/**
 * MOD-D04 — Engagement & Feedback Loop (v2)
 *
 * Real Claude sentiment analysis on social comments.
 * High-intent comments are re-ingested to Agento as new leads.
 * Closes the autonomous factory loop.
 *
 * Fixes:
 *   - [D04-1] Real Claude sentiment + intent analysis
 *   - [D04-2] Agento re-ingestion path (high-intent → new lead)
 *   - [D04-3] Neo4j performance data written for MOD-D01 refinement
 */

import { MediaServices, ModuleResult, SocialComment } from '../../lib/types'
import { Anthropic } from '@anthropic-ai/sdk'

export interface EngagementInputs {
  channel_id:  string
  lead_id:     string
  campaign_id: string
  platform:    string
}

export interface EngagementResult extends ModuleResult {
  engagement_count?:   number
  high_intent_count?:  number
  re_ingested_leads?:  string[]
}

// ── Comment analysis via Claude ───────────────────────────────────────────────

async function analyzeComments(comments: SocialComment[]): Promise<SocialComment[]> {
  const claudeKey = process.env.ANTHROPIC_API_KEY
  if (!claudeKey || comments.length === 0) return comments

  try {
    const client = new Anthropic({ apiKey: claudeKey })

    const commentList = comments.map((c, i) => `[${i}] "${c.text}"`).join('\n')

    const response = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{
        role:    'user',
        content: `Analyze these social media comments on a real estate AI platform post. For each comment, classify:
- sentiment: positive | neutral | negative
- intent: lead | question | complaint | praise | unknown

Comments:
${commentList}

Return ONLY a JSON array: [{"index": 0, "sentiment": "...", "intent": "..."}]`,
      }],
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const raw  = (textBlock as any)?.text?.trim()
    const json = JSON.parse(raw?.match(/\[[\s\S]*\]/)?.[0] || '[]') as Array<{
      index:     number
      sentiment: SocialComment['sentiment']
      intent:    SocialComment['intent']
    }>

    const enriched = [...comments]
    for (const result of json) {
      if (enriched[result.index]) {
        enriched[result.index].sentiment = result.sentiment
        enriched[result.index].intent    = result.intent
      }
    }
    return enriched
  } catch (err) {
    console.warn(`[MOD-D04] Claude analysis failed — returning raw comments: ${(err as Error).message}`)
    return comments
  }
}

// ── Agento re-ingestion ───────────────────────────────────────────────────────

/**
 * Route a high-intent comment back to Agento as a new ingest lead.
 * Calls the Agento /api/pipeline/ingest endpoint on the local stack.
 */
async function reIngestToAgento(comment: SocialComment, campaignId: string): Promise<string | null> {
  const agentoToken = process.env.AGENTO_INGEST_TOKEN
  const agentoUrl   = process.env.AGENTO_BASE_URL || 'http://localhost:3000'
  if (!agentoToken) return null

  try {
    const res = await fetch(`${agentoUrl}/api/pipeline/ingest`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${agentoToken}`,
      },
      body: JSON.stringify({
        source:      'social_engagement',
        external_id: `social_${comment.id}`,
        address:     `social_lead_${campaignId}`,
        metadata: {
          platform:    comment.platform,
          author:      comment.author,
          comment:     comment.text,
          campaign_id: campaignId,
          intent:      comment.intent,
        },
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.property_id || null
  } catch (err) {
    console.warn(`[MOD-D04] Agento re-ingest failed: ${(err as Error).message}`)
    return null
  }
}

// ── Main Execute ──────────────────────────────────────────────────────────────

export async function execute(
  inputs:   EngagementInputs,
  db:       any,
  services: MediaServices,
): Promise<EngagementResult> {
  const { channel_id, lead_id, campaign_id, platform } = inputs

  console.log(`[MOD-D04] Monitoring ${platform}:${channel_id} | campaign:${campaign_id}`)

  if (!services.memory || !services.social) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: memory and social required' }
  }

  // ── Fetch comments ────────────────────────────────────────────────────────
  const engRes  = await services.social.monitorEngagement(channel_id)
  const rawComments = engRes.comments as SocialComment[]

  // ── Claude sentiment + intent analysis ───────────────────────────────────
  const analyzed = await analyzeComments(rawComments)

  // ── Re-ingest high-intent leads to Agento ────────────────────────────────
  const highIntentComments = analyzed.filter(c => c.intent === 'lead')
  const reIngestedLeads: string[] = []

  for (const comment of highIntentComments) {
    const leadId = await reIngestToAgento(comment, campaign_id)
    if (leadId) {
      reIngestedLeads.push(leadId)
      console.log(`[MOD-D04] Re-ingested lead → Agento | ${comment.author} → ${leadId}`)
    }
  }

  // ── Neo4j: performance data for MOD-D01 refinement ───────────────────────
  const sentimentBreakdown = analyzed.reduce((acc, c) => {
    acc[c.sentiment || 'unknown'] = (acc[c.sentiment || 'unknown'] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  await services.memory.mapRelationships({
    lead_id,
    campaign_id,
    event:               'ENGAGEMENT_PROCESSED',
    engagement_count:    analyzed.length,
    high_intent_count:   highIntentComments.length,
    re_ingested_count:   reIngestedLeads.length,
    sentiment_breakdown: sentimentBreakdown,
    timestamp:           new Date().toISOString(),
  })

  console.log(
    `[MOD-D04] Done | comments:${analyzed.length} | ` +
    `high-intent:${highIntentComments.length} | re-ingested:${reIngestedLeads.length}`
  )

  return {
    success:            true,
    transition:         'MOD-FINISHED',
    engagement_count:   analyzed.length,
    high_intent_count:  highIntentComments.length,
    re_ingested_leads:  reIngestedLeads,
  }
}
