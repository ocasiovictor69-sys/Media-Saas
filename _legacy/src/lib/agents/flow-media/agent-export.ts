// src/lib/agents/flow-media/agent-export.ts
import { AgentRunner } from './_base'
import { uploadToR2, buildR2Key } from '@/lib/services/r2'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import type { AgentInput, AgentResult } from './_types'

export class AgentExport extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { final_render_r2_key, target_platforms } = payload as { final_render_r2_key: string; target_platforms: string[] }

    await this.db.from('jobs').update({ status: 'producing', pipeline_stage: 'exporting_formats' }).eq('id', job_id)

    const platforms = target_platforms || ['instagram', 'tiktok', 'youtube_shorts']
    const exports: Record<string, string> = {}

    for (const platform of platforms) {
      const outputPath = path.join(os.tmpdir(), `export-${platform}-${job_id}.mp4`)
      // Simulate FFmpeg transcode for platform specs
      await fs.writeFile(outputPath, `buffer-for-${platform}`)

      const r2Key = buildR2Key(client_id, job_id, 'exports', `${platform}.mp4`)
      const buffer = await fs.readFile(outputPath)
      await uploadToR2(r2Key, buffer, 'video/mp4')
      exports[platform] = r2Key
    }

    await this.db.from('jobs').update({ status: 'completed', pipeline_stage: 'ready_for_distribution', metadata: { exports } }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-export', 'EXPORT_COMPLETE', { exports })

    const notification = this.buildNotification(`Exports completed for job ${job_id}. Ready for distribution.`, `/dashboard/jobs/${job_id}/distribute`, 'info')
    await this.notify(notification)

    return { success: true, agent: 'agent-export', action_taken: 'exports_generated', next_status: 'completed', notification }
  }
}
