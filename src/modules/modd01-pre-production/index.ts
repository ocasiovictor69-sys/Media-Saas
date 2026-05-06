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

import { MediaServices, ModuleResult, OpportunityType } from '../../lib/types'

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
  db:       any,
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

  // ── Generate script via Claude ────────────────────────────────────────────
  let script: string

  const claudeKey = process.env.ANTHROPIC_API_KEY
  const tone      = SCRIPT_TONE[opportunity_type]

  const financialContext = financial_summary
    ? `Key metrics: Cap Rate ${((financial_summary.cap_rate || 0) * 100).toFixed(1)}%, ` +
      `DSCR ${(financial_summary.dscr || 0).toFixed(2)}, NOI $${(financial_summary.noi || 0).toLocaleString()}/yr.`
    : ''

  if (claudeKey) {
    try {
      const Anthropic = require('@anthropic-ai/sdk')
      const client = new Anthropic.Anthropic({ apiKey: claudeKey })

      const prompt =
        `You are creating a 30-second outreach video script for a real estate opportunity.\n` +
        `Property: ${property_details}\n` +
        `Seller archetype: ${archetype}\n` +
        `Opportunity type: ${opportunity_type}\n` +
        `${financialContext}\n\n` +
        `Tone: ${tone}\n\n` +
        `Write ONLY the spoken script (no stage directions, no labels). ` +
        `Under 90 words. Start with a hook. End with a clear single call to action.`

      const response = await client.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 200,
        messages:   [{ role: 'user', content: prompt }],
      })

      script = response.content[0]?.text?.trim() || buildFallbackScript(opportunity_type, property_details, archetype)
    } catch (err) {
      console.warn(`[MOD-D01] Claude failed — using template: ${(err as Error).message}`)
      script = buildFallbackScript(opportunity_type, property_details, archetype)
    }
  } else {
    script = buildFallbackScript(opportunity_type, property_details, archetype)
  }

  // ── Build manifest ────────────────────────────────────────────────────────
  const manifest: VideoManifest = {
    lead_id,
    script,
    avatar_id,
    voice_id,
    aspect_ratio: '9:16',
    bg_prompt:    BG_PROMPTS[opportunity_type],
    music:        opportunity_type === 'institutional' ? 'corporate_minimal' : 'cinematic_uplifting',
    opportunity_type,
  }

  // ── Persist to memory ─────────────────────────────────────────────────────
  await services.memory.captureContext({
    type:      'video_manifest_generated',
    lead_id,
    manifest,
    timestamp: new Date().toISOString(),
  })

  return { success: true, manifest, transition: 'MOD-D02' }
}

// ── Template fallback ─────────────────────────────────────────────────────────

function buildFallbackScript(type: OpportunityType, property: string, archetype: string): string {
  if (type === 'institutional') {
    return `We've completed a full analysis on ${property}. The numbers are compelling and we have accredited capital ready to move. I'd like 10 minutes to walk you through the offer. When works for you?`
  }
  return `Hi — we saw your property at ${property}. As a ${archetype}, we know timing matters. We can close fast, as-is, no commissions. Would you take a quick call this week?`
}
