// src/lib/agents/services/skiptrace.ts
export async function skipTrace(params: { property_address: string; owner_name: string }) {
  const key = process.env.RESIMPLI_API_KEY
  if (!key) throw new Error('RESIMPLI_API_KEY not set')
  const res = await fetch('https://api.resimpli.com/v3/skip-trace', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`REsimpli skip trace HTTP ${res.status}: ${await res.text()}`)
  return res.json() as Promise<{ phones: string[]; emails: string[]; mailing_address: string; owner_name: string }>
}
