import { MediaServices, ModuleResult } from '../../lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PreProductionInputs {
  lead_id: string
  archetype: string
  property_details: string
}

export interface PreProductionResult extends ModuleResult {
  manifest?: any
}

// ── Module Execution ──────────────────────────────────────────────────────────

export async function execute(
  inputs: PreProductionInputs,
  db: any,
  services: MediaServices
): Promise<PreProductionResult> {
  const { lead_id, archetype, property_details } = inputs

  console.log(`[MOD-D01] Initiating Pre-Production for lead: ${lead_id}`)

  // 1. Strict Service Validation
  if (!services.memory || !services.video) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: Module requires Memory and Video services' }
  }

  // 2. Execution: Generate Script (Simulated Claude)
  const script = `Hey there! We saw your property at ${property_details}. As a ${archetype}, we have a special offer for you.`

  // 3. Execution: Generate Background Assets (Simulated Higgsfield)
  const assets = await services.video.generateAssets({ script, archetype })

  const manifest = {
    lead_id,
    script,
    bg_url: assets.videoUrl,
    thumbnail: assets.thumbnail,
    voice: 'alloy',
    music: 'cinematic_uplifting'
  }

  // 4. Memory Layer: Working Context (Zep)
  await services.memory.captureContext({
    type: 'video_manifest_generated',
    lead_id,
    manifest,
    timestamp: new Date().toISOString()
  })

  return {
    success: true,
    manifest,
    transition: 'MOD-D02'
  }
}
