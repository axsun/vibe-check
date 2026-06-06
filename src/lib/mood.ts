// The aura: a place's mood expressed as color. This is the ONLY saturated color
// in the app — used as glow/light through glass, never as a flat fill, never a
// number or emoji. Define mood→color once here; reuse everywhere.
// See the design system (message.txt): "quiet glass, living color".

export type MoodKey = 'party' | 'electric' | 'buzzy' | 'cozy' | 'chill' | 'still'

export interface Mood {
  key: MoodKey
  label: string // one-word mono label, UPPERCASE
  color: string
}

export const MOODS: Record<MoodKey, Mood> = {
  party: { key: 'party', label: 'PARTY', color: '#FF2D78' }, // magenta — peak, dancing
  electric: { key: 'electric', label: 'ELECTRIC', color: '#7C5CFF' }, // violet — late-night, driving
  buzzy: { key: 'buzzy', label: 'BUZZY', color: '#FF6B8A' }, // coral — lively chatter
  cozy: { key: 'cozy', label: 'COZY', color: '#FF9F5A' }, // amber — intimate, candlelit
  chill: { key: 'chill', label: 'CHILL', color: '#4EC0FF' }, // blue — calm, talk-friendly
  still: { key: 'still', label: 'STILL', color: '#5B6B86' }, // slate — quiet, sparse
}

// Warm/intimate genres lean "cozy" over "chill".
const WARM = /jazz|folk|lo-?fi|acoustic|soul|indie|ambient|blues|bossa|classical/i

interface MoodInput {
  emotional_register: string
  loudness?: number
  music_volume?: number | null
  music_genre?: string | null
}

/** Derive a place's mood from its analyzed vibe (register + warmth cues). */
export function moodFor(v: MoodInput): Mood {
  const reg = v.emotional_register
  if (reg === 'dead') return MOODS.still
  if (reg === 'hyped') {
    const loud = Number(v.loudness) >= 9 || Number(v.music_volume) >= 8
    return loud ? MOODS.party : MOODS.electric
  }
  if (reg === 'lively') return MOODS.buzzy
  // chill → cozy when the music feels warm/intimate, else cool chill
  if (v.music_genre && WARM.test(v.music_genre)) return MOODS.cozy
  return MOODS.chill
}

/**
 * Energy → glow size in px. Energy reads as glow intensity/size, not a digit.
 * `score` is the 0–100 popping signal; larger/brighter glow = more energy.
 */
export function glowPx(score = 50, base = 12, span = 26): number {
  return Math.round(base + (Math.max(0, Math.min(100, score)) / 100) * span)
}

/** A soft mood-color glow shadow (low alpha — it's light, not fill). */
export function moodGlow(color: string, score = 50): string {
  const px = glowPx(score)
  return `0 0 ${px}px ${color}55, 0 0 ${Math.round(px / 2)}px ${color}33`
}
