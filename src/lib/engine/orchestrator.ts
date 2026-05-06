import { createClient } from '@supabase/supabase-js'
import { eventBus, MEDIA_EVENTS } from './event-bus'
import { execute as modD01 } from './modules/modd01-pre-production'
import { execute as modD02 } from './modules/pipeline' // This is the multi-task generator
import { execute as modD03 } from './modules/modd03-distribution'
import { execute as modD04 } from './modules/modd04-engagement'
import { MediaServices, Campaign } from '../types'

/**
 * Flow-Media Master Orchestrator
 *
 * The "Brain" of the autonomous factory. 
 * Orchestrates the 4-module flow:
 *   MOD-D01: Pre-Production (Script/Manifest)
 *   MOD-D02: Generation (Router/AI Providers)
 *   MOD-D03: Distribution (Social/Buffer)
 *   MOD-D04: Engagement (Sentiment/Lead-back)
 */

export class FlowMediaOrchestrator {
  private db: any
  private services: MediaServices

  constructor(services: MediaServices) {
    this.services = services
    this.db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Run the full autonomous loop for a campaign
   */
  async runCampaign(campaignId: string, teamId: string) {
    console.log(`[Orchestrator] Starting campaign: ${campaignId}`)

    // 1. Load Campaign
    const { data: campaign } = await this.db
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND')

    // 2. MOD-D01: Pre-Production
    // If it's a new campaign, we might need to generate manifests first.
    // In v2, we assume strategy.mediaTasks is already built, 
    // but we can run D01 per-task to refine scripts.
    
    // 3. MOD-D02: Generation (Chained Pipeline)
    // We call the existing pipeline which handles the router + AI providers.
    const generationResult = await modD02(campaignId, teamId)
    
    if (generationResult.success) {
      eventBus.dispatch(MEDIA_EVENTS.GENERATION_SUBMITTED, { 
        campaignId, 
        teamId, 
        jobCount: generationResult.submitted 
      })
    }

    return generationResult
  }

  /**
   * Handle completion of a generation job (called by poller)
   */
  async onGenerationComplete(jobId: string) {
    // 1. Resolve asset
    const { data: asset } = await this.db
      .from('media_assets')
      .select('*, campaigns(*)')
      .eq('job_id', jobId)
      .single()

    if (!asset || asset.status !== 'ready') return

    // 2. Trigger MOD-D03: Distribution
    const distResult = await modD03({
      campaign_id: asset.campaign_id,
      lead_id:     asset.campaigns?.source_lead_id || 'unknown',
      content_url: asset.url,
      platforms:   ['facebook', 'instagram', 'linkedin'] // Default omnichannel
    }, this.db, this.services)

    if (distResult.success) {
      eventBus.dispatch(MEDIA_EVENTS.DISTRIBUTION_COMPLETE, {
        campaignId: asset.campaign_id,
        assetId:    asset.id,
        links:      distResult.links
      })
    }
  }

  /**
   * Handle periodic engagement check
   */
  async monitorEngagement(campaignId: string) {
    const { data: assets } = await this.db
      .from('media_assets')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'ready')

    for (const asset of (assets || [])) {
      if (asset.metadata?.distribution_links) {
        for (const link of asset.metadata.distribution_links) {
          const result = await modD04({
            campaign_id: campaignId,
            lead_id:     asset.campaign_id, // maps to lead via campaign
            channel_id:  link,
            platform:    'social'
          }, this.db, this.services)

          if (result.engagement_count > 0) {
             eventBus.dispatch(MEDIA_EVENTS.ENGAGEMENT_DETECTED, {
               campaignId,
               engagement: result
             })
          }
        }
      }
    }
  }
}
