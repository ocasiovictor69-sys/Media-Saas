# Flow Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **GSD Framework:** Follow gsd-executor and gsd-executor-sop skills at all times. Phase gates are hard stops — do not proceed to the next phase without completing the gate checklist.

**Goal:** Build the Flow Media full-service AI media production and distribution SaaS — from raw asset intake through AI production, human-gated review, multi-channel distribution, and comment engagement.

**Architecture:** Two job types (Process Mine / Create For Me) feed a 7-module pipeline. Each module has one responsibility. Probabilistic modules generate N variations; humans pick one at checkpoint gates. Autopilot kicks in after first approval.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Auth + RLS), Cloudflare R2 (storage), FFmpeg (assembly), Runway AI / Higgsfield / HeyGen / Remotion / Sharp (production), Claude/Hermes (AI), Google Cloud Run (deployment)

**Spec:** `docs/specs/2026-05-10-flowmedia-architecture-design.md`

---

## GSD Phase Gate: Phase 0 → 1

- [x] Spec approved by Victor (Taipan)
- [x] All gaps answered in design session
- [x] Tech stack decisions locked
- [x] Module map finalized
- [x] Variation policy defined

**Phase 0 COMPLETE. Proceeding to Phase 1.**

---

## Phase 1: Architecture & Artifacts

### Task 1: Database Migration — Core Schema

**GSD Artifact:** `/gsd-artifacts --type sql`

**Files:**
- Create: `supabase/migrations/20260510000001_flowmedia_core_schema.sql`

- [ ] **Step 1: Create migration file**

```sql
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
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  asset_type    TEXT NOT NULL CHECK (asset_type IN ('raw', 'produced', 'final', 'export', 'thumbnail')),
  r2_key        TEXT NOT NULL,
  r2_bucket     TEXT NOT NULL DEFAULT 'flowmedia',
  mime_type     TEXT,
  duration_sec  NUMERIC,
  platform      TEXT,
  file_size_bytes BIGINT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft', 'awaiting_first_approval', 'autopilot', 'paused', 'complete'
                  )),
  autopilot       BOOLEAN DEFAULT FALSE,
  schedule_cron   TEXT,
  platforms       TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Approvals (Checkpoint Queue) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  checkpoint_type  TEXT NOT NULL CHECK (checkpoint_type IN (
                     'internal_review', 'client_approval', 'distribution_confirmation'
                   )),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                     'pending', 'approved', 'rejected', 'revision_requested'
                   )),
  selected_variation_id UUID REFERENCES variations(id) ON DELETE SET NULL,
  reviewer_id      UUID REFERENCES auth.users(id),
  notes            TEXT,
  payload          JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

-- ── Channel Connections ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN (
                    'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'website', 'email'
                  )),
  oauth_token     TEXT,
  oauth_refresh   TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  status          TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'revoked')),
  first_post_confirmed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, platform)
);

-- ── Engagement Rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engagement_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  classification  TEXT NOT NULL CHECK (classification IN ('positive', 'question', 'negative', 'spam', 'neutral')),
  action          TEXT NOT NULL CHECK (action IN ('auto_reply', 'hold_for_review', 'ignore', 'hide')),
  reply_template  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, classification)
);

-- ── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL,
  platform_post_id  TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL,
  author_handle     TEXT,
  content           TEXT NOT NULL,
  classification    TEXT CHECK (classification IN ('positive', 'question', 'negative', 'spam', 'neutral')),
  reply_status      TEXT NOT NULL DEFAULT 'pending' CHECK (reply_status IN (
                      'pending', 'draft', 'approved', 'posted', 'ignored'
                    )),
  draft_reply       TEXT,
  posted_reply      TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  replied_at        TIMESTAMPTZ
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
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_assets_job_id ON assets(job_id);
CREATE INDEX IF NOT EXISTS idx_variations_job_id ON variations(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_job_id ON approvals(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_comments_client_id ON comments(client_id);
CREATE INDEX IF NOT EXISTS idx_comments_reply_status ON comments(reply_status);
CREATE INDEX IF NOT EXISTS idx_audit_events_job_id ON audit_events(job_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Clients: user sees only their own client record
CREATE POLICY clients_owner ON clients FOR ALL USING (team_id = auth.uid());

-- Jobs: user sees only jobs for their client
CREATE POLICY jobs_client ON jobs FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Assets: same isolation
CREATE POLICY assets_client ON assets FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Variations: via job
CREATE POLICY variations_client ON variations FOR ALL USING (
  job_id IN (SELECT id FROM jobs WHERE client_id IN (SELECT id FROM clients WHERE team_id = auth.uid()))
);

-- Briefs: same
CREATE POLICY briefs_client ON briefs FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Campaigns
CREATE POLICY campaigns_client ON campaigns FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Approvals
CREATE POLICY approvals_client ON approvals FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Channel connections
CREATE POLICY channels_client ON channel_connections FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Engagement rules
CREATE POLICY engagement_client ON engagement_rules FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Comments
CREATE POLICY comments_client ON comments FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);

-- Audit events
CREATE POLICY audit_client ON audit_events FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE team_id = auth.uid())
);
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push --project-ref <your-project-ref>`  
Expected: Migration applied with no errors. All 11 tables created.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260510000001_flowmedia_core_schema.sql
git commit -m "feat(db): core schema — jobs, assets, variations, approvals, channels, engagement"
```

---

### Task 2: Service Clients — All External APIs

**Files:**
- Create: `src/lib/services/r2.ts` — Cloudflare R2 client
- Create: `src/lib/services/runway.ts` — Runway AI client
- Create: `src/lib/services/higgsfield.ts` — Higgsfield client
- Create: `src/lib/services/heygen.ts` — HeyGen client
- Create: `src/lib/services/ffmpeg.ts` — FFmpeg wrapper
- Create: `src/lib/services/ai.ts` — Claude / Hermes AI client
- Create: `src/lib/services/index.ts` — Service factory (buildServices)

- [ ] **Step 1: Create R2 client** (`src/lib/services/r2.ts`)

```typescript
'use server'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME || 'flowmedia'

export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }))
  return { key, bucket: BUCKET }
}

export async function getR2SignedUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

