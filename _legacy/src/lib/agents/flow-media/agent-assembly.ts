// src/lib/agents/flow-media/agent-assembly.ts
import { AgentRunner } from './_base'
import { assembleClips } from '@/lib/services/ffmpeg'
import { uploadToR2, buildR2Key } from '@/lib/services/r2'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import type { AgentInput, AgentResult } from './_types'

type EDLClip = { r2_key: string; in: number; out: number; transition: string }
type EDL = { clips: EDLClip[]; notes: string }

export class AgentAssembly extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { selected_variation_id } = payload as { selected_variation_id: string }

    const { data: variation, error: varErr } = await this.db.from('variations').select('*').eq('id', selected_variation_id).single()
    if (varErr || !variation) return { success: false, agent: 'agent-assembly', action_taken: 'none', error: 'VARIATION_NOT_FOUND' }

    const { data: broll } = await this.db.from('assets').select('r2_key').eq('job_id', job_id).eq('asset_type', 'raw')
    const clips = [variation.r2_key, ...((broll || []).map((a: { r2_key: string }) => a.r2_key))]

    const edl = await this.buildEDL(clips, variation.content || '')
    const outputPath = path.join(os.tmpdir(), `assembly-${job_id}.mp4`)
    
    // In a real implementation, assembleClips would download from R2 and use FFmpeg
    await assembleClips(clips, outputPath)

    const r2Key = buildR2Key(client_id, job_id, 'produced', 'assembly.mp4')
    const buffer = await fs.readFile(outputPath)
    await uploadToR2(r2Key, buffer, 'video/mp4')

    await this.db.from('assets').insert({ job_id, client_id, asset_type: 'produced', r2_key: r2Key, mime_type: 'video/mp4', metadata: { edl } })
    await this.db.from('approvals').insert({ job_id, client_id, checkpoint_type: 'client_approval', status: 'pending', payload: { stage: 'assembly', r2_key: r2Key } })
    await this.db.from('jobs').update({ status: 'checkpoint_2', pipeline_stage: 'awaiting_client_approval' }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-assembly', 'ASSEMBLY_COMPLETE', { r2_key: r2Key })

    const notification = this.buildNotification(`Assembly cut ready for job ${job_id}. Client approval needed.`, `/dashboard/jobs/${job_id}/client-review`, 'action_required')
    await this.notify(notification)

    return { success: true, agent: 'agent-assembly', action_taken: 'assembly_complete', next_status: 'checkpoint_2', notification }
  }

  private async buildEDL(clips: string[], scriptContext: string): Promise<EDL> {
    const prompt =
      `Given these ${clips.length} clips and this script context, produce an Edit Decision List. ` +
      `Return JSON only: { "clips": [{ "r2_key": string, "in": number, "out": number, "transition": "cut"|"fade"|"dissolve" }], "notes": string }\n\n` +
      `Script: "${scriptContext.slice(0, 300)}"`
    const fallback = JSON.stringify({ clips: clips.map((r2_key, i) => ({ r2_key, in: 0, out: 5, transition: i === 0 ? 'cut' : 'cut' })), notes: 'Default assembly' })
    const raw = await this.askHermes(prompt, fallback)
    try {
      const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]) as EDL
      if (parsed.clips?.length) return parsed
    } catch { /* use fallback */ }
    return JSON.parse(fallback) as EDL
  }
}
