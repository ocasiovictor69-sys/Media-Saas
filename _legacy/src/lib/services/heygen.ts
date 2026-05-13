export function buildHeyGenClient() {
  const key = process.env.HEYGEN_API_KEY
  if (!key) { console.warn('[Services] HEYGEN_API_KEY not set — avatar generation disabled'); return null }

  return {
    generateAvatar: async (params: {
      avatar_id: string
      voice_id: string
      script: string
      background?: string
    }) => {
      const res = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_inputs: [{
            character: { type: 'avatar', avatar_id: params.avatar_id },
            voice: { type: 'text', input_text: params.script, voice_id: params.voice_id },
            background: params.background
              ? { type: 'image', url: params.background }
              : { type: 'color', value: '#FAFAFA' },
          }],
          dimension: { width: 1920, height: 1080 },
        }),
      })
      if (!res.ok) throw new Error(`HeyGen API HTTP ${res.status}: ${await res.text()}`)
      return res.json() as Promise<{ video_id: string; status: string }>
    },

    pollVideo: async (videoId: string): Promise<{ status: string; video_url?: string }> => {
      const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': key },
      })
      if (!res.ok) throw new Error(`HeyGen poll HTTP ${res.status}`)
      const data = await res.json() as { data?: { status: string; video_url?: string } }
      return data.data || { status: 'unknown' }
    },

    listAvatars: async () => {
      const res = await fetch('https://api.heygen.com/v2/avatars', { headers: { 'X-Api-Key': key } })
      if (!res.ok) throw new Error(`HeyGen avatars HTTP ${res.status}`)
      return res.json()
    },
  }
}
