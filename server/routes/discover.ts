import { Router } from 'express'
import { discoverEvents } from '../lib/discover'
import { listVibes } from '../lib/store'

export const discoverRouter = Router()

// GET /api/discover?q=<natural language vibe>  → ranked current + upcoming events
discoverRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim()
    if (!q) return res.status(400).json({ error: 'missing query (?q=)' })
    const vibes = await listVibes()
    const events = await discoverEvents(q, vibes)
    res.json({ query: q, events })
  } catch (err: any) {
    console.error('[GET /api/discover]', err)
    res.status(500).json({ error: err.message ?? 'discovery failed' })
  }
})
