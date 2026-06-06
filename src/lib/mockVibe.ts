// Client-side mock vibe analyzer. Derives a plausible Vibe from real mic loudness
// captured during recording. Swap for a real /api/vibe call later — same return shape.

import type { Vibe, VibeDimensions, EmotionalRegister } from '../../shared/types'
import { computePoppingScore } from '../../shared/score'

const SUMMARIES: Record<EmotionalRegister, string[]> = {
  hyped: [
    'Walls sweating, bass in your chest, nobody checking the time.',
    'Pure peak — packed, loud, hands in the air.',
    'It is going OFF. Drop everything.',
  ],
  lively: [
    'Buzzy, talky, just the right amount of chaos.',
    'Real conversation energy — the room is into it.',
    'Warm crowd, music doing its job.',
  ],
  chill: [
    'Soft, low-key, easy to hear yourself think.',
    'Cozy hum — perfect third-place energy.',
    'Mellow soundtrack, scattered chatter.',
  ],
  dead: [
    'You could hear a pin drop. Bring your own personality.',
    'Empty-ish. Not the move tonight.',
    'Library hours. Skip unless you want quiet.',
  ],
}

const GENRES = ['house', '2000s pop', 'indie folk', 'reggaeton', 'techno', 'lo-fi', 'hip-hop']

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed * arr.length)) % arr.length]
}

function levelToRegister(avg: number): EmotionalRegister {
  if (avg >= 0.22) return 'hyped'
  if (avg >= 0.12) return 'lively'
  if (avg >= 0.04) return 'chill'
  return 'dead'
}

export interface MockInput {
  levels: number[]
  place_name: string
  handle: string
  lat?: number | null
  lng?: number | null
  clipBlob?: Blob | null
}

/** Produce a Vibe from recorded mic levels. Pure(-ish) — only randomness is summary pick. */
export function mockVibeFromLevels(input: MockInput): Vibe {
  const lv = input.levels.length ? input.levels : [0]
  const avg = lv.reduce((a, b) => a + b, 0) / lv.length
  const peak = lv.reduce((a, b) => Math.max(a, b), 0)
  const dynamic = peak - Math.min(...lv) // rough dynamic range — proxy for talk/music mix

  const loudness = Math.min(10, Math.round(avg * 38))
  const talk_level = Math.min(10, Math.round(dynamic * 28))
  const music_present = peak > 0.15 && dynamic < 0.3
  const music_volume = music_present ? Math.min(10, Math.round(peak * 24)) : null
  const register = levelToRegister(avg)

  const dims: VibeDimensions = {
    loudness,
    music_present,
    music_volume,
    music_genre: music_present ? pick(GENRES, avg + peak) : null,
    has_lyrics: music_present ? avg > 0.14 : null,
    talk_level,
    emotional_register: register,
    summary: pick(SUMMARIES[register], avg + peak * 1.7),
  }

  const score = computePoppingScore(dims)
  const id = `local-${Date.now()}`
  const clip_url = input.clipBlob ? URL.createObjectURL(input.clipBlob) : null

  return {
    id,
    place_name: input.place_name,
    handle: input.handle,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    clip_url,
    popping_score: score,
    created_at: new Date().toISOString(),
    ...dims,
  }
}
