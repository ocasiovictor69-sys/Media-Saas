export function buildHiggsfieldClient() {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) { console.warn('[Services] HIGGSFIELD_API_KEY not set — Higgsfield disabled, Google AI Studio fallback active'); return null }

  return {
    generate: async (params: {
      prompt: string
      duration?: number
      aspect_ratio?: '16:9' | '9:16' | '1:1'
      style?: string
    }) => {
      const res = await fetch('https://api.higgsfield.ai/v1/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, duration: params.duration || 5, aspect_ratio: params.aspect_ratio || '16:9' }),
      })
      if (!res.ok) throw new Error(`Higgsfield API HTTP ${res.status}: ${await res.text()}`)
      return res.json() as Promise<{ job_id: string; status: string }>
    },

    pollJob: async (jobId: string): Promise<{ status: string; video_url?: string }> => {
      const res = await fetch(`https://api.higgsfield.ai/v1/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw new Error(`Higgsfield poll HTTP ${res.status}`)
      return res.json()
    },
  }
}
