import type { Vibe, VibeDimensions } from './types'
import { computePoppingScore } from './score'

// 👉 Set this to your demo venue's coordinates so the map + feed center on you.
// Default: Washington Square Park area, Manhattan (NY Tech Week).
export const DEMO_CENTER = { lat: 40.7308, lng: -73.9973 }

type Seed = { place_name: string; handle: string; dLat: number; dLng: number; dims: VibeDimensions }

const SEEDS: Seed[] = [
  {
    place_name: 'Le Bain (rooftop)', handle: '🦄 nightowl', dLat: 0.004, dLng: 0.003,
    dims: { loudness: 9, music_present: true, music_volume: 9, music_genre: 'house', has_lyrics: false, talk_level: 4, emotional_register: 'hyped', summary: 'Wall-to-wall house, nobody talking, everybody sweating.' },
  },
  {
    place_name: 'The Smith', handle: '🍸 emma', dLat: -0.003, dLng: 0.002,
    dims: { loudness: 6, music_present: true, music_volume: 5, music_genre: '2000s pop', has_lyrics: true, talk_level: 7, emotional_register: 'lively', summary: 'Throwback pop and shouted gossip — actually a good time.' },
  },
  {
    place_name: 'Think Coffee', handle: '☕ deepwork', dLat: 0.002, dLng: -0.004,
    dims: { loudness: 3, music_present: true, music_volume: 2, music_genre: 'indie folk', has_lyrics: true, talk_level: 3, emotional_register: 'chill', summary: 'Soft indie, laptops everywhere, productivity theater in session.' },
  },
  {
    place_name: 'Banter Bar', handle: '🏈 mike', dLat: -0.005, dLng: -0.002,
    dims: { loudness: 7, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 9, emotional_register: 'lively', summary: 'No music, just the game on and a hundred people yelling at it.' },
  },
  {
    place_name: 'Quiet Bean', handle: '🌙 nora', dLat: 0.006, dLng: 0.001,
    dims: { loudness: 1, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 1, emotional_register: 'dead', summary: 'You could hear a pin drop. Bring your own personality.' },
  },
]

/** Build seed Vibe rows around a center, spaced a few minutes apart. */
export function makeSeedVibes(center = DEMO_CENTER, now = Date.now()): Vibe[] {
  return SEEDS.map((s, i) => ({
    id: `seed-${i + 1}`,
    place_name: s.place_name,
    handle: s.handle,
    lat: center.lat + s.dLat,
    lng: center.lng + s.dLng,
    clip_url: null,
    popping_score: computePoppingScore(s.dims),
    created_at: new Date(now - i * 7 * 60_000).toISOString(),
    ...s.dims,
  }))
}
