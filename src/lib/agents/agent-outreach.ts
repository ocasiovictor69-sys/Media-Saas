// src/lib/agents/agent-outreach.ts
import { AgentRunner } from './base'
import type { AgentInput, AgentResult } from './types'

type OutreachPackage = {
  sms: string
  email_subject: string
  email_body: string
  call_script: string
  loom_script: string
}

export class Flow Mediautreach extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { lead_id, team_id } = input
    if (!lead_id) {
      return { success: false, agent: 'Flow Mediautreach', action_taken: 'none', error: 'MISSING_LEAD_ID' }
    }

    // 1. Fetch Lead
    const { data: lead, error: fetchError } = await this.db
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (fetchError || !lead) {
      return { success: false, agent: 'Flow Mediautreach', action_taken: 'none', error: 'LEAD_NOT_FOUND' }
    }

    // 2. Fetch Agent Profile for Voice
    const { data: profile } = await this.db
      .from('profiles')
      .select('full_name')
      .eq('id', lead.owner_id)
      .single()

    const agentName = profile?.full_name || 'Agent'
    const agentVoice = 'professional, empathetic, and solution-oriented'

    // 3. Generate Scripts via AI
    const scripts = await this.generateScripts(
      lead.seller_name,
      lead.property_address,
      lead.four_d_breakdown || [],
      agentVoice,
      agentName
    )

    // 4. Create Outreach Approval Item
    const { error: queueError } = await this.db.from('approval_queue').insert({
      agent_id: lead.owner_id || 'system',
      checkpoint_type: 'outreach_sequence',
      status: 'pending',
      payload: {
        lead_id,
        outreach: scripts,
        metadata: {
          agent_name: agentName,
          agent_voice: agentVoice
        }
      }
    })

    if (queueError) {
      console.error('[Flow Mediautreach] Queue insert failed:', queueError)
    }

    await this.logAudit(team_id, 'OUTREACH_SCRIPTS_GENERATED', { scripts }, lead_id)

    const notification = this.buildNotification(
      `Outreach scripts ready for ${lead.seller_name}. Review in approval queue.`,
      'action_required',
      `/dashboard/leads/${lead_id}`
    )
    await this.notify(notification)

    return { 
      success: true, 
      agent: 'Flow Mediautreach', 
      action_taken: 'scripts_generated',
      notification,
      payload: { scripts }
    }
  }

  private async generateScripts(
    ownerName: string, 
    address: string, 
    signals: string[], 
    agentVoice: string,
    agentName: string
  ): Promise<OutreachPackage> {
    const fallback = this.buildFallbackScripts(ownerName, address, agentName)
    
    const prompt = `
      Draft 4 outreach scripts for real estate lead.
      Seller: ${ownerName}
      Property: ${address}
      Distress Signals: ${signals.join(', ')}
      Agent: ${agentName} (Voice: ${agentVoice})

      Requirements:
      1. SMS: < 160 chars.
      2. Email: Subject + 3 paragraphs.
      3. Call: Opener + 3 talking points + 2 objection handlers.
      4. Loom: 90-second narrative script.

      Return JSON: { "sms": string, "email_subject": string, "email_body": string, "call_script": string, "loom_script": string }
    `

    const response = await this.chat(prompt, JSON.stringify(fallback))
    try {
      const parsed = JSON.parse(response)
      return {
        ...fallback,
        ...parsed,
        sms: (parsed.sms || fallback.sms).slice(0, 160)
      }
    } catch {
      return fallback
    }
  }

  private buildFallbackScripts(ownerName: string, address: string, agentName: string): OutreachPackage {
    const firstName = ownerName.split(' ')[0]
    return {
      sms: `Hi ${firstName}, this is ${agentName}. I saw your property at ${address} and wanted to reach out. Any interest in a quick chat?`,
      email_subject: `Question about ${address}`,
      email_body: `Hi ${firstName},\n\nI hope you're having a good week.\n\nI'm reaching out because I've been doing some research on property values at ${address} and believe you might be in a unique position to capitalize on recent market shifts.\n\nWould you be open to a brief 5-minute call?`,
      call_script: `Hi ${firstName}, this is ${agentName}. I'm calling about ${address}...`,
      loom_script: `Hi ${firstName}, I made this video to show you some data about ${address}...`
    }
  }
}

