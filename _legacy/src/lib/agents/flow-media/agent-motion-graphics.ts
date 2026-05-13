// src/lib/agents/flow-media/agent-motion-graphics.ts
import { AgentRunner } from './_base'
import { uploadToR2, buildR2Key } from '@/lib/services/r2'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import type { AgentInput, AgentResult } from './_types'

export class AgentMotionGraphics extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { audio_mix_r2_key, brand_config } = payload as { audio_mix_r2_key: string; brand_config: any }

    await this.db.from('jobs').update({ status: 'producing', pipeline_stage: 'rendering_remotion' }).eq('id', job_id)

    const outputPath = path.join(os.tmpdir(), `final-render-${job_id}.mp4`)
    
    // In a real implementation, this would use @remotion/lambda to render branded overlays
    await fs.writeFile(outputPath, 'remotion-final-render-buffer')

    const r2Key = buildR2Key(client_id, job_id, 'produced', 'final_render.mp4')
    const buffer = await fs.readFile(outputPath)
    await uploadToR2(r2Key, buffer, 'video/mp4')

    await this.db.from('assets').insert({ job_id, client_id, asset_type: 'produced', r2_key: r2Key, mime_type: 'video/mp4', metadata: { stage: 'final_render' } })
    await this.db.from('approvals').insert({ job_id, client_id, checkpoint_type: 'final_review', status: 'pending', payload: { r2_key: r2Key } })
    await this.db.from('jobs').update({ status: 'checkpoint_3', pipeline_stage: 'awaiting_final_review' }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-motion-graphics', 'RENDER_COMPLETE', { r2_key: r2Key })

    const notification = this.buildNotification(`Final render ready for job ${job_id}. Final review required.`, `/dashboard/jobs/${job_id}/final-review`, 'action_required')
    await this.notify(notification)

    return { success: true, agent: 'agent-motion-graphics', action_taken: 'final_render_complete', next_status: 'checkpoint_3', notification }
  }
}
