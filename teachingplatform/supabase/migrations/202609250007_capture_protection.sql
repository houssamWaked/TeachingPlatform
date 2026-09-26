-- Pseudonymous, server-issued viewing-session watermark and factual capture log.
-- Only the Edge Function's service role can resolve these records.
create table public.forensic_watermarks (
  id uuid primary key default gen_random_uuid(),
  watermark_code text not null unique,
  integrity_tag text not null,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  session_hash text not null,
  issued_at timestamptz not null default now(),
  watermark_version integer not null default 1
);
create index forensic_watermarks_student_lesson_idx
  on public.forensic_watermarks(student_id, lesson_id, issued_at desc);

create table public.capture_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  platform text not null check (platform in ('web', 'android', 'ios')),
  capture_type text not null check (capture_type in (
    'SCREEN_SHARING_DETECTED', 'SCREEN_SHARING_ENDED', 'UNKNOWN_CAPTURE_SUSPICION',
    'SCREENSHOT_DETECTED', 'SCREEN_RECORDING_DETECTED', 'SCREEN_MIRRORING_DETECTED',
    'PROTECTION_OVERLAY_ACTIVATED'
  )),
  captured_at timestamptz not null default now(),
  application_version text not null default 'web',
  capture_state text not null,
  response text not null
);
create index capture_events_student_time_idx on public.capture_events(student_id, captured_at desc);
create index capture_events_lesson_time_idx on public.capture_events(lesson_id, captured_at desc);

alter table public.forensic_watermarks enable row level security;
alter table public.capture_events enable row level security;
revoke all on public.forensic_watermarks, public.capture_events from anon, authenticated;
grant all on public.forensic_watermarks, public.capture_events to service_role;
