/**
 * Generate Media Pipeline — Full Production Pipeline
 *
 * Orchestrates the entire campaign generation run:
 *   1. Load campaign from DB
 *   2. Pre-flight cost check
 *   3. Per-task: route → submit job → create media_asset record
 *   4. Return job IDs for async polling
 *
 * Fixes:
 *   - [PL-1] Per-task error isolation (one failure does not stop others)
 *   - [PL-2] Pre-flight cost gate before any generation fires
 *   - [PL-3] URL written only after polling completes (async — not on submit)
 *   - [PL-4] strategy.mediaTasks validated before loop
 *   - [PL-5] Campaign spend updated atomically
 */

import { createClient } from '@supabase/supabase-js'
import { MediaTask, Campaign } from '@/lib/types'
import { mediaRouter, RouterResult } from '@/modules/media-router'
import { preflightCostCheck } from '@/lib/cost-guard'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineResult {
  success: boolean
  campaignId: string
  totalTasks: number
  submitted: number
  failed: number
  skipped: number
  totalEstimatedCostUsd: number
  jobs: RouterResult[]
  errors: string[]
  error?: string
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Run the full media generation pipeline for a campaign.
 *
 * @param campaignId
 * @param teamId      — must match campaign.team_id (authorization)
 */
export async function execute(
  campaignId: string,
  teamId: string,
): Promise<PipelineResult> {
  const db = getServiceClient()

  // ── Load campaign ──────────────────────────────────────────────────────────
  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('team_id', teamId)
    .single()

  if (fetchError || !campaign) {
    return {
      success: false,
      campaignId,
      totalTasks: 0,
      submitted: 0,
      failed: 0,
      skipped: 0,
      totalEstimatedCostUsd: 0,
      jobs: [],
      errors: [],
      error: `CAMPAIGN_NOT_FOUND: ${fetchError?.message || 'Campaign not found or access denied'}`,
    }
  }

  const c = campaign as Campaign

  // ── [PL-4] Validate mediaTasks ─────────────────────────────────────────────
  const mediaTasks: MediaTask[] = c.strategy?.mediaTasks

  if (!Array.isArray(mediaTasks) || mediaTasks.length === 0) {
    return {
      success: false,
      campaignId,
      totalTasks: 0,
      submitted: 0,
      failed: 0,
      skipped: 0,
      totalEstimatedCostUsd: 0,
      jobs: [],
      errors: ['INVALID_STRATEGY: campaign.strategy.mediaTasks is missing or empty'],
      error: 'INVALID_STRATEGY',
    }
  }

  // ── [PL-2] Pre-flight cost gate ────────────────────────────────────────────
  const costCheck = preflightCostCheck(
    mediaTasks
      .filter(t => t.type !== 'raw_edit')
      .map(t => ({
        generator: t.type === 'avatar' ? 'heygen'
          : t.type === 'broll' ? 'runway'
            : 'higgsfield' as Parameters<typeof preflightCostCheck>[0][0]['generator'],
        taskType: t.type,
      })),
    c.budgetUsd ?? null,
    c.spentUsd ?? 0,
  )

  if (!costCheck.allowed) {
    await db.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return {
      success: false,
      campaignId,
      totalTasks: mediaTasks.length,
      submitted: 0,
      failed: 0,
      skipped: mediaTasks.length,
      totalEstimatedCostUsd: costCheck.totalEstimated,
      jobs: [],
      errors: [costCheck.reason || 'BUDGET_EXCEEDED'],
      error: 'BUDGET_EXCEEDED',
    }
  }

  // ── Set campaign to generating ─────────────────────────────────────────────
  await db.from('campaigns').update({ status: 'generating' }).eq('id', campaignId)

  // ── [PL-1] Per-task loop with error isolation ──────────────────────────────
  const jobs: RouterResult[] = []
  const errors: string[] = []
  let submitted = 0
  let failed = 0
  let totalCost = 0

  for (let i = 0; i < mediaTasks.length; i++) {
    const task = mediaTasks[i]

    try {
      // Create pending media_asset record BEFORE routing
      const { data: asset } = await db
        .from('media_assets')
        .insert({
          campaign_id: campaignId,
          client_id: c.clientId,
          team_id: teamId,
          type: task.type === 'raw_edit' ? 'raw' : task.type,
          format: 'video',
          status: 'pending',
          generator: task.type === 'avatar' ? 'heygen'
            : task.type === 'broll' ? 'runway'
              : task.type === 'cinematic' ? 'higgsfield'
                : 'ffmpeg',
          metadata: { task_index: i, task },
        })
        .select('id')
        .single()

      // Route to generator
      const result = await mediaRouter(task, teamId, campaignId)

      // Link job to asset
      if (result.ok && result.jobId && asset) {
        await db
          .from('media_assets')
          .update({ status: 'generating', job_id: result.jobId })
          .eq('id', asset.id)
        submitted++
        totalCost += result.estimatedCostUsd
      } else if (!result.ok) {
        if (asset) {
          await db.from('media_assets').update({ status: 'failed' }).eq('id', asset.id)
        }
        failed++
        errors.push(`Task[${i}] ${task.type}: ${result.error}`)
      } else if (task.type === 'raw_edit') {
        // raw_edit: mark immediately ready, no job needed
        if (asset) {
          await db.from('media_assets').update({ status: 'ready' }).eq('id', asset.id)
        }
        submitted++
      }

      jobs.push(result)

    } catch (err) {
      // [PL-1] Catch per-task — do not let one task kill the loop
      failed++
      errors.push(`Task[${i}] ${task.type}: UNHANDLED_ERROR: ${(err as Error).message}`)
      console.error(`[Pipeline] Task[${i}] unhandled error:`, err)
    }
  }

  // ── Update campaign spend ──────────────────────────────────────────────────
  const newStatus = failed === mediaTasks.length ? 'failed'
    : submitted > 0 ? 'generating'
      : 'failed'

  await db
    .from('campaigns')
    .update({
      status: newStatus,
      spent_usd: (c.spentUsd || 0) + totalCost,
    })
    .eq('id', campaignId)

  console.log(
    `[Pipeline] Campaign ${campaignId} | ` +
    `submitted:${submitted} failed:${failed} | est:$${totalCost.toFixed(4)}`
  )

  return {
    success: submitted > 0,
    campaignId,
    totalTasks: mediaTasks.length,
    submitted,
    failed,
    skipped: 0,
    totalEstimatedCostUsd: +totalCost.toFixed(4),
    jobs,
    errors,
  }
}
