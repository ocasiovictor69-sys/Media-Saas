// src/lib/agents/services/twilio-lookup.ts
export async function lookupPhone(phone: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('TWILIO credentials not set')
  const encoded = Buffer.from(`${sid}:${token}`).toString('base64')
  const res = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence`, {
    headers: { Authorization: `Basic ${encoded}` },
  })
  if (!res.ok) throw new Error(`Twilio Lookup HTTP ${res.status}`)
  const data = await res.json() as { valid?: boolean; line_type_intelligence?: { type?: string; carrier_name?: string } }
  return {
    valid:    data.valid ?? false,
    type:     data.line_type_intelligence?.type || 'unknown',
    carrier:  data.line_type_intelligence?.carrier_name || 'unknown',
  }
}
