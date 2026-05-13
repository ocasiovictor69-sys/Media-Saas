status report
export async function postToInstagram(params: {
  video_url:    string
  caption:      string
  access_token: string
  ig_user_id:   string
}) {
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.ig_user_id}/reels`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url:    params.video_url,
        caption:      params.caption,
        access_token: params.access_token,
      }),
    }
  )
  if (!containerRes.ok) throw new Error(`Instagram container HTTP ${containerRes.status}`)
  const { id: creation_id } = await containerRes.json() as { id: string }

  let attempts = 0
  while (attempts < 20) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${creation_id}?fields=status_code&access_token=${params.access_token}`
    )
    const status = await statusRes.json() as { status_code?: string }
    if (status.status_code === 'FINISHED') break
    if (status.status_code === 'ERROR') throw new Error('Instagram reel processing failed')
    attempts++
  }

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.ig_user_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id, access_token: params.access_token }),
    }
  )
  if (!publishRes.ok) throw new Error(`Instagram publish HTTP ${publishRes.status}`)
  const { id } = await publishRes.json() as { id: string }
  return { platform: 'instagram', post_id: id }
}
