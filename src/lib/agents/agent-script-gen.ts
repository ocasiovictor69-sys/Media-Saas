import { AgentRunner } from './base'
import type { AgentInput, AgentResult, ScriptResult } from './types'
import Anthropic from '@anthropic-ai/sdk'

export class AgentScriptGen extends AgentRunner {
  private anthropic: Anthropic

  constructor(supabase: any) {
    super(supabase)
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    })
  }

  async run(input: AgentInput): Promise<AgentResult> {
    const { team_id, payload } = input
    const topic = payload?.topic || 'Media Production Strategy'

    try {
      // 1. Generate Script via Anthropic
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate a high-conversion 60-second video script about: ${topic}. 
          Return a JSON object with: title, hook, body, call_to_action, estimated_duration (seconds).`
        }]
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const script: ScriptResult = JSON.parse(content)

      // 2. Persist Media Asset Concept
      const { data: asset, error: assetError } = await this.db
        .from('media_assets')
        .insert({
          team_id,
          title: script.title,
          description: script.hook,
          s3_key: 'PENDING_UPLOAD',
          media_type: 'VIDEO',
          status: 'PROCESSING',
          metadata: script
        })
        .select()
        .single()

      if (assetError) throw assetError

      await this.logAudit(team_id, 'SCRIPT_GENERATED', { topic }, asset.id)

      return {
        success: true,
        agent: 'AgentScriptGen',
        action_taken: 'script_generation_complete',
        payload: { asset_id: asset.id, script }
      }

    } catch (err) {
      return { success: false, agent: 'AgentScriptGen', action_taken: 'failed', error: (err as Error).message }
    }
  }
}
