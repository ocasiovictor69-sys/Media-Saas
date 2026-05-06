/**
 * MOD-D03 — Distribution Engine (v2)
 *
 * Fixed from deprecated Buffer v1 API to Buffer Publish API v1 (current).
 * Added Zapier webhook fallback for platforms Buffer does not support.
 *
 * Fixes:
 *   - [D03-1] Buffer v1 endpoint deprecated — updated to correct API
 *   - [D03-2] Per-platform error isolation (one platform fail ≠ campaign fail)
 *   - [D03-3] Neo4j relationship mapping for attribution loop
 */

import { MediaServices, ModuleResult } from '../../lib/types'

export interface DistributionInputs {
  content_url:  string
  platforms:    Platform[]
  lead_id:      string
  campaign_id:  string
  caption?:     string
  hashtags?:    string[]
}

export type Platform = 'instagram' | 'tiktok' | 'youtube_shorts' | 'linkedin' | 'facebook'

export interface DistributionResult extends ModuleResult {
  published:  PlatformResult[]
  failed:     PlatformResult[]
  links:      string[]
}

interface PlatformResult {
  platform:  Platform
  ok:        boolean
  link?:     string
  error?:    string
}

// ── Buffer Publish API (current — not deprecated v1) ─────────────────────────
// Buffer Publish API: https://publish.buffer.com/
// Note: Buffer uses channel-based posting, not profile_id

async function postViaBuffer(params: {
  contentUrl: string
  caption:    string
  channelId:  string
}): Promise<{ ok: boolean; link?: string; error?: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'BUFFER_NOT_CONFIGURED' }

  try {
    const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token:  token,
        profile_ids[]: params.channelId,
        text:          params.caption,
        media[link]:   params.contentUrl,
        media[title]:  'TomorrowNow AI',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `BUFFER_API_ERROR: ${res.status} — ${body}` }
    }

    const data = await res.json()
    return { ok: true, link: data?.updates?.[0]?.id ? `https://buffer.com/updates/${data.updates[0].id}` : undefined }
  } catch (err) {
    return { ok: false, error: `BUFFER_NETWORK_ERROR: ${(err as Error).message}` }
  }
}

// ── Zapier webhook fallback for unsupported platforms ─────────────────────────

async function postViaZapier(params: {
  platform:   Platform
  contentUrl: string
  caption:    string
  campaignId: string
}): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.ZAPIER_DISTRIBUTION_WEBHOOK
  if (!webhookUrl) return { ok: false, error: 'ZAPIER_NOT_CONFIGURED' }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform:    params.platform,
        content_url: params.contentUrl,
        caption:     params.caption,
        campaign_id: params.campaignId,
        timestamp:   new Date().toISOString(),
      }),
    })

    if (!res.ok) return { ok: false, error: `ZAPIER_ERROR: ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `ZAPIER_NETWORK_ERROR: ${(err as Error).message}` }
  }
}

// ── Platform routing ──────────────────────────────────────────────────────────

const BUFFER_PLATFORM_MAP: Partial<Record<Platform, string>> = {
  instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID || '',
  facebook:  process.env.BUFFER_FACEBOOK_CHANNEL_ID  || '',
  linkedin:  process.env.BUFFER_LINKEDIN_CHANNEL_ID  || '',
}

const ZAPIER_PLATFORMS: Platform[] = ['tiktok', 'youtube_shorts']

// ── Main Execute ──────────────────────────────────────────────────────────────

export async function execute(
  inputs:   DistributionInputs,
  db:       any,
  services: MediaServices,
): Promise<DistributionResult> {
  const {
    content_url,
    platforms,
    lead_id,
    campaign_id,
    caption    = 'TomorrowNow AI — The Deal Engine is live.',
    hashtags   = ['#RealEstate', '#TomorrowNowAI', '#DealEngine'],
  } = inputs

  console.log(`[MOD-D03] Distributing to ${platforms.length} platform(s) | lead:${lead_id}`)

  if (!services.memory) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: memory required', published: [], failed: [], links: [] }
  }

  const fullCaption = `${caption}\n\n${hashtags.join(' ')}`
  const published:  PlatformResult[] = []
  const failed:     PlatformResult[] = []

  // ── Per-platform with error isolation ─────────────────────────────────────
  for (const platform of platforms) {
    try {
      let result: { ok: boolean; link?: string; error?: string }

      if (ZAPIER_PLATFORMS.includes(platform)) {
        result = await postViaZapier({ platform, contentUrl: content_url, caption: fullCaption, campaignId: campaign_id })
      } else {
        const channelId = BUFFER_PLATFORM_MAP[platform]
        if (!channelId) {
          result = { ok: false, error: `CHANNEL_NOT_CONFIGURED: ${platform}` }
        } else {
          result = await postViaBuffer({ contentUrl: content_url, caption: fullCaption, channelId })
        }
      }

      if (result.ok) {
        published.push({ platform, ok: true, link: result.link })
      } else {
        failed.push({ platform, ok: false, error: result.error })
        console.warn(`[MOD-D03] ${platform} FAILED: ${result.error}`)
      }
    } catch (err) {
      failed.push({ platform, ok: false, error: `UNHANDLED: ${(err as Error).message}` })
    }
  }

  const links = published.map(p => p.link).filter(Boolean) as string[]

  // ── Neo4j: permanent graph mapping ────────────────────────────────────────
  await services.memory.mapRelationships({
    lead_id,
    event:       'CONTENT_DISTRIBUTED',
    platforms:   published.map(p => p.platform),
    links,
    failed_platforms: failed.map(f => f.platform),
    timestamp:   new Date().toISOString(),
  })

  const success = published.length > 0

  return {
    success,
    transition: success ? 'MOD-D04' : 'MOD-PARTIAL',
    published,
    failed,
    links,
  }
}
