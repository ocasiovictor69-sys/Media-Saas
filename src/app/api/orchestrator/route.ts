// src/app/api/orchestrator/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAYBOOK } from '@/lib/playbook'
import { Flow Mediautreach } from '@/lib/agents/agent-outreach'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const secret = process.env.ORCHESTRATOR_SECRET

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // 1. Fetch leads due for sequence action
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .in('priority', ['HIGH', 'MEDIUM'])
      .or(`next_action_at.is.null,next_action_at.lte.${now}`)
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = []

    for (const lead of leads) {
      const priority = lead.priority as 'HIGH' | 'MEDIUM'
      const steps = PLAYBOOK[priority]
      if (!steps) continue

      const stepIndex = lead.outreach_step || 0
      const step = steps[stepIndex]

      if (!step) {
        // Sequence exhausted
        await supabase
          .from('leads')
          .update({ stage: 'ARCHIVED', updated_at: now })
          .eq('id', lead.id)
        results.push({ lead_id: lead.id, status: 'exhausted' })
        continue
      }

      // 2. Execute Action
      // In this version, we trigger the Flow Mediautreach for any outreach action
      if (step.action.startsWith('outreach')) {
        const agent = new Flow Mediautreach()
        await agent.run({
          lead_id: lead.id,
          team_id: lead.team_id,
          trigger: 'cron'
        })
      }

      // 3. Advance Step
      const nextIndex = stepIndex + 1
      const nextActionAt = new Date()
      nextActionAt.setDate(nextActionAt.getDate() + step.wait_days)

      await supabase
        .from('leads')
        .update({
          outreach_step: nextIndex,
          next_action_at: nextActionAt.toISOString(),
          updated_at: now
        })
        .eq('id', lead.id)

      results.push({ lead_id: lead.id, status: 'advanced', step: step.label })
    }

    return NextResponse.json({
      success: true,
      processed: leads.length,
      results
    })

  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

