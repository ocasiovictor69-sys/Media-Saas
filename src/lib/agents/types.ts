// src/lib/agents/types.ts

export type AgentUrgency = 'info' | 'action_required' | 'warning' | 'critical'

export type AgentNotification = {
  target: string
  message: string
  action_url?: string
  urgency: AgentUrgency
}

export type AgentResult = {
  success: boolean
  agent: string
  action_taken: string
  next_status?: string
  notification?: AgentNotification
  error?: string
  payload?: Record<string, any>
}

export type VerificationResult = {
  phone_valid: boolean
  phone_carrier?: string
  phone_type?: string
  email_valid: boolean
  email_reason?: string
  address_valid: boolean
  address_dpv?: string
  identity_confidence: number
  identity_flags: string[]
  recommendation: 'approve' | 'review' | 'reject'
}

export type AgentInput = {
  lead_id?: string
  property_id?: string
  team_id: string
  trigger: 'event' | 'cron' | 'manual'
  payload?: Record<string, any>
}
