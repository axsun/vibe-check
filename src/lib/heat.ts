// Vibe Heat scale — single source of truth for score → color/label.
// Use this everywhere a score appears (pins, chips, glows, reveal).
// See DESIGN.md "The Vibe Heat scale".

export type HeatTier = 'peak' | 'popping' | 'lively' | 'chill' | 'quiet'

export interface Heat {
  tier: HeatTier
  label: string
  color: string
}

// Violet/indigo family. See --heat-* tokens in src/index.css.
const PEAK: Heat = { tier: 'peak', label: 'Peak', color: '#E254FF' }
const POPPING: Heat = { tier: 'popping', label: 'Popping', color: '#A468FF' }
const LIVELY: Heat = { tier: 'lively', label: 'Lively', color: '#6E5BFF' }
const CHILL: Heat = { tier: 'chill', label: 'Chill', color: '#4A3DFF' }
const QUIET: Heat = { tier: 'quiet', label: 'Quiet', color: '#4B4F70' }

export function heatFor(score: number): Heat {
  if (score >= 80) return PEAK
  if (score >= 60) return POPPING
  if (score >= 40) return LIVELY
  if (score >= 20) return CHILL
  return QUIET
}

/** Soft glow shadow for a score chip in its heat color. */
export function heatGlow(score: number, intensity = 16): string {
  return `0 0 ${intensity}px ${heatFor(score).color}55`
}
