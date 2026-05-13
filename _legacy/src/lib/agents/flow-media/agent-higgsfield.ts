// src/lib/agents/flow-media/agent-higgsfield.ts
import { AgentRunner } from './_base'
import { buildHiggsfieldClient } from '@/lib/services/higgsfield'
import type { AgentInput, AgentResult } from './_types'

export class AgentHiggsfield extends AgentRunner {
  private higgsfield = buildHiggsfieldClient()

  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { selected_script, brief_context } = payload as { selected_script: string; brief_context?: string }

    if (!this.higgsfield) {
      await this.db.from('jobs').update({ status: 'failed', pipeline_stage: 'higgsfield_unavailable' }).eq('id', job_id)
      const notification = this.buildNotification(`Higgsfield unavailable for job ${job_id} — manual intervention required.`, `/dashboard/jobs/${job_id}`, 'warning')
      await this.notify(notification)
      return { success: false, agent: 'agent-higgsfield', action_taken: 'none', error: 'HIGGSFIELD_UNAVAILABLE', notification }
    }

    const promptText = await this.buildGenerationPrompt(selected_script, brief_context || '')

    await this.db.from('jobs').update({ status: 'producing', pipeline_stage: 'generating_higgsfield' }).eq('id', job_id)

    const jobIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const { job_id: hid } = await this.higgsfield.generate({ prompt: promptText, duration: 5, aspect_ratio: '16:9' })
      jobIds.push(hid)
    }

    const videoUrls: string[] = []
    for (const hid of jobIds) {
      let attempts = 0
      let delay = 5000 // Start with 5s
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, delay))
        const status = await this.higgsfield!.pollJob(hid)
        
        if (status.status === 'completed' && status.video_url) {
          videoUrls.push(status.video_url)
          break
        }
        
        if (status.status === 'failed') {
          console.error(`[AgentHiggsfield] Job ${hid} failed:`, status)
          break // Or throw if critical
        }
        
        attempts++
        delay = Math.min(delay * 1.5, 60000) // Max 1 minute
      }
    }

    const persistedKeys: string[] = []
    for (let i = 0; i < videoUrls.length; i++) {
      const key = await this.persistAsset(videoUrls[i], client_id, job_id, 'produced', `higgsfield_${i}.mp4`)
      persistedKeys.push(key)
    }

    for (let i = 0; i < persistedKeys.length; i++) {
      await this.db.from('variations').insert({ job_id, variation_type: 'video', variation_index: i, r2_key: persistedKeys[i], generator: 'higgsfield', selected: false })
    }

    await this.db.from('approvals').insert({ job_id, client_id, checkpoint_type: 'internal_review', status: 'pending', payload: { generator: 'higgsfield', video_count: videoUrls.length } })
    await this.db.from('jobs').update({ status: 'checkpoint_1', pipeline_stage: 'awaiting_internal_review' }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-higgsfield', 'HIGGSFIELD_COMPLETE', { video_count: videoUrls.length })

    const notification = this.buildNotification(`2 Higgsfield variations generated for job ${job_id}. Internal review required.`, `/dashboard/jobs/${job_id}/review-variations`, 'action_required')
    await this.notify(notification)

    return { success: true, agent: 'agent-higgsfield', action_taken: 'variations_generated', next_status: 'checkpoint_1', notification }
  }

  private async buildGenerationPrompt(script: string, context: string): Promise<string> {
    const prompt =
      `Given this video script and context, write a precise Higgsfield cinematic generation prompt. ` +
      `Focus on: scene composition, lighting mood, camera movement, visual style. Return prompt text only.\n\n` +
      `Script: "${script}"\nContext: "${context}"`
    return this.askHermes(prompt, `Cinematic footage matching: ${script.slice(0, 100)}`)
  }
}
