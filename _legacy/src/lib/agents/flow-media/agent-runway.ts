// src/lib/agents/flow-media/agent-runway.ts
import { AgentRunner } from './_base'
import { buildRunwayClient } from '@/lib/services/runway'
import type { AgentInput, AgentResult } from './_types'

export class AgentRunway extends AgentRunner {
  private runway = buildRunwayClient()

  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { raw_asset_url, editing_goal, content_type } = payload as { raw_asset_url: string; editing_goal: string; content_type: string }

    if (!this.runway) {
      const notification = this.buildNotification(`Runway unavailable for job ${job_id}.`, `/dashboard/jobs/${job_id}`, 'warning')
      await this.notify(notification)
      return { success: false, agent: 'agent-runway', action_taken: 'none', error: 'RUNWAY_UNAVAILABLE', notification }
    }

    const runwayPrompt = await this.buildRunwayPrompt(editing_goal, content_type)

    await this.db.from('jobs').update({ status: 'producing', pipeline_stage: 'generating_runway' }).eq('id', job_id)

    const taskIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const task = await this.runway.videoToVideo({ init_video_url: raw_asset_url, text_prompt: runwayPrompt, duration: 5 })
      taskIds.push(task.id)
    }

    const outputUrls: string[] = []
    for (const tid of taskIds) {
      let attempts = 0
      let delay = 5000
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, delay))
        const status = await this.runway!.pollTask(tid)
        
        if (status.status === 'SUCCEEDED' && status.output?.[0]) {
          outputUrls.push(status.output[0])
          break
        }
        
        if (status.status === 'FAILED') {
          console.error(`[AgentRunway] Task ${tid} failed:`, status)
          break
        }
        
        attempts++
        delay = Math.min(delay * 1.5, 60000)
      }
    }

    const persistedKeys: string[] = []
    for (let i = 0; i < outputUrls.length; i++) {
      const key = await this.persistAsset(outputUrls[i], client_id, job_id, 'produced', `runway_${i}.mp4`)
      persistedKeys.push(key)
    }

    for (let i = 0; i < persistedKeys.length; i++) {
      await this.db.from('variations').insert({ job_id, variation_type: 'video', variation_index: i, r2_key: persistedKeys[i], generator: 'runway', selected: false })
    }

    await this.db.from('approvals').insert({ job_id, client_id, checkpoint_type: 'internal_review', status: 'pending', payload: { generator: 'runway', video_count: outputUrls.length } })
    await this.db.from('jobs').update({ status: 'checkpoint_1', pipeline_stage: 'awaiting_internal_review' }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-runway', 'RUNWAY_COMPLETE', { video_count: outputUrls.length })

    const notification = this.buildNotification(`2 Runway AI edits ready for job ${job_id}. Internal review required.`, `/dashboard/jobs/${job_id}/review-variations`, 'action_required')
    await this.notify(notification)

    return { success: true, agent: 'agent-runway', action_taken: 'runway_edits_generated', next_status: 'checkpoint_1', notification }
  }

  private async buildRunwayPrompt(goal: string, content_type: string): Promise<string> {
    const prompt = `Write a precise Runway AI video-to-video prompt for this editing goal: "${goal}". Content type: ${content_type}. Specify visual style, color treatment, motion characteristics. Return prompt text only.`
    return this.askHermes(prompt, `Transform footage: ${goal}`)
  }
}
