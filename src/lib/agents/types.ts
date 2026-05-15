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
  notification?: AgentNotification
  error?: string
  payload?: Record<string, any>
}

export type AgentInput = {
  asset_id?: string
  job_id?: string
  team_id: string
  trigger: 'event' | 'cron' | 'manual'
  payload?: Record<string, any>
}

// --- MOD-M Specific Types (Media Production) ---

export type ScriptResult = {
  title: string
  hook: string
  body: string
  call_to_action: string
  estimated_duration: number
}

export type RenderJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type DistributionPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER' | 'LINKEDIN'
