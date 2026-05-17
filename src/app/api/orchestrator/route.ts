import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AgentScriptGen } from '@/lib/agents/agent-script-gen'
import { AgentRenderOrchestrator } from '@/lib/agents/agent-render'
import { AgentDistributor } from '@/lib/agents/agent-distribute'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const secret = process.env.ORCHESTRATOR_SECRET

    // HARDENED: Zero-Bypass Auth
    if (!secret || authHeader !== `Bearer ${secret}`) {
      console.error('[Flow Media Orchestrator] Unauthorized access attempt.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const results = []

    const body = await request.json()
    const { action, team_id } = body

    if (!team_id) {
      return NextResponse.json({ error: 'team_id required' }, { status: 400 })
    }

    // 1. SCRIPT GENERATION (MOD-M01)
    if (action === 'GENERATE_SCRIPT') {
      const agent = new AgentScriptGen(supabase)
      const res = await agent.run({ team_id, trigger: 'manual', payload: body.payload })
      results.push(res)
    }

    // 2. RENDER ORCHESTRATION (MOD-M02)
    if (action === 'START_RENDER') {
      const agent = new AgentRenderOrchestrator(supabase)
      const { asset_id } = body
      const res = await agent.run({ team_id, asset_id, trigger: 'manual' })
      results.push(res)
    }

    // 3. SOCIAL DISTRIBUTION (MOD-M03)
    if (action === 'SCHEDULE_POST') {
      const agent = new AgentDistributor(supabase)
      const { asset_id, platform } = body
      const res = await agent.run({ team_id, asset_id, trigger: 'manual', payload: { platform } })
      results.push(res)
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      results
    })

  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