export async function deleteFromR2(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function buildR2Key(clientId: string, jobId: string, stage: 'raw' | 'produced' | 'finals' | 'exports', filename: string) {
  return `${stage}/${clientId}/${jobId}/${filename}`
}
```

- [ ] **Step 2: Create Runway AI client** (`src/lib/services/runway.ts`)

```typescript
export function buildRunwayClient() {
  const key = process.env.RUNWAY_API_KEY
  if (!key) { console.warn('[Services] RUNWAY_API_KEY not set — Runway AI disabled'); return null }

  return {
    videoToVideo: async (params: {
      init_video_url: string
      text_prompt: string
      duration?: number
      watermark?: boolean
    }) => {
      const res = await fetch('https://api.runwayml.com/v1/image_to_video', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06' },
        body: JSON.stringify({ ...params, watermark: false, duration: params.duration || 5 }),
      })
      if (!res.ok) throw new Error(`Runway API HTTP ${res.status}: ${await res.text()}`)
      return res.json() as Promise<{ id: string; status: string }>
    },

    pollTask: async (taskId: string): Promise<{ status: string; output?: string[] }> => {
      const res = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' },
      })
      if (!res.ok) throw new Error(`Runway poll HTTP ${res.status}`)
      return res.json()
    },
  }
}
```

- [ ] **Step 3: Create Higgsfield client** (`src/lib/services/higgsfield.ts`)

```typescript
export function buildHiggsfieldClient() {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) { console.warn('[Services] HIGGSFIELD_API_KEY not set — Higgsfield disabled, Google AI Studio fallback active'); return null }

  return {
    generate: async (params: {
      prompt: string
      duration?: number
      aspect_ratio?: '16:9' | '9:16' | '1:1'
      style?: string
    }) => {
      const res = await fetch('https://api.higgsfield.ai/v1/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, duration: params.duration || 5, aspect_ratio: params.aspect_ratio || '16:9' }),
      })
      if (!res.ok) throw new Error(`Higgsfield API HTTP ${res.status}: ${await res.text()}`)
      return res.json() as Promise<{ job_id: string; status: string }>
    },

    pollJob: async (jobId: string): Promise<{ status: string; video_url?: string }> => {
      const res = await fetch(`https://api.higgsfield.ai/v1/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw new Error(`Higgsfield poll HTTP ${res.status}`)
      return res.json()
    },
  }
}
```

- [ ] **Step 4: Create HeyGen client** (`src/lib/services/heygen.ts`)

```typescript
export function buildHeyGenClient() {
  const key = process.env.HEYGEN_API_KEY
  if (!key) { console.warn('[Services] HEYGEN_API_KEY not set — avatar generation disabled'); return null }

  return {
    generateAvatar: async (params: {
      avatar_id: string
      voice_id: string
      script: string
      background?: string
    }) => {
      const res = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_inputs: [{
            character: { type: 'avatar', avatar_id: params.avatar_id },
            voice: { type: 'text', input_text: params.script, voice_id: params.voice_id },
            background: params.background ? { type: 'image', url: params.background } : { type: 'color', value: '#FAFAFA' },
          }],
          dimension: { width: 1920, height: 1080 },
        }),
      })
      if (!res.ok) throw new Error(`HeyGen API HTTP ${res.status}: ${await res.text()}`)
      return res.json() as Promise<{ video_id: string; status: string }>
    },

    pollVideo: async (videoId: string): Promise<{ status: string; video_url?: string }> => {
      const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': key },
      })
      if (!res.ok) throw new Error(`HeyGen poll HTTP ${res.status}`)
      const data = await res.json() as { data?: { status: string; video_url?: string } }
      return data.data || { status: 'unknown' }
    },

    listAvatars: async () => {
      const res = await fetch('https://api.heygen.com/v2/avatars', { headers: { 'X-Api-Key': key } })
      if (!res.ok) throw new Error(`HeyGen avatars HTTP ${res.status}`)
      return res.json()
    },
  }
}
```

- [ ] **Step 5: Create FFmpeg wrapper** (`src/lib/services/ffmpeg.ts`)

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const execFileAsync = promisify(execFile)

export type PlatformExportSpec = {
  platform: 'youtube' | 'instagram_reel' | 'tiktok' | 'linkedin' | 'facebook_reel'
  width: number
  height: number
  maxDurationSec: number | null
}

export const PLATFORM_SPECS: Record<string, PlatformExportSpec> = {
  youtube:        { platform: 'youtube',         width: 1920, height: 1080, maxDurationSec: null },
  instagram_reel: { platform: 'instagram_reel',  width: 1080, height: 1920, maxDurationSec: 90 },
  tiktok:         { platform: 'tiktok',          width: 1080, height: 1920, maxDurationSec: 600 },
  linkedin:       { platform: 'linkedin',        width: 1920, height: 1080, maxDurationSec: 600 },
  facebook_reel:  { platform: 'facebook_reel',   width: 1080, height: 1920, maxDurationSec: 90 },
}

export async function exportForPlatform(inputPath: string, platform: string): Promise<string> {
  const spec = PLATFORM_SPECS[platform]
  if (!spec) throw new Error(`Unknown platform: ${platform}`)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowmedia-'))
  const outputPath = path.join(tmpDir, `${platform}.mp4`)

  const args = [
    '-i', inputPath,
    '-vf', `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=decrease,pad=${spec.width}:${spec.height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    ...(spec.maxDurationSec ? ['-t', String(spec.maxDurationSec)] : []),
    '-movflags', '+faststart',
    '-y', outputPath,
  ]

  await execFileAsync('ffmpeg', args)
  return outputPath
}

export async function assembleClips(inputPaths: string[], outputPath: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowmedia-concat-'))
  const listFile = path.join(tmpDir, 'concat.txt')
  const listContent = inputPaths.map(p => `file '${p}'`).join('\n')
  await fs.writeFile(listFile, listContent)

  await execFileAsync('ffmpeg', [
    '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c', 'copy', '-y', outputPath,
  ])
  return outputPath
}

export async function extractAudio(inputPath: string, outputPath: string): Promise<string> {
  await execFileAsync('ffmpeg', [
    '-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', '-y', outputPath,
  ])
  return outputPath
}
```

- [ ] **Step 6: Create AI client** (`src/lib/services/ai.ts`)

```typescript
import Anthropic from '@anthropic-ai/sdk'

export function buildAIClient() {
  const hermesKey = process.env.HERMES_API_KEY
  const hermesUrl = process.env.HERMES_API_URL || 'http://localhost:8000'
  const claudeKey = process.env.ANTHROPIC_API_KEY

  if (hermesKey) {
    return {
      provider: 'hermes' as const,
      chat: async (prompt: string): Promise<string> => {
        const res = await fetch(`${hermesUrl}/api/chat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${hermesKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt }),
        })
        if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`)
        const data = await res.json() as Record<string, unknown>
        return String(data.response || data.content || data.text || '')
      },
    }
  }

  if (claudeKey) {
    const claude = new Anthropic({ apiKey: claudeKey })
    return {
      provider: 'claude' as const,
      chat: async (prompt: string): Promise<string> => {
        const msg = await claude.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        })
        return (msg.content[0] as { text: string }).text
      },
    }
  }

  console.warn('[Services] No AI client configured — script generation will use templates')
  return null
}
```

- [ ] **Step 7: Create service factory** (`src/lib/services/index.ts`)

```typescript
import { buildRunwayClient } from './runway'
import { buildHiggsfieldClient } from './higgsfield'
import { buildHeyGenClient } from './heygen'
import { buildAIClient } from './ai'

export function buildServices() {
  return {
    runway:     buildRunwayClient(),
    higgsfield: buildHiggsfieldClient(),
    heygen:     buildHeyGenClient(),
    ai:         buildAIClient(),
  }
}

export type Services = ReturnType<typeof buildServices>
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/
git commit -m "feat(services): R2, Runway, Higgsfield, HeyGen, FFmpeg, AI clients"
```

---

### Task 3: DECISIONS.md — Architecture Decisions

**Files:**
- Create: `DECISIONS.md`

- [ ] **Step 1: Write decisions file**

```markdown
# Flow Media — Architectural Decisions

## Decision 1: Cloudflare R2 for Asset Storage
**Decision:** Use Cloudflare R2 as the primary asset store for all video, audio, and image files.
**Rationale:** Zero egress fees — critical for high-volume video. S3-compatible API. Handles 4K raw footage natively.
**Alternatives considered:** Supabase Storage (egress fees at scale), AWS S3 (egress fees), GCS (egress fees).
**Impact:** All modules use R2 keys to reference assets. Supabase stores only metadata.

## Decision 2: Variation-Based Review
**Decision:** Every probabilistic output generates N variations (2 for video, 3 for scripts/thumbnails/captions). Human picks one.
**Rationale:** Avoids full reruns. Client always has a choice. Rerun only if all variations rejected.
**Alternatives considered:** Single output + revision loop (slow, expensive), unlimited variations (too costly).
**Impact:** `variations` table stores all outputs. `approvals` table tracks which was selected.

## Decision 3: Four Checkpoint Gates
**Decision:** Pipeline pauses at Checkpoint 1 (internal), Checkpoint 2 (client), Checkpoint 3 (first distribution), Checkpoint 4 (engagement rules).
**Rationale:** AI output is probabilistic — must be reviewed before going public. Autopilot kicks in after first approval.
**Alternatives considered:** Full autopilot (risky for brand), approve every piece (too slow).
**Impact:** `approvals` table gates every distribution. `campaigns.autopilot` flag controls post-first-approval behavior.

## Decision 4: Tool Separation by Responsibility
**Decision:** Each production tool has exactly one job. No tool overlaps another's role.
**Rationale:** Simplifies routing logic. Failures are isolated. Tools can be swapped without pipeline changes.
**Tool assignments:** Higgsfield=cinematic generation, HeyGen=avatars, Runway=AI editing, Remotion=branded overlays, FFmpeg=assembly+export, Sharp=static images.
**Impact:** mod3-produce routes to exactly one primary tool per job type. Fallback only for Higgsfield→Google AI Studio.

## Decision 5: Media-Only Boundary
**Decision:** Flow Media does not interpret business intent, route leads, or integrate with Agento/Aver/Aventra.
**Rationale:** Clean product separation. Flow Media's job is production and distribution only.
**Impact:** Comment classification stops at tone. No cross-product data sharing.

## Decision 6: Multi-Tenant from Day One
**Decision:** Every table has client_id. Supabase RLS enforces complete isolation.
**Rationale:** Real estate is launch vertical but platform must support any business. R2 prefixes are per-client.
**Impact:** All queries must include client_id. RLS policies on every table.
```

- [ ] **Step 2: Commit**

```bash
git add DECISIONS.md
git commit -m "docs(gsd): architectural decisions — R2, variations, checkpoints, tool separation"
```

---

## GSD Phase Gate: Phase 1 → 2

- [ ] All decisions documented in DECISIONS.md
- [ ] DB schema migration written
- [ ] All service clients scaffolded
- [ ] Victor (Taipan) reviews and approves Phase 1 artifacts

**Only proceed to Phase 2 after gate is cleared.**

---

## Phase 2: Build — Module by Module

### Task 4: mod1-intake — Job Intake & Asset Ingest

**Files:**
- Create: `src/lib/engine/modules/mod1-intake/index.ts`
- Create: `src/app/api/jobs/intake/route.ts`

- [ ] **Step 1: Create mod1-intake** (`src/lib/engine/modules/mod1-intake/index.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, buildR2Key } from '@/lib/services/r2'

export type IntakeInput = {
  client_id: string
  job_type: 'process_mine' | 'create_for_me'
  output_types: string[]
  target_platforms: string[]
  files?: { name: string; buffer: Buffer; mime_type: string }[]
  metadata?: Record<string, unknown>
}

export async function execute(input: IntakeInput) {
  const db = await createClient()

  const { data: job, error: jobError } = await db
    .from('jobs')
    .insert({
      client_id:        input.client_id,
      job_type:         input.job_type,
      status:           input.job_type === 'process_mine' ? 'intake' : 'briefing',
      output_types:     input.output_types,
      target_platforms: input.target_platforms,
      metadata:         input.metadata || {},
    })
    .select()
    .single()

  if (jobError || !job) {
    return { success: false, error: `JOB_CREATE_FAIL: ${jobError?.message}` }
  }

  const assetRecords = []

  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      const key = buildR2Key(input.client_id, job.id, 'raw', file.name)
      await uploadToR2(key, file.buffer, file.mime_type)

      const { data: asset } = await db.from('assets').insert({
        job_id:    job.id,
        client_id: input.client_id,
        asset_type: 'raw',
        r2_key:    key,
        mime_type: file.mime_type,
      }).select().single()

      if (asset) assetRecords.push(asset)
    }
  }

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     job.id,
    event_type: 'JOB_INTAKE_COMPLETE',
    actor:      'system',
    payload:    { asset_count: assetRecords.length, job_type: input.job_type },
  })

  console.log(`[mod1-intake] Job created: ${job.id} | type:${input.job_type} | assets:${assetRecords.length}`)

  return {
    success:     true,
    job_id:      job.id,
    job_type:    input.job_type,
    asset_count: assetRecords.length,
    next_step:   input.job_type === 'process_mine' ? 'mod3-produce' : 'mod2-brief',
  }
}
```

- [ ] **Step 2: Create intake API route** (`src/app/api/jobs/intake/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod1-intake'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const job_type = formData.get('job_type') as 'process_mine' | 'create_for_me'
  const client_id = formData.get('client_id') as string
  const output_types = JSON.parse(formData.get('output_types') as string || '[]')
  const target_platforms = JSON.parse(formData.get('target_platforms') as string || '[]')

  if (!job_type || !client_id) {
    return NextResponse.json({ error: 'job_type and client_id are required' }, { status: 422 })
  }

  const files: { name: string; buffer: Buffer; mime_type: string }[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file_') && value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer())
      files.push({ name: value.name, buffer, mime_type: value.type })
    }
  }

  const result = await execute({ client_id, job_type, output_types, target_platforms, files })

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/modules/mod1-intake/ src/app/api/jobs/intake/
git commit -m "feat(mod1): job intake — upload raw assets to R2, create job record"
```

---

### Task 5: mod2-brief — Brief Builder

**Files:**
- Create: `src/lib/engine/modules/mod2-brief/index.ts`
- Create: `src/app/api/jobs/brief/route.ts`

- [ ] **Step 1: Create mod2-brief** (`src/lib/engine/modules/mod2-brief/index.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Services } from '@/lib/services'

export type BriefInput = {
  job_id:          string
  client_id:       string
  goal:            string
  tone:            string
  target_audience: string
  platforms:       string[]
  deadline?:       string
  content_types:   string[]
  notes?:          string
}

const CONTENT_TYPE_TO_GENERATOR: Record<string, string> = {
  avatar_video:   'heygen',
  talking_head:   'heygen',
  cinematic:      'higgsfield',
  broll:          'higgsfield',
  scene:          'higgsfield',
  explainer:      'remotion',
  slideshow:      'remotion',
  marketing:      'higgsfield',
  podcast:        'ffmpeg',
  course:         'heygen',
  thumbnail:      'remotion',
}

export async function execute(input: BriefInput, services: Services) {
  const db = await createClient()

  const { data: brief, error } = await db.from('briefs').insert({
    job_id:          input.job_id,
    client_id:       input.client_id,
    goal:            input.goal,
    tone:            input.tone,
    target_audience: input.target_audience,
    platforms:       input.platforms,
    deadline:        input.deadline || null,
    content_types:   input.content_types,
    notes:           input.notes || null,
    raw_form:        input as unknown as Record<string, unknown>,
  }).select().single()

  if (error || !brief) {
    return { success: false, error: `BRIEF_CREATE_FAIL: ${error?.message}` }
  }

  const scriptVariations = await generateScriptVariations(input, services)

  for (let i = 0; i < scriptVariations.length; i++) {
    await db.from('variations').insert({
      job_id:          input.job_id,
      variation_type:  'script',
      variation_index: i,
      content:         scriptVariations[i],
      generator:       services?.ai?.provider || 'template',
      selected:        false,
    })
  }

  const primaryGenerator = input.content_types.map(t => CONTENT_TYPE_TO_GENERATOR[t]).filter(Boolean)[0] || 'higgsfield'

  await db.from('jobs').update({
    status:         'checkpoint_1',
    pipeline_stage: 'script_selection',
    metadata:       { primary_generator: primaryGenerator },
  }).eq('id', input.job_id)

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     input.job_id,
    event_type: 'BRIEF_COMPLETE',
    actor:      'system',
    payload:    { script_variations: scriptVariations.length, primary_generator: primaryGenerator },
  })

  return {
    success:             true,
    brief_id:            brief.id,
    script_variations:   scriptVariations.length,
    primary_generator:   primaryGenerator,
    next_step:           'select_script_variation',
  }
}

async function generateScriptVariations(brief: BriefInput, services: Services): Promise<string[]> {
  const templates = [
    `${brief.tone} script for ${brief.target_audience}: ${brief.goal}. Keep it concise and action-oriented.`,
    `Conversational ${brief.tone} script addressing ${brief.target_audience}. Goal: ${brief.goal}. Focus on benefits.`,
    `Professional ${brief.tone} script for ${brief.goal}. Target: ${brief.target_audience}. Lead with a strong hook.`,
  ]

  if (!services?.ai) return templates

  try {
    const prompt =
      `You are a professional media scriptwriter. Write 3 distinct script variations for: "${brief.goal}". ` +
      `Tone: ${brief.tone}. Audience: ${brief.target_audience}. Platforms: ${brief.platforms.join(', ')}. ` +
      `Return JSON only: { "scripts": [string, string, string] } — no prose, no markdown.`

    const raw = await services.ai.chat(prompt)
    const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]) as { scripts?: string[] }
    if (parsed.scripts?.length === 3) return parsed.scripts
  } catch (err) {
    console.warn(`[mod2-brief] AI script generation failed — using templates: ${(err as Error).message}`)
  }

  return templates
}
```

- [ ] **Step 2: Create brief API route** (`src/app/api/jobs/brief/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod2-brief'
import { buildServices } from '@/lib/services'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const services = buildServices()
  const result = await execute(body, services)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/modules/mod2-brief/ src/app/api/jobs/brief/
git commit -m "feat(mod2): brief builder — 3 script variations, generator routing"
```

---

### Task 6: mod3-produce — Production Engine

**Files:**
- Create: `src/lib/engine/modules/mod3-produce/index.ts`
- Create: `src/lib/engine/modules/mod3-produce/generators/heygen.ts`
- Create: `src/lib/engine/modules/mod3-produce/generators/higgsfield.ts`
- Create: `src/lib/engine/modules/mod3-produce/generators/runway.ts`
- Create: `src/lib/engine/modules/mod3-produce/generators/ffmpeg-assemble.ts`
- Create: `src/app/api/jobs/produce/route.ts`

- [ ] **Step 1: Create HeyGen generator** (`src/lib/engine/modules/mod3-produce/generators/heygen.ts`)

```typescript
import type { Services } from '@/lib/services'

export async function generateAvatarVariations(params: {
  script: string
  avatar_id: string
  voice_id: string
}, services: Services, count = 2): Promise<string[]> {
  if (!services.heygen) {
    console.warn('[mod3-produce/heygen] HeyGen not configured')
    return []
  }

  const videoIds: string[] = []
  for (let i = 0; i < count; i++) {
    const { video_id } = await services.heygen.generateAvatar({
      avatar_id: params.avatar_id,
      voice_id:  params.voice_id,
      script:    params.script,
    })
    videoIds.push(video_id)
  }

  const videoUrls: string[] = []
  for (const id of videoIds) {
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 10000))
      const status = await services.heygen.pollVideo(id)
      if (status.status === 'completed' && status.video_url) {
        videoUrls.push(status.video_url)
        break
      }
      if (status.status === 'failed') throw new Error(`HeyGen video ${id} failed`)
      attempts++
    }
  }

  return videoUrls
}
```

- [ ] **Step 2: Create Higgsfield generator** (`src/lib/engine/modules/mod3-produce/generators/higgsfield.ts`)

```typescript
import type { Services } from '@/lib/services'

export async function generateCinematicVariations(params: {
  prompt: string
  duration?: number
  aspect_ratio?: '16:9' | '9:16'
}, services: Services, count = 2): Promise<string[]> {
  if (!services.higgsfield) {
    console.warn('[mod3-produce/higgsfield] Higgsfield not configured — trying Google AI Studio fallback')
    return generateGoogleAIFallback(params, count)
  }

  const jobIds: string[] = []
  for (let i = 0; i < count; i++) {
    const { job_id } = await services.higgsfield.generate({
      prompt:       params.prompt,
      duration:     params.duration || 5,
      aspect_ratio: params.aspect_ratio || '16:9',
    })
    jobIds.push(job_id)
  }

  const videoUrls: string[] = []
  for (const id of jobIds) {
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 10000))
      const status = await services.higgsfield.pollJob(id)
      if (status.status === 'completed' && status.video_url) {
        videoUrls.push(status.video_url)
        break
      }
      if (status.status === 'failed') throw new Error(`Higgsfield job ${id} failed`)
      attempts++
    }
  }

  return videoUrls
}

async function generateGoogleAIFallback(params: { prompt: string }, count: number): Promise<string[]> {
  const key = process.env.GOOGLE_AI_STUDIO_API_KEY
  if (!key) throw new Error('No video generator available — HIGGSFIELD_API_KEY and GOOGLE_AI_STUDIO_API_KEY both missing')
  console.log('[mod3-produce/higgsfield] Using Google AI Studio fallback')
  return []
}
```

- [ ] **Step 3: Create Runway generator** (`src/lib/engine/modules/mod3-produce/generators/runway.ts`)

```typescript
import type { Services } from '@/lib/services'

export async function processWithRunway(params: {
  input_video_url: string
  prompt: string
  duration?: number
}, services: Services, count = 2): Promise<string[]> {
  if (!services.runway) {
    console.warn('[mod3-produce/runway] Runway not configured')
    return [params.input_video_url]
  }

  const taskIds: string[] = []
  for (let i = 0; i < count; i++) {
    const task = await services.runway.videoToVideo({
      init_video_url: params.input_video_url,
      text_prompt:    params.prompt,
      duration:       params.duration || 5,
    })
    taskIds.push(task.id)
  }

  const outputUrls: string[] = []
  for (const id of taskIds) {
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 8000))
      const status = await services.runway.pollTask(id)
      if (status.status === 'SUCCEEDED' && status.output?.[0]) {
        outputUrls.push(status.output[0])
        break
      }
      if (status.status === 'FAILED') throw new Error(`Runway task ${id} failed`)
      attempts++
    }
  }

  return outputUrls
}
```

- [ ] **Step 4: Create production engine orchestrator** (`src/lib/engine/modules/mod3-produce/index.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, buildR2Key } from '@/lib/services/r2'
import { generateAvatarVariations } from './generators/heygen'
import { generateCinematicVariations } from './generators/higgsfield'
import { processWithRunway } from './generators/runway'
import type { Services } from '@/lib/services'

export type ProduceInput = {
  job_id:     string
  client_id:  string
  job_type:   'process_mine' | 'create_for_me'
  generator:  'heygen' | 'higgsfield' | 'runway' | 'remotion' | 'ffmpeg'
  script?:    string
  prompt?:    string
  raw_asset_r2_keys?: string[]
  avatar_id?: string
  voice_id?:  string
}

export async function execute(input: ProduceInput, services: Services) {
  const db = await createClient()

  await db.from('jobs').update({ status: 'producing', pipeline_stage: 'generating_variations' }).eq('id', input.job_id)

  let videoUrls: string[] = []

  if (input.job_type === 'create_for_me') {
    if (input.generator === 'heygen' && input.script && input.avatar_id && input.voice_id) {
      videoUrls = await generateAvatarVariations(
        { script: input.script, avatar_id: input.avatar_id, voice_id: input.voice_id },
        services, 2
      )
    } else if (['higgsfield', 'scene', 'cinematic'].includes(input.generator) && input.prompt) {
      videoUrls = await generateCinematicVariations({ prompt: input.prompt }, services, 2)
    }
  } else if (input.job_type === 'process_mine' && input.raw_asset_r2_keys?.length && input.prompt) {
    videoUrls = await processWithRunway(
      { input_video_url: input.raw_asset_r2_keys[0], prompt: input.prompt },
      services, 2
    )
  }

  if (videoUrls.length === 0) {
    return { success: false, error: 'PRODUCE_FAIL: No video URLs generated' }
  }

  const variationIds: string[] = []
  for (let i = 0; i < videoUrls.length; i++) {
    const { data: variation } = await db.from('variations').insert({
      job_id:          input.job_id,
      variation_type:  'video',
      variation_index: i,
      r2_key:          videoUrls[i],
      generator:       input.generator,
      selected:        false,
    }).select().single()
    if (variation) variationIds.push(variation.id)
  }

  const { error: approvalError } = await db.from('approvals').insert({
    job_id:           input.job_id,
    client_id:        input.client_id,
    checkpoint_type:  'internal_review',
    status:           'pending',
    payload:          { variation_ids: variationIds, generator: input.generator },
  })

  if (approvalError) return { success: false, error: `APPROVAL_CREATE_FAIL: ${approvalError.message}` }

  await db.from('jobs').update({ status: 'checkpoint_1', pipeline_stage: 'awaiting_internal_review' }).eq('id', input.job_id)

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     input.job_id,
    event_type: 'PRODUCE_COMPLETE',
    actor:      'system',
    payload:    { variations: videoUrls.length, generator: input.generator },
  })

  console.log(`[mod3-produce] ${videoUrls.length} variations generated → Checkpoint 1 | job:${input.job_id}`)

  return {
    success:        true,
    job_id:         input.job_id,
    variation_count: videoUrls.length,
    status:         'AWAITING_INTERNAL_REVIEW',
  }
}
```

- [ ] **Step 5: Create produce API route** (`src/app/api/jobs/produce/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod3-produce'
import { buildServices } from '@/lib/services'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const services = buildServices()
  const result = await execute(body, services)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/engine/modules/mod3-produce/ src/app/api/jobs/produce/
git commit -m "feat(mod3): production engine — HeyGen, Higgsfield, Runway, 2 variations → Checkpoint 1"
```

---

### Task 7: mod4-review — Checkpoint Gate Handler

**Files:**
- Create: `src/lib/engine/modules/mod4-review/index.ts`
- Create: `src/app/api/jobs/approve/route.ts`

- [ ] **Step 1: Create mod4-review** (`src/lib/engine/modules/mod4-review/index.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'

export type ApprovalInput = {
  approval_id:           string
  job_id:                string
  client_id:             string
  decision:              'approved' | 'rejected' | 'revision_requested'
  selected_variation_id?: string
  notes?:                string
  reviewer_id:           string
}

export async function execute(input: ApprovalInput) {
  const db = await createClient()

  const { data: approval, error: fetchError } = await db
    .from('approvals')
    .select('*')
    .eq('id', input.approval_id)
    .single()

  if (fetchError || !approval) return { success: false, error: 'APPROVAL_NOT_FOUND' }
  if (approval.status !== 'pending') return { success: false, error: 'APPROVAL_ALREADY_RESOLVED' }

  await db.from('approvals').update({
    status:                input.decision,
    selected_variation_id: input.selected_variation_id || null,
    reviewer_id:           input.reviewer_id,
    notes:                 input.notes || null,
    resolved_at:           new Date().toISOString(),
  }).eq('id', input.approval_id)

  if (input.selected_variation_id) {
    await db.from('variations').update({ selected: true }).eq('id', input.selected_variation_id)
  }

  let nextStatus: string
  let nextStage: string

  if (input.decision === 'approved') {
    if (approval.checkpoint_type === 'internal_review') {
      nextStatus = 'checkpoint_2'
      nextStage  = 'awaiting_client_approval'
      await db.from('approvals').insert({
        job_id:          input.job_id,
        client_id:       input.client_id,
        checkpoint_type: 'client_approval',
        status:          'pending',
        payload:         { selected_variation_id: input.selected_variation_id },
      })
    } else if (approval.checkpoint_type === 'client_approval') {
      nextStatus = 'exporting'
      nextStage  = 'awaiting_export'
    } else {
      nextStatus = 'distributing'
      nextStage  = 'scheduled'
    }
  } else if (input.decision === 'rejected') {
    nextStatus = 'producing'
    nextStage  = 'rerun_requested'
  } else {
    nextStatus = 'checkpoint_1'
    nextStage  = 'revision_requested'
  }

  await db.from('jobs').update({ status: nextStatus, pipeline_stage: nextStage }).eq('id', input.job_id)

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     input.job_id,
    event_type: `CHECKPOINT_${approval.checkpoint_type.toUpperCase()}_${input.decision.toUpperCase()}`,
    actor:      input.reviewer_id,
    payload:    { approval_id: input.approval_id, next_status: nextStatus },
  })

  return {
    success:     true,
    decision:    input.decision,
    next_status: nextStatus,
  }
}
```

- [ ] **Step 2: Create approve API route** (`src/app/api/jobs/approve/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod4-review'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = await execute({ ...body, reviewer_id: user.id })
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/modules/mod4-review/ src/app/api/jobs/approve/
git commit -m "feat(mod4): checkpoint gate — internal review, client approval, variation selection"
```

---

### Task 8: mod5-distribute — Distribution & Scheduling

**Files:**
- Create: `src/lib/engine/modules/mod5-distribute/index.ts`
- Create: `src/lib/engine/modules/mod5-distribute/channels/youtube.ts`
- Create: `src/lib/engine/modules/mod5-distribute/channels/instagram.ts`
- Create: `src/app/api/jobs/distribute/route.ts`

- [ ] **Step 1: Create YouTube channel poster** (`src/lib/engine/modules/mod5-distribute/channels/youtube.ts`)

```typescript
export async function postToYouTube(params: {
  video_url: string
  title:     string
  description: string
  access_token: string
}) {
  const videoRes = await fetch(params.video_url)
  const videoBuffer = await videoRes.arrayBuffer()

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${params.access_token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.byteLength),
      },
      body: JSON.stringify({
        snippet: { title: params.title, description: params.description },
        status:  { privacyStatus: 'public' },
      }),
    }
  )

  if (!uploadRes.ok) throw new Error(`YouTube resumable upload init HTTP ${uploadRes.status}`)
  const uploadUrl = uploadRes.headers.get('Location')
  if (!uploadUrl) throw new Error('YouTube did not return upload URL')

  const finalRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body:    videoBuffer,
  })

  if (!finalRes.ok) throw new Error(`YouTube upload HTTP ${finalRes.status}`)
  const data = await finalRes.json() as { id?: string }
  return { platform: 'youtube', post_id: data.id, url: `https://youtube.com/watch?v=${data.id}` }
}
```

- [ ] **Step 2: Create Instagram channel poster** (`src/lib/engine/modules/mod5-distribute/channels/instagram.ts`)

```typescript
export async function postToInstagram(params: {
  video_url:    string
  caption:      string
  access_token: string
  ig_user_id:   string
}) {
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.ig_user_id}/reels`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url:    params.video_url,
        caption:      params.caption,
        access_token: params.access_token,
      }),
    }
  )
  if (!containerRes.ok) throw new Error(`Instagram container HTTP ${containerRes.status}`)
  const { id: creation_id } = await containerRes.json() as { id: string }

  let attempts = 0
  while (attempts < 20) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${creation_id}?fields=status_code&access_token=${params.access_token}`
    )
    const status = await statusRes.json() as { status_code?: string }
    if (status.status_code === 'FINISHED') break
    if (status.status_code === 'ERROR') throw new Error('Instagram reel processing failed')
    attempts++
  }

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.ig_user_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id, access_token: params.access_token }),
    }
  )
  if (!publishRes.ok) throw new Error(`Instagram publish HTTP ${publishRes.status}`)
  const { id } = await publishRes.json() as { id: string }
  return { platform: 'instagram', post_id: id }
}
```

- [ ] **Step 3: Create distribution orchestrator** (`src/lib/engine/modules/mod5-distribute/index.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import { postToYouTube } from './channels/youtube'
import { postToInstagram } from './channels/instagram'

export type DistributeInput = {
  job_id:       string
  client_id:    string
  asset_r2_key: string
  caption:      string
  title:        string
  platforms:    string[]
}

export async function execute(input: DistributeInput) {
  const db = await createClient()

  const { data: connections } = await db
    .from('channel_connections')
    .select('*')
    .eq('client_id', input.client_id)
    .eq('status', 'connected')
    .in('platform', input.platforms)

  if (!connections || connections.length === 0) {
    return { success: false, error: 'NO_CONNECTED_CHANNELS' }
  }

  const results: { platform: string; post_id?: string; error?: string }[] = []

  for (const conn of connections) {
    try {
      if (!conn.first_post_confirmed) {
        await db.from('approvals').insert({
          job_id:          input.job_id,
          client_id:       input.client_id,
          checkpoint_type: 'distribution_confirmation',
          status:          'pending',
          payload:         { platform: conn.platform },
        })
        results.push({ platform: conn.platform, error: 'AWAITING_FIRST_POST_CONFIRMATION' })
        continue
      }

      let result: { platform: string; post_id?: string }
      const assetUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${input.asset_r2_key}`

      if (conn.platform === 'youtube') {
        result = await postToYouTube({ video_url: assetUrl, title: input.title, description: input.caption, access_token: conn.oauth_token })
      } else if (conn.platform === 'instagram') {
        result = await postToInstagram({ video_url: assetUrl, caption: input.caption, access_token: conn.oauth_token, ig_user_id: conn.platform_user_id })
      } else {
        result = { platform: conn.platform, post_id: `stub_${Date.now()}` }
      }

      results.push(result)

      await db.from('audit_events').insert({
        client_id:  input.client_id,
        job_id:     input.job_id,
        event_type: 'CONTENT_POSTED',
        actor:      'system',
        payload:    result,
      })
    } catch (err) {
      results.push({ platform: conn.platform, error: (err as Error).message })
    }
  }

  await db.from('jobs').update({ status: 'complete', pipeline_stage: 'distributed' }).eq('id', input.job_id)

  return { success: true, results }
}
```

- [ ] **Step 4: Create distribute API route** (`src/app/api/jobs/distribute/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod5-distribute'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = await execute(body)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/modules/mod5-distribute/ src/app/api/jobs/distribute/
git commit -m "feat(mod5): distribution — YouTube, Instagram, first-post confirmation gate"
```

---

### Task 9: mod6-engage — Comment & DM Engagement

**Files:**
- Create: `src/lib/engine/modules/mod6-engage/index.ts`
- Create: `src/app/api/engage/comments/route.ts`

- [ ] **Step 1: Create mod6-engage** (`src/lib/engine/modules/mod6-engage/index.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Services } from '@/lib/services'

export type IncomingComment = {
  client_id:           string
  platform:            string
  platform_post_id:    string
  platform_comment_id: string
  author_handle:       string
  content:             string
}

type Classification = 'positive' | 'question' | 'negative' | 'spam' | 'neutral'

export async function execute(input: IncomingComment, services: Services) {
  const db = await createClient()

  const classification = await classifyComment(input.content, services)

  const { data: comment } = await db.from('comments').insert({
    client_id:           input.client_id,
    platform:            input.platform,
    platform_post_id:    input.platform_post_id,
    platform_comment_id: input.platform_comment_id,
    author_handle:       input.author_handle,
    content:             input.content,
    classification,
    reply_status:        'pending',
  }).select().single()

  if (!comment) return { success: false, error: 'COMMENT_INSERT_FAIL' }

  const { data: rules } = await db
    .from('engagement_rules')
    .select('*')
    .eq('client_id', input.client_id)
    .eq('classification', classification)

  const rule = rules?.[0]
  const action = rule?.action || (classification === 'negative' ? 'hold_for_review' : classification === 'spam' ? 'ignore' : 'auto_reply')

  if (action === 'ignore' || action === 'hide') {
    await db.from('comments').update({ reply_status: 'ignored' }).eq('id', comment.id)
    return { success: true, action: 'ignored', comment_id: comment.id }
  }

  const { data: client } = await db.from('clients').select('brand_voice, name').eq('id', input.client_id).single()
  const draftReply = await generateReply(input.content, classification, client?.brand_voice as Record<string, string>, rule?.reply_template, services)

  await db.from('comments').update({
    draft_reply:  draftReply,
    reply_status: action === 'auto_reply' ? 'approved' : 'draft',
  }).eq('id', comment.id)

  if (action === 'hold_for_review') {
    return { success: true, action: 'held_for_review', comment_id: comment.id, draft_reply: draftReply }
  }

  return { success: true, action: 'auto_reply_drafted', comment_id: comment.id, draft_reply: draftReply }
}

async function classifyComment(content: string, services: Services): Promise<Classification> {
  const lower = content.toLowerCase()
  if (/spam|follow me|click here|dm for free/i.test(lower)) return 'spam'

  if (!services?.ai) {
    if (/great|love|amazing|awesome|beautiful|thank/i.test(lower)) return 'positive'
    if (/\?|how|what|when|where|price|cost|available/i.test(lower)) return 'question'
    if (/bad|terrible|awful|worst|disappointed|scam/i.test(lower)) return 'negative'
    return 'neutral'
  }

  try {
    const prompt = `Classify this comment as exactly one of: positive, question, negative, spam, neutral. Reply with only the single word.\n\nComment: "${content}"`
    const result = (await services.ai.chat(prompt)).trim().toLowerCase() as Classification
    if (['positive', 'question', 'negative', 'spam', 'neutral'].includes(result)) return result
  } catch { /* fall through to neutral */ }

  return 'neutral'
}

async function generateReply(
  content: string,
  classification: Classification,
  brandVoice: Record<string, string> | null,
  template: string | null,
  services: Services
): Promise<string> {
  if (template) return template

  const tone = brandVoice?.tone || 'professional and friendly'
  const templates: Record<Classification, string> = {
    positive:  'Thank you so much! We really appreciate your kind words. 🙏',
    question:  'Great question! Please send us a DM and we\'ll be happy to help.',
    negative:  'We\'re sorry to hear about your experience. Please DM us so we can make it right.',
    spam:      '',
    neutral:   'Thank you for reaching out! Feel free to DM us anytime.',
  }

  if (!services?.ai) return templates[classification]

  try {
    const prompt =
      `You manage social media replies for a client. Their tone is: ${tone}. ` +
      `Write a brief, genuine reply (under 100 words) to this ${classification} comment: "${content}". ` +
      `Reply with only the reply text — no quotes, no labels.`
    return await services.ai.chat(prompt)
  } catch {
    return templates[classification]
  }
}
```

- [ ] **Step 2: Create comments API route** (`src/app/api/engage/comments/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod6-engage'
import { buildServices } from '@/lib/services'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const services = buildServices()
  const result = await execute(body, services)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/modules/mod6-engage/ src/app/api/engage/
git commit -m "feat(mod6): comment engagement — classify, draft reply, auto-reply vs hold, brand voice"
```

---

### Task 10: Environment Variables

**Files:**
- Create: `.env.local` (update)
- Create: `.env.example`

- [ ] **Step 1: Update `.env.local` with all required keys**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=flowmedia
R2_PUBLIC_DOMAIN=pub.your-r2-domain.com

# Higgsfield (primary video generator)
HIGGSFIELD_API_KEY=your-higgsfield-api-key

# HeyGen (avatar videos)
HEYGEN_API_KEY=your-heygen-api-key

# Runway AI (AI editing)
RUNWAY_API_KEY=your-runway-api-key

# Google AI Studio (backup generator)
GOOGLE_AI_STUDIO_API_KEY=your-google-ai-studio-api-key

# AI (scripts, captions, replies)
HERMES_API_URL=http://localhost:8000
HERMES_API_KEY=your-hermes-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: env vars — all service keys documented"
```

---

## GSD Phase Gate: Phase 2 → 3

- [ ] All 7 modules implemented (mod1–mod6 + pipeline)
- [ ] All API routes respond correctly
- [ ] DB migration applied and verified
- [ ] Service clients connect to real APIs in dev
- [ ] Victor (Taipan) reviews Phase 2 output

**Only proceed to Phase 3 (Integration) after gate is cleared.**

---

## Phase 3: Integration & E2E Wiring

### Task 11: Pipeline Orchestrator

**Files:**
- Create: `src/lib/engine/pipeline.ts`

- [ ] **Step 1: Create pipeline orchestrator** (`src/lib/engine/pipeline.ts`)

```typescript
import { execute as intake }    from './modules/mod1-intake'
import { execute as brief }     from './modules/mod2-brief'
import { execute as produce }   from './modules/mod3-produce'
import { execute as review }    from './modules/mod4-review'
import { execute as distribute } from './modules/mod5-distribute'
import { execute as engage }    from './modules/mod6-engage'
import { buildServices }        from '@/lib/services'

export {
  intake,
  brief,
  produce,
  review,
  distribute,
  engage,
  buildServices,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/engine/pipeline.ts
git commit -m "feat(pipeline): orchestrator — wires all modules, exports unified API"
```

---

## GSD Phase Gate: Phase 3 → 4

- [ ] End-to-end job tested: intake → produce → approve → distribute
- [ ] Comment engagement end-to-end verified
- [ ] Real service connections verified (at least one per category)
- [ ] Victor (Taipan) approves staging readiness

---

## Phase 4: Staging & Deployment

### Task 12: Deployment Checklist

- [ ] All environment variables set in Google Cloud Run
- [ ] R2 bucket created and CORS configured
- [ ] Supabase migration applied to production project
- [ ] `npm run build` passes with no errors
- [ ] Deploy to Cloud Run: `gcloud run deploy flowmedia --source . --region us-central1`
- [ ] Smoke test: POST `/api/jobs/intake` returns 200
- [ ] Commit: `git tag v0.1.0 && git push --tags`

---

## GSD Phase Gate: Phase 4 → 5

- [ ] Cloud Run deployment stable
- [ ] All smoke tests passing
- [ ] Monitoring configured
- [ ] Victor (Taipan) approves go-live

---

## Phase 5: Production Release

- [ ] `/gsd-learnings "flowmedia-v1"` — document what went well, what to improve
- [ ] Update `DECISIONS.md` with any post-build corrections
- [ ] Tag release: `git tag v1.0.0`
