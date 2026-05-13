import { createClient } from '@/lib/supabase/server'
import { postToYouTube } from './channels/youtube'
import { postToInstagram } from './channels/instagram'

export type DistributeInput = {
  job_id:       string
  client_id:    string
  asset_r2_key: string
  caption:      string
  title:        string
  platforms:    string[]
}

export async function execute(input: DistributeInput) {
  const db = await createClient()

  const { data: connections } = await db
    .from('channel_connections')
    .select('*')
    .eq('client_id', input.client_id)
    .eq('status', 'connected')
    .in('platform', input.platforms)

  if (!connections || connections.length === 0) {
    return { success: false, error: 'NO_CONNECTED_CHANNELS' }
  }

  const results: { platform: string; post_id?: string; error?: string }[] = []

  for (const conn of connections) {
    try {
      if (!conn.first_post_confirmed) {
        await db.from('approvals').insert({
          job_id:          input.job_id,
          client_id:       input.client_id,
          checkpoint_type: 'distribution_confirmation',
          status:          'pending',
          payload:         { platform: conn.platform },
        })
        results.push({ platform: conn.platform, error: 'AWAITING_FIRST_POST_CONFIRMATION' })
        continue
      }

      const assetUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${input.asset_r2_key}`
      let result: { platform: string; post_id?: string; url?: string }

      if (conn.platform === 'youtube') {
        result = await postToYouTube({
          video_url:    assetUrl,
          title:        input.title,
          description:  input.caption,
          access_token: conn.oauth_token,
        })
      } else if (conn.platform === 'instagram') {
        result = await postToInstagram({
          video_url:    assetUrl,
          caption:      input.caption,
          access_token: conn.oauth_token,
          ig_user_id:   conn.platform_user_id,
        })
      } else {
        result = { platform: conn.platform, post_id: `stub_${Date.now()}` }
      }

      results.push(result)

      await db.from('audit_events').insert({
        client_id:  input.client_id,
        job_id:     input.job_id,
        event_type: 'CONTENT_POSTED',
        actor:      'system',
        payload:    result,
      })
    } catch (err) {
      results.push({ platform: conn.platform, error: (err as Error).message })
    }
  }

  await db.from('jobs')
    .update({ status: 'complete', pipeline_stage: 'distributed' })
    .eq('id', input.job_id)

  return { success: true, results }
}
