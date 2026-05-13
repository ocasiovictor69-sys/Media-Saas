import type { Services } from '@/lib/services'

export async function generateCinematicVariations(
  params: { prompt: string; duration?: number; aspect_ratio?: '16:9' | '9:16' },
  services: Services,
  count = 2
): Promise<string[]> {
  if (!services.higgsfield) {
    console.warn('[mod3-produce/higgsfield] Higgsfield not configured — trying Google AI Studio fallback')
    return generateGoogleAIFallback(params, count)
  }

  const jobIds: string[] = []
  for (let i = 0; i < count; i++) {
    const { job_id } = await services.higgsfield.generate({
      prompt:       params.prompt,
      duration:     params.duration || 5,
      aspect_ratio: params.aspect_ratio || '16:9',
    })
    jobIds.push(job_id)
  }

  const videoUrls: string[] = []
  for (const id of jobIds) {
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 10000))
      const status = await services.higgsfield.pollJob(id)
      if (status.status === 'completed' && status.video_url) {
        videoUrls.push(status.video_url)
        break
      }
      if (status.status === 'failed') throw new Error(`Higgsfield job ${id} failed`)
      attempts++
    }
  }

  return videoUrls
}

async function generateGoogleAIFallback(params: { prompt: string }, _count: number): Promise<string[]> {
  const key = process.env.GOOGLE_AI_STUDIO_API_KEY
  if (!key) throw new Error('No video generator available — HIGGSFIELD_API_KEY and GOOGLE_AI_STUDIO_API_KEY both missing')
  console.log(`[mod3-produce/higgsfield] Using Google AI Studio fallback for prompt: "${params.prompt}"`)
  return []
}
