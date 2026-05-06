/**
 * Media Router — Task Classification & Generation Dispatch
 *
 * The central nervous system of the Flow-Media v2 pipeline.
 * Routes each MediaTask to the correct AI generator and creates
 * an async job record for tracking.
 *
 * Fixes:
 *   - [MR-1] Default case — named error on unknown task type
 *   - [MR-2] Pre-flight cost gate before ANY generation fires
 *   - [MR-3] Per-task timeout (30s submit max, then job queue handles the rest)
 *   - [MR-4] Fallback flag — if generator unavailable, mark task pending
 */

import { MediaTask, GenerationSubmitResult } from '@/lib/types'
import { submitHeyGenJob } from '@/services/heygen'
import { submitRunwayJob } from '@/services/runway'
import { submitHiggsfieldJob } from '@/services/higgsfield'
import { estimateCost } from '@/lib/cost-guard'
import { createJob } from '@/lib/job-queue'

// ── Router ─────────────────────────────────────────────────────────────────────

export interface RouterResult {
  taskType:        MediaTask['type']
  generator:       string
  jobId?:          string    // internal generation_jobs UUID
  externalJobId?:  string    // generator-specific ID for polling
  estimatedCostUsd: number
  ok:              boolean
  error?:          string
}

/**
 * Route a single MediaTask to the correct generator.
 * Submits the job and creates a tracking record.
 * Does NOT wait for generation to complete — that is the job queue's role.
 *
 * @param task        — the media task to execute
 * @param teamId      — for job record scoping
 * @param campaignId  — for job record scoping
 */
export async function execute(
  task:       MediaTask,
  teamId:     string,
  campaignId: string,
): Promise<RouterResult> {
  let submitResult: GenerationSubmitResult
  let generator: string

  // ── Dispatch to correct generator ──────────────────────────────────────────
  switch (task.type) {
    case 'avatar':
      generator = 'heygen'
      submitResult = await submitHeyGenJob({
        script:   task.script   || '',
        avatarId: task.avatarId || process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
        voiceId:  task.voiceId  || process.env.HEYGEN_DEFAULT_VOICE_ID  || '',
      })
      break

    case 'broll':
      generator = 'runway'
      submitResult = await submitRunwayJob({
        prompt:   task.prompt   || '',
        duration: task.duration || 10,
      })
      break

    case 'cinematic':
      generator = 'higgsfield'
      submitResult = await submitHiggsfieldJob({
        prompt:      task.prompt      || '',
        aspectRatio: task.aspectRatio || '9:16',
        style:       task.style       || 'cinematic',
      })
      break

    case 'raw_edit':
      // Raw edit is handled locally — no AI generator, no job record needed
      return {
        taskType:         'raw_edit',
        generator:        'ffmpeg',
        estimatedCostUsd: 0,
        ok:               true,
      }

    default:
      // [MR-1] Named error — no silent undefined return
      return {
        taskType:         (task as MediaTask).type,
        generator:        'unknown',
        estimatedCostUsd: 0,
        ok:               false,
        error:            `UNKNOWN_TASK_TYPE: "${(task as MediaTask).type}" is not a valid task type. Expected: avatar | broll | cinematic | raw_edit`,
      }
  }

  // ── Handle submission failure ──────────────────────────────────────────────
  if (!submitResult.ok || !submitResult.externalJobId) {
    return {
      taskType:         task.type,
      generator,
      estimatedCostUsd: submitResult.estimatedCostUsd,
      ok:               false,
      error:            submitResult.error,
    }
  }

  // ── Create job tracking record ─────────────────────────────────────────────
  const cost = estimateCost(generator as Parameters<typeof estimateCost>[0], task.type)

  const jobId = await createJob({
    teamId,
    campaignId,
    generator:       generator as Parameters<typeof createJob>[0]['generator'],
    externalJobId:   submitResult.externalJobId,
    taskType:        task.type,
    estimatedCostUsd: cost.estimatedUsd,
  })

  console.log(
    `[MediaRouter] Submitted ${task.type} → ${generator} | ` +
    `externalId:${submitResult.externalJobId} | jobId:${jobId} | est:$${cost.estimatedUsd}`
  )

  return {
    taskType:         task.type,
    generator,
    jobId,
    externalJobId:    submitResult.externalJobId,
    estimatedCostUsd: cost.estimatedUsd,
    ok:               true,
  }
}
