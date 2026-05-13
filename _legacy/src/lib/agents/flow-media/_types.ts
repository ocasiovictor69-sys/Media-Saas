// src/lib/agents/flow-media/_types.ts
export type AgentInput = {
  job_id:    string
  client_id: string
  trigger:   'event' | 'cron' | 'webhook'
  payload:   Record<string, unknown>
}

export type AgentNotification = {
  target:     string
  message:    string
  action_url: string
  urgency:    'info' | 'action_required' | 'warning'
}

export type AgentResult = {
  success:      boolean
  agent:        string
  action_taken: string
  next_status?: string
  notification?: AgentNotification
  error?:       string
}

export type AuditPayload = {
  agent:      string
  event_type: string
  data:       Record<string, unknown>
  ts:         string
}
