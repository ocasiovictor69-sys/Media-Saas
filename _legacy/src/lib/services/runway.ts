export function buildRunwayClient() {
  const key = process.env.RUNWAY_API_KEY
  if (!key) { console.warn('[Services] RUNWAY_API_KEY not set — Runway AI disabled'); return null }

  return {
    videoToVideo: async (params: {
      init_video_url: string
      text_prompt: string
      duration?: number
      watermark?: boolean
    }) => {
      const res = await fetch('https://api.runwayml.com/v1/image_to_video', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06' },
        body: JSON.stringify({ ...params, watermark: false, duration: params.duration || 5 }),
      })
      if (!res.ok) throw new Error(`Runway API HTTP ${res.status}: ${await res.text()}`)
      return res.json() as Promise<{ id: string; status: string }>
    },

    pollTask: async (taskId: string): Promise<{ status: string; output?: string[] }> => {
      const res = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' },
      })
      if (!res.ok) throw new Error(`Runway poll HTTP ${res.status}`)
      return res.json()
    },
  }
}
