alter table public.progress
  add column if not exists manual_completed boolean not null default false;
