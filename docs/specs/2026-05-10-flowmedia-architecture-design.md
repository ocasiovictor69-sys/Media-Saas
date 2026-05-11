# Flow Media — Architecture Design Spec

**Date:** 2026-05-10  
**Status:** Approved for implementation planning  
**Author:** TomorrowNow AI

---

## 1. Product Overview

Flow Media is a full-service AI-powered media production and distribution SaaS. It accepts raw client assets or a creative brief, produces finished media content, and distributes it automatically across all connected channels. It also manages post-distribution engagement (comments, replies) on behalf of the client.

**Two modes of operation:**
- **"Process Mine"** — client uploads raw footage, audio, or photos; Flow edits and distributes
- **"Create For Me"** — client submits a brief; Flow generates content from scratch

**Launch vertical:** Real estate agents and brokers  
**Future:** Any business — fully multi-tenant

---

## 2. Core Principles

- **AI-first, human-gated** — AI does the creative work; humans approve before anything goes public
- **Variation-based review** — every probabilistic output generates multiple variations; human picks one
- **Autopilot after first approval** — client approves the first piece per campaign; automation runs the rest
- **Tool-agnostic pipeline** — each production tool has one job; orchestrator routes between them
- **Media only** — Flow Media produces and distributes content; business decisions belong to the client

---

## 3. Module Map

| Module | Name | Type | Checkpoint |
|--------|------|------|------------|
| `mod1-intake` | Job Intake & Asset Ingest | Deterministic | None |
| `mod2-brief` | Brief Builder | Deterministic | None |
| `mod3-produce` | Production Engine | Probabilistic | ✅ Checkpoint 1 (internal) |
| `mod4-review` | Client Review Gate | Probabilistic | ✅ Checkpoint 2 (client) |
| `mod5-distribute` | Distribution & Scheduling | Deterministic | ✅ Checkpoint 3 (first post only) |
| `mod6-engage` | Comment & DM Engagement | Probabilistic | ✅ Checkpoint 4 (rule-based) |
| `mod7-persist` | Asset Library & Analytics | Deterministic | None |

---

## 4. Production Workflow

### 4A — "Process Mine" (raw assets in)

```
1. INGEST      → Client uploads raw video / audio / photos → stored in Cloudflare R2
2. AI EDIT     → Runway AI — cleanup, effects, style transfer, background removal
3. ASSEMBLE    → FFmpeg — cuts, trims, audio sync, intro/outro, format conversion
4. BRAND       → Remotion — logo, lower thirds, captions, branded transitions, thumbnails
5. EXPORT      → FFmpeg — render platform-specific versions (Reel, YouTube, TikTok, LinkedIn, etc.)
6. CHECKPOINT 1 → Flow Media internal review — picks best variation or flags for redo
7. CHECKPOINT 2 → Client approves — selects from variations, requests revision, or approves
8. DISTRIBUTE  → mod5-distribute posts to connected channels on client schedule
```

### 4B — "Create For Me" (brief in)

```
1. BRIEF       → Client fills brief builder wizard
2. SCRIPT      → AI generates 3 script variations → client picks one
3. GENERATE    → Job type routes to engine:
                   Avatar / talking head  → HeyGen (2 variations)
                   Cinematic / B-roll     → Higgsfield (2 variations)
                   Explainer / slideshow  → Remotion (2 variations)
                   Scene generation       → Higgsfield or Runway AI (2 variations)
                   Podcast                → FFmpeg audio edit (2 variations)
                   Backup generation      → Google AI Studio
4. ASSEMBLE    → FFmpeg — stitch generated assets
5. BRAND       → Remotion — logo, captions, branded overlays, thumbnail (3 variations)
6. EXPORT      → FFmpeg — platform-specific renders
7. CHECKPOINT 1 → Flow Media internal review
8. CHECKPOINT 2 → Client approves
9. DISTRIBUTE  → mod5-distribute
```

---

## 5. Production Tool Stack

| Tool | Single Responsibility |
|------|-----------------------|
| **Higgsfield** | Cinematic video generation, B-roll, scene generation (primary) |
| **HeyGen** | AI avatar creation, digital twin, talking-head videos |
| **Runway AI** | AI editing, visual effects, video-to-video transformation |
| **Remotion** | Branded overlays, explainers, motion graphics, thumbnails |
| **FFmpeg** | Assembly, audio processing, format conversion, final render, podcasts |
| **Sharp** | Static image processing, thumbnail compositing |
| **Google AI Studio** | Backup generator when Higgsfield is unavailable |

**Human override lane:** A Flow Media team member may use Premiere Pro for fully custom manual edits, uploading the final render back into the pipeline. Not a platform dependency — optional escalation path only.

---

## 6. Variation Generation Policy

Every probabilistic output generates N variations. The reviewer picks one. A full rerun only occurs if all variations are rejected.

| Output Type | Variations | Generator |
|-------------|-----------|-----------|
| Video renders | **2** | Higgsfield / HeyGen / Runway |
| Scripts | **3** | AI (Claude / Hermes) |
| Thumbnails | **3** | Remotion + AI prompt |
| B-roll sequences | **2** | Runway / Higgsfield |
| Captions & hashtags | **3** | AI |
| Avatar videos | **2** | HeyGen |

> Variation counts are configurable per client tier and can be adjusted post-launch.

---

## 7. Checkpoint Gates

