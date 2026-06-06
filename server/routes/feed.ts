import { Router } from 'express'
import { listVibes } from '../lib/store'

export const feedRouter = Router()

// GET /api/feed?lat=&lng=&radiusKm=
feedRouter.get('/', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query
    const vibes = await listVibes({
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
    })
    res.json(vibes)
  } catch (err: any) {
    console.error('[GET /api/feed]', err)
    res.status(500).json({ error: err.message ?? 'feed query failed' })
  }
})
