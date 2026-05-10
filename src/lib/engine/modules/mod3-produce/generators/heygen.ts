import type { Services } from '@/lib/services'

export async function generateAvatarVariations(
  params: { script: string; avatar_id: string; voice_id: string },
  services: Services,
  count = 2
): Promise<string[]> {
  if (!services.heygen) {
    console.warn('[mod3-produce/heygen] HeyGen not configured')
    return []
  }

  const videoIds: string[] = []
  for (let i = 0; i < count; i++) {
    const { video_id } = await services.heygen.generateAvatar({
      avatar_id: params.avatar_id,
      voice_id:  params.voice_id,
      script:    params.script,
    })
    videoIds.push(video_id)
  }

  const videoUrls: string[] = []
  for (const id of videoIds) {
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 10000))
      const status = await services.heygen.pollVideo(id)
      if (status.status === 'completed' && status.video_url) {
        videoUrls.push(status.video_url)
        break
      }
      if (status.status === 'failed') throw new Error(`HeyGen video ${id} failed`)
      attempts++
    }
  }

  return videoUrls
}
