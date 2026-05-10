-- Flow Media Core Schema
-- Migration: 20260510000001_flowmedia_core_schema

-- ── Clients (multi-tenant root) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  industry      TEXT NOT NULL DEFAULT 'real_estate',
  brand_voice   JSONB DEFAULT '{}',
  plan_tier     TEXT NOT NULL DEFAULT 'starter',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Jobs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL CHECK (job_type IN ('process_mine', 'create_for_me')),
  status          TEXT NOT NULL DEFAULT 'intake' CHECK (status IN (
                    'intake', 'briefing', 'producing', 'checkpoint_1',
                    'checkpoint_2', 'approved', 'exporting', 'distributing',
                    'complete', 'failed', 'cancelled'
                  )),
  pipeline_stage  TEXT,
  output_types    TEXT[] DEFAULT '{}',
  target_platforms TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Assets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL CHECK (asset_type IN ('raw', 'produced', 'final', 'export', 'thumbnail')),
  r2_key          TEXT NOT NULL,
  r2_bucket       TEXT NOT NULL DEFAULT 'flowmedia',
  mime_type       TEXT,
  duration_sec    NUMERIC,
  platform        TEXT,
  file_size_bytes BIGINT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Variations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
  variation_type  TEXT NOT NULL CHECK (variation_type IN (
                    'video', 'script', 'thumbnail', 'broll', 'caption', 'avatar'
                  )),
  variation_index INTEGER NOT NULL DEFAULT 0,
  content         TEXT,
  r2_key          TEXT,
  selected        BOOLEAN DEFAULT FALSE,
  generator       TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Briefs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  goal            TEXT NOT NULL,
  tone            TEXT,
  target_audience TEXT,
  platforms       TEXT[] DEFAULT '{}',
  deadline        TIMESTAMPTZ,
  content_types   TEXT[] DEFAULT '{}',
  notes           TEXT,
  raw_form        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                  'draft', 'awaiting_first_approval', 'autopilot', 'paused', 'complete'
                )),
  autopilot     BOOLEAN DEFAULT FALSE,
  schedule_cron TEXT,
  platforms     TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Approvals (Checkpoint Queue) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  checkpoint_type       TEXT NOT NULL CHECK (checkpoint_type IN (
                          'internal_review', 'client_approval', 'distribution_confirmation'
                        )),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                          'pending', 'approved', 'rejected', 'revision_requested'
                        )),
  selected_variation_id UUID REFERENCES variations(id) ON DELETE SET NULL,
  reviewer_id           UUID REFERENCES auth.users(id),
  notes                 TEXT,
  payload               JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  resolved_at           TIMESTAMPTZ
);

-- ── Channel Connections ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform             TEXT NOT NULL CHECK (platform IN (
                         'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'website', 'email'
                       )),
  oauth_token          TEXT,
  oauth_refresh        TEXT,
  token_expires_at     TIMESTAMPTZ,
  platform_user_id     TEXT,
  status               TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'revoked')),
  first_post_confirmed BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, platform)
);

-- ── Engagement Rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engagement_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  classification TEXT NOT NULL CHECK (classification IN ('positive', 'question', 'negative', 'spam', 'neutral')),
  action         TEXT NOT NULL CHECK (action IN ('auto_reply', 'hold_for_review', 'ignore', 'hide')),
  reply_template TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, classification)
);

-- ── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform            TEXT NOT NULL,
  platform_post_id    TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL,
  author_handle       TEXT,
  content             TEXT NOT NULL,
  classification      TEXT CHECK (classification IN ('positive', 'question', 'negative', 'spam', 'neutral')),
  reply_status        TEXT NOT NULL DEFAULT 'pending' CHECK (reply_status IN (
                        'pending', 'draft', 'approved', 'posted', 'ignored'
                      )),
  draft_reply         TEXT,
  posted_reply        TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  replied_at          TIMESTAMPTZ
);

-- ── Audit Events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'system',
  payload     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_client_id      ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status         ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_assets_job_id       ON assets(job_id);
CREATE INDEX IF NOT EXISTS idx_variations_job_id   ON variations(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_job_id    ON approvals(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status    ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_comments_client_id  ON comments(client_id);
CREATE INDEX IF NOT EXISTS idx_comments_reply_status ON comments(reply_status);
CREATE INDEX IF NOT EXISTS idx_audit_events_job_id ON audit_events(job_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at  BEFORE UPDATE ON clients  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at     BEFORE UPDATE ON jobs     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events       ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_owner    ON clients    FOR ALL USING (team_id = auth.uid());
CREATE POLICY jobs_client      ON jobs       FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY assets_client    ON assets     FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY variations_client ON variations FOR ALL USING (job_id IN (SELECT id FROM jobs WHERE client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())));
CREATE POLICY briefs_client    ON briefs     FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY campaigns_client ON campaigns  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY approvals_client ON approvals  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY channels_client  ON channel_connections FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY engagement_client ON engagement_rules   FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY comments_client  ON comments   FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
CREATE POLICY audit_client     ON audit_events FOR ALL USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()));
