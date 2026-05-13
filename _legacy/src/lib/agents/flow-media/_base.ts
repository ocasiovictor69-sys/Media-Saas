// src/lib/agents/flow-media/_base.ts
import { createClient } from '@supabase/supabase-js'
import { buildAIClient } from '@/lib/services/ai'
import type { AgentNotification, AuditPayload } from './_types'

export class AgentRunner {
  protected db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  protected ai = buildAIClient()

  buildNotification(
    message: string,
    action_url: string,
    urgency: AgentNotification['urgency']
  ): AgentNotification {
    const target = process.env.HERMES_NOTIFY_TARGET || 'telegram:default'
    return { target, message, action_url, urgency }
  }

  buildAuditPayload(
    agent: string,
    event_type: string,
    data: Record<string, unknown>
  ): AuditPayload {
    return { agent, event_type, data, ts: new Date().toISOString() }
  }

  async writeAudit(client_id: string, job_id: string, agent: string, event_type: string, data: Record<string, unknown>) {
    await this.db.from('audit_events').insert({
      client_id,
      job_id,
      event_type,
      actor:   agent,
      payload: this.buildAuditPayload(agent, event_type, data),
    })
  }

  async notify(notif: AgentNotification) {
    const hermesUrl = process.env.HERMES_API_URL || 'http://localhost:8000'
    const hermesKey = process.env.HERMES_API_KEY
    if (!hermesKey) {
      console.log(`[Agent Notify] ${notif.urgency.toUpperCase()} — ${notif.message} → ${notif.action_url}`)
      return
    }
    try {
      await fetch(`${hermesUrl}/api/send`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${hermesKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target: notif.target, message: `${notif.message}\n\n${notif.action_url}` }),
      })
    } catch (err) {
      console.warn(`[Agent Notify] Hermes send failed: ${(err as Error).message}`)
    }
  }

  async askHermes(prompt: string, fallback: string): Promise<string> {
    if (!this.ai) return fallback
    try {
      return await this.ai.chat(prompt)
    } catch (err) {
      console.warn(`[AgentRunner] AI call failed — using fallback: ${(err as Error).message}`)
      return fallback
    }
  async persistAsset(url: string, clientId: string, jobId: string, stage: 'raw' | 'produced' | 'finals' | 'exports', filename: string): Promise<string> {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Fetch asset failed: ${response.statusText}`)
      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'video/mp4'
      
      const { buildR2Key, uploadToR2 } = await import('@/lib/services/r2')
      const key = buildR2Key(clientId, jobId, stage, filename)
      
      await uploadToR2(key, Buffer.from(buffer), contentType)
      return key
    } catch (err) {
      console.error(`[AgentRunner] Asset persistence failed for ${url}:`, err)
      return url // Fallback to original URL if upload fails (degraded mode)
    }
  }
}
