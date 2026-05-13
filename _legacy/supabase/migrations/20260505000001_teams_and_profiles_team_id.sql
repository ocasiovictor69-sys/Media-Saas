-- Fix C-05: Create missing teams table referenced by campaigns, media_assets, generation_jobs
-- Fix C-06: Add team_id column to profiles (queried by all pipeline/upload API routes)
-- Must run BEFORE 20260506000001_flow_media_v2.sql in timestamp order
-- Inserted at 20260507 to slot between initial schema and v2 migration

-- ── Teams ─────────────────────────────────────────────────────────────────────

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "teams_members" on public.teams
  for all using (
    id in (select team_id from public.profiles where id = auth.uid())
  );

create policy "teams_owner_insert" on public.teams
  for insert with check (owner_id = auth.uid());

-- ── Add team_id to profiles ───────────────────────────────────────────────────

alter table public.profiles
  add column if not exists team_id uuid references public.teams(id) on delete set null;

alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('team_leader', 'member'));

create index if not exists profiles_team_id_idx on public.profiles(team_id);
