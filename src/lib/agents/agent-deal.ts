// src/lib/agents/agent-deal.ts (Flow Media Edition)
import { AgentRunner } from './base'
import type { AgentInput, AgentResult } from './types'
import { Underwriter } from '@/lib/engine/underwriter/engine'

export class AgentDeal extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { lead_id, team_id } = input
    
    // 1. Fetch Campaign Data
    const { data: campaign } = await this.db
      .from('leads') // Reusing 'leads' table for campaign metadata in this template
      .select('*')
      .eq('id', lead_id)
      .single()

    if (!campaign) {
      return { success: false, agent: 'AgentDeal', action_taken: 'none', error: 'CAMPAIGN_NOT_FOUND' }
    }

    // 2. Prepare Cost Guard Input
    const underwritingInput = {
      tasks: campaign.attom_data?.tasks || [
        { generator: 'heygen', taskType: 'avatar' },
        { generator: 'runway', taskType: 'broll' }
      ],
      budget_usd: campaign.valuation?.budget_usd || 100.00,
      spent_usd: campaign.valuation?.spent_usd || 0.00
    }

    // 3. Execute Cost Guard
    const result = Underwriter.evaluate(underwritingInput as any)

    // 4. Generate Narrative
    const narrative = await this.buildFlowNarrative(campaign.seller_name, result)

    // 5. Create Approval Queue Item
    await this.db.from('approval_queue').insert({
      agent_id: campaign.owner_id || 'system',
      checkpoint_type: 'buy_box_confirmation',
      status: 'pending',
      payload: {
        campaign_id: lead_id,
        metrics: result,
        narrative
      }
    })

    await this.logAudit(team_id, 'CAMPAIGN_COST_GUARD_COMPLETE', { allowed: result.allowed }, lead_id)

    return { 
      success: true, 
      agent: 'AgentDeal', 
      action_taken: 'preflight_complete',
      notification: this.buildNotification(
        `Pre-flight complete for ${campaign.seller_name}. Status: ${result.allowed ? 'READY' : 'HALTED'}`,
        result.allowed ? 'info' : 'warning',
        `/dashboard/leads/${lead_id}`
      ),
      payload: { result }
    }
  }

  private async buildFlowNarrative(name: string, res: any): Promise<string> {
    const prompt = `
      Draft a professional media production pre-flight summary for campaign "${name}".
      Status: ${res.allowed ? 'BUDGET_APPROVED' : 'BUDGET_EXCEEDED'}
      Estimated Cost: $${res.total_estimated_usd.toFixed(2)}
      Remaining Budget: $${res.remaining_budget_usd?.toFixed(2) || 'N/A'}
      
      Breakdown:
      ${res.breakdown.map((b: any) => `- ${b.generator} (${b.taskType}): $${b.estimatedUsd.toFixed(2)}`).join('\n')}
      
      Keep it professional and concise.
    `
    return this.chat(prompt, `Pre-flight complete for ${name}: ${res.allowed ? 'ALLOWED' : 'HALTED'}`)
  }
}
