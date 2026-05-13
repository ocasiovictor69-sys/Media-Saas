/**
 * HeyGen v2 — Avatar Video Generation Service
 *
 * Fixes:
 *   - [HG-1] Async: submit returns video_id, not URL
 *   - [HG-2] Polling required: GET /v2/video/status/{video_id}
 *   - [HG-3] Error handling for API failures
 *
 * HeyGen v2 API Docs: https://docs.heygen.com/reference/generate-video-v2
 */

import { GenerationSubmitResult, GenerationPollResult } from '@/lib/types'

const HEYGEN_BASE = 'https://api.heygen.com'
const HEYGEN_COST_PER_VIDEO = 2.00  // conservative upper bound

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * Submit an avatar video generation job to HeyGen v2.
 * Returns immediately with a video_id (external job ID).
 * Poll with pollHeyGenJob() until status = 'completed'.
 *
 * @param task  — { script, avatarId, voiceId }
 * @returns     GenerationSubmitResult
 */
export async function submitHeyGenJob(task: {
  script:   string
  avatarId: string
  voiceId:  string
}): Promise<GenerationSubmitResult> {
  const key = process.env.HEYGEN_API_KEY
  if (!key) {
    return { ok: false, estimatedCostUsd: 0, error: 'HEYGEN_NOT_CONFIGURED: Set HEYGEN_API_KEY in env' }
  }

  try {
    const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key':    key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type:      'avatar',
            avatar_id: task.avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type:     'text',
            input_text: task.script,
            voice_id: task.voiceId,
          },
        }],
        dimension: { width: 1080, height: 1920 },  // 9:16 portrait
        aspect_ratio: null,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return {
        ok:              false,
        estimatedCostUsd: HEYGEN_COST_PER_VIDEO,
        error:           `HEYGEN_API_ERROR: ${res.status} — ${body}`,
      }
    }

    const data = await res.json()
    const videoId = data?.data?.video_id

    if (!videoId) {
      return {
        ok:              false,
        estimatedCostUsd: HEYGEN_COST_PER_VIDEO,
        error:           `HEYGEN_NO_VIDEO_ID: ${JSON.stringify(data)}`,
      }
    }

    return {
      ok:              true,
      externalJobId:   videoId,
      estimatedCostUsd: HEYGEN_COST_PER_VIDEO,
    }
  } catch (err) {
    return {
      ok:              false,
      estimatedCostUsd: 0,
      error:           `HEYGEN_NETWORK_ERROR: ${(err as Error).message}`,
    }
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

/**
 * Poll HeyGen for the status of a submitted video job.
 * Called by the job queue poller every 10 seconds.
 *
 * HeyGen status values: 'pending' | 'processing' | 'completed' | 'failed'
 */
export async function pollHeyGenJob(videoId: string): Promise<GenerationPollResult> {
  const key = process.env.HEYGEN_API_KEY
  if (!key) return { status: 'failed', error: 'HEYGEN_NOT_CONFIGURED' }

  try {
    const res = await fetch(`${HEYGEN_BASE}/v2/video_status.get?video_id=${videoId}`, {
      headers: { 'X-Api-Key': key },
    })

    if (!res.ok) {
      return { status: 'failed', error: `HEYGEN_POLL_ERROR: ${res.status}` }
    }

    const data = await res.json()
    const status = data?.data?.status

    switch (status) {
      case 'completed':
        return {
          status:       'completed',
          outputUrl:    data.data.video_url,
          actualCostUsd: HEYGEN_COST_PER_VIDEO,
          rawResponse:  data.data,
        }
      case 'failed':
        return {
          status: 'failed',
          error:  data.data?.error || 'HeyGen generation failed',
          rawResponse: data.data,
        }
      case 'processing':
      case 'pending':
      default:
        return { status: 'processing' }
    }
  } catch (err) {
    return { status: 'failed', error: `HEYGEN_POLL_NETWORK_ERROR: ${(err as Error).message}` }
  }
}
