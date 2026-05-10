# Agentic Layer Design — Agento + Flow Media
**Date:** 2026-05-10  
**Status:** Approved by Taipan  
**Scope:** 14 agents across both products

---

## Core Agent Contract

Every agent — regardless of product or stage — follows this exact pattern:

```
Trigger (DB event or cron)
  → Load context from Supabase
  → Reason with Hermes (Claude fallback)
  → Execute tool or pipeline step
  → Write result + audit event to Supabase
  → Notify via Hermes bridge (summary + action link)
  → Gate: halt pipeline until human acts (if checkpoint)
```

**Non-negotiable rules:**
1. Agents never self-judge creative output — humans review at every checkpoint
2. Agents never generate speculatively — one intentional pass, then human reviews
3. No API call happens without a job record authorizing it
4. Every agent action writes an audit event
5. All notifications go through Hermes bridge (Telegram/Slack/Discord per client config)
6. Hermes is primary AI backend — Claude Sonnet fallback if Hermes unavailable

---

## Agent Interface (TypeScript contract)

Every agent exports this shape:

```typescript
export type AgentInput = {
  job_id:     string
  client_id:  string
  trigger:    'event' | 'cron'
  payload:    Record<string, unknown>
}

export type AgentResult = {
  success:     boolean
  agent:       string
  action_taken: string
  next_status?: string
  notification?: {
    message:    string
    action_url: string
  }
  error?:      string
}

export async function run(input: AgentInput, services: Services): Promise<AgentResult>
```

---

## Notification Contract

Every agent that requires human action sends a Hermes notification:

```typescript
type AgentNotification = {
  target:     string           // Hermes channel: "telegram:client_id" or configured channel
  message:    string           // One-line summary of what happened
  action_url: string           // Deep link into dashboard for the specific checkpoint
  urgency:    'info' | 'action_required' | 'warning'
}
```

Agents with `urgency: 'action_required'` represent hard stops — pipeline does not advance until human acts.

---

## Flow Media — 10 Agents

### Agent 1: Brief Agent (`agent-brief`)
**File:** `src/lib/agents/flow-media/agent-brief.ts`  
**Trigger:** Event — job created with `job_type = 'create_for_me'`  
**DB watch:** `jobs.status = 'briefing'`

**Responsibility:**
- Parse brief form fields (goal, tone, target audience, content types, platforms)
- Reason over brief with Hermes to produce 3 distinct script variations
- Determine primary production tool (Higgsfield / HeyGen / Runway) based on content type
- Write 3 script variations to `variations` table (`variation_type = 'script'`)
- Advance job to `checkpoint_1` (script selection)

**Reasoning prompt:**
> "You are a professional media scriptwriter. Given this client brief, produce 3 distinct script variations. Each should have a different angle, hook style, and pacing. Return structured JSON only."

**Notification:**
```
message:    "Brief processed for {client_name} — 3 script variations ready. Primary tool: {generator}."
action_url: "/dashboard/jobs/{job_id}/select-script"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — client selects script before any generation begins

---

### Agent 2: Higgsfield Agent (`agent-higgsfield`)
**File:** `src/lib/agents/flow-media/agent-higgsfield.ts`  
**Trigger:** Event — script variation selected, `metadata.primary_generator = 'higgsfield'`  
**DB watch:** `jobs.status = 'approved'` + `jobs.pipeline_stage = 'script_selected'`

**Responsibility:**
- Load selected script and brief parameters
- Construct Higgsfield generation prompt from script + visual style guidance (Hermes)
- Submit generation job to Higgsfield API for exactly 2 variations
- Poll until both complete
- Write 2 video variation records to `variations` table
- Create `internal_review` approval record

**Reasoning prompt:**
> "Given this script and brief context, write a precise Higgsfield cinematic generation prompt that will produce visually compelling footage for {content_type}. Focus on: scene composition, lighting mood, camera movement, and visual style. Return prompt text only."

**Notification:**
```
message:    "2 Higgsfield variations generated for {client_name}. Ready for internal review."
action_url: "/dashboard/jobs/{job_id}/review-variations"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — internal reviewer selects variation before client sees anything  
**Fallback:** If Higgsfield unavailable → notify human, do NOT auto-fallback to Google AI Studio without human knowing

---

