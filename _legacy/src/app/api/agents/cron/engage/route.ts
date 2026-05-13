import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/agents/flow-media'

/**
 * GET /api/agents/cron/engage
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-webhook-secret')
  if (authHeader !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAgent('agent-engage', {
      job_id: 'none', client_id: 'none', trigger: 'cron', payload: {}
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
