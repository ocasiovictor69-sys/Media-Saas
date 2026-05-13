// src/lib/agents/services/smarty.ts
export async function validateAddress(address: string) {
  const authId     = process.env.SMARTY_AUTH_ID
  const authToken  = process.env.SMARTY_AUTH_TOKEN
  if (!authId || !authToken) throw new Error('SMARTY credentials not set')
  const params = new URLSearchParams({ street: address, 'auth-id': authId, 'auth-token': authToken })
  const res = await fetch(`https://us-street.api.smarty.com/street-address?${params}`)
  if (!res.ok) throw new Error(`Smarty Streets HTTP ${res.status}`)
  const data = await res.json() as Array<{ analysis?: { dpv_match_code?: string } }>
  const match = data[0]
  return {
    valid:     !!match,
    dpv_code:  match?.analysis?.dpv_match_code || 'N',
  }
}
