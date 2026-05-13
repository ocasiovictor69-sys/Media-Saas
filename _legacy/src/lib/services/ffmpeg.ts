import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const execFileAsync = promisify(execFile)

export type PlatformExportSpec = {
  platform: 'youtube' | 'instagram_reel' | 'tiktok' | 'linkedin' | 'facebook_reel'
  width: number
  height: number
  maxDurationSec: number | null
}

export const PLATFORM_SPECS: Record<string, PlatformExportSpec> = {
  youtube:        { platform: 'youtube',        width: 1920, height: 1080, maxDurationSec: null },
  instagram_reel: { platform: 'instagram_reel', width: 1080, height: 1920, maxDurationSec: 90 },
  tiktok:         { platform: 'tiktok',         width: 1080, height: 1920, maxDurationSec: 600 },
  linkedin:       { platform: 'linkedin',       width: 1920, height: 1080, maxDurationSec: 600 },
  facebook_reel:  { platform: 'facebook_reel',  width: 1080, height: 1920, maxDurationSec: 90 },
}

export async function exportForPlatform(inputPath: string, platform: string): Promise<string> {
  const spec = PLATFORM_SPECS[platform]
  if (!spec) throw new Error(`Unknown platform: ${platform}`)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowmedia-'))
  const outputPath = path.join(tmpDir, `${platform}.mp4`)

  const args = [
    '-i', inputPath,
    '-vf', `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=decrease,pad=${spec.width}:${spec.height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    ...(spec.maxDurationSec ? ['-t', String(spec.maxDurationSec)] : []),
    '-movflags', '+faststart',
    '-y', outputPath,
  ]

  await execFileAsync('ffmpeg', args)
  return outputPath
}

export async function assembleClips(inputPaths: string[], outputPath: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowmedia-concat-'))
  const listFile = path.join(tmpDir, 'concat.txt')
  const listContent = inputPaths.map(p => `file '${p}'`).join('\n')
  await fs.writeFile(listFile, listContent)

  await execFileAsync('ffmpeg', [
    '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c', 'copy', '-y', outputPath,
  ])
  return outputPath
}

export async function extractAudio(inputPath: string, outputPath: string): Promise<string> {
  await execFileAsync('ffmpeg', [
    '-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', '-y', outputPath,
  ])
  return outputPath
}
