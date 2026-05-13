// src/lib/agents/flow-media/agent-brief.ts
import { AgentRunner } from './_base'
import type { AgentInput, AgentResult } from './_types'

const CONTENT_TYPE_TO_GENERATOR: Record<string, string> = {
  avatar_video: 'heygen', talking_head: 'heygen',
  cinematic: 'higgsfield', broll: 'higgsfield', scene: 'higgsfield', marketing: 'higgsfield',
  explainer: 'remotion', slideshow: 'remotion', thumbnail: 'remotion',
  podcast: 'ffmpeg', course: 'heygen',
}

export class AgentBrief extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { job_id, client_id, payload } = input
    const { goal, tone, target_audience, content_types, platforms, notes, deadline } = payload as Record<string, string | string[]>

    const { data: brief, error } = await this.db.from('briefs').insert({
      job_id, client_id,
      goal, tone, target_audience,
      platforms:     Array.isArray(platforms) ? platforms : [platforms],
      content_types: Array.isArray(content_types) ? content_types : [content_types],
      notes: notes || null,
      deadline: deadline || null,
      raw_form: payload,
    }).select().single()

    if (error || !brief) return { success: false, agent: 'agent-brief', action_taken: 'none', error: `BRIEF_INSERT_FAIL: ${error?.message}` }

    const scripts = await this.generateScripts(String(goal), String(tone), String(target_audience), Array.isArray(platforms) ? platforms : [String(platforms)])

    for (let i = 0; i < scripts.length; i++) {
      await this.db.from('variations').insert({ job_id, variation_type: 'script', variation_index: i, content: scripts[i], generator: this.ai?.provider || 'template', selected: false })
    }

    const generator = (Array.isArray(content_types) ? content_types : [content_types]).map(t => CONTENT_TYPE_TO_GENERATOR[t]).filter(Boolean)[0] || 'higgsfield'

    await this.db.from('jobs').update({ status: 'checkpoint_1', pipeline_stage: 'script_selection', metadata: { primary_generator: generator } }).eq('id', job_id)
    await this.writeAudit(client_id, job_id, 'agent-brief', 'BRIEF_COMPLETE', { script_count: scripts.length, generator })

    const notification = this.buildNotification(
      `Brief processed for job ${job_id} — 3 script variations ready. Primary tool: ${generator}.`,
      `/dashboard/jobs/${job_id}/select-script`,
      'action_required'
    )
    await this.notify(notification)

    return { success: true, agent: 'agent-brief', action_taken: 'brief_built', next_status: 'checkpoint_1', notification }
  }

  private async generateScripts(goal: string, tone: string, audience: string, platforms: string[]): Promise<string[]> {
    const fallback = [
      `${tone} script for ${audience}: ${goal}. Keep it concise and action-oriented.`,
      `Conversational ${tone} script addressing ${audience}. Goal: ${goal}. Focus on benefits.`,
      `${tone} script for ${goal}. Target: ${audience}. Lead with a strong hook.`,
    ]
    const prompt =
      `You are a professional media scriptwriter. Write 3 distinct script variations for: "${goal}". ` +
      `Tone: ${tone}. Audience: ${audience}. Platforms: ${platforms.join(', ')}. ` +
      `Return JSON only: { "scripts": [string, string, string] }`
    const raw = await this.askHermes(prompt, JSON.stringify({ scripts: fallback }))
    try {
      const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]) as { scripts?: string[] }
      if (parsed.scripts?.length === 3) return parsed.scripts
    } catch { /* use fallback */ }
    return fallback
  }
}
