-- Agento Deal Engine — Core Consolidated Schema
-- Run: supabase db push

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
  notification_preferences jsonb not null default '{"lead_assigned":true,"deal_status":true,"nurture_alert":true}'::jsonb,
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

-- ── Leads ────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id               uuid primary key default uuid_generate_v4(),
  team_id          uuid not null references public.teams(id) on delete cascade,
  owner_id         uuid references public.profiles(id) on delete set null,
  score            integer not null default 50 check (score between 0 and 100),
  stage            text not null default 'NEW' check (stage in ('NEW','ACTIVE','QUALIFIED','CLOSED_WON','ARCHIVED')),
  priority         text not null default 'MEDIUM' check (priority in ('HIGH','MEDIUM','LOW')),
  seller_name      text not null,
  seller_email     text,
  seller_phone     text,
  property_address text not null,
  property_zip     text not null,
  property_type    text check (property_type in ('single_family','duplex','triplex','fourplex','commercial')),
  property_beds    integer,
  property_baths   integer,
  property_sqft    integer,
  valuation        jsonb,
  four_d_breakdown jsonb,
  outreach_step    integer not null default 0,
  next_action_at   timestamptz,
  last_contacted   timestamptz,
  assigned_to      text,
  tags             text[],
  attom_data       jsonb,
  pipeline         text check (pipeline in ('1','2')) default '1',
  seller_category  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at for leads
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

