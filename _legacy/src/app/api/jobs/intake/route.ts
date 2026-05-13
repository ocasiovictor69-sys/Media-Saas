import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod1-intake'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const job_type        = formData.get('job_type') as 'process_mine' | 'create_for_me'
  const client_id       = formData.get('client_id') as string
  const output_types    = JSON.parse(formData.get('output_types') as string || '[]') as string[]
  const target_platforms = JSON.parse(formData.get('target_platforms') as string || '[]') as string[]

  if (!job_type || !client_id) {
    return NextResponse.json({ error: 'job_type and client_id are required' }, { status: 422 })
  }

  const files: { name: string; buffer: Buffer; mime_type: string }[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file_') && value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer())
      files.push({ name: value.name, buffer, mime_type: value.type })
    }
  }

  const result = await execute({ client_id, job_type, output_types, target_platforms, files })
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
