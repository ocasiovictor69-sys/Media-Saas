import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// CSV Row Zod Schema
const leadImportSchema = z.object({
  seller_name: z.string().min(1, 'Seller name is required'),
  seller_email: z.string().email('Invalid email').optional().or(z.literal('')),
  seller_phone: z.string().optional().or(z.literal('')),
  property_address: z.string().min(5, 'Address is required'),
  property_zip: z.string().optional().or(z.literal('')),
  property_type: z.enum(['single_family', 'duplex', 'triplex', 'fourplex', 'commercial']).optional().or(z.literal('')),
  seller_category: z.string().optional().or(z.literal('')),
  pipeline: z.enum(['1', '2']).default('1'),
})

const batchImportSchema = z.array(leadImportSchema)

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
      ...lead,
      team_id: profile.team_id,
      owner_id: user.id,
      stage: 'NEW',
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
