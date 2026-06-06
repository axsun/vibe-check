import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'

/**
 * Browsers don't agree on a Gemini-friendly audio format:
 *   - Chrome MediaRecorder -> audio/webm (opus)   ← Gemini does NOT accept webm
 *   - iOS Safari           -> audio/mp4 (aac)      ← container often not pipe-seekable
 * So we transcode whatever comes in to mono 16kHz MP3 (which Gemini accepts) via a
 * temp file (reliable for mp4's trailing moov atom). Falls back to the original
 * buffer if ffmpeg is unavailable.
 */
export async function toMp3(input: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!ffmpegPath) {
    console.warn('[transcode] ffmpeg-static missing; passing audio through untouched')
    return { buffer: input, mimeType: 'audio/mp4' }
  }

  const dir = await mkdtemp(join(tmpdir(), 'vibe-'))
  const inPath = join(dir, `${randomUUID()}.bin`)
  const outPath = join(dir, `${randomUUID()}.mp3`)

  try {
    await writeFile(inPath, input)
    await run(ffmpegPath, ['-y', '-i', inPath, '-ac', '1', '-ar', '16000', '-f', 'mp3', outPath])
    const buffer = await readFile(outPath)
    return { buffer, mimeType: 'audio/mp3' }
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    p.stderr.on('data', (d) => (stderr += d.toString()))
    p.on('error', reject)
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`)),
    )
  })
}
