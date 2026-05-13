import { createClient } from '@/lib/supabase/server'

export type ApprovalInput = {
  approval_id:            string
  job_id:                 string
  client_id:              string
  decision:               'approved' | 'rejected' | 'revision_requested'
  selected_variation_id?: string
  notes?:                 string
  reviewer_id:            string
}

export async function execute(input: ApprovalInput) {
  const db = await createClient()

  const { data: approval, error: fetchError } = await db
    .from('approvals')
    .select('*')
    .eq('id', input.approval_id)
    .single()

  if (fetchError || !approval) return { success: false, error: 'APPROVAL_NOT_FOUND' }
  if (approval.status !== 'pending') return { success: false, error: 'APPROVAL_ALREADY_RESOLVED' }

  await db.from('approvals').update({
    status:                input.decision,
    selected_variation_id: input.selected_variation_id || null,
    reviewer_id:           input.reviewer_id,
    notes:                 input.notes || null,
    resolved_at:           new Date().toISOString(),
  }).eq('id', input.approval_id)

  if (input.selected_variation_id) {
    await db.from('variations').update({ selected: true }).eq('id', input.selected_variation_id)
  }

  let nextStatus: string
  let nextStage: string

  if (input.decision === 'approved') {
    if (approval.checkpoint_type === 'internal_review') {
      nextStatus = 'checkpoint_2'
      nextStage  = 'awaiting_client_approval'
      await db.from('approvals').insert({
        job_id:          input.job_id,
        client_id:       input.client_id,
        checkpoint_type: 'client_approval',
        status:          'pending',
        payload:         { selected_variation_id: input.selected_variation_id },
      })
    } else if (approval.checkpoint_type === 'client_approval') {
      nextStatus = 'exporting'
      nextStage  = 'awaiting_export'
    } else {
      nextStatus = 'distributing'
      nextStage  = 'scheduled'
    }
  } else if (input.decision === 'rejected') {
    nextStatus = 'producing'
    nextStage  = 'rerun_requested'
  } else {
    nextStatus = 'checkpoint_1'
    nextStage  = 'revision_requested'
  }

  await db.from('jobs')
    .update({ status: nextStatus, pipeline_stage: nextStage })
    .eq('id', input.job_id)

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     input.job_id,
    event_type: `CHECKPOINT_${(approval.checkpoint_type as string).toUpperCase()}_${input.decision.toUpperCase()}`,
    actor:      input.reviewer_id,
    payload:    { approval_id: input.approval_id, next_status: nextStatus },
  })

  return { success: true, decision: input.decision, next_status: nextStatus }
}
