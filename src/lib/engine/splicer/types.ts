// src/lib/engine/splicer/types.ts
// Institutional type definitions for Media Production — Splicer Engine

export type MediaPlatform = 'youtube' | 'instagram' | 'tiktok' | 'internal';

export interface CompositionSettings {
  aspect_ratio: '16:9' | '9:16' | '1:1';
  resolution: '1080p' | '4k';
  frame_rate: number;
  duration_ms: number;
}

export interface SplicerResult {
  success: boolean;
  job_id: string;
  output_url?: string;
  render_stats: {
    frames_rendered: number;
    encoding_time_ms: number;
    file_size_bytes: number;
  };
  warnings: string[];
  audit_trail: {
    assets_used: string[];
    effects_applied: string[];
    intermediate_logs: Record<string, any>;
  };
}
