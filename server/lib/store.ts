import type { Vibe } from '../../shared/types'
import { env, flags } from './env'
import { supabase } from './supabase'
import { localList, localInsert, localSaveClip, localSeedIfEmpty, localReseed } from './localStore'

// Storage dispatcher. Default = local files (data/). Set STORAGE_MODE=supabase to
// use Supabase (kept fully working behind the flag so switching back is one env var).

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface FeedQuery {
  lat?: number
  lng?: number
  radiusKm?: number
}

/** Recent vibes, newest first, optionally filtered to a radius around the user. */
export async function listVibes(q: FeedQuery = {}): Promise<Vibe[]> {
  let rows: Vibe[]

  if (flags.supabase && supabase) {
    const { data, error } = await supabase
      .from('vibes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    rows = (data ?? []) as Vibe[]
  } else {
    rows = (await localList()).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  if (q.lat != null && q.lng != null) {
    const radius = q.radiusKm ?? 5
    rows = rows.filter(
      (v) => v.lat == null || v.lng == null || distanceKm(q.lat!, q.lng!, v.lat, v.lng) <= radius,
    )
  }
  return rows
}

/** Save a clip and return a playable URL (Supabase public URL or local /clips path). */
export async function uploadClip(buffer: Buffer, contentType: string): Promise<string | null> {
  if (flags.supabase && supabase) {
    const { randomUUID } = await import('node:crypto')
    const ext = contentType.includes('mp4') ? 'm4a' : contentType.includes('webm') ? 'webm' : 'audio'
    const path = `${randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(env.SUPABASE_BUCKET).upload(path, buffer, { contentType })
    if (error) throw error
    return supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl
  }
  return localSaveClip(buffer, contentType)
}

/** Persist a vibe. Returns the stored row. */
export async function insertVibe(vibe: Omit<Vibe, 'id' | 'created_at'>): Promise<Vibe> {
  if (flags.supabase && supabase) {
    const { data, error } = await supabase.from('vibes').insert(vibe).select().single()
    if (error) throw error
    return data as Vibe
  }
  return localInsert(vibe)
}

/** Seed starter data if empty (local mode only; Supabase uses `npm run seed`). */
export async function seedIfEmpty(): Promise<void> {
  if (flags.supabase) return
  const n = await localSeedIfEmpty()
  console.log(`   • seeded:     ${n} starter vibes in data/vibes.json`)
}

export { localReseed }
