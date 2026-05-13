-- Flow-Media v2 — Full Production Schema
-- Fixes: missing campaigns, media_assets, generation_jobs tables
-- Fixes: no RLS on media_assets
-- Adds: append-only audit log, cost tracking per generation job

-- ── Extensions ───────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ── Campaigns ─────────────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  team_id         uuid not null references public.teams(id) on delete cascade,
  name            text not null,
  status          text not null default 'draft'
                  check (status in ('draft', 'queued', 'generating', 'complete', 'failed')),
  strategy        jsonb not null default '{}',
  -- strategy.mediaTasks: array of { type, script, prompt, avatarId, voiceId, duration, rawMedia }
  budget_usd      numeric(10,2) default null, -- null = no cap
  spent_usd       numeric(10,2) not null default 0,
  source_lead_id  text default null, -- Agento property_id if campaign originated from deal engine
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_team_status_idx on public.campaigns(team_id, status);
create index if not exists campaigns_source_lead_idx on public.campaigns(source_lead_id) where source_lead_id is not null;

-- ── Media Assets ──────────────────────────────────────────────────────────────

create table if not exists public.media_assets (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  client_id       uuid not null,
  team_id         uuid not null references public.teams(id) on delete cascade,

  -- Asset classification
  type            text not null check (type in ('avatar', 'broll', 'cinematic', 'raw', 'composite')),
  format          text not null default 'video' check (format in ('video', 'audio', 'image')),
  status          text not null default 'pending'
                  check (status in ('pending', 'generating', 'ready', 'failed')),

  -- Storage
  url             text,           -- Supabase Storage URL — null until generation complete
  storage_path    text,           -- internal bucket path
  file_size_bytes bigint,
  duration_sec    numeric(8,2),
  mime_type       text,

  -- Source fingerprint (dedup key for raw uploads)
  md5_hash        text,

  -- Generation metadata
  generator       text check (generator in ('heygen', 'runway', 'higgsfield', 'ffmpeg', 'raw')),
  generation_cost_usd numeric(8,4) default 0,
  metadata        jsonb not null default '{}',  -- full API response

  -- Job reference (async generation tracking) — FK added below after generation_jobs is created
  job_id          uuid,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists media_assets_campaign_idx on public.media_assets(campaign_id);
create index if not exists media_assets_team_status_idx on public.media_assets(team_id, status);
create unique index if not exists media_assets_md5_client_idx on public.media_assets(client_id, md5_hash)
  where md5_hash is not null; -- prevents raw upload deduplication

-- ── Generation Jobs (Async Job Queue) ────────────────────────────────────────
-- All three AI generators (HeyGen, Runway, Higgsfield) are async.
-- A job is created on submission, polled until complete, then resolved.

create table if not exists public.generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  campaign_id     uuid references public.campaigns(id) on delete cascade,

  -- Generator identification
  generator       text not null check (generator in ('heygen', 'runway', 'higgsfield')),
  external_job_id text not null,  -- ID returned by the generator API (video_id, task_id, etc.)
  task_type       text not null,  -- 'avatar' | 'broll' | 'cinematic'

  -- Job lifecycle
  status          text not null default 'submitted'
                  check (status in ('submitted', 'processing', 'completed', 'failed', 'timed_out')),
  attempt_count   integer not null default 0,
  max_attempts    integer not null default 60, -- 60 polls @ 10s = 10min timeout

  -- Results
  output_url      text,
  error_message   text,
  raw_response    jsonb default '{}',

  -- Cost tracking
  estimated_cost_usd  numeric(8,4) default 0,
  actual_cost_usd     numeric(8,4) default 0,

  submitted_at    timestamptz not null default now(),
  completed_at    timestamptz,
  next_poll_at    timestamptz not null default now() + interval '10 seconds'
);

-- Note: generation_jobs is referenced by media_assets.job_id above,
-- so it must be created first. Alter the FK after creation:
alter table public.media_assets
  add constraint media_assets_job_id_fkey
  foreign key (job_id) references public.generation_jobs(id) on delete set null
  not valid;

create index if not exists generation_jobs_poll_idx
  on public.generation_jobs(next_poll_at, status)
  where status in ('submitted', 'processing');

create index if not exists generation_jobs_campaign_idx
  on public.generation_jobs(campaign_id);

-- ── Media Audit Log ───────────────────────────────────────────────────────────

create table if not exists public.media_audit_log (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid,
  campaign_id     uuid,
  asset_id        uuid,
  job_id          uuid,
  event_type      text not null,
  service         text not null,
  cost_usd        numeric(8,4) default 0,
  payload         jsonb not null default '{}',
  timestamp       timestamptz not null default now()
);

-- Append-only: no update or delete
create rule media_audit_no_update as on update to public.media_audit_log do instead nothing;
create rule media_audit_no_delete as on delete to public.media_audit_log do instead nothing;

create index if not exists media_audit_campaign_idx on public.media_audit_log(campaign_id, timestamp desc);

-- ── Auto-update triggers ──────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute procedure public.set_updated_at();

drop trigger if exists media_assets_updated_at on public.media_assets;
create trigger media_assets_updated_at
  before update on public.media_assets
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.campaigns        enable row level security;
alter table public.media_assets     enable row level security;
alter table public.generation_jobs  enable row level security;
alter table public.media_audit_log  enable row level security;

-- Campaigns: team-scoped
create policy "campaigns_team" on public.campaigns
  for all using (team_id in (select team_id from public.profiles where id = auth.uid()));

-- Media assets: team-scoped
create policy "media_assets_team" on public.media_assets
  for all using (team_id in (select team_id from public.profiles where id = auth.uid()));

-- Generation jobs: team-scoped read (service role writes)
create policy "generation_jobs_team_read" on public.generation_jobs
  for select using (team_id in (select team_id from public.profiles where id = auth.uid()));

-- Audit log: team-scoped read-only
create policy "media_audit_team_read" on public.media_audit_log
  for select using (team_id in (select team_id from public.profiles where id = auth.uid()));

-- ── Storage bucket policy ─────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  524288000,  -- 500MB max per file
  array['video/mp4','video/quicktime','video/webm','video/mpeg','image/jpeg','image/png','audio/mpeg','audio/wav']
) on conflict (id) do nothing;
