import { MediaServices, ModuleResult, SupabaseClient } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PostProductionInputs {
  manifest: any
}

export interface PostProductionResult extends ModuleResult {
  output_url?: string
}

// ── Module Execution ──────────────────────────────────────────────────────────

export async function execute(
  inputs: PostProductionInputs,
  db: SupabaseClient,
  services: MediaServices
): Promise<PostProductionResult> {
  const { manifest } = inputs

  console.log(`[MOD-D02] Initiating Post-Production for manifest of lead: ${manifest.lead_id}`)

  // 1. Strict Service Validation
  if (!services.memory || !services.video) {
    return { success: false, transition: 'MOD-HALT', error: 'SERVICE_MISSING: Module requires Memory and Video services' }
  }

  // 2. Execution: Render Video (Simulated Remotion)
  const renderRes = await services.video.renderVideo(manifest)

  // 3. Memory Layer: Working Context (Zep)
  await services.memory.captureContext({
    type: 'video_render_completed',
    lead_id: manifest.lead_id,
    output_url: renderRes.outputUrl,
    timestamp: new Date().toISOString()
  })

  return {
    success: true,
    output_url: renderRes.outputUrl,
    transition: 'MOD-D03'
  }
}
