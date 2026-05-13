// src/lib/agents/agent-sourcing.ts
import { AgentRunner } from './base'
import type { AgentInput, AgentResult } from './types'
import { crypto } from '@/lib/api-utils' // Assumes we have a crypto helper or use native

export class AgentSourcing extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { team_id } = input
    const attomKey = process.env.ATTOM_API_KEY
    const propstreamKey = process.env.PROPSTREAM_API_KEY

    if (!attomKey) {
      return { success: false, agent: 'AgentSourcing', action_taken: 'none', error: 'ATTOM_API_KEY not set' }
    }

    // 1. Fetch leads from external sources
    const rawProperties = await this.fetchAttomProperties(attomKey)
    
    let sourcedCount = 0
    let highPriorityCount = 0

    for (const prop of rawProperties) {
      // 2. Calculate 4D Score
      const scored = this.calculateFourD(prop)
      
      // 3. Create Unique Fingerprint (Address + City + State)
      const fingerprint = `${prop.address?.line1 || ''}|${prop.address?.city || ''}|${prop.address?.state || ''}`.toLowerCase()

      // 4. Upsert into Properties table
      const { data: savedProp, error: propError } = await this.db
        .from('properties')
        .upsert({
          tenant_id: team_id,
          source: 'ATTOM',
          external_id: String(prop.identifier?.attomId || ''),
          source_fingerprint: fingerprint,
          address: prop.address?.oneLine || 'Unknown',
          raw_data: prop,
          four_d_score: scored.score,
          four_d_priority: scored.priority,
          four_d_breakdown: scored.signals,
          pipeline: scored.pipeline,
          pipeline_status: scored.score >= 40 ? 'PENDING' : 'HALTED'
        }, { onConflict: 'source_fingerprint' })
        .select()
        .single()

      if (propError) {
        console.error('[AgentSourcing] Property upsert failed:', propError)
        continue
      }

      // 5. If High Score, promote to Leads table
      if (scored.score >= 70) {
        highPriorityCount++
        await this.db.from('leads').upsert({
          team_id: team_id,
          seller_name: prop.owner?.name || 'Unknown Owner',
          property_address: prop.address?.oneLine || 'Unknown',
          property_zip: prop.address?.postalCode || '',
          score: scored.score,
          stage: 'NEW',
          priority: 'HIGH',
          attom_data: prop,
          pipeline: scored.pipeline === 'commercial' ? '2' : '1'
        })
      }
      
      sourcedCount++
    }

    await this.logAudit(team_id, 'SOURCING_COMPLETE', { sourcedCount, highPriorityCount })

    const notification = this.buildNotification(
      `Sourcing complete. ${sourcedCount} properties indexed, ${highPriorityCount} HIGH priority leads found.`,
      'info',
      '/dashboard/leads'
    )
    await this.notify(notification)

    return { 
      success: true, 
      agent: 'AgentSourcing', 
      action_taken: 'properties_sourced',
      notification,
      payload: { sourcedCount, highPriorityCount }
    }
  }

  private async fetchAttomProperties(apiKey: string): Promise<any[]> {
    try {
      const res = await fetch('https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/snapshot?radius=10&latitude=25.7617&longitude=-80.1918&pagesize=50', {
        headers: { apikey: apiKey, Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`ATTOM HTTP ${res.status}`)
      const data = await res.json()
      return data.property || []
    } catch (err) {
      console.error('[AgentSourcing] ATTOM Fetch error:', err)
      return []
    }
  }

  private calculateFourD(prop: any) {
    let score = 0
    const signals: string[] = []

    // Example signals (based on ATTOM data structure)
    if (prop.assessment?.taxDelinquent === 'Y') { score += 30; signals.push('TAX_DELINQUENT') }
    if (prop.vintage?.lastSalesPrice < 100000) { score += 10; signals.push('LOW_COST_BASIS') }
    if (prop.summary?.absenteeInd === 'Y') { score += 20; signals.push('ABSENTEE_OWNER') }
    if (prop.summary?.propClass === 'Commercial') { score += 10; signals.push('COMMERCIAL_ASSET') }

    const pipeline = prop.summary?.propClass === 'Commercial' ? 'commercial' : 'residential'
    const priority = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'

    return { score: Math.min(score, 100), signals, pipeline, priority }
  }
}
