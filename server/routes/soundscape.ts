import { Router } from 'express'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { soundscape } from '../lib/elevenlabs'
import { flags } from '../lib/env'

export const soundscapeRouter = Router()

// Cache generated beds per venue+time so replays are instant and we don't re-bill.
const cache = new Map<string, Buffer>()

// No-key fallback: map the forecast's mood to a bundled ambient clip so the
// feature always demos.
const FALLBACK: Record<string, string> = {
  party: 'warehouse-edm.mp3',
  electric: 'le-bain-rooftop.mp3',
  buzzy: 'calle-ocho.mp3',
  cozy: 'blue-note.mp3',
  chill: 'third-rail-coffee.mp3',
  still: 'the-strand-back.mp3',
}
const clipPath = (mood: string) =>
  join(process.cwd(), 'public', 'seed-clips', FALLBACK[mood] ?? FALLBACK.chill)

// POST /api/soundscape { prompt, mood?, cacheKey? } → looping ambient MP3
soundscapeRouter.post('/', async (req, res) => {
  const { prompt, mood = 'chill', cacheKey } = req.body ?? {}
  const key = cacheKey || prompt || mood
  try {
    if (cache.has(key)) {
      res.type('audio/mpeg')
      return res.send(cache.get(key))
    }
    let buf: Buffer
    if (flags.elevenlabs && prompt) {
      buf = await soundscape(prompt)
    } else {
      buf = await readFile(clipPath(mood))
    }
    cache.set(key, buf)
    res.type('audio/mpeg')
    res.send(buf)
  } catch (err: any) {
    console.warn('[POST /api/soundscape] generation failed, using bundled clip:', err?.message ?? err)
    try {
      const buf = await readFile(clipPath(mood))
      res.type('audio/mpeg')
      res.send(buf)
    } catch {
      res.status(500).json({ error: 'soundscape unavailable' })
    }
  }
})
