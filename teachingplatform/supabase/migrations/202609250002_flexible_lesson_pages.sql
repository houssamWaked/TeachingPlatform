-- Add a structured page model without changing existing video, PDF,
-- question, progress, redemption, or device-lock records.
alter table public.lessons
  add column if not exists content jsonb not null
    default '{"blocks":[],"sections":[]}'::jsonb,
  add column if not exists published boolean not null default true;

-- Existing lessons remain visible to students. New lessons are created as drafts
-- by the admin API, which explicitly writes published = false.
