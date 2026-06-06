import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { Vibe, DiscoverEvent } from '../../shared/types'
import { DEMO_CENTER } from '../../shared/seed-data'
import { env, flags } from './env'

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    events: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          when: { type: SchemaType.STRING },
          kind: { type: SchemaType.STRING, format: 'enum', enum: ['now', 'soon'] },
          match_reason: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          popping_score: { type: SchemaType.INTEGER },
          music_genre: { type: SchemaType.STRING, nullable: true },
          emotional_register: { type: SchemaType.STRING },
          // name of an existing venue this maps to (for "now"), or null if invented
          place_ref: { type: SchemaType.STRING, nullable: true },
        },
        required: ['name', 'when', 'kind', 'match_reason', 'summary', 'popping_score', 'emotional_register'],
      },
    },
  },
  required: ['events'],
} as const

/** Resolve a query into a ranked mix of current + upcoming events. */
export async function discoverEvents(query: string, vibes: Vibe[]): Promise<DiscoverEvent[]> {
  const byName = new Map(vibes.map((v) => [v.place_name.toLowerCase(), v]))

  if (flags.gemini) {
    try {
      const raw = await askGemini(query, vibes)
      const events = raw.map((e, i) => hydrate(e, i, byName))
      if (events.length) return events
    } catch (err: any) {
      console.warn('[discover] Gemini failed, using heuristic:', err?.message ?? err)
    }
  }
  return heuristic(query, vibes)
}

async function askGemini(query: string, vibes: Vibe[]): Promise<any[]> {
  const menu = vibes
    .map((v) => `- ${v.place_name} [${v.emotional_register}, ${v.music_genre ?? 'no music'}, score ${v.popping_score}]: ${v.summary}`)
    .join('\n')

  const prompt = `You are a nightlife concierge for the app "Vibe Check".
A user is searching, in their own words, for a vibe: "${query}"

Here are venues people have checked into recently (the live scene):
${menu}

Return 4–6 events as JSON matching the schema. Mix:
- "now" events: pick the venues above that best match the request. Set place_ref to the EXACT venue name from the list. Reuse that venue's score/genre/register/summary feel.
- "soon" events: invent 1–3 plausible UPCOMING events (later tonight or this week) that fit the requested vibe — give a catchy name, a concrete "when" (e.g. "tonight 11pm", "Fri 10pm"), a one-line summary, a 0–100 score, genre and register. Set place_ref to null for these.
For every event, match_reason is a short phrase tying it to what the user asked for. Order best match first.`

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema as any },
  })
  const result = await model.generateContent(prompt)
  const parsed = JSON.parse(result.response.text())
  return Array.isArray(parsed?.events) ? parsed.events : []
}

// Turn a raw model event into a full DiscoverEvent, linking "now" events to the
// real vibe so the client can inspect actual location/clip.
function hydrate(e: any, i: number, byName: Map<string, Vibe>): DiscoverEvent {
  const ref = e.place_ref ? byName.get(String(e.place_ref).toLowerCase()) : undefined
  const kind: 'now' | 'soon' = e.kind === 'soon' ? 'soon' : 'now'
  const score = clampScore(e.popping_score)
  // Invented events get a spot near the demo center so they still map.
  const jLat = DEMO_CENTER.lat + ((i % 5) - 2) * 0.0016
  const jLng = DEMO_CENTER.lng + ((i % 3) - 1) * 0.0021
  return {
    id: `disc-${i}-${(ref?.id ?? 'soon')}`,
    name: e.name || ref?.place_name || 'A vibe',
    when: e.when || (kind === 'now' ? 'now' : 'soon'),
    kind,
    match_reason: e.match_reason || '',
    summary: e.summary || ref?.summary || '',
    popping_score: ref ? ref.popping_score : score,
    music_genre: e.music_genre ?? ref?.music_genre ?? null,
    emotional_register: e.emotional_register || ref?.emotional_register || 'lively',
    place_name: ref?.place_name || e.name || 'A vibe',
    lat: ref?.lat ?? jLat,
    lng: ref?.lng ?? jLng,
    clip_url: ref?.clip_url ?? null,
  }
}

// No-AI fallback: keyword-match the live vibes + a couple of synthesized events.
function heuristic(query: string, vibes: Vibe[]): DiscoverEvent[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  const scored = vibes
    .map((v) => {
      const hay = `${v.place_name} ${v.summary} ${v.music_genre ?? ''} ${v.emotional_register}`.toLowerCase()
      const hits = terms.filter((t) => hay.includes(t)).length
      return { v, rank: hits * 10 + v.popping_score / 100 }
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 4)

  const now: DiscoverEvent[] = scored.map(({ v }, i) => ({
    id: `disc-now-${v.id}`,
    name: v.place_name,
    when: 'now',
    kind: 'now',
    match_reason: terms.length ? `matches "${query}"` : 'popping right now',
    summary: v.summary,
    popping_score: v.popping_score,
    music_genre: v.music_genre,
    emotional_register: v.emotional_register,
    place_name: v.place_name,
    lat: v.lat,
    lng: v.lng,
    clip_url: v.clip_url,
  }))

  const soon: DiscoverEvent[] = [
    {
      id: 'disc-soon-1', name: 'Late Set', when: 'tonight 11pm', kind: 'soon',
      match_reason: `more "${query}" later`, summary: 'A late-night room that peaks after 11 — exactly your speed.',
      popping_score: 82, music_genre: 'house', emotional_register: 'hyped',
      place_name: 'Late Set', lat: DEMO_CENTER.lat + 0.002, lng: DEMO_CENTER.lng - 0.002, clip_url: null,
    },
    {
      id: 'disc-soon-2', name: 'Sunday Sessions', when: 'Sun 4pm', kind: 'soon',
      match_reason: `a mellow take on "${query}"`, summary: 'Easygoing afternoon sounds, low-key and warm.',
      popping_score: 48, music_genre: 'lo-fi', emotional_register: 'chill',
      place_name: 'Sunday Sessions', lat: DEMO_CENTER.lat - 0.003, lng: DEMO_CENTER.lng + 0.001, clip_url: null,
    },
  ]
  return [...now, ...soon]
}

function clampScore(n: any): number {
  const v = Math.round(Number(n))
  if (Number.isNaN(v)) return 50
  return Math.max(0, Math.min(100, v))
}