### Agent 3: HeyGen Agent (`agent-heygen`)
**File:** `src/lib/agents/flow-media/agent-heygen.ts`  
**Trigger:** Event — script selected, `metadata.primary_generator = 'heygen'`  
**DB watch:** `jobs.status = 'approved'` + `jobs.pipeline_stage = 'script_selected'`

**Responsibility:**
- Load selected script, avatar_id, voice_id from job metadata
- Reason over script with Hermes to optimize for spoken delivery (pacing notes, emphasis markers)
- Submit 2 avatar video generation jobs to HeyGen API
- Poll until both complete
- Write 2 video variation records to `variations` table
- Create `internal_review` approval record

**Reasoning prompt:**
> "Review this script for spoken avatar delivery. Identify any lines that are too long, awkward to speak, or unclear. Return the optimized script with natural pacing — no other commentary."

**Notification:**
```
message:    "2 HeyGen avatar videos generated for {client_name}. Ready for internal review."
action_url: "/dashboard/jobs/{job_id}/review-variations"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — internal reviewer selects variation before client sees anything

---

### Agent 4: Runway Agent (`agent-runway`)
**File:** `src/lib/agents/flow-media/agent-runway.ts`  
**Trigger:** Event — raw asset uploaded, job type = `process_mine`, prompt set  
**DB watch:** `jobs.status = 'intake'` + `assets` count > 0 + `jobs.metadata.prompt` set

**Responsibility:**
- Load raw uploaded asset R2 key and editing prompt
- Reason over prompt with Hermes to construct precise Runway video-to-video instruction
- Submit 2 Runway transformation jobs
- Poll until both complete
- Write 2 transformed variation records to `variations` table
- Create `internal_review` approval record

**Reasoning prompt:**
> "Given this raw footage description and the client's editing goal, write a precise Runway AI video-to-video prompt that will guide the transformation. Be specific about visual style, color treatment, and motion. Return prompt text only."

**Notification:**
```
message:    "2 Runway AI edits ready for {client_name} — raw footage processed. Ready for internal review."
action_url: "/dashboard/jobs/{job_id}/review-variations"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — internal reviewer selects variation

---

### Agent 5: Assembly Agent (`agent-assembly`)
**File:** `src/lib/agents/flow-media/agent-assembly.ts`  
**Trigger:** Event — variation selected by internal reviewer (`variations.selected = true`)  
**DB watch:** `approvals.status = 'approved'` + `checkpoint_type = 'internal_review'`

**Responsibility:**
- Load selected video variation + any B-roll clips + audio assets
- Reason with Hermes to produce an Edit Decision List (EDL): clip order, cut points, transition types, pacing
- Execute FFmpeg assembly using EDL — concatenate clips, sync audio, set pacing
- Upload assembled cut to R2 (`produced/` prefix)
- Create asset record, advance job to `checkpoint_2` (client approval)

**Reasoning prompt:**
> "Given these clips and the original brief, produce an Edit Decision List. Specify: clip sequence, cut points (in seconds), transition type between each clip, and pacing notes. Return JSON only: { clips: [{ r2_key, in, out, transition }], notes: string }"

**Notification:**
```
message:    "Assembly cut ready for {client_name}. Client approval needed before audio + graphics."
action_url: "/dashboard/jobs/{job_id}/client-review"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — client approves assembled cut before audio/graphics work begins

---

### Agent 6: Audio Agent (`agent-audio`)
**File:** `src/lib/agents/flow-media/agent-audio.ts`  
**Trigger:** Event — client approves assembled cut  
**DB watch:** `approvals.status = 'approved'` + `checkpoint_type = 'client_approval'` + `pipeline_stage = 'assembly_approved'`

**Responsibility:**
- Load approved assembled video
- Reason with Hermes on audio treatment: music selection/genre, voiceover level, SFX, EQ notes
- Execute FFmpeg audio pipeline: normalize levels, mix music track, apply EQ
- Upload audio-mixed video to R2
- Advance job to `pipeline_stage = 'audio_approved'` — no separate checkpoint, flows to motion graphics

**Reasoning prompt:**
> "Given this video's content type ({content_type}), tone ({tone}), and target platform ({platforms}), recommend: music genre/mood, voiceover-to-music level ratio (0-100), and any SFX. Return JSON only: { music_mood, vo_level, sfx_notes }"

**Notification:**
```
message:    "Audio mix complete for {client_name}. Moving to motion graphics."
action_url: "/dashboard/jobs/{job_id}"
urgency:    "info"
```

**Gate:** None — flows directly to motion graphics agent

---

### Agent 7: Motion Graphics Agent (`agent-motion-graphics`)
**File:** `src/lib/agents/flow-media/agent-motion-graphics.ts`  
**Trigger:** Event — audio mix complete  
**DB watch:** `jobs.pipeline_stage = 'audio_approved'`

**Responsibility:**
- Load audio-mixed video + client brand assets (colors, fonts, logo)
- Reason with Hermes to produce Remotion composition spec: lower thirds, intro/outro timing, CTA overlay text, brand overlay positions
- Execute Remotion render with composition spec
- Upload final branded video to R2 (`finals/` prefix)
- Create `distribution_confirmation` approval record

**Reasoning prompt:**
> "Given this video's script, brand voice ({brand_voice}), and target platforms ({platforms}), produce a Remotion composition spec. Specify: intro duration, outro duration, lower-third text + timing, CTA text + position, logo placement. Return JSON only."

**Notification:**
```
message:    "Final branded video ready for {client_name}. Please review before distribution."
action_url: "/dashboard/jobs/{job_id}/final-review"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — final human review before any export or distribution

