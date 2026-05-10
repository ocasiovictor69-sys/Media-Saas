import { createClient } from '@/lib/supabase/server'
import { generateAvatarVariations } from './generators/heygen'
import { generateCinematicVariations } from './generators/higgsfield'
import { processWithRunway } from './generators/runway'
import type { Services } from '@/lib/services'

export type ProduceInput = {
  job_id:              string
  client_id:           string
  job_type:            'process_mine' | 'create_for_me'
  generator:           'heygen' | 'higgsfield' | 'runway' | 'remotion' | 'ffmpeg'
  script?:             string
  prompt?:             string
  raw_asset_r2_keys?:  string[]
  avatar_id?:          string
  voice_id?:           string
}

export async function execute(input: ProduceInput, services: Services) {
  const db = await createClient()

  await db.from('jobs')
    .update({ status: 'producing', pipeline_stage: 'generating_variations' })
    .eq('id', input.job_id)

  let videoUrls: string[] = []

  if (input.job_type === 'create_for_me') {
    if (input.generator === 'heygen' && input.script && input.avatar_id && input.voice_id) {
      videoUrls = await generateAvatarVariations(
        { script: input.script, avatar_id: input.avatar_id, voice_id: input.voice_id },
        services,
        2
      )
    } else if (['higgsfield', 'scene', 'cinematic'].includes(input.generator) && input.prompt) {
      videoUrls = await generateCinematicVariations({ prompt: input.prompt }, services, 2)
    }
  } else if (input.job_type === 'process_mine' && input.raw_asset_r2_keys?.length && input.prompt) {
    videoUrls = await processWithRunway(
      { input_video_url: input.raw_asset_r2_keys[0], prompt: input.prompt },
      services,
      2
    )
  }

  if (videoUrls.length === 0) {
    return { success: false, error: 'PRODUCE_FAIL: No video URLs generated' }
  }

  const variationIds: string[] = []
  for (let i = 0; i < videoUrls.length; i++) {
    const { data: variation } = await db.from('variations').insert({
      job_id:          input.job_id,
      variation_type:  'video',
      variation_index: i,
      r2_key:          videoUrls[i],
      generator:       input.generator,
      selected:        false,
    }).select().single()
    if (variation) variationIds.push(variation.id)
  }

  const { error: approvalError } = await db.from('approvals').insert({
    job_id:          input.job_id,
    client_id:       input.client_id,
    checkpoint_type: 'internal_review',
    status:          'pending',
    payload:         { variation_ids: variationIds, generator: input.generator },
  })

  if (approvalError) return { success: false, error: `APPROVAL_CREATE_FAIL: ${approvalError.message}` }

  await db.from('jobs')
    .update({ status: 'checkpoint_1', pipeline_stage: 'awaiting_internal_review' })
    .eq('id', input.job_id)

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     input.job_id,
    event_type: 'PRODUCE_COMPLETE',
    actor:      'system',
    payload:    { variations: videoUrls.length, generator: input.generator },
  })

  console.log(`[mod3-produce] ${videoUrls.length} variations generated → Checkpoint 1 | job:${input.job_id}`)

  return {
    success:         true,
    job_id:          input.job_id,
    variation_count: videoUrls.length,
    status:          'AWAITING_INTERNAL_REVIEW',
  }
}
