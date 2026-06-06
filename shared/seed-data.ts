import type { Vibe, VibeDimensions } from './types'
import { computePoppingScore } from './score'

// 👉 Set this to your demo venue's coordinates so the map + feed center on you.
// Default: Washington Square Park area, Manhattan (NY Tech Week).
export const DEMO_CENTER = { lat: 40.7308, lng: -73.9973 }

// A curated demo set: positions are offsets from DEMO_CENTER (so they cluster
// wherever you point the demo), and `clip` points to a committed sample in
// public/seed-clips/ so the audio travels with the repo. Generated vibes were
// sourced from ElevenLabs and analyzed by Gemini; the no-clip ones are authored.
type Seed = {
  place_name: string
  handle: string
  dLat: number
  dLng: number
  clip?: string | null
  dims: VibeDimensions
}

const SEEDS: Seed[] = [
  {
    place_name: "Calle Ocho", handle: "💃 lola", dLat: -0.0038, dLng: 0.0026, clip: '/seed-clips/calle-ocho.mp3', 
    dims: { loudness: 8, music_present: true, music_volume: 8, music_genre: "Cumbia", has_lyrics: true, talk_level: 7, emotional_register: "hyped", summary: "The cumbia's blaring, the crowd's singing along, and the energy is contagiously hyped." },
  },
  {
    place_name: "Finnerty’s", handle: "🏈 gameday", dLat: -0.0051, dLng: -0.0019, clip: '/seed-clips/finnertys.mp3', 
    dims: { loudness: 10, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 10, emotional_register: "hyped", summary: "It sounds like a full stadium just witnessed a game-winning play, with cheers and shouts reaching a deafening peak." },
  },
  {
    place_name: "McSorley’s", handle: "🍺 oldtimer", dLat: 0.0035, dLng: 0.0009, clip: '/seed-clips/mcsorleys.mp3', 
    dims: { loudness: 8, music_present: true, music_volume: 6, music_genre: "electronic dance", has_lyrics: false, talk_level: 9, emotional_register: "lively", summary: "The room is buzzing with loud conversations and cheers over an upbeat electronic track." },
  },
  {
    place_name: "Le Bain (rooftop)", handle: "🦄 nightowl", dLat: 0.0048, dLng: -0.0028, clip: '/seed-clips/le-bain-rooftop.mp3', 
    dims: { loudness: 7, music_present: true, music_volume: 7, music_genre: "House", has_lyrics: false, talk_level: 7, emotional_register: "lively", summary: "The house beat is pumping with a lively crowd chatting over it, making for a buzzing atmosphere." },
  },
  {
    place_name: "East Canal Jewelry", handle: "mike", dLat: -0.0118, dLng: -0.0077, clip: '/seed-clips/east-canal-jewelry.m4a', 
    dims: { loudness: 7, music_present: true, music_volume: 7, music_genre: "electronic dance music", has_lyrics: true, talk_level: 4, emotional_register: "lively", summary: "Upbeat electronic music drives the energy while hushed conversations try to compete, setting a lively yet not overwhelming scene." },
  },
  {
    place_name: "The Smith", handle: "🍸 emma", dLat: -0.003, dLng: 0.002, 
    dims: { loudness: 6, music_present: true, music_volume: 5, music_genre: "2000s pop", has_lyrics: true, talk_level: 7, emotional_register: "lively", summary: "Throwback pop and shouted gossip — actually a good time." },
  },
  {
    place_name: "Banter Bar", handle: "🏈 mike", dLat: -0.005, dLng: -0.002, 
    dims: { loudness: 7, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 9, emotional_register: "lively", summary: "No music, just the game on and a hundred people yelling at it." },
  },
  {
    place_name: "Third Rail Coffee", handle: "☕ wfh", dLat: 0.0018, dLng: 0.0039, clip: '/seed-clips/third-rail-coffee.mp3', 
    dims: { loudness: 5, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 6, emotional_register: "lively", summary: "The room's abuzz with chatter and clinking glasses, like a busy cafe catching up on the day's gossip." },
  },
  {
    place_name: "Warehouse (EDM)", handle: "🔊 raver", dLat: 0.0042, dLng: 0.0031, clip: '/seed-clips/warehouse-edm.mp3',
    dims: { loudness: 10, music_present: true, music_volume: 10, music_genre: "techno", has_lyrics: false, talk_level: 3, emotional_register: "hyped", summary: "Relentless 128-BPM techno, zero lyrics, a packed floor that hasn't stopped moving." },
  },
  {
    place_name: "Blue Note", handle: "🎷 milesfan", dLat: 0.0029, dLng: -0.0041, clip: '/seed-clips/blue-note.mp3', 
    dims: { loudness: 3, music_present: true, music_volume: 4, music_genre: "jazz", has_lyrics: false, talk_level: 0, emotional_register: "chill", summary: "A mellow upright bass strolls through a quiet room, setting a perfectly calm jazz backdrop." },
  },
  {
    place_name: "Think Coffee", handle: "☕ deepwork", dLat: 0.002, dLng: -0.004, 
    dims: { loudness: 3, music_present: true, music_volume: 2, music_genre: "indie folk", has_lyrics: true, talk_level: 3, emotional_register: "chill", summary: "Soft indie, laptops everywhere, productivity theater in session." },
  },
  {
    place_name: "Quiet Bean", handle: "🌙 nora", dLat: 0.006, dLng: 0.001, 
    dims: { loudness: 1, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 1, emotional_register: "dead", summary: "You could hear a pin drop. Bring your own personality." },
  },
  {
    place_name: "The Strand (back)", handle: "📚 quiet", dLat: -0.0024, dLng: 0.0044, clip: '/seed-clips/the-strand-back.mp3', 
    dims: { loudness: 1, music_present: false, music_volume: null, music_genre: null, has_lyrics: null, talk_level: 0, emotional_register: "dead", summary: "The only sounds are faint clinking and a deafening silence. " },
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
    clip_url: s.clip ?? null,
    popping_score: computePoppingScore(s.dims),
    created_at: new Date(now - i * 7 * 60_000).toISOString(),
    ...s.dims,
  }))
}
