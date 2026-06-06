import type { Vibe, VibeCheckInput, DiscoverResponse, ForecastResponse } from '../../shared/types'

export async function getFeed(lat?: number, lng?: number, radiusKm = 5): Promise<Vibe[]> {
  const q = new URLSearchParams()
  if (lat != null && lng != null) {
    q.set('lat', String(lat))
    q.set('lng', String(lng))
    q.set('radiusKm', String(radiusKm))
  }
  const res = await fetch(`/api/feed?${q}`)
  if (!res.ok) throw new Error('feed failed')
  return res.json()
}

export async function checkIn(clip: Blob, input: VibeCheckInput): Promise<Vibe> {
  const fd = new FormData()
  const ext = clip.type.includes('mp4') ? 'm4a' : 'webm'
  fd.append('clip', clip, `clip.${ext}`)
  fd.append('place_name', input.place_name)
  fd.append('handle', input.handle)
  if (input.lat != null) fd.append('lat', String(input.lat))
  if (input.lng != null) fd.append('lng', String(input.lng))

  const res = await fetch('/api/vibe', { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'check-in failed')
  return res.json()
}

/** Reverse-geocode a location to a place name (general area when loc is null). */
export async function geocode(loc?: { lat: number; lng: number } | null): Promise<{ place: string; precise: boolean }> {
  const q = loc ? `?lat=${loc.lat}&lng=${loc.lng}` : ''
  const res = await fetch(`/api/geocode${q}`)
  if (!res.ok) throw new Error('geocode failed')
  return res.json()
}

/** Discover venues/events from a natural-language vibe query. */
export async function discover(q: string): Promise<DiscoverResponse> {
  const res = await fetch(`/api/discover?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'discovery failed')
  return res.json()
}

/** Forecast a place's future atmosphere at a target time. */
export async function forecast(place_name: string, target_time: string, location?: string): Promise<ForecastResponse> {
  const res = await fetch('/api/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place_name, target_time, location }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'forecast failed')
  return res.json()
}

/** Generate/fetch the looping ambient soundscape for a forecast. Returns a playable URL. */
export async function soundscapeUrl(prompt: string, mood: string, cacheKey: string): Promise<string> {
  const res = await fetch('/api/soundscape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mood, cacheKey }),
  })
  if (!res.ok) throw new Error('soundscape unavailable')
  return URL.createObjectURL(await res.blob())
}

/** Vibe Narrator: speak a summary aloud (ElevenLabs). Returns a playable audio URL. */
export async function narrateUrl(text: string): Promise<string> {
  const res = await fetch('/api/narrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'narrator unavailable')
  return URL.createObjectURL(await res.blob())
}
