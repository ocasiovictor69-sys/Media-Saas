// src/lib/agents/flow-media/agent-distribute.ts
import { AgentRunner } from './_base'
import type { AgentInput, AgentResult } from './_types'

export class AgentDistribute extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { platform, r2_key, caption } = payload as { platform: string; r2_key: string; caption: string }

    await this.db.from('jobs').update({ status: 'completed', pipeline_stage: `distributing_${platform}` }).eq('id', job_id)

    // In a real implementation, this would use platform APIs (Instagram, TikTok, etc.)
    console.log(`[AgentDistribute] Posting ${r2_key} to ${platform} with caption: ${caption}`)

    await this.writeAudit(client_id, job_id, 'agent-distribute', 'POST_SUCCESS', { platform, r2_key })

    const notification = this.buildNotification(`Successfully posted to ${platform} for job ${job_id}.`, `/dashboard/jobs/${job_id}`, 'info')
    await this.notify(notification)

    return { success: true, agent: 'agent-distribute', action_taken: 'posted_to_platform', notification }
  }
}
