// src/lib/agents/flow-media/agent-heygen.ts
import { AgentRunner } from './_base'
import { buildHeyGenClient } from '@/lib/services/heygen'
import type { AgentInput, AgentResult } from './_types'

export class AgentHeyGen extends AgentRunner {
  private heygen = buildHeyGenClient()

  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { selected_script, avatar_id, voice_id } = payload as { selected_script: string; avatar_id: string; voice_id: string }

    if (!this.heygen) {
      const notification = this.buildNotification(`HeyGen unavailable for job ${job_id}.`, `/dashboard/jobs/${job_id}`, 'warning')
      await this.notify(notification)
      return { success: false, agent: 'agent-heygen', action_taken: 'none', error: 'HEYGEN_UNAVAILABLE', notification }
    }

    const optimizedScript = await this.optimizeForSpeech(selected_script)

    await this.db.from('jobs').update({ status: 'producing', pipeline_stage: 'generating_heygen' }).eq('id', job_id)

    const videoIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const { video_id } = await this.heygen.generateAvatar({ avatar_id, voice_id, script: optimizedScript })
      videoIds.push(video_id)
    }

    const videoUrls: string[] = []
    for (const vid of videoIds) {
      let attempts = 0
      let delay = 5000
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, delay))
        const status = await this.heygen!.pollVideo(vid)
        
        if (status.status === 'completed' && status.video_url) {
          videoUrls.push(status.video_url)
          break
        }
        
        if (status.status === 'failed') {
          console.error(`[AgentHeyGen] Video ${vid} failed:`, status)
          break
        }
        
        attempts++
        delay = Math.min(delay * 1.5, 60000)
      }
    }

    const persistedKeys: string[] = []
    for (let i = 0; i < videoUrls.length; i++) {
      const key = await this.persistAsset(videoUrls[i], client_id, job_id, 'produced', `heygen_${i}.mp4`)
      persistedKeys.push(key)
    }

    for (let i = 0; i < persistedKeys.length; i++) {
      await this.db.from('variations').insert({ job_id, variation_type: 'avatar', variation_index: i, r2_key: persistedKeys[i], generator: 'heygen', selected: false })
    }

    await this.db.from('approvals').insert({ job_id, client_id, checkpoint_type: 'internal_review', status: 'pending', payload: { generator: 'heygen', video_count: videoUrls.length } })
    await this.db.from('jobs').update({ status: 'checkpoint_1', pipeline_stage: 'awaiting_internal_review' }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-heygen', 'HEYGEN_COMPLETE', { video_count: videoUrls.length })

    const notification = this.buildNotification(`2 HeyGen avatar videos generated for job ${job_id}. Internal review required.`, `/dashboard/jobs/${job_id}/review-variations`, 'action_required')
    await this.notify(notification)

    return { success: true, agent: 'agent-heygen', action_taken: 'avatar_videos_generated', next_status: 'checkpoint_1', notification }
  }

  private async optimizeForSpeech(script: string): Promise<string> {
    const prompt = `Review this script for spoken avatar delivery. Fix any lines that are too long or awkward to speak. Return only the optimized script text.\n\nScript: "${script}"`
    return this.askHermes(prompt, script)
  }
}
