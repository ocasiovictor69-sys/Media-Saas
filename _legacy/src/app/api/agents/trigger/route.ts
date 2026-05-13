import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/agents/flow-media'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-webhook-secret')
  if (authHeader !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { agent, input } = body

    if (!agent || !input) {
      return NextResponse.json({ error: 'Missing agent or input' }, { status: 400 })
    }

    const result = await runAgent(agent, input)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[FlowMediaTrigger] Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
