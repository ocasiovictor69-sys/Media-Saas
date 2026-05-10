import Anthropic from '@anthropic-ai/sdk'

export function buildAIClient() {
  const hermesKey = process.env.HERMES_API_KEY
  const hermesUrl = process.env.HERMES_API_URL || 'http://localhost:8000'
  const claudeKey = process.env.ANTHROPIC_API_KEY

  if (hermesKey) {
    return {
      provider: 'hermes' as const,
      chat: async (prompt: string): Promise<string> => {
        const res = await fetch(`${hermesUrl}/api/chat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${hermesKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt }),
        })
        if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`)
        const data = await res.json() as Record<string, unknown>
        return String(data.response || data.content || data.text || '')
      },
    }
  }

  if (claudeKey) {
    const claude = new Anthropic({ apiKey: claudeKey })
    return {
      provider: 'claude' as const,
      chat: async (prompt: string): Promise<string> => {
        const msg = await claude.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        })
        return (msg.content[0] as { text: string }).text
      },
    }
  }

  console.warn('[Services] No AI client configured — script generation will use templates')
  return null
}
