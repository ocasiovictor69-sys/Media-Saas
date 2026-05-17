-- Recreate leads table for Flow Media to be media-specific and resolve domain-isolation mismatches

-- Drop dependent tables first
DROP TABLE IF EXISTS public.lead_timeline CASCADE;
DROP TABLE IF EXISTS public.lead_notes CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- Create media-specific leads table
CREATE TABLE public.leads (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id          UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  score            INTEGER NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  stage            TEXT NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW','ACTIVE','QUALIFIED','CLOSED_WON','ARCHIVED')),
  priority         TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH','MEDIUM','LOW')),
  client_name      TEXT NOT NULL,
  client_email     TEXT,
  client_phone     TEXT,
  project_title    TEXT NOT NULL,
  media_type       TEXT NOT NULL DEFAULT 'VIDEO' CHECK (media_type IN ('VIDEO', 'AUDIO', 'IMAGE', 'SCRIPT')),
  platform         TEXT NOT NULL DEFAULT 'MULTI' CHECK (platform IN ('YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'TWITTER', 'MULTI')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Re-enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Re-create lead notes for media leads
CREATE TABLE public.lead_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Re-create lead timeline for media leads
CREATE TABLE public.lead_timeline (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id   UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event     TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  metadata  JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_timeline ENABLE ROW LEVEL SECURITY;

-- Re-apply RLS Policies
CREATE POLICY "leads_team" ON public.leads FOR ALL USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "lead_notes_team" ON public.lead_notes FOR ALL USING (
  lead_id IN (
    SELECT id FROM public.leads
    WHERE team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "timeline_team" ON public.lead_timeline FOR ALL USING (
  lead_id IN (
    SELECT id FROM public.leads
    WHERE team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Triggers for updated_at
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
