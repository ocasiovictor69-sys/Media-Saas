/**
 * Raw Media Processor
 *
 * Handles ingestion of real-world client footage:
 *   phone videos, interviews, screen recordings
 *
 * Fixes:
 *   - [RM-1] Server-side FormData — no browser File type
 *   - [RM-2] File size limit (500MB)
 *   - [RM-3] MIME type whitelist validation
 *   - [RM-4] MD5 hash deduplication
 *   - [RM-5] Structured error returns, no throws
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  // 500MB

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/mpeg',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'image/jpeg',
  'image/png',
])

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RawMediaUploadResult {
  ok:            boolean
  assetId?:      string
  url?:          string
  storagePath?:  string
  md5Hash?:      string
  fileSizeBytes?: number
  mimeType?:     string
  error?:        string
  duplicate?:    boolean
  existingAssetId?: string
}

// ── Service client ─────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Main Upload ───────────────────────────────────────────────────────────────

/**
 * Process and upload a raw media file from a Next.js API route.
 * Uses server-side FormData (Blob), NOT browser File type.
 *
 * @param blob      — file content as Blob (from request.formData())
 * @param fileName  — original file name
 * @param mimeType  — MIME type from Content-Type header
 * @param clientId  — tenant scoping
 * @param campaignId — associated campaign
 * @param teamId    — RLS scoping
 */
export async function processRawMedia(
  blob:       Blob,
  fileName:   string,
  mimeType:   string,
  clientId:   string,
  campaignId: string,
  teamId:     string,
): Promise<RawMediaUploadResult> {
  const db = getServiceClient()

  // ── [RM-2] File size validation ────────────────────────────────────────────
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok:    false,
      error: `FILE_TOO_LARGE: ${(blob.size / 1024 / 1024).toFixed(1)}MB exceeds 500MB limit`,
    }
  }

  if (blob.size === 0) {
    return { ok: false, error: 'FILE_EMPTY: Zero-byte file rejected' }
  }

  // ── [RM-3] MIME type whitelist ─────────────────────────────────────────────
  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      ok:    false,
      error: `INVALID_MIME_TYPE: "${normalizedMime}" is not allowed. Accepted: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`,
    }
  }

  // ── [RM-4] MD5 deduplication ───────────────────────────────────────────────
  const buffer   = await blob.arrayBuffer()
  const md5Hash  = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex')

  const { data: existing } = await db
    .from('media_assets')
    .select('id, url')
    .eq('client_id', clientId)
    .eq('md5_hash', md5Hash)
    .maybeSingle()

  if (existing) {
    console.log(`[RawMedia] Duplicate detected — md5:${md5Hash.slice(0, 8)}... → ${existing.id}`)
    return {
      ok:               true,
      duplicate:        true,
      existingAssetId:  existing.id,
      url:              existing.url,
    }
  }

  // ── Upload to Supabase Storage ─────────────────────────────────────────────
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath   = `clients/${clientId}/${Date.now()}_${sanitizedName}`

  const { data: uploadData, error: uploadError } = await db
    .storage
    .from('media')
    .upload(storagePath, blob, {
      contentType: normalizedMime,
      upsert:      false,
    })

  if (uploadError || !uploadData) {
    return {
      ok:    false,
      error: `STORAGE_UPLOAD_FAIL: ${uploadError?.message || 'Unknown storage error'}`,
    }
  }

  // Get public URL
  const { data: urlData } = db.storage.from('media').getPublicUrl(storagePath)
  const url = urlData?.publicUrl || null

  // ── Insert media_assets record ─────────────────────────────────────────────
  const { data: asset, error: assetError } = await db
    .from('media_assets')
    .insert({
      campaign_id:    campaignId,
      client_id:      clientId,
      team_id:        teamId,
      type:           'raw',
      format:         normalizedMime.startsWith('video') ? 'video'
                    : normalizedMime.startsWith('audio') ? 'audio' : 'image',
      status:         'ready',
      url,
      storage_path:   storagePath,
      file_size_bytes: blob.size,
      mime_type:      normalizedMime,
      md5_hash:       md5Hash,
      generator:      'raw',
      generation_cost_usd: 0,
      metadata:       { original_name: fileName },
    })
    .select('id')
    .single()

  if (assetError || !asset) {
    return {
      ok:    false,
      error: `ASSET_INSERT_FAIL: ${assetError?.message}`,
    }
  }

  console.log(`[RawMedia] Uploaded ${sanitizedName} → ${storagePath} | ${(blob.size / 1024 / 1024).toFixed(2)}MB`)

  return {
    ok:            true,
    assetId:       asset.id,
    url:           url ?? undefined,
    storagePath,
    md5Hash,
    fileSizeBytes: blob.size,
    mimeType:      normalizedMime,
  }
}
