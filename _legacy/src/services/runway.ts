/**
 * Runway ML — B-Roll Video Generation Service
 *
 * Fixes:
 *   - [RW-1] Wrong endpoint: correct is /v1/tasks not /v1/generate
 *   - [RW-2] Async: returns task_id, not URL
 *   - [RW-3] Duration must be 5 or 10 (enforced by type)
 *
 * Runway Gen-4 API Docs: https://docs.dev.runwayml.com/
 */

import { GenerationSubmitResult, GenerationPollResult } from '@/lib/types'

const RUNWAY_BASE = 'https://api.runwayml.com'

// Cost: $0.05/sec for Gen-4 Turbo
const RUNWAY_COST_PER_SEC = 0.05

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * Submit a B-Roll generation job to Runway Gen-4.
 * Returns a task_id (external job ID).
 * Poll with pollRunwayJob() until status = 'SUCCEEDED'.
 *
 * Duration must be 5 or 10 seconds (Runway constraint).
 */
export async function submitRunwayJob(task: {
  prompt:   string
  duration: 5 | 10
}): Promise<GenerationSubmitResult> {
  const key = process.env.RUNWAY_API_KEY
  if (!key) {
    return { ok: false, estimatedCostUsd: 0, error: 'RUNWAY_NOT_CONFIGURED: Set RUNWAY_API_KEY in env' }
  }

  const estimatedCostUsd = task.duration * RUNWAY_COST_PER_SEC

  try {
    const res = await fetch(`${RUNWAY_BASE}/v1/tasks`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${key}`,
        'Content-Type':   'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        taskType:      'gen4_turbo',
        model:         'gen4_turbo',
        promptText:    task.prompt,
        duration:      task.duration,
        ratio:         '1280:768',  // 16:9 for b-roll compositing
        watermark:     false,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, estimatedCostUsd, error: `RUNWAY_API_ERROR: ${res.status} — ${body}` }
    }

    const data = await res.json()
    const taskId = data?.id

    if (!taskId) {
      return { ok: false, estimatedCostUsd, error: `RUNWAY_NO_TASK_ID: ${JSON.stringify(data)}` }
    }

    return { ok: true, externalJobId: taskId, estimatedCostUsd }
  } catch (err) {
    return { ok: false, estimatedCostUsd: 0, error: `RUNWAY_NETWORK_ERROR: ${(err as Error).message}` }
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

/**
 * Poll Runway for the status of a submitted task.
 * Runway status values: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
 */
export async function pollRunwayJob(taskId: string): Promise<GenerationPollResult> {
  const key = process.env.RUNWAY_API_KEY
  if (!key) return { status: 'failed', error: 'RUNWAY_NOT_CONFIGURED' }

  try {
    const res = await fetch(`${RUNWAY_BASE}/v1/tasks/${taskId}`, {
      headers: {
        'Authorization':  `Bearer ${key}`,
        'X-Runway-Version': '2024-11-06',
      },
    })

    if (!res.ok) {
      return { status: 'failed', error: `RUNWAY_POLL_ERROR: ${res.status}` }
    }

    const data = await res.json()
    const status = data?.status

    switch (status) {
      case 'SUCCEEDED':
        // Runway returns an array of output URLs
        const outputUrl = data?.output?.[0]
        return {
          status:       'completed',
          outputUrl,
          actualCostUsd: (data?.progressRatio || 1) * 10 * RUNWAY_COST_PER_SEC,
          rawResponse:  data,
        }
      case 'FAILED':
      case 'CANCELLED':
        return {
          status: 'failed',
          error:  data?.failure || `Runway task ${status}`,
          rawResponse: data,
        }
      case 'RUNNING':
      case 'PENDING':
      default:
        return { status: 'processing' }
    }
  } catch (err) {
    return { status: 'failed', error: `RUNWAY_POLL_NETWORK_ERROR: ${(err as Error).message}` }
  }
}
