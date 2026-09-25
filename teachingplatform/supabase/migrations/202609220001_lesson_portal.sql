create extension if not exists pgcrypto;

create type public.question_type as enum ('text', 'multiple_choice');

create table public.codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_used boolean not null default false,
  used_by uuid,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Student',
  code_id uuid not null references public.codes(id) on delete restrict,
  device_id text,
  device_locked_at timestamptz,
  session_token text, -- SHA-256 digest only; raw token is stored in an httpOnly cookie
  created_at timestamptz not null default now()
);

alter table public.codes add constraint codes_used_by_fkey foreign key (used_by) references public.students(id) on delete set null;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_id text not null,
  pdf_path text not null,
  order_index integer not null check (order_index > 0),
  created_at timestamptz not null default now()
);
create unique index lessons_order_index_key on public.lessons(order_index);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question_text text not null,
  question_type public.question_type not null,
  options jsonb,
  correct_answer text,
  constraint multiple_choice_has_options check (question_type <> 'multiple_choice' or jsonb_typeof(options) = 'array')
);

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  video_watched boolean not null default false,
  pdf_viewed boolean not null default false,
  questions_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text not null,
  submitted_at timestamptz not null default now(),
  unique(student_id, question_id)
);

create table public.redemption_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);
create index redemption_attempts_ip_time_idx on public.redemption_attempts(ip_hash, attempted_at desc);

alter table public.codes enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.progress enable row level security;
alter table public.answers enable row level security;
alter table public.redemption_attempts enable row level security;

-- Deliberately no anon/authenticated policies. The raw session token is httpOnly and
-- cannot safely participate in browser-side RLS. All access passes through the Edge
-- Function, which validates token + device and scopes every query to student_id.
revoke all on public.codes, public.students, public.lessons, public.questions, public.progress, public.answers, public.redemption_attempts from anon, authenticated;
grant all on public.codes, public.students, public.lessons, public.questions, public.progress, public.answers, public.redemption_attempts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-pdfs', 'lesson-pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false;

-- Storage remains private. Only the service role creates short-lived signed URLs.
create policy "deny direct lesson pdf reads" on storage.objects for select to anon, authenticated using (false);
create policy "deny direct lesson pdf writes" on storage.objects for insert to anon, authenticated with check (false);

create or replace function public.redeem_access_code(
  p_code text,
  p_device_id text,
  p_token_hash text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_code public.codes;
  v_student public.students;
begin
  select * into v_code from public.codes where upper(code) = upper(trim(p_code)) for update;
  if not found then raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;

  if v_code.is_used then
    select * into v_student from public.students where id = v_code.used_by for update;
    if v_student.device_id is not null then raise exception 'CODE_ALREADY_USED' using errcode = 'P0001'; end if;
    update public.students set device_id = p_device_id, device_locked_at = now(), session_token = p_token_hash where id = v_student.id;
    return v_student.id;
  end if;

  insert into public.students(code_id, device_id, device_locked_at, session_token)
  values(v_code.id, p_device_id, now(), p_token_hash) returning id into v_student.id;
  update public.codes set is_used = true, used_by = v_student.id where id = v_code.id;
  return v_student.id;
end;
$$;
revoke all on function public.redeem_access_code(text,text,text) from public, anon, authenticated;
grant execute on function public.redeem_access_code(text,text,text) to service_role;

create or replace function public.touch_progress_timestamp() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger progress_updated_at before update on public.progress for each row execute function public.touch_progress_timestamp();
