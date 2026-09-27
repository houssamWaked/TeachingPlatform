create table if not exists public.teacher_profile (
  id boolean primary key default true check (id),
  name text not null default 'Teacher' check (char_length(name) between 1 and 80),
  profile_image_path text,
  updated_at timestamptz not null default now()
);

insert into public.teacher_profile (id, name)
values (true, 'Teacher')
on conflict (id) do nothing;

alter table public.teacher_profile enable row level security;
revoke all on public.teacher_profile from anon, authenticated;
grant all on public.teacher_profile to service_role;
