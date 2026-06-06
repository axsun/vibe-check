import { Router } from 'express'
import multer from 'multer'
import type { Vibe } from '../../shared/types'
import { computePoppingScore } from '../../shared/score'
import { analyzeVibe } from '../lib/gemini'
import { insertVibe, uploadClip } from '../lib/store'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })
export const vibeRouter = Router()

// POST /api/vibe  (multipart: clip + place_name, handle, lat, lng)
vibeRouter.post('/', upload.single('clip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'missing audio clip (field "clip")' })

    const { place_name = 'Unknown spot', handle = 'anon', lat, lng } = req.body
    const contentType = req.file.mimetype || 'audio/mp4'

    // 1. upload clip   2. analyze   (run in parallel — upload doesn't block analysis)
    const [clip_url, dims] = await Promise.all([
      uploadClip(req.file.buffer, contentType),
      analyzeVibe(req.file.buffer),
    ])

    // 3. derive score   4. persist
    const row = await insertVibe({
      place_name,
      handle,
      lat: lat != null && lat !== '' ? Number(lat) : null,
      lng: lng != null && lng !== '' ? Number(lng) : null,
      clip_url,
      popping_score: computePoppingScore(dims),
      ...dims,
    } as Omit<Vibe, 'id' | 'created_at'>)

    res.json(row)
  } catch (err: any) {
    console.error('[POST /api/vibe]', err)
    res.status(500).json({ error: err.message ?? 'vibe analysis failed' })
  }
})
