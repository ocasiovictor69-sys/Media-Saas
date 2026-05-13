// src/lib/agents/services/kickbox.ts
export async function verifyEmail(email: string) {
  const key = process.env.KICKBOX_API_KEY
  if (!key) throw new Error('KICKBOX_API_KEY not set')
  const res = await fetch(`https://open.kickbox.com/v1/verify/${encodeURIComponent(email)}?apikey=${key}`)
  if (!res.ok) throw new Error(`Kickbox HTTP ${res.status}`)
  const data = await res.json() as { result?: string; reason?: string; disposable?: boolean }
  return {
    valid:       data.result === 'deliverable',
    reason:      data.reason || 'unknown',
    disposable:  data.disposable || false,
  }
}
