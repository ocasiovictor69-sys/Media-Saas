import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FlowMediaOrchestrator } from '@/lib/engine/orchestrator'

/**
 * POST /api/media/pipeline
 *
 * Trigger the full media generation pipeline for a campaign.
 * Body: { campaign_id }
 *
 * Returns immediately with job IDs — generation is async.
 * Poll /api/media/jobs/[jobId] for status.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (!profile?.team_id) return NextResponse.json({ error: 'Team not found' }, { status: 403 })

  let body: { campaign_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 422 })

  // Initialize orchestrator with required services
  const orchestrator = new FlowMediaOrchestrator({
    memory: {
      captureContext:   async (p) => { console.log('[Memory] Context Captured', p); return { ok: true } },
      mapRelationships: async (p) => { console.log('[Memory] Graph Updated', p); return { ok: true } }
    },
    creative: {
      generateScript: async (brief) => ({ script: 'Mock tailored script', tone: 'professional' }),
      generateCourse: async (topic, avatarId) => ({ chapters: [] })
    },
    production: {
      ingestRawFootage: async (raw) => ({ assetId: 'raw-123', status: 'ready' }),
      generateAIFootage: async (script, avatarId) => ({ assetId: 'ai-123', status: 'ready' }),
      renderPostProduction: async (manifest) => {
        console.log('[Post-Production] Compositing final media (Raw/AI/Graphics)...', manifest);
        // This is where FFMPEG or Remotion lambda render is invoked
        return { outputUrl: `https://storage.tomorrownow.ai/composite/${manifest.lead_id || Date.now()}.mp4` }
      }
    },
    social: {
      distribute: async (content) => ({ success: true, links: [] }),
      monitorEngagement: async (channelId) => {
        console.log(`[Social] Fetching comments for ${channelId}`);
        return { comments: [] }
      }
    }
  })

  const result = await orchestrator.runCampaign(body.campaign_id, profile.team_id)

  return NextResponse.json(result, { status: result.success ? 200 : 422 })
}
