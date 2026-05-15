// src/lib/types.ts
// Institutional type definitions for Flow Media — AI Media Production

export interface TimelineEvent {
  id?: string;
  lead_id?: string;
  event: string;
  status: 'pending' | 'completed' | 'failed';
  created_at?: string;
  metadata?: any;
}

export interface MediaProject {
  id: string;
  team_id: string;
  client_name: string;
  client_email?: string;
  project_name: string;
  project_type: 'explainer' | 'social' | 'ads' | 'internal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'NEW' | 'PROCESSING' | 'REVIEW' | 'RENDERED' | 'PUBLISHED' | 'ARCHIVED';
  score: number; // Engagement/Quality score
  created_at: string;
  updated_at: string;
  media_assets?: any[];
  render_settings?: any;
  timeline?: TimelineEvent[];
  notes?: any[];
  assigned_to?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'team_leader' | 'viewer';
  lead_count?: number;
  created_at: string;
}

export interface AgentResult {
  success: boolean;
  agent: string;
  action_taken: string;
  payload?: any;
  error?: string;
  notification?: any;
}
