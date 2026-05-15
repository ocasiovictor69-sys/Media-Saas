import { SupabaseClient } from '@supabase/supabase-js'
import { AgentInput, AgentResult } from './types'

export abstract class AgentRunner {
  protected db: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.db = supabase
  }

  abstract run(input: AgentInput): Promise<AgentResult>

  protected async logAudit(team_id: string, event: string, metadata: any, asset_id?: string) {
    const { error } = await this.db
      .from('render_jobs') // Using render_jobs as the audit trail for media
      .insert({
        team_id,
        asset_id,
        job_type: 'AUDIT_LOG',
        status: 'COMPLETED',
        error_log: event,
        metadata,
        created_at: new Date().toISOString()
      })
    
    if (error) console.error(`[Audit Log Error] ${error.message}`)
  }
}
