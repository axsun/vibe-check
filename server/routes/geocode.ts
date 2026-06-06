import { Router } from 'express'
import { DEMO_CENTER } from '../../shared/seed-data'

export const geocodeRouter = Router()

// Reverse-geocode via OpenStreetMap Nominatim (free, no key). Server-side so we
// can set a User-Agent and avoid exposing anything client-side.
async function reverse(lat: number, lng: number): Promise<any | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=16&addressdetails=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'VibeCheck/1.0 (hackathon demo)' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function pickPlace(j: any, general: boolean): string | null {
  const a = j?.address ?? {}
  if (general) return a.city || a.town || a.suburb || a.county || a.state || j?.name || null
  // Prefer a named spot, then progressively broader neighborhood labels.
  return (
    a.neighbourhood || a.quarter || a.suburb || a.city_district || a.road ||
    a.city || a.town || j?.name || null
  )
}

// GET /api/geocode?lat=&lng=  → { place, precise }
// With valid coords: the user's neighborhood (precise). Without: a general area
// derived from the demo center, so the field is never blank.
geocodeRouter.get('/', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const precise = Number.isFinite(lat) && Number.isFinite(lng)
  const j = await reverse(precise ? lat : DEMO_CENTER.lat, precise ? lng : DEMO_CENTER.lng)
  const place = pickPlace(j, !precise) || (precise ? 'Where you are' : 'Around town')
  res.json({ place, precise })
})
