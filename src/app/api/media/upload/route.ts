import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processRawMedia } from '@/modules/raw-media'

/**
 * POST /api/media/upload
 *
 * Ingest raw client footage (phone video, interviews, screen recordings).
 * Accepts multipart/form-data with:
 *   - file:        the media file (Blob)
 *   - campaign_id: associated campaign
 *   - client_id:   tenant client ID
 *
 * Returns immediately with asset record.
 * Max file size: 500MB (enforced in processRawMedia + storage bucket policy).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (!profile?.team_id) return NextResponse.json({ error: 'Team not found' }, { status: 403 })

  // ── Parse multipart form data (server-side, NOT browser File API) ──────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const fileEntry    = formData.get('file')
  const campaignId   = formData.get('campaign_id')?.toString()
  const clientId     = formData.get('client_id')?.toString()

  if (!fileEntry || !(fileEntry instanceof Blob)) {
    return NextResponse.json({ error: 'file is required and must be a Blob' }, { status: 422 })
  }
  if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 422 })
  if (!clientId)   return NextResponse.json({ error: 'client_id required' }, { status: 422 })

  // Extract file name from FormData entry
  const fileName = (fileEntry as File).name || `upload_${Date.now()}`
  const mimeType = fileEntry.type || 'application/octet-stream'

  const result = await processRawMedia(
    fileEntry,
    fileName,
    mimeType,
    clientId,
    campaignId,
    profile.team_id,
  )

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 })
  }

  return NextResponse.json(result, { status: 200 })
}
