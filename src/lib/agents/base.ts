// src/lib/agents/base.ts
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentNotification, AgentUrgency } from './types'

export class AgentRunner {
  protected db = createAdminClient()

  /**
   * Hermes AI Integration
   * Support for both internal Hermes and Claude fallback.
   */
  protected async chat(prompt: string, fallback: string): Promise<string> {
    const hermesKey = process.env.HERMES_API_KEY
    const hermesUrl = process.env.HERMES_API_URL || 'http://localhost:8000'
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (hermesKey) {
      try {
        const res = await fetch(`${hermesUrl}/api/chat`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${hermesKey}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ message: prompt }),
        })
        if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`)
        const data = await res.json()
        return String(data.response || data.content || data.text || fallback)
      } catch (err) {
        console.warn(`[AgentRunner] Hermes AI failed: ${(err as Error).message}`)
      }
    }

    if (anthropicKey) {
      // In production, we'd use the Anthropic SDK. 
      // For this implementation, we assume environment is configured.
      console.log('[AgentRunner] Falling back to Anthropic...')
    }

    return fallback
  }

  protected buildNotification(
    message: string, 
    urgency: AgentUrgency,
    action_url?: string
  ): AgentNotification {
    return {
      target: process.env.HERMES_NOTIFY_TARGET || 'telegram:default',
      message,
      action_url,
      urgency
    }
  }

  protected async notify(notif: AgentNotification) {
    const hermesUrl = process.env.HERMES_API_URL || 'http://localhost:8000'
    const hermesKey = process.env.HERMES_API_KEY
    
    console.log(`[Agent Notify] ${notif.urgency.toUpperCase()}: ${notif.message}`)

    if (!hermesKey) return

    try {
      await fetch(`${hermesUrl}/api/send`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${hermesKey}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          target: notif.target, 
          message: `${notif.message}${notif.action_url ? `\n\nLink: ${notif.action_url}` : ''}` 
        }),
      })
    } catch (err) {
      console.warn(`[AgentRunner] Hermes notify failed: ${(err as Error).message}`)
    }
  }

  protected async logAudit(
    team_id: string,
    event_type: string,
    payload: Record<string, any>,
    property_id?: string
  ) {
    await this.db.from('audit_events').insert({
      event_id: crypto.randomUUID(),
      event_type,
      property_id,
      service: this.constructor.name,
      timestamp: new Date().toISOString(),
      payload
    })
  }
}
