// Generate real vibes from ElevenLabs-sourced venue soundscapes.
// For each venue type below we synthesize ~20s of ambient audio with ElevenLabs
// Sound Effects, then run it through the SAME pipeline a real recording uses:
//   audio -> Gemini analyzer -> structured vibe -> popping_score -> store.
// The rating is therefore earned by analyzing real audio, not hand-authored.
//
//   npm run generate-vibes
//
// Additive: inserts alongside existing rows (run `npm run seed` first to reset).
import { DEMO_CENTER } from '../shared/seed-data'
import { computePoppingScore } from '../shared/score'
import { flags } from '../server/lib/env'
import { soundEffect } from '../server/lib/elevenlabs'
import { analyzeVibe } from '../server/lib/gemini'
import { insertVibe, uploadClip, listVibes } from '../server/lib/store'

type Venue = {
  place_name: string
  handle: string
  dLat: number // offset from DEMO_CENTER so pins spread across the map
  dLng: number
  prompt: string // what ElevenLabs should synthesize
}

// Spread of venue types chosen to exercise the full dimension space:
// loud/quiet, music/no-music, lyrics/instrumental, hyped/dead.
const VENUES: Venue[] = [
  {
    place_name: 'Warehouse (EDM)', handle: '🔊 raver', dLat: 0.0042, dLng: 0.0031,
    prompt: 'Inside a packed warehouse rave: pounding 128 BPM electronic dance music, heavy sub bass, a roaring crowd cheering, no clear vocals, ecstatic and deafening.',
  },
  {
    place_name: 'Calle Ocho', handle: '💃 lola', dLat: -0.0038, dLng: 0.0026,
    prompt: 'A crowded Latin nightclub: upbeat reggaeton with male Spanish vocals, brass stabs, people singing along and laughing, festive and high-energy.',
  },
  {
    place_name: 'Blue Note', handle: '🎷 milesfan', dLat: 0.0029, dLng: -0.0041,
    prompt: 'An intimate jazz lounge: live double bass, brushed drums and a smoky saxophone solo, low murmured conversation, clinking glasses, relaxed and classy.',
  },
  {
    place_name: 'Third Rail Coffee', handle: '☕ wfh', dLat: 0.0018, dLng: 0.0039,
    prompt: 'A busy daytime coffee shop: soft indie folk playing quietly, espresso machine hissing and steaming, gentle chatter, laptops, calm and productive.',
  },
  {
    place_name: 'Finnerty’s', handle: '🏈 gameday', dLat: -0.0051, dLng: -0.0019,
    prompt: 'A rowdy sports bar during a big game: no music, a huge crowd of people shouting and cheering at a TV, sudden roars and groans, beer-soaked and loud.',
  },
  {
    place_name: 'McSorley’s', handle: '🍺 oldtimer', dLat: 0.0035, dLng: 0.0009,
    prompt: 'An old wood-paneled dive bar: a classic rock jukebox playing electric guitar, scattered loud conversation and laughter, glasses clinking, easygoing and lively.',
  },
  {
    place_name: 'The Strand (back)', handle: '📚 quiet', dLat: -0.0024, dLng: 0.0044,
    prompt: 'The hushed back room of a bookstore: almost silent, faint footsteps and the occasional page turning, a distant air-conditioning hum, calm and nearly empty.',
  },
  {
    place_name: 'Le Bain (rooftop)', handle: '🦄 nightowl', dLat: 0.0048, dLng: -0.0028,
    prompt: 'A rooftop house-music party at night: groovy deep house with a steady four-on-the-floor beat, no lyrics, a lively crowd talking and dancing, warm and cool.',
  },
]

async function main() {
  if (!flags.elevenlabs) {
    console.error('✖ ELEVENLABS_API_KEY missing — cannot source venue audio. Aborting.')
    process.exit(1)
  }
  if (!flags.gemini) {
    console.warn('⚠ GEMINI_API_KEY missing — vibes will be MOCK-rated, not analyzed.')
  }

  // Skip venues already in the store so re-runs only fill gaps (no dup credit spend).
  // Delete a row from data/vibes.json to force-regenerate that venue.
  const existing = new Set((await listVibes()).map((r) => r.place_name))
  const todo = VENUES.filter((v) => !existing.has(v.place_name))
  if (todo.length < VENUES.length) {
    console.log(`↺ ${VENUES.length - todo.length} already present — generating ${todo.length}.`)
  }

  console.log(`🎛  Generating ${todo.length} venue vibes near (${DEMO_CENTER.lat}, ${DEMO_CENTER.lng})\n`)

  for (const v of todo) {
    process.stdout.write(`  • ${v.place_name.padEnd(20)} `)
    try {
      // 1. ElevenLabs -> ~20s ambient mp3
      const audio = await soundEffect(v.prompt, 20)

      // 2. same as POST /api/vibe: store the clip + analyze in parallel
      const [clip_url, dims] = await Promise.all([
        uploadClip(audio, 'audio/mpeg'),
        analyzeVibe(audio),
      ])

      // 3. score + persist around the demo center
      const row = await insertVibe({
        place_name: v.place_name,
        handle: v.handle,
        lat: DEMO_CENTER.lat + v.dLat,
        lng: DEMO_CENTER.lng + v.dLng,
        clip_url,
        popping_score: computePoppingScore(dims),
        ...dims,
      })

      console.log(`✓ ${String(row.popping_score).padStart(3)}/100  — ${dims.summary}`)
    } catch (err: any) {
      console.log(`✖ ${err.message ?? err}`)
    }
  }

  console.log('\nDone. Open the feed/map to see them.')
}

main()
