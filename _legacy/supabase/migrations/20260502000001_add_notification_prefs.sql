-- Add notification_preferences to profiles for Flow-Media Factory
alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"render_complete":true,"distribution_success":true,"engagement_alert":true}'::jsonb;
