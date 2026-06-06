import type { Vibe, VibeCheckInput } from '../../shared/types'

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
