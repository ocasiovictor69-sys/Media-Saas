import { createClient } from '@/lib/supabase/server'
import { uploadToR2, buildR2Key } from '@/lib/services/r2'

export type IntakeInput = {
  client_id:        string
  job_type:         'process_mine' | 'create_for_me'
  output_types:     string[]
  target_platforms: string[]
  files?:           { name: string; buffer: Buffer; mime_type: string }[]
  metadata?:        Record<string, unknown>
}

export async function execute(input: IntakeInput) {
  const db = await createClient()

  const { data: job, error: jobError } = await db
    .from('jobs')
    .insert({
      client_id:        input.client_id,
      job_type:         input.job_type,
      status:           input.job_type === 'process_mine' ? 'intake' : 'briefing',
      output_types:     input.output_types,
      target_platforms: input.target_platforms,
      metadata:         input.metadata || {},
    })
    .select()
    .single()

  if (jobError || !job) {
    return { success: false, error: `JOB_CREATE_FAIL: ${jobError?.message}` }
  }

  const assetRecords = []

  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      const key = buildR2Key(input.client_id, job.id, 'raw', file.name)
      await uploadToR2(key, file.buffer, file.mime_type)

      const { data: asset } = await db.from('assets').insert({
        job_id:     job.id,
        client_id:  input.client_id,
        asset_type: 'raw',
        r2_key:     key,
        mime_type:  file.mime_type,
      }).select().single()

      if (asset) assetRecords.push(asset)
    }
  }

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     job.id,
    event_type: 'JOB_INTAKE_COMPLETE',
    actor:      'system',
    payload:    { asset_count: assetRecords.length, job_type: input.job_type },
  })

  console.log(`[mod1-intake] Job created: ${job.id} | type:${input.job_type} | assets:${assetRecords.length}`)

  return {
    success:     true,
    job_id:      job.id,
    job_type:    input.job_type,
    asset_count: assetRecords.length,
    next_step:   input.job_type === 'process_mine' ? 'mod3-produce' : 'mod2-brief',
  }
}