-- ── Lead Notes ───────────────────────────────────────────────────────────────
create table if not exists public.lead_notes (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists lead_notes_updated_at on public.lead_notes;
create trigger lead_notes_updated_at
  before update on public.lead_notes
  for each row execute procedure public.set_updated_at();

-- ── Lead Timeline ────────────────────────────────────────────────────────────
create table if not exists public.lead_timeline (
  id        uuid primary key default uuid_generate_v4(),
  lead_id   uuid not null references public.leads(id) on delete cascade,
  event     text not null,
  status    text not null default 'pending' check (status in ('pending','completed','failed')),
  metadata  jsonb,
  created_at timestamptz not null default now()
);

-- ── Properties (Module 5) ────────────────────────────────────────────────────
create table if not exists public.properties (
  property_id       uuid primary key default gen_random_uuid(),
  tenant_id         uuid references public.teams(id) on delete cascade,

  -- Source provenance
  source            text not null check (source in ('ATTOM', 'PropStream')),
  external_id       text not null,
  source_fingerprint text not null unique,  -- SHA-256 cross-source dedup key

  -- Module 1 output
  address           text not null,
  market_tier       text not null default 'tertiary' check (market_tier in ('metro', 'secondary', 'tertiary')),
  raw_data          jsonb not null default '{}',
  four_d_score      integer,
  four_d_priority   text check (four_d_priority in ('HIGH', 'MEDIUM', 'LOW')),
  four_d_breakdown  jsonb,
  distress_flags    jsonb,
  filter_pass       boolean not null default false,
  enrichment_required boolean not null default true,

  -- Refactored columns
  pipeline          text check (pipeline in ('commercial', 'residential')),
  pipeline_status   text not null default 'processing' check (pipeline_status in ('PENDING', 'COMPLETE', 'HALTED', 'REVIEW', 'processing')),
  skip_trace        jsonb,
  skip_traced_at    timestamptz,
  ai_verification   jsonb,
  
  -- Module 2 output
  valuation         jsonb,
  valuated_at       timestamptz,

  -- Module 3A output
  verification      jsonb,
  verified_at       timestamptz,

  -- Module 3B output
  validation        jsonb,
  validated_at      timestamptz,

  -- Module 4 output
  outreach          jsonb,
  outreach_at       timestamptz,

  halt_reason       text,
  halt_at           timestamptz,
  sealed_at         timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists properties_pipeline_status_idx
  on public.properties(pipeline_status, created_at desc)
  where pipeline_status in ('PENDING', 'REVIEW', 'processing');

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
  before update on public.properties
  for each row execute procedure public.set_updated_at();

-- ── Audit Events ─────────────────────────────────────────────────────────────
create table if not exists public.audit_events (
  event_id         uuid primary key,
  schema_version   text not null default '1.0.0',
  property_id      uuid references public.properties(property_id) on delete set null,
  event_type       text not null,
  service          text not null,
  timestamp        timestamptz not null,
  payload          jsonb not null default '{}'
);

create rule audit_events_no_update as
  on update to public.audit_events do instead nothing;

create rule audit_events_no_delete as
  on delete to public.audit_events do instead nothing;

create index if not exists audit_events_property_idx
  on public.audit_events(property_id, timestamp desc)
  where property_id is not null;

create index if not exists audit_events_type_idx
  on public.audit_events(event_type, timestamp desc);

-- ── Tenant Config ────────────────────────────────────────────────────────────
create table if not exists public.tenant_config (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null unique references public.teams(id) on delete cascade,

  down_payment_pct  numeric(5,4) not null default 0.25   check (down_payment_pct between 0.05 and 0.95),
  annual_rate       numeric(5,4) not null default 0.075  check (annual_rate between 0.01 and 0.25),
  amortization_yrs  integer      not null default 30     check (amortization_yrs between 5 and 40),
  closing_cost_pct  numeric(5,4) not null default 0.03   check (closing_cost_pct between 0.01 and 0.10),

  cap_rate_min      numeric(5,4) not null default 0.04   check (cap_rate_min >= 0),
  cap_rate_max      numeric(5,4) not null default 0.25   check (cap_rate_max <= 1),
  dscr_bankable     numeric(5,4) not null default 1.25   check (dscr_bankable > 0),
  dscr_marginal     numeric(5,4) not null default 1.00   check (dscr_marginal > 0),
  min_confidence    integer      not null default 40     check (min_confidence between 0 and 100),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists tenant_config_updated_at on public.tenant_config;
create trigger tenant_config_updated_at
  before update on public.tenant_config
  for each row execute procedure public.set_updated_at();

-- ── Approval Queue ───────────────────────────────────────────────────────────
create table if not exists public.approval_queue (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties(property_id) on delete cascade,
  agent_id         uuid not null references public.profiles(id) on delete cascade,
  checkpoint_type  text not null check (checkpoint_type in (
                     'verification_review',
                     'buy_box_confirmation',
                     'outreach_sequence'
                   )),
  status           text not null default 'pending' check (status in (
                     'pending', 'approved', 'edited_approved', 'rejected'
                   )),
  payload          jsonb not null default '{}',
  agent_notes      text,
  created_at       timestamptz not null default now(),
  actioned_at      timestamptz
);

create index if not exists idx_approval_queue_agent      on public.approval_queue(agent_id, status);
create index if not exists idx_approval_queue_property   on public.approval_queue(property_id);
create index if not exists idx_approval_queue_checkpoint on public.approval_queue(checkpoint_type, status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.teams         enable row level security;
alter table public.profiles      enable row level security;
alter table public.leads         enable row level security;
alter table public.lead_notes    enable row level security;
alter table public.lead_timeline enable row level security;
alter table public.properties    enable row level security;
alter table public.audit_events  enable row level security;
alter table public.tenant_config enable row level security;
alter table public.approval_queue enable row level security;

-- Profiles: users can read/update their own profile
create policy "profiles_own" on public.profiles for all using (auth.uid() = id);

-- Teams: members can read their team
create policy "teams_member_read" on public.teams for select using (
  id in (select team_id from public.profiles where id = auth.uid())
);

-- Teams: any authenticated user can create a team
create policy "teams_insert" on public.teams for insert with check (auth.uid() is not null);

-- Leads: team members can CRUD their team's leads
create policy "leads_team" on public.leads for all using (
  team_id in (select team_id from public.profiles where id = auth.uid())
);

-- Lead Notes: team members can CRUD notes for their team's leads
create policy "lead_notes_team" on public.lead_notes for all using (
  lead_id in (
    select id from public.leads
    where team_id in (select team_id from public.profiles where id = auth.uid())
  )
);

-- Timeline: accessible if lead is accessible
create policy "timeline_team" on public.lead_timeline for all using (
  lead_id in (
    select id from public.leads
    where team_id in (select team_id from public.profiles where id = auth.uid())
  )
);

-- Properties: team-scoped access
create policy "properties_team_all" on public.properties for all using (
  tenant_id in (select team_id from public.profiles where id = auth.uid())
);

-- Audit events: team-scoped read-only
create policy "audit_events_team_read" on public.audit_events for select using (
  property_id in (
    select property_id from public.properties
    where tenant_id in (select team_id from public.profiles where id = auth.uid())
  )
);

-- Tenant config: team-scoped
create policy "tenant_config_team" on public.tenant_config for all using (
  team_id in (select team_id from public.profiles where id = auth.uid())
);

-- Approval Queue: agents see only their own queue
create policy "approval_queue_agent" on public.approval_queue for all using (
  agent_id = auth.uid()
);
