export async function postToYouTube(params: {
  video_url:    string
  title:        string
  description:  string
  access_token: string
}) {
  const videoRes = await fetch(params.video_url)
  const videoBuffer = await videoRes.arrayBuffer()

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization:             `Bearer ${params.access_token}`,
        'Content-Type':            'application/json',
        'X-Upload-Content-Type':   'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.byteLength),
      },
      body: JSON.stringify({
        snippet: { title: params.title, description: params.description },
        status:  { privacyStatus: 'public' },
      }),
    }
  )

  if (!uploadRes.ok) throw new Error(`YouTube resumable upload init HTTP ${uploadRes.status}`)
  const uploadUrl = uploadRes.headers.get('Location')
  if (!uploadUrl) throw new Error('YouTube did not return upload URL')

  const finalRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body:    videoBuffer,
  })

  if (!finalRes.ok) throw new Error(`YouTube upload HTTP ${finalRes.status}`)
  const data = await finalRes.json() as { id?: string }
  return { platform: 'youtube', post_id: data.id, url: `https://youtube.com/watch?v=${data.id}` }
}
