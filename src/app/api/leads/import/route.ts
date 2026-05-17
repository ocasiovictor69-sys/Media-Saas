import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// CSV Row Zod Schema - Media-Specific
const mediaLeadSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  project_title: z.string().min(3, 'Project title is required'),
  media_type: z.enum(['VIDEO', 'AUDIO', 'IMAGE', 'SCRIPT']).optional().or(z.literal('')).default('VIDEO'),
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'TWITTER', 'MULTI']).optional().or(z.literal('')).default('MULTI'),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

const batchImportSchema = z.array(mediaLeadSchema)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's team
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (!profile?.team_id) {
      return NextResponse.json({ error: 'User does not belong to a team' }, { status: 400 })
    }

    const body = await request.json()

    // Server-side Zod validation
    const validationResult = batchImportSchema.safeParse(body.leads)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      }, { status: 422 })
    }

    const validLeads = validationResult.data.map(lead => ({
      team_id: profile.team_id,
      owner_id: user.id,
      stage: 'NEW',
      client_name: lead.client_name,
      client_email: lead.client_email,
      client_phone: lead.client_phone || null,
      media_type: lead.media_type,
      platform: lead.platform,
      project_title: lead.project_title,
      notes: lead.notes || null,
    }))

    // Bulk insert into Supabase
    const { error: insertError } = await supabase
      .from('leads')
      .insert(validLeads)

    if (insertError) {
      console.error('[CSV Import] Database insertion failed:', insertError)
      return NextResponse.json({ error: 'Database error', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${validLeads.length} leads.`,
      count: validLeads.length
    })

  } catch (error) {
    console.error('[CSV Import] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
