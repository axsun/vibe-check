import { Router } from 'express'
import { forecastAtmosphere } from '../lib/forecast'
import { listVibes } from '../lib/store'

export const forecastRouter = Router()

// POST /api/forecast { place_name, target_time, location? } → Atmosphere Forecast
forecastRouter.post('/', async (req, res) => {
  try {
    const { place_name, target_time, location } = req.body ?? {}
    if (!place_name || !target_time) {
      return res.status(400).json({ error: 'place_name and target_time required' })
    }
    const vibes = await listVibes()
    const atPlace = vibes.filter((v) => v.place_name === place_name)
    const current = atPlace[0] ?? vibes.find((v) => v.place_name === place_name) ?? null
    const forecast = await forecastAtmosphere({
      venue: place_name,
      location: location ?? '',
      target_time,
      current,
      historical: atPlace.slice(0, 4),
    })
    res.json({ place_name, target_time, forecast })
  } catch (err: any) {
    console.error('[POST /api/forecast]', err)
    res.status(500).json({ error: err.message ?? 'forecast failed' })
  }
})