### Checkpoint 1 — Internal Production Review
- **Who:** Flow Media team member
- **Triggered:** After mod3-produce completes
- **Action:** Review all variations, pick best, or reject all (triggers rerun with adjusted params)
- **Why:** AI generation is probabilistic — quality gate before client sees anything

### Checkpoint 2 — Client Approval
- **Who:** Client
- **Triggered:** After Checkpoint 1 passes
- **First piece:** Always requires explicit client approval
- **Subsequent pieces:** Autopilot — client can pause at any time
- **Client can:** Pick a different variation, request revision, or approve as-is

### Checkpoint 3 — Distribution Confirmation
- **Who:** Client
- **Triggered:** Before first post on each newly connected channel
- **Action:** Client confirms schedule, posting time, caption, hashtags
- **After confirmation:** Fully automated on defined schedule

### Checkpoint 4 — Engagement Rules Gate
- **Who:** Client (rule configuration) + AI (execution)
- **Triggered:** On each incoming comment or DM
- **Action:** AI classifies tone, drafts reply in brand voice, applies client rules
- **Auto-reply:** Positive, questions, compliments — based on client rules
- **Hold for review:** Negative, complaints, sensitive topics
- **Ignore/hide:** Spam

---

## 8. Comment & DM Engagement (mod6-engage)

Flow Media monitors and responds to comments on all connected channels on behalf of the client. It does not interpret business intent — it manages the conversation only.

**Comment classification:**
- `positive` — compliment, praise → auto-reply with brand voice
- `question` — product/service question → auto-reply or hold (client rule)
- `negative` — complaint, criticism → hold for client review
- `spam` → ignore or hide
- `neutral` → auto-reply or ignore (client rule)

**Client onboarding for engagement:**
1. Set brand voice (tone, vocabulary, phrases to avoid)
2. Set auto-reply rules per classification
3. Set review threshold (e.g. "always show me negatives")
4. Approve first 5 AI-drafted replies to train tone

---

## 9. Distribution Channels

Channels are connected per client via OAuth. Flow Media supports:

**Social:**
- Instagram (Reels, Feed, Stories)
- TikTok
- YouTube (Shorts + long-form)
- Facebook (Reels, Feed)
- LinkedIn

**Professional / Real Estate:**
- Agent website embed (via iframe or CDN link)
- Email / newsletter (video thumbnail + link)
- MLS / Zillow / Realtor.com (link embed — no direct API at launch)

**Platform export specs (handled by FFmpeg):**

| Platform | Resolution | Format | Max Duration |
|----------|------------|--------|-------------|
| YouTube | 1920×1080 | MP4 H.264 | Unlimited |
| Instagram Reel | 1080×1920 | MP4 | 90 sec |
| TikTok | 1080×1920 | MP4 | 10 min |
| LinkedIn | 1920×1080 | MP4 | 10 min |
| Facebook Reel | 1080×1920 | MP4 | 90 sec |

---

## 10. Storage Architecture

**Primary:** Cloudflare R2  
- Zero egress fees — critical for high-volume video files
- Handles large files (4K raw footage) natively
- S3-compatible API — standard SDK

**Asset lifecycle:**
- Raw uploads → R2 `/raw/{client_id}/{job_id}/`
- Production outputs (all variations) → R2 `/produced/{client_id}/{job_id}/`
- Approved finals → R2 `/finals/{client_id}/{job_id}/`
- Platform exports → R2 `/exports/{client_id}/{job_id}/{platform}/`

**Metadata + job state:** Supabase (PostgreSQL)  
**Auth + RLS:** Supabase Auth — full multi-tenant isolation per client

---

## 11. Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `jobs` | All intake jobs — type, status, pipeline stage, client_id |
| `assets` | All uploaded and generated files — R2 key, type, job_id |
| `variations` | All generated variations per job step — selected flag |
| `briefs` | Brief builder submissions for "Create For Me" jobs |
| `campaigns` | Campaign definition — schedule, channels, autopilot flag |
| `approvals` | Checkpoint approval queue — same pattern as Agento |
| `channel_connections` | OAuth tokens per client per platform |
| `engagement_rules` | Client's comment reply rules and brand voice config |
| `comments` | Incoming comments — classified, reply status |
| `audit_events` | Full event log — every state transition |

---

## 12. Multi-Tenant Architecture

- Every table includes `client_id` (foreign key to `clients`)
- Supabase RLS policies enforce complete data isolation — no client sees another's data
- Channel OAuth tokens encrypted at rest
- Separate R2 prefixes per client

---

## 13. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Storage | Cloudflare R2 |
| Video generation | Higgsfield, HeyGen, Runway AI, Google AI Studio |
| Motion graphics | Remotion |
| Video processing | FFmpeg |
| Image processing | Sharp |
| AI (scripts, captions, replies) | Claude (Anthropic) / Hermes |
| Deployment | Google Cloud Run |

---

## 14. Integration with TomorrowNow AI Ecosystem

Flow Media is a standalone product. It does not send data to Agento, Aver, or Aventra. Client data belongs to the client. The only ecosystem integration is **shared auth** — a TomorrowNow AI account can access multiple products with one login (future phase).

---

## 15. Out of Scope (v1)

- Canva embed (manual design tool) — add if clients request it
- Premiere Pro integration — optional human override only, not in pipeline
- MLS direct posting API — link embed only at launch
- Lead routing to Agento — not Flow Media's responsibility
- Podcast hosting / RSS feed — distribution link only at launch
