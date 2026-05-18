-- Flow Media Silo — Unified Multi-Tenant Auth Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Teams ────────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id           uuid primary key default uuid_generate_v4(),
  team_name    text not null,
  subscription_status text not null default 'trial' check (subscription_status in ('active','cancelled','trial')),
  created_at   timestamptz not null default now()
);

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  full_name text,
  team_id   uuid references public.teams(id) on delete cascade,
  role      text not null default 'team_member' check (role in ('team_member','team_leader')),
  notification_preferences jsonb not null default '{"render_complete":true,"campaign_alert":true}'::jsonb,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS for teams and profiles
alter table public.teams         enable row level security;
alter table public.profiles      enable row level security;

-- Profiles: users can read/update their own profile
create policy "profiles_own" on public.profiles for all using (auth.uid() = id);

-- Teams: members can read their team
create policy "teams_member_read" on public.teams for select using (
  id in (select team_id from public.profiles where id = auth.uid())
);

-- Teams: any authenticated user can create a team
create policy "teams_insert" on public.teams for insert with check (auth.uid() is not null);
