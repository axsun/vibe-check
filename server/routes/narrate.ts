import { Router } from 'express'
import type { NarrateRequest } from '../../shared/types'
import { narrate } from '../lib/elevenlabs'
import { flags } from '../lib/env'

export const narrateRouter = Router()

// POST /api/narrate  { text, voiceId? }  -> audio/mpeg
// The "Vibe Narrator" speaks a summary aloud in a persona voice (ElevenLabs).
narrateRouter.post('/', async (req, res) => {
  try {
    if (!flags.elevenlabs) return res.status(503).json({ error: 'narrator disabled (no ELEVENLABS_API_KEY)' })
    const { text, voiceId } = req.body as NarrateRequest
    if (!text?.trim()) return res.status(400).json({ error: 'missing text' })

    const audio = await narrate(text.slice(0, 500), voiceId)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(audio)
  } catch (err: any) {
    console.error('[POST /api/narrate]', err)
    res.status(500).json({ error: err.message ?? 'narration failed' })
  }
})
