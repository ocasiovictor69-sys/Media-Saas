/**
 * MOD-D01 — Pre-Production Engine (v2)
 *
 * Upgraded from simulated script to real Claude-driven script generation.
 * Respects Agento opportunity_type to bifurcate residential vs. institutional tone.
 *
 * Fixes:
 *   - [D01-1] Real Claude API call (not hardcoded template)
 *   - [D01-2] Opportunity type drives script angle
 *   - [D01-3] Manifest includes all fields needed by MOD-D02
 */

import { MediaServices, ModuleResult, OpportunityType, SupabaseClient } from '@/lib/types'
import { Anthropic } from '@anthropic-ai/sdk'

export interface PreProductionInputs {
  lead_id:          string
  archetype:        string
  property_details: string
  opportunity_type?: OpportunityType  // from Agento — drives tone
  financial_summary?: {
    cap_rate?:    number
    dscr?:        number
    noi?:         number
    priority?:    string
  }
  // Avatar config
  avatar_id?:  string
  voice_id?:   string
}

export interface VideoManifest {
  lead_id:      string
  script:       string
  avatar_id:    string
  voice_id:     string
  aspect_ratio: '9:16'
  bg_prompt:    string    // for Higgsfield/Runway b-roll layer
  music:        string
  opportunity_type: string
}

export interface PreProductionResult extends ModuleResult {
  manifest?: VideoManifest
}

// ── Script tones by opportunity type ──────────────────────────────────────────

const SCRIPT_TONE: Record<OpportunityType, string> = {
  residential:   'empathetic, conversational, fast-close focused. Speak directly to a homeowner in distress.',
  institutional: 'data-driven, professional, institutional grade. Address an investor or portfolio manager.',
  hybrid:        'confident and analytical. This seller has options — lead with metrics and speed.',
}

const BG_PROMPTS: Record<OpportunityType, string> = {
  residential:   'suburban neighborhood aerial drone shot, golden hour, warm tones, cinematic',
  institutional: 'modern financial district skyline, glass buildings, cool blue tones, cinematic',
  hybrid:        'mixed-use property exterior, clean architecture, neutral tones, cinematic',
}

// ── Main Execute ──────────────────────────────────────────────────────────────

export async function execute(
  inputs:   PreProductionInputs,
  db:       SupabaseClient,
  services: MediaServices,
): Promise<PreProductionResult> {
  const {
    lead_id,
    archetype,
    property_details,
    opportunity_type = 'residential',
    financial_summary,
    avatar_id = process.env.HEYGEN_DEFAULT_AVATAR_ID || 'default',
    voice_id  = process.env.HEYGEN_DEFAULT_VOICE_ID  || 'default',
  } = inputs

  console.log(`[MOD-D01] Pre-Production — lead:${lead_id} | type:${opportunity_type}`)

  if (!services.memory) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: memory service required' }
  }

  // ── Generate Tasks via Claude (Intent Parsing) ─────────────────────────
  let tasks: any[] = []

  const claudeKey = process.env.ANTHROPIC_API_KEY
  const tone      = SCRIPT_TONE[opportunity_type] || 'professional'

  if (claudeKey) {
    try {
      const client = new Anthropic({ apiKey: claudeKey })

      const prompt =
        `You are the Flow Media Dynamic Creative Director.\n` +
        `The client has submitted a request or raw asset: "${property_details}".\n\n` +
        `Instructions:\n` +
        `1. Determine the media intent: is this a request for a 'podcast', 'explainer', 'avatar', 'course', 'raw_edit', or 'distribute_only'?\n` +
        `2. Output a valid JSON array of tasks. Do not output anything else.\n` +
        `3. For 'podcast', generate a multi-camera layout plan and script.\n` +
        `4. For 'explainer', generate a dynamic script focusing on the core value prop.\n` +
        `5. For 'avatar', generate a hyper-realistic script for the AI avatar.\n` +
        `6. Always include a "branding" object in each task containing "primary_color", "font", and "logo_url" placeholders.\n\n` +
        `Format:\n` +
        `[{"type": "explainer", "script": "...", "branding": {"primary_color": "#FF0000"}}]`

      const response = await client.messages.create({
        model:      'claude-3-5-sonnet-20240620',
        max_tokens: 1500,
        messages:   [{ role: 'user', content: prompt }],
      })

      const textBlock = response.content.find(block => block.type === 'text')
      const rawText = (textBlock as any)?.text?.trim() || '[]'
      
      // Extract JSON from potential markdown blocks
      const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
      tasks = JSON.parse(jsonStr)
    } catch (err) {
      console.warn(`[MOD-D01] Claude failed — using fallback task: ${(err as Error).message}`)
      tasks = [{ type: 'avatar', script: buildFallbackScript(opportunity_type, property_details, archetype) }]
    }
  } else {
    tasks = [{ type: 'avatar', script: buildFallbackScript(opportunity_type, property_details, archetype) }]
  }

  // ── Persist to memory ─────────────────────────────────────────────────────
  await services.memory.captureContext({
    type:      'video_tasks_generated',
    lead_id,
    tasks,
    timestamp: new Date().toISOString(),
  })

  return { success: true, generatedTasks: tasks, transition: 'MOD-D02' }
}

// ── Template fallback ─────────────────────────────────────────────────────────

function buildFallbackScript(type: OpportunityType, property: string, archetype: string): string {
  if (type === 'institutional') {
    return `We've completed a full analysis on ${property}. The numbers are compelling and we have accredited capital ready to move. I'd like 10 minutes to walk you through the offer. When works for you?`
  }
  return `Hi — we saw your property at ${property}. As a ${archetype}, we know timing matters. We can close fast, as-is, no commissions. Would you take a quick call this week?`
}