---

### Agent 8: Export Agent (`agent-export`)
**File:** `src/lib/agents/flow-media/agent-export.ts`  
**Trigger:** Event — final video approved for distribution  
**DB watch:** `approvals.status = 'approved'` + `checkpoint_type = 'distribution_confirmation'`

**Responsibility:**
- Load final branded video from R2
- For each target platform: run FFmpeg export with platform spec (resolution, aspect ratio, duration cap, bitrate)
- Verify each export: file integrity, dimension check, duration within platform limits
- Upload all platform exports to R2 (`exports/` prefix)
- Write export asset records, advance job to `distributing`

**No reasoning needed** — purely deterministic tool execution. No Hermes call.

**Notification:**
```
message:    "Platform exports complete for {client_name} — {platform_count} formats ready. Confirm distribution schedule."
action_url: "/dashboard/jobs/{job_id}/schedule"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — client confirms schedule before first post

---

### Agent 9: Distribution Agent (`agent-distribute`)
**File:** `src/lib/agents/flow-media/agent-distribute.ts`  
**Trigger:** Cron (every 15 min) + Event (first-post confirmed)  
**DB watch:** `jobs.status = 'distributing'` + `channel_connections.first_post_confirmed = true`

**Responsibility:**
- Check distribution queue for content scheduled to post now
- Verify OAuth tokens valid for each platform — flag expired tokens immediately
- Reason with Hermes on caption optimization per platform (character limits, hashtag strategy, hook placement)
- Post to each connected channel
- Write post results + audit events
- After first post confirmed by client → `campaigns.autopilot = true` — all subsequent posts fire automatically

**Reasoning prompt:**
> "Optimize this caption for {platform}. Respect character limits, add 3-5 relevant hashtags, ensure the first line is a strong hook. Return optimized caption text only."

**Notification:**
```
message:    "Posted to {platform} for {client_name} — {title}."
action_url: "{platform_post_url}"
urgency:    "info"
```

**Gate:** ✅ HARD STOP on first post only — autopilot after client confirms

---

### Agent 10: Engagement Agent (`agent-engage`)
**File:** `src/lib/agents/flow-media/agent-engage.ts`  
**Trigger:** Cron (every 30 min) + platform webhooks  
**DB watch:** `comments.reply_status = 'pending'`

**Responsibility:**
- Fetch new comments/DMs from connected platforms
- Classify each comment with Hermes (positive / question / negative / spam / neutral)
- Apply client engagement rules (auto_reply / hold_for_review / ignore / hide)
- For auto_reply classifications: generate brand-voice reply with Hermes, mark `approved`
- For hold_for_review: write draft reply, notify human
- Never interpret business intent — classification stops at tone

**Reasoning prompt (classify):**
> "Classify this comment as exactly one of: positive, question, negative, spam, neutral. Reply with one word only."

**Reasoning prompt (reply):**
> "Write a brief reply (under 80 words) to this {classification} comment in this brand voice: {brand_voice}. Reply text only — no quotes, no labels."

**Notification (when holds exist):**
```
message:    "{hold_count} comments need your review for {client_name}. {auto_count} auto-replied."
action_url: "/dashboard/engage/{client_id}/inbox"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP for negative + hold_for_review — auto-reply for positive/neutral/question per rules

