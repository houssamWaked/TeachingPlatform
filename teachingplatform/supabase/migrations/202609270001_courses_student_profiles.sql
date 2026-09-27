create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  image_path text not null default '',
  created_at timestamptz not null default now()
);

insert into public.courses (name, description)
values ('General', 'Existing lessons and student access')
on conflict (name) do nothing;

alter table public.lessons add column course_id uuid references public.courses(id) on delete restrict;
update public.lessons
set course_id = (select id from public.courses where name = 'General')
where course_id is null;
alter table public.lessons alter column course_id set not null;
create index lessons_course_id_idx on public.lessons(course_id);

create table public.student_courses (
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (student_id, course_id)
);
create index student_courses_course_id_idx on public.student_courses(course_id);

-- Keep current students' existing access after lessons become course-scoped.
insert into public.student_courses (student_id, course_id)
select students.id, courses.id
from public.students cross join public.courses
where courses.name = 'General'
on conflict do nothing;

alter table public.students add column profile_image_path text not null default '';

alter table public.courses enable row level security;
alter table public.student_courses enable row level security;
revoke all on public.courses, public.student_courses from anon, authenticated;
grant all on public.courses, public.student_courses to service_role;

create or replace function public.set_student_courses(p_student_id uuid, p_course_ids uuid[])
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'STUDENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_course_ids), 0) > 100 then
    raise exception 'TOO_MANY_COURSES' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_course_ids, array[]::uuid[])) as requested(id)
    left join public.courses on courses.id = requested.id
    where courses.id is null
  ) then
    raise exception 'COURSE_NOT_FOUND' using errcode = 'P0001';
  end if;

  delete from public.student_courses where student_id = p_student_id;
  insert into public.student_courses (student_id, course_id)
  select p_student_id, requested.id
  from (select distinct unnest(coalesce(p_course_ids, array[]::uuid[])) as id) requested;
end;
$$;
revoke all on function public.set_student_courses(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.set_student_courses(uuid, uuid[]) to service_role;
