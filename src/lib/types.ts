/**
 * Flow-Media v2 — Shared Type Definitions
 * Extended from v1 MediaServices to support real generation layer.
 */
export { SupabaseClient } from '@supabase/supabase-js'

// ── Task Types ─────────────────────────────────────────────────────────────────

export type MediaTaskType = 'avatar' | 'broll' | 'cinematic' | 'raw_edit'

export type GeneratorName = 'heygen' | 'runway' | 'higgsfield' | 'ffmpeg' | 'raw'

export type JobStatus = 'submitted' | 'processing' | 'completed' | 'failed' | 'timed_out'

export type AssetStatus = 'pending' | 'generating' | 'ready' | 'failed'

export type OpportunityType = 'residential' | 'institutional' | 'hybrid'

// ── Media Task (input to router) ──────────────────────────────────────────────

export interface MediaTask {
  type:           MediaTaskType
  // Avatar (HeyGen)
  script?:        string
  avatarId?:      string
  voiceId?:       string
  // B-Roll & Cinematic (Runway / Higgsfield)
  prompt?:        string
  duration?:      5 | 10            // Runway allowed values only
  style?:         string
  aspectRatio?:   '9:16' | '16:9' | '1:1'
  // Raw edit
  rawMedia?:      RawMediaRef
  // Routing context
  opportunityType?: OpportunityType // from Agento — drives script tone
  leadId?:        string            // Agento property_id for attribution
}

export interface RawMediaRef {
  storagePath: string
  mimeType:    string
  fileSizeBytes: number
}

// ── Generation Job ─────────────────────────────────────────────────────────────

export interface GenerationJob {
  id:             string
  teamId:         string
  campaignId:     string
  generator:      GeneratorName
  externalJobId:  string
  taskType:       MediaTaskType
  status:         JobStatus
  attemptCount:   number
  maxAttempts:    number
  outputUrl?:     string
  errorMessage?:  string
  rawResponse?:   Record<string, unknown>
  estimatedCostUsd: number
  actualCostUsd:  number
  submittedAt:    string
  completedAt?:   string
  nextPollAt:     string
}

// ── Media Asset ────────────────────────────────────────────────────────────────

export interface MediaAsset {
  id:             string
  campaignId:     string
  clientId:       string
  teamId:         string
  type:           MediaTaskType | 'composite'
  format:         'video' | 'audio' | 'image'
  status:         AssetStatus
  url?:           string
  storagePath?:   string
  fileSizeBytes?: number
  durationSec?:   number
  mimeType?:      string
  md5Hash?:       string
  generator?:     GeneratorName
  generationCostUsd: number
  metadata:       Record<string, unknown>
  jobId?:         string
}

// ── Campaign ───────────────────────────────────────────────────────────────────

export interface Campaign {
  id:             string
  clientId:       string
  teamId:         string
  name:           string
  status:         'draft' | 'queued' | 'generating' | 'complete' | 'failed'
  strategy: {
    mediaTasks:   MediaTask[]
    [key: string]: unknown
  }
  budgetUsd?:     number
  spentUsd:       number
  sourceLeadId?:  string  // Agento property_id
}

// ── Generator Results ──────────────────────────────────────────────────────────

export interface GenerationSubmitResult {
  ok:             boolean
  jobId?:         string      // our internal DB job ID
  externalJobId?: string      // generator-specific ID
  estimatedCostUsd: number
  error?:         string
}

export interface GenerationPollResult {
  status:         JobStatus
  outputUrl?:     string
  actualCostUsd?: number
  rawResponse?:   Record<string, unknown>
  error?:         string
}

// ── Services ───────────────────────────────────────────────────────────────────

export interface MediaServices {
  memory: {
    captureContext:   (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
    mapRelationships: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  }
  video?: {
    generateAssets: (brief: Record<string, unknown>) => Promise<{ videoUrl: string; thumbnail: string }>
    renderVideo:    (manifest: Record<string, unknown>) => Promise<{ outputUrl: string }>
  }
  social?: {
    distribute:        (content: Record<string, unknown>) => Promise<{ success: boolean; links: string[] }>
    monitorEngagement: (channelId: string) => Promise<{ comments: SocialComment[] }>
  }
}

export interface SocialComment {
  id:        string
  text:      string
  author:    string
  platform:  string
  timestamp: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  intent?:   'lead' | 'question' | 'complaint' | 'praise' | 'unknown'
}

// ── Module Execution Signature ────────────────────────────────────────────────

export type ModuleExecutor<T = unknown, R = ModuleResult> = (
  inputs:   T,
  db:       SupabaseClient,
  services: MediaServices,
) => Promise<R>

// ── Module Result ──────────────────────────────────────────────────────────────

export interface ModuleResult {
  success:    boolean
  transition: string
  error?:     string
  [key: string]: unknown
}

// ── Cost Guard ────────────────────────────────────────────────────────────────

export interface CostEstimate {
  generator:      GeneratorName
  taskType:       MediaTaskType
  estimatedUsd:   number
}
