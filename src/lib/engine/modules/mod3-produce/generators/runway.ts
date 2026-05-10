import type { Services } from '@/lib/services'

export async function processWithRunway(
  params: { input_video_url: string; prompt: string; duration?: number },
  services: Services,
  count = 2
): Promise<string[]> {
  if (!services.runway) {
    console.warn('[mod3-produce/runway] Runway not configured — returning original asset')
    return [params.input_video_url]
  }

  const taskIds: string[] = []
  for (let i = 0; i < count; i++) {
    const task = await services.runway.videoToVideo({
      init_video_url: params.input_video_url,
      text_prompt:    params.prompt,
      duration:       params.duration || 5,
    })
    taskIds.push(task.id)
  }

  const outputUrls: string[] = []
  for (const id of taskIds) {
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 8000))
      const status = await services.runway.pollTask(id)
      if (status.status === 'SUCCEEDED' && status.output?.[0]) {
        outputUrls.push(status.output[0])
        break
      }
      if (status.status === 'FAILED') throw new Error(`Runway task ${id} failed`)
      attempts++
    }
  }

  return outputUrls
}
