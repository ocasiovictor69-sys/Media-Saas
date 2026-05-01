-- Flow-Media Pipeline — Initial Schema
-- Run: supabase db push

create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Productions
create table if not exists public.productions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  platforms    text[],
  script       text,
  avatar_id    text,
  voice_id     text,
  status       text not null default 'draft' check (status in ('draft','rendering','completed','failed')),
  heygen_job_id text,
  video_url    text,
  duration_sec integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Assets (finished video files ready for distribution)
create table if not exists public.assets (
  id            uuid primary key default uuid_generate_v4(),
  production_id uuid not null references public.productions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  file_url      text not null,
  file_name     text,
  file_size_mb  numeric(8,2),
  asset_type    text not null default 'video' check (asset_type in ('video','thumbnail','caption')),
  created_at    timestamptz not null default now()
);

-- Distributions (one row per platform per asset)
create table if not exists public.distributions (
  id          uuid primary key default uuid_generate_v4(),
  asset_id    uuid not null references public.assets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  platform    text not null check (platform in ('youtube','instagram','tiktok','linkedin','facebook','twitter')),
  status      text not null default 'pending' check (status in ('pending','scheduled','posted','failed')),
  buffer_id   text,
  scheduled_at timestamptz,
  posted_at   timestamptz,
  caption     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger productions_updated_at  before update on public.productions  for each row execute procedure public.set_updated_at();
create trigger distributions_updated_at before update on public.distributions for each row execute procedure public.set_updated_at();
create trigger profiles_updated_at      before update on public.profiles     for each row execute procedure public.set_updated_at();

-- RLS
alter table public.profiles      enable row level security;
alter table public.productions   enable row level security;
alter table public.assets        enable row level security;
alter table public.distributions enable row level security;

create policy "profiles_own"       on public.profiles      for all using (auth.uid() = id);
create policy "productions_own"    on public.productions   for all using (auth.uid() = user_id);
create policy "assets_own"         on public.assets        for all using (auth.uid() = user_id);
create policy "distributions_own"  on public.distributions for all using (auth.uid() = user_id);
