import { createClient } from '@/lib/supabase/server'
import type { Services } from '@/lib/services'

export type BriefInput = {
  job_id:          string
  client_id:       string
  goal:            string
  tone:            string
  target_audience: string
  platforms:       string[]
  deadline?:       string
  content_types:   string[]
  notes?:          string
}

const CONTENT_TYPE_TO_GENERATOR: Record<string, string> = {
  avatar_video: 'heygen',
  talking_head: 'heygen',
  cinematic:    'higgsfield',
  broll:        'higgsfield',
  scene:        'higgsfield',
  explainer:    'remotion',
  slideshow:    'remotion',
  marketing:    'higgsfield',
  podcast:      'ffmpeg',
  course:       'heygen',
  thumbnail:    'remotion',
}

export async function execute(input: BriefInput, services: Services) {
  const db = await createClient()

  const { data: brief, error } = await db.from('briefs').insert({
    job_id:          input.job_id,
    client_id:       input.client_id,
    goal:            input.goal,
    tone:            input.tone,
    target_audience: input.target_audience,
    platforms:       input.platforms,
    deadline:        input.deadline || null,
    content_types:   input.content_types,
    notes:           input.notes || null,
    raw_form:        input as unknown as Record<string, unknown>,
  }).select().single()

  if (error || !brief) {
    return { success: false, error: `BRIEF_CREATE_FAIL: ${error?.message}` }
  }

  const scriptVariations = await generateScriptVariations(input, services)

  for (let i = 0; i < scriptVariations.length; i++) {
    await db.from('variations').insert({
      job_id:          input.job_id,
      variation_type:  'script',
      variation_index: i,
      content:         scriptVariations[i],
      generator:       services?.ai?.provider || 'template',
      selected:        false,
    })
  }

  const primaryGenerator = input.content_types
    .map(t => CONTENT_TYPE_TO_GENERATOR[t])
    .filter(Boolean)[0] || 'higgsfield'

  await db.from('jobs').update({
    status:         'checkpoint_1',
    pipeline_stage: 'script_selection',
    metadata:       { primary_generator: primaryGenerator },
  }).eq('id', input.job_id)

  await db.from('audit_events').insert({
    client_id:  input.client_id,
    job_id:     input.job_id,
    event_type: 'BRIEF_COMPLETE',
    actor:      'system',
    payload:    { script_variations: scriptVariations.length, primary_generator: primaryGenerator },
  })

  return {
    success:           true,
    brief_id:          brief.id,
    script_variations: scriptVariations.length,
    primary_generator: primaryGenerator,
    next_step:         'select_script_variation',
  }
}

async function generateScriptVariations(brief: BriefInput, services: Services): Promise<string[]> {
  const templates = [
    `${brief.tone} script for ${brief.target_audience}: ${brief.goal}. Keep it concise and action-oriented.`,
    `Conversational ${brief.tone} script addressing ${brief.target_audience}. Goal: ${brief.goal}. Focus on benefits.`,
    `Professional ${brief.tone} script for ${brief.goal}. Target: ${brief.target_audience}. Lead with a strong hook.`,
  ]

  if (!services?.ai) return templates

  try {
    const prompt =
      `You are a professional media scriptwriter. Write 3 distinct script variations for: "${brief.goal}". ` +
      `Tone: ${brief.tone}. Audience: ${brief.target_audience}. Platforms: ${brief.platforms.join(', ')}. ` +
      `Return JSON only: { "scripts": [string, string, string] } — no prose, no markdown.`

    const raw = await services.ai.chat(prompt)
    const parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]) as { scripts?: string[] }
    if (parsed.scripts?.length === 3) return parsed.scripts
  } catch (err) {
    console.warn(`[mod2-brief] AI script generation failed — using templates: ${(err as Error).message}`)
  }

  return templates
}