---

## Agento — 4 Agents

### Agent 1: Sourcing Agent (`agent-sourcing`)
**File:** `lib/agents/agento/agent-sourcing.ts`  
**Trigger:** Cron — configurable, default every 6 hours  
**DB watch:** None — initiates batch

**Responsibility:**
- Pull property data from ATTOM, PropStream, Goliath for configured search criteria
- Run Four D scorer on each property (Death/Divorce/Debt/Divestment)
- Route: score ≥70 → HIGH → skip trace queue; 40–69 → MEDIUM → skip trace queue; <40 → archived
- Determine pipeline: commercial vs. residential based on property type + investor profile
- Write lead records with score, pipeline assignment, source data

**No reasoning needed** — Four D scoring is deterministic math.

**Notification:**
```
message:    "{high_count} HIGH + {medium_count} MEDIUM leads sourced. {commercial_count} commercial, {residential_count} residential. Starting skip trace."
action_url: "/dashboard/leads/queue"
urgency:    "info"
```

**Gate:** None — fully autonomous

---

### Agent 2: Verification Agent (`agent-verify`)
**File:** `lib/agents/agento/agent-verify.ts`  
**Trigger:** Event — lead status hits `skip_traced`  
**DB watch:** `leads.status = 'skip_traced'`

**Responsibility:**
- Run four-layer verification in sequence:
  1. Twilio Lookup — phone active, not VOIP/burner
  2. Kickbox — email inbox exists, not disposable
  3. Smarty Streets — address USPS-validated
  4. Hermes identity coherence — does the person match the property? Any conflicts?
- Produce verification summary: confidence score, flags, any conflicting data points
- Write to `checkpoint_1` approval queue

**Reasoning prompt (Hermes identity coherence):**
> "Given this property data and owner contact info from skip trace, assess identity coherence. Does the owner name match public records? Are there any conflicts between data sources? Provide a confidence score (0-100) and list any specific flags. Return JSON: { confidence, flags: string[], recommendation: 'approve' | 'review' | 'reject' }"

**Notification:**
```
message:    "Verification complete — {owner_name} | {address}. Confidence: {score}%. {flag_count} flags. Action required."
action_url: "/dashboard/leads/{lead_id}/verify"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — agent must approve/override/reject before pipeline advances

---

### Agent 3: Outreach Agent (`agent-outreach`)
**File:** `lib/agents/agento/agent-outreach.ts`  
**Trigger:** Event — lead status hits `verified`  
**DB watch:** `leads.status = 'verified'` + `leads.pipeline = 'residential'`

**Responsibility:**
- Load verified lead: name, property, Four D score, skip trace summary, agent voice/style
- Generate all 4 outreach scripts in one Hermes call:
  - Step 1: SMS (160 chars max, immediate send)
  - Step 2: Email (subject + body, sends 2 days after Step 1)
  - Step 3: Call script (talking points + objection handlers, 5 days after Step 1)
  - Step 4: Loom video script (equity report narrative, 8 days after Step 1)
- Write full outreach package to `outreach_approval_queue`
- No message is drafted for Step 2–4 until Step 1 is approved — package is approved as a unit

**Reasoning prompt:**
> "You are drafting outreach for a real estate agent. Lead: {name}, property: {address}, distress signals: {four_d_signals}. Agent voice: {agent_voice}. Write 4 scripts: SMS (160 chars, warm opener), Email (subject + 3 paragraphs), Call script (opener + 3 talking points + 2 objection handlers), Loom script (90-second equity report narrative). Return JSON only."

**Notification:**
```
message:    "Outreach package ready — {seller_name} | {address} | 4D Score: {score}. Review all 4 scripts before sending."
action_url: "/dashboard/leads/{lead_id}/outreach"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — agent approves entire 4-script package once. No individual step approval. No message leaves without approved status.

---

### Agent 4: Deal Packaging Agent (`agent-deal`)
**File:** `lib/agents/agento/agent-deal.ts`  
**Trigger:** Event — lead validated, pipeline = commercial  
**DB watch:** `leads.status = 'validated'` + `leads.pipeline = 'commercial'`

