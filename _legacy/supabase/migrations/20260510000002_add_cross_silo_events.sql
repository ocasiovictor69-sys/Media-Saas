-- Flow-Media: cross_silo_events table for decoupled silo communication
-- Replaces direct HTTP calls between silos (D04→Agento silo violation fix)
-- Agento polls this table for pending social_lead_ingest events

create table if not exists public.cross_silo_events (
  id           text primary key,
  source_silo  text not null check (source_silo in ('agento', 'aver', 'aventra', 'media')),
  target_silo  text not null check (target_silo in ('agento', 'aver', 'aventra', 'media')),
  event_type   text not null,
  status       text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  payload      jsonb not null default '{}',
  error        text,
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_cross_silo_events_target on public.cross_silo_events(target_silo, status);
create index if not exists idx_cross_silo_events_type   on public.cross_silo_events(event_type);
create index if not exists idx_cross_silo_events_status on public.cross_silo_events(status);

alter table public.cross_silo_events enable row level security;

create policy "Service role only"
  on public.cross_silo_events for all
  using (auth.role() = 'service_role');
