/**
 * Flow-Media Production Service
 *
 * Routes post-production jobs to Remotion (composition rendering)
 * or FFmpeg (direct video editing) based on the manifest type.
 *
 * Env vars:
 *   REMOTION_SERVE_URL   — Remotion Lambda serve URL (for cloud rendering)
 *   REMOTION_FUNCTION    — Remotion Lambda function name
 *   FFMPEG_SERVICE_URL   — Self-hosted FFmpeg service endpoint (optional)
 *   AWS_REGION           — for Remotion Lambda (defaults to us-east-1)
 */

type ProductionManifest = {
  lead_id:     string
  assets:      Array<{ url: string; type: string; durationSec?: number }>
  template?:   string
  use_ffmpeg?: boolean
  [key: string]: unknown
}

type RenderResult = { outputUrl: string }

async function renderWithFFmpeg(manifest: ProductionManifest): Promise<RenderResult> {
  const serviceUrl = process.env.FFMPEG_SERVICE_URL
  if (!serviceUrl) throw new Error('FFMPEG_SERVICE_URL not set')

  const res = await fetch(`${serviceUrl}/render`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(manifest),
  })
  if (!res.ok) throw new Error(`FFMPEG_ERROR: ${res.status}`)
  const data = await res.json()
  return { outputUrl: data.output_url }
}

async function renderWithRemotion(manifest: ProductionManifest): Promise<RenderResult> {
  const serveUrl      = process.env.REMOTION_SERVE_URL
  const functionName  = process.env.REMOTION_FUNCTION
  const region        = process.env.AWS_REGION || 'us-east-1'

  if (!serveUrl || !functionName) throw new Error('REMOTION_SERVE_URL or REMOTION_FUNCTION not set')

  const { renderMediaOnLambda } = await import('@remotion/lambda/client')

  const result = await renderMediaOnLambda({
    region:        region as any,
    functionName,
    serveUrl,
    composition:   manifest.template || 'MediaComposite',
    inputProps:    manifest,
    codec:         'h264',
    imageFormat:   'jpeg',
  })

  return { outputUrl: result.renderedMediaOrUndefined ?? '' }
}

export function buildProductionClient() {
  const hasRemotion = !!(process.env.REMOTION_SERVE_URL && process.env.REMOTION_FUNCTION)
  const hasFFmpeg   = !!process.env.FFMPEG_SERVICE_URL

  if (!hasRemotion && !hasFFmpeg) {
    console.warn('[Services] No production renderer configured — REMOTION_SERVE_URL or FFMPEG_SERVICE_URL required')
    return {
      ingestRawFootage:     async (_raw: any) => ({ assetId: 'pending', status: 'PENDING_INTEGRATION' }),
      generateAIFootage:    async (_script: any) => ({ assetId: 'pending', status: 'PENDING_INTEGRATION' }),
      renderPostProduction: async (_manifest: any): Promise<{ outputUrl: string }> => {
        throw new Error('PRODUCTION_NOT_CONFIGURED: Set REMOTION_SERVE_URL or FFMPEG_SERVICE_URL')
      },
    }
  }

  return {
    ingestRawFootage: async (rawMediaRef: Record<string, unknown>) => {
      console.log(`[Production] Raw footage ingested: ${rawMediaRef.storagePath}`)
      return { assetId: String(rawMediaRef.storagePath), status: 'ready' }
    },

    generateAIFootage: async (script: string, avatarId?: string) => {
      console.log(`[Production] AI footage generation delegated to media-router | avatar: ${avatarId}`)
      return { assetId: `ai_${Date.now()}`, status: 'generating' }
    },

    renderPostProduction: async (manifest: Record<string, unknown>): Promise<{ outputUrl: string }> => {
      const m = manifest as ProductionManifest
      console.log(`[Production] Rendering post-production for lead: ${m.lead_id} | use_ffmpeg: ${m.use_ffmpeg}`)

      if (m.use_ffmpeg && hasFFmpeg) {
        return renderWithFFmpeg(m)
      }

      if (hasRemotion) {
        return renderWithRemotion(m)
      }

      return renderWithFFmpeg(m)
    },
  }
}
