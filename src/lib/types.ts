/**
 * Media Shared Type Definitions
 * Enforces the "Hard-Seal" architectural standard for the Media Pipeline.
 */

export interface MediaServices {
  memory: {
    captureContext: (payload: any) => Promise<{ ok: boolean; error?: string }>
    mapRelationships: (payload: any) => Promise<{ ok: boolean; error?: string }>
  }
  video?: {
    generateAssets: (brief: any) => Promise<{ videoUrl: string; thumbnail: string }>
    renderVideo: (manifest: any) => Promise<{ outputUrl: string }>
  }
  social?: {
    distribute: (content: any) => Promise<{ success: boolean; links: string[] }>
    monitorEngagement: (channelId: string) => Promise<{ comments: any[] }>
  }
}

export interface ModuleResult {
  success: boolean
  transition: string
  error?: string
  [key: string]: any
}
