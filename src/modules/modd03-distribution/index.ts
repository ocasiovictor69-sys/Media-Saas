import { MediaServices, ModuleResult } from '../../lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DistributionInputs {
  content_url: string
  platforms: string[]
  lead_id: string
}

export interface DistributionResult extends ModuleResult {
  links?: string[]
}

// ── Module Execution ──────────────────────────────────────────────────────────

export async function execute(
  inputs: DistributionInputs,
  db: any,
  services: MediaServices
): Promise<DistributionResult> {
  const { content_url, platforms, lead_id } = inputs

  console.log(`[MOD-D03] Initiating Distribution for lead: ${lead_id}`)

  // 1. Strict Service Validation
  if (!services.memory || !services.social) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: Module requires Memory and Social services' }
  }

  // 2. Execution: Distribute to Platforms (Simulated Social API)
  const distRes = await services.social.distribute({ content_url, platforms })

  // 3. Memory Layer: Permanent Graph (Neo4j)
  await services.memory.mapRelationships({
    lead_id,
    event: 'CONTENT_DISTRIBUTED',
    platforms,
    links: distRes.links,
    timestamp: new Date().toISOString()
  })

  return {
    success: true,
    links: distRes.links,
    transition: 'MOD-D04'
  }
}
