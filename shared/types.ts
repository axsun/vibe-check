// ── The API contract (§6). Lock this; both client and server import it. ──

export type EmotionalRegister = 'hyped' | 'lively' | 'chill' | 'dead'

/** The structured vibe the analyzer (Gemini) returns from an audio clip. */
export interface VibeDimensions {
  loudness: number // 0–10 overall ambient level
  music_present: boolean
  music_volume: number | null // 0–10, only when music_present
  music_genre: string | null // e.g. "2000s pop", "techno", "reggaeton"
  has_lyrics: boolean | null // the core café/nightlife differentiator
  talk_level: number // 0–10 how conversational
  emotional_register: EmotionalRegister
  summary: string // one witty sentence — the screenshot line
}

/** A full vibe row as stored + returned by the API. */
export interface Vibe extends VibeDimensions {
  id: string
  place_name: string
  lat: number | null
  lng: number | null
  handle: string // emoji/name, no auth
  clip_url: string | null // Supabase Storage public URL (null in mock mode)
  popping_score: number // 0–100, derived from dimensions
  created_at: string // ISO timestamp
}

/** Multipart fields sent to POST /api/vibe alongside the `clip` file. */
export interface VibeCheckInput {
  place_name: string
  handle: string
  lat?: number | null
  lng?: number | null
}

/** GET /api/feed?lat=&lng=&radiusKm= response. */
export type FeedResponse = Vibe[]

export interface NarrateRequest {
  text: string
  voiceId?: string
}
