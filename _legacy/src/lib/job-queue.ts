/**
 * Supabase-Backed Async Job Queue
 *
 * All three AI generators (HeyGen, Runway, Higgsfield) are async:
 *   1. Submit → receive external_job_id
 *   2. Poll until status = completed | failed | timed_out
 *   3. Resolve output_url → update media_assets
 *
 * Uses `generation_jobs` table as the queue backing store.
 * Polling is triggered by the /api/media/jobs/poll endpoint (cron or edge function).
 *
 * Fixes:
 *   - [JQ-1] Synchronous treatment of async APIs
 *   - [JQ-2] No job lifecycle tracking
 *   - [JQ-3] No timeout handling
 */

import { createClient } from '@supabase/supabase-js'
import { GenerationJob, JobStatus, GenerationPollResult } from './types'

// Service-role client — needed for job writes that bypass RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Job Creation ───────────────────────────────────────────────────────────────

/**
 * Create a new generation job record after API submission.
 *
 * @returns internal job UUID
 */
export async function createJob(params: {
  teamId:          string
  campaignId:      string
  generator:       GenerationJob['generator']
  externalJobId:   string
  taskType:        GenerationJob['taskType']
  estimatedCostUsd: number
}): Promise<string> {
  const db = getServiceClient()

  const { data, error } = await db
    .from('generation_jobs')
    .insert({
      team_id:            params.teamId,
      campaign_id:        params.campaignId,
      generator:          params.generator,
      external_job_id:    params.externalJobId,
      task_type:          params.taskType,
      estimated_cost_usd: params.estimatedCostUsd,
      status:             'submitted',
      attempt_count:      0,
      next_poll_at:       new Date(Date.now() + 15_000).toISOString(), // first poll in 15s
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`[JobQueue] Failed to create job: ${error?.message}`)
  }

  return data.id as string
}

// ── Job Polling ────────────────────────────────────────────────────────────────

/**
 * Fetch all jobs due for polling.
 * Called by the /api/media/jobs/poll cron handler.
 */
export async function getJobsDueForPoll(): Promise<GenerationJob[]> {
  const db = getServiceClient()

  const { data, error } = await db
    .from('generation_jobs')
    .select('*')
    .in('status', ['submitted', 'processing'])
    .lte('next_poll_at', new Date().toISOString())
    .order('next_poll_at', { ascending: true })
    .limit(20)

  if (error) throw new Error(`[JobQueue] Poll query failed: ${error.message}`)
  return (data || []) as GenerationJob[]
}

/**
 * Update a job after polling the generator.
 */
export async function updateJob(
  jobId:  string,
  result: GenerationPollResult,
  attemptCount: number,
  maxAttempts:  number,
): Promise<void> {
  const db = getServiceClient()

  const isComplete = result.status === 'completed'
  const isFailed   = result.status === 'failed'
  const isTimedOut = attemptCount >= maxAttempts

  let nextStatus: JobStatus = 'processing'
  if (isComplete)  nextStatus = 'completed'
  if (isFailed)    nextStatus = 'failed'
  if (isTimedOut)  nextStatus = 'timed_out'

  const nextPollAt = isComplete || isFailed || isTimedOut
    ? null
    : new Date(Date.now() + 10_000).toISOString() // poll every 10s

  const { error } = await db
    .from('generation_jobs')
    .update({
      status:           nextStatus,
      attempt_count:    attemptCount,
      output_url:       result.outputUrl ?? null,
      error_message:    result.error ?? null,
      raw_response:     result.rawResponse ?? {},
      actual_cost_usd:  result.actualCostUsd ?? 0,
      completed_at:     isComplete ? new Date().toISOString() : null,
      next_poll_at:     nextPollAt,
    })
    .eq('id', jobId)

  if (error) {
    console.error(`[JobQueue] Failed to update job ${jobId}: ${error.message}`)
  }

  // If completed — resolve the linked media_asset
  if (isComplete && result.outputUrl) {
    await db
      .from('media_assets')
      .update({
        status: 'ready',
        url:    result.outputUrl,
        actual_cost_usd: result.actualCostUsd ?? 0,
        metadata: result.rawResponse ?? {},
      })
      .eq('job_id', jobId)
  }

  // If failed or timed out — mark asset failed
  if (isFailed || isTimedOut) {
    await db
      .from('media_assets')
      .update({ status: 'failed' })
      .eq('job_id', jobId)
  }
}

/**
 * Get the current status of a single job.
 */
export async function getJobStatus(jobId: string): Promise<GenerationJob | null> {
  const db = getServiceClient()

  const { data, error } = await db
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) return null
  return data as GenerationJob
}
