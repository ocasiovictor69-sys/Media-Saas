import { MediaServices, ModuleResult } from '../../lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EngagementInputs {
  channel_id: string
  lead_id: string
}

export interface EngagementResult extends ModuleResult {
  engagement_count?: number
}

// ── Module Execution ──────────────────────────────────────────────────────────

export async function execute(
  inputs: EngagementInputs,
  db: any,
  services: MediaServices
): Promise<EngagementResult> {
  const { channel_id, lead_id } = inputs

  console.log(`[MOD-D04] Monitoring Engagement for lead: ${lead_id} on channel: ${channel_id}`)

  // 1. Strict Service Validation
  if (!services.memory || !services.social) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: Module requires Memory and Social services' }
  }

  // 2. Execution: Fetch Comments (Simulated Social API)
  const engRes = await services.social.monitorEngagement(channel_id)

  // 3. Memory Layer: Permanent Graph (Neo4j)
  await services.memory.mapRelationships({
    lead_id,
    event: 'ENGAGEMENT_PROCESSED',
    engagement_count: engRes.comments.length,
    timestamp: new Date().toISOString()
  })

  return {
    success: true,
    engagement_count: engRes.comments.length,
    transition: 'MOD-FINISHED'
  }
}
