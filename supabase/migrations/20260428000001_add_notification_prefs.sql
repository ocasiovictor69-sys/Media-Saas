-- Add notification_prefs to profiles for Flow-Media Pipeline
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{"youtube":false,"instagram":false,"tiktok":false,"linkedin":false}'::jsonb;
