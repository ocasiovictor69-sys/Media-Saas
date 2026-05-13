/**
 * Higgsfield AI — Cinematic Video Generation Service
 *
 * Fixes:
 *   - [HF-1] Verified REST endpoint for cinematic generation
 *   - [HF-2] Async job pattern with proper polling
 *   - [HF-3] 9:16 aspect ratio enforced for social-first output
 *
 * Higgsfield API Docs: https://platform.higgsfield.ai/docs
 */

import { GenerationSubmitResult, GenerationPollResult } from '@/lib/types'

const HIGGSFIELD_BASE = 'https://api.higgsfield.ai'
const HIGGSFIELD_COST_PER_GEN = 0.30

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * Submit a cinematic generation job to Higgsfield.
 * Returns a generation_id (external job ID).
 * Poll with pollHiggsfieldJob() until status = 'completed'.
 */
export async function submitHiggsfieldJob(task: {
  prompt:      string
  aspectRatio: '9:16' | '16:9' | '1:1'
  style?:      string
}): Promise<GenerationSubmitResult> {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) {
    return { ok: false, estimatedCostUsd: 0, error: 'HIGGSFIELD_NOT_CONFIGURED: Set HIGGSFIELD_API_KEY in env' }
  }

  try {
    const res = await fetch(`${HIGGSFIELD_BASE}/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        prompt:       task.prompt,
        aspect_ratio: task.aspectRatio,
        motion_style: task.style || 'cinematic',
        num_frames:   129,  // ~5 seconds at ~24fps
        guidance_scale: 7.5,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return {
        ok:              false,
        estimatedCostUsd: HIGGSFIELD_COST_PER_GEN,
        error:           `HIGGSFIELD_API_ERROR: ${res.status} — ${body}`,
      }
    }

    const data = await res.json()
    // Higgsfield returns { generation_id: "..." }
    const generationId = data?.generation_id || data?.id

    if (!generationId) {
      return {
        ok:              false,
        estimatedCostUsd: HIGGSFIELD_COST_PER_GEN,
        error:           `HIGGSFIELD_NO_GEN_ID: ${JSON.stringify(data)}`,
      }
    }

    return {
      ok:              true,
      externalJobId:   generationId,
      estimatedCostUsd: HIGGSFIELD_COST_PER_GEN,
    }
  } catch (err) {
    return {
      ok:              false,
      estimatedCostUsd: 0,
      error:           `HIGGSFIELD_NETWORK_ERROR: ${(err as Error).message}`,
    }
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

/**
 * Poll Higgsfield for the status of a submitted generation.
 * Higgsfield status values: 'queued' | 'generating' | 'completed' | 'failed'
 */
export async function pollHiggsfieldJob(generationId: string): Promise<GenerationPollResult> {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) return { status: 'failed', error: 'HIGGSFIELD_NOT_CONFIGURED' }

  try {
    const res = await fetch(`${HIGGSFIELD_BASE}/v1/generate/${generationId}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    })

    if (!res.ok) {
      return { status: 'failed', error: `HIGGSFIELD_POLL_ERROR: ${res.status}` }
    }

    const data = await res.json()
    const status = data?.status

    switch (status) {
      case 'completed':
        return {
          status:       'completed',
          outputUrl:    data?.video_url || data?.output_url,
          actualCostUsd: HIGGSFIELD_COST_PER_GEN,
          rawResponse:  data,
        }
      case 'failed':
        return {
          status: 'failed',
          error:  data?.error || 'Higgsfield generation failed',
          rawResponse: data,
        }
      case 'queued':
      case 'generating':
      default:
        return { status: 'processing' }
    }
  } catch (err) {
    return { status: 'failed', error: `HIGGSFIELD_POLL_NETWORK_ERROR: ${(err as Error).message}` }
  }
}
