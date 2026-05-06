import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJobsDueForPoll, updateJob } from '@/lib/job-queue'
import { pollHeyGenJob } from '@/services/heygen'
import { pollRunwayJob } from '@/services/runway'
import { pollHiggsfieldJob } from '@/services/higgsfield'
import { GenerationPollResult } from '@/lib/types'

/**
 * POST /api/media/jobs/poll
 *
 * Polls all generation jobs that are due for a status check.
 * Should be called by a cron job every 10-15 seconds.
 *
 * Protected by CRON_SECRET header to prevent abuse.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await getJobsDueForPoll()

  if (jobs.length === 0) {
    return NextResponse.json({ polled: 0, message: 'No jobs due' })
  }

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      let pollResult: GenerationPollResult

      switch (job.generator) {
        case 'heygen':
          pollResult = await pollHeyGenJob(job.externalJobId)
          break
        case 'runway':
          pollResult = await pollRunwayJob(job.externalJobId)
          break
        case 'higgsfield':
          pollResult = await pollHiggsfieldJob(job.externalJobId)
          break
        default:
          pollResult = { status: 'failed', error: `Unknown generator: ${job.generator}` }
      }

      await updateJob(job.id, pollResult, job.attemptCount + 1, job.maxAttempts)

      return { jobId: job.id, status: pollResult.status }
    })
  )

  const polled    = results.filter(r => r.status === 'fulfilled').length
  const errors    = results.filter(r => r.status === 'rejected').length
  const completed = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<{ jobId: string; status: string }>).value)
    .filter(v => v.status === 'completed')

  return NextResponse.json({
    polled,
    errors,
    completed: completed.length,
    jobs:      completed,
  })
}

/**
 * GET /api/media/jobs/poll?job_id=xxx
 *
 * Check status of a single job. Used by the client to poll after submission.
 */
export async function GET(req: NextRequest) {
  const supabase  = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 422 })

  const { data, error } = await supabase
    .from('generation_jobs')
    .select('id, status, output_url, error_message, attempt_count, submitted_at, completed_at, estimated_cost_usd, actual_cost_usd')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
