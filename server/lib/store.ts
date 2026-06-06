import { randomUUID } from 'node:crypto'
import type { Vibe } from '../../shared/types'
import { makeSeedVibes } from '../../shared/seed-data'
import { env, flags } from './env'
import { supabase } from './supabase'

// ── In-memory fallback (no Supabase keys): full app works, just not persisted ──
const memory: Vibe[] = makeSeedVibes()

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
    rows = [...memory].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  if (q.lat != null && q.lng != null) {
    const radius = q.radiusKm ?? 5
    rows = rows.filter(
      (v) => v.lat == null || v.lng == null || distanceKm(q.lat!, q.lng!, v.lat, v.lng) <= radius,
    )
  }
  return rows
}

/** Upload a clip to Supabase Storage and return its public URL (null in mock mode). */
export async function uploadClip(buffer: Buffer, contentType: string): Promise<string | null> {
  if (!(flags.supabase && supabase)) return null
  const ext = contentType.includes('mp4') ? 'm4a' : contentType.includes('webm') ? 'webm' : 'audio'
  const path = `${randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(env.SUPABASE_BUCKET).upload(path, buffer, { contentType })
  if (error) throw error
  return supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Persist a vibe (Supabase) or push into memory (mock). Returns the stored row. */
export async function insertVibe(vibe: Omit<Vibe, 'id' | 'created_at'>): Promise<Vibe> {
  if (flags.supabase && supabase) {
    const { data, error } = await supabase.from('vibes').insert(vibe).select().single()
    if (error) throw error
    return data as Vibe
  }
  const row: Vibe = { ...vibe, id: randomUUID(), created_at: new Date().toISOString() }
  memory.unshift(row)
  return row
}
