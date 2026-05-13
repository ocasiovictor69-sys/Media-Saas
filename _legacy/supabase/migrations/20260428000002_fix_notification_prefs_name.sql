-- Fix notification column name for Flow-Media
alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"youtube":false,"instagram":false,"tiktok":false,"linkedin":false}'::jsonb;

-- Optional: drop the misnamed column if it exists from previous incorrect migration
-- alter table public.profiles drop column if exists notification_prefs;
