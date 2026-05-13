import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/engine/modules/mod6-engage'
import { buildServices } from '@/lib/services'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const services = buildServices()
  const result = await execute(body, services)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
