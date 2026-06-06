import type { VibeDimensions, EmotionalRegister } from './types'

const REGISTER_WEIGHT: Record<EmotionalRegister, number> = {
  hyped: 1.0,
  lively: 0.7,
  chill: 0.35,
  dead: 0.05,
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * Derive the 0–100 "popping" score from the analyzer's dimensions.
 * Pure + shared so the feed, the card, and the backend all agree on one number.
 * Weighting (tune freely): loudness 40%, register 25%, music 20%, talk 15%.
 */
export function computePoppingScore(d: VibeDimensions): number {
  const loudness = clamp(d.loudness ?? 0, 0, 10) / 10
  const talk = clamp(d.talk_level ?? 0, 0, 10) / 10
  const music = d.music_present ? clamp(d.music_volume ?? 0, 0, 10) / 10 : 0
  const register = REGISTER_WEIGHT[d.emotional_register] ?? 0.3

  const raw = loudness * 0.4 + register * 0.25 + music * 0.2 + talk * 0.15
  return Math.round(clamp(raw, 0, 1) * 100)
}