**Responsibility:**
- Load full valuation data: NOI, Cap Rate, DSCR, Cash-on-Cash, GRM, rehab estimate, MAO
- Reason with Hermes to produce deal narrative and investor summary
- Infer investor buy box from transaction history (property types, geography, price range, return thresholds)
- Generate in-app deal card (structured JSON for dashboard render)
- Generate PDF report (deal narrative + financials + property details)
- Write buy box inference to `checkpoint_2` queue
- Upload PDF to R2

**Reasoning prompt (deal narrative):**
> "Given these property financials, write a professional deal summary for a real estate investor. Highlight DSCR classification ({dscr_class}), cap rate ({cap_rate}%), and key value drivers. 3 paragraphs max. No filler. Return text only."

**Reasoning prompt (buy box inference):**
> "Given this investor's last {n} transactions, infer their buy box: preferred property types, target geography, price range, minimum cap rate, minimum cash-on-cash return. Return JSON: { property_types, geography, price_min, price_max, cap_rate_min, coc_min, notes }"

**Notification:**
```
message:    "Deal package ready — {address}. DSCR: {dscr_class}. Cap Rate: {cap_rate}%. Buy box inferred — confirmation needed."
action_url: "/dashboard/deals/{lead_id}/package"
urgency:    "action_required"
```

**Gate:** ✅ HARD STOP — investor (via agent) confirms buy box before commercial property search runs

---

## Agent File Structure

```
# Flow Media
src/lib/agents/flow-media/
  agent-brief.ts
  agent-higgsfield.ts
  agent-heygen.ts
  agent-runway.ts
  agent-assembly.ts
  agent-audio.ts
  agent-motion-graphics.ts
  agent-export.ts
  agent-distribute.ts
  agent-engage.ts
  index.ts              ← agent registry + dispatcher

# Agento
lib/agents/agento/
  agent-sourcing.ts
  agent-verify.ts
  agent-outreach.ts
  agent-deal.ts
  index.ts              ← agent registry + dispatcher
```

---

## Agent Registry Pattern

Each product exports a dispatcher that receives a trigger event and routes to the correct agent:

```typescript
// src/lib/agents/flow-media/index.ts
export const FLOW_MEDIA_AGENTS = {
  'job.briefing':          agentBrief,
  'job.script_selected.higgsfield': agentHiggsfield,
  'job.script_selected.heygen':     agentHeyGen,
  'job.intake.runway':     agentRunway,
  'approval.internal_review.approved': agentAssembly,
  'job.audio_approved':    agentMotionGraphics,
  'approval.distribution_confirmation.approved': agentExport,
  'cron.distribute':       agentDistribute,
  'cron.engage':           agentEngage,
  'webhook.comment':       agentEngage,
}
```

---

## Summary Table

| # | Agent | Product | Trigger | Gate | AI Call |
|---|-------|---------|---------|------|---------|
| 1 | agent-brief | Flow Media | Event | ✅ Script select | Hermes |
| 2 | agent-higgsfield | Flow Media | Event | ✅ Internal review | Hermes (prompt) |
| 3 | agent-heygen | Flow Media | Event | ✅ Internal review | Hermes (script optimize) |
| 4 | agent-runway | Flow Media | Event | ✅ Internal review | Hermes (prompt) |
| 5 | agent-assembly | Flow Media | Event | ✅ Client approval | Hermes (EDL) |
| 6 | agent-audio | Flow Media | Event | None | Hermes (audio spec) |
| 7 | agent-motion-graphics | Flow Media | Event | ✅ Final review | Hermes (composition spec) |
| 8 | agent-export | Flow Media | Event | ✅ Schedule confirm | None (deterministic) |
| 9 | agent-distribute | Flow Media | Cron + Event | ✅ First post only | Hermes (caption) |
| 10 | agent-engage | Flow Media | Cron + Webhook | ✅ Negatives/holds | Hermes (classify + reply) |
| 11 | agent-sourcing | Agento | Cron | None | None (deterministic) |
| 12 | agent-verify | Agento | Event | ✅ CP1 | Hermes (coherence) |
| 13 | agent-outreach | Agento | Event | ✅ CP3 | Hermes (4 scripts) |
| 14 | agent-deal | Agento | Event | ✅ CP2 | Hermes (narrative + buy box) |

**14 agents total. 10 Flow Media. 4 Agento. 11 have human-in-the-loop gates. 3 are fully autonomous.**
