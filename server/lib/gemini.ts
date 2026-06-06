import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { VibeDimensions } from '../../shared/types'
import { env, flags } from './env'
import { toMp3 } from './transcode'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPT_PATH = join(__dirname, '..', 'prompts', 'vibe-analyzer.txt')

// Forces Gemini to emit exactly our shape (no markdown, no stray fields).
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    loudness: { type: SchemaType.INTEGER },
    music_present: { type: SchemaType.BOOLEAN },
    music_volume: { type: SchemaType.INTEGER, nullable: true },
    music_genre: { type: SchemaType.STRING, nullable: true },
    has_lyrics: { type: SchemaType.BOOLEAN, nullable: true },
    talk_level: { type: SchemaType.INTEGER },
    emotional_register: { type: SchemaType.STRING, format: 'enum', enum: ['hyped', 'lively', 'chill', 'dead'] },
    summary: { type: SchemaType.STRING },
  },
  required: ['loudness', 'music_present', 'talk_level', 'emotional_register', 'summary'],
} as const

/** audio clip -> structured vibe. Mock when GEMINI_API_KEY is absent. */
export async function analyzeVibe(clip: Buffer): Promise<VibeDimensions> {
  if (!flags.gemini) return mockVibe()

  const { buffer, mimeType } = await toMp3(clip)
  const prompt = await readFile(PROMPT_PATH, 'utf8')

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json', responseSchema: responseSchema as any },
  })

  const result = await model.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType } },
    { text: prompt },
  ])

  const parsed = JSON.parse(result.response.text()) as VibeDimensions
  return normalize(parsed)
}

function normalize(v: VibeDimensions): VibeDimensions {
  const i = (n: any, d = 0) => Math.max(0, Math.min(10, Math.round(Number(n) || d)))
  return {
    loudness: i(v.loudness),
    music_present: !!v.music_present,
    music_volume: v.music_present ? i(v.music_volume) : null,
    music_genre: v.music_present ? v.music_genre ?? null : null,
    has_lyrics: v.music_present ? v.has_lyrics ?? null : null,
    talk_level: i(v.talk_level),
    emotional_register: ['hyped', 'lively', 'chill', 'dead'].includes(v.emotional_register)
      ? v.emotional_register
      : 'lively',
    summary: (v.summary || 'A room with a vibe.').slice(0, 160),
  }
}

// Random-ish demo vibe so the full flow works with zero API keys.
function mockVibe(): VibeDimensions {
  const picks: VibeDimensions[] = [
    { loudness: 8, music_present: true, music_volume: 8, music_genre: 'techno', has_lyrics: false, talk_level: 3, emotional_register: 'hyped', summary: 'Relentless techno, zero lyrics, everyone locked in.' },
    { loudness: 6, music_present: true, music_volume: 5, music_genre: '2000s pop', has_lyrics: true, talk_level: 6, emotional_register: 'lively', summary: 'Throwback pop and loud laughter — actually fun in here.' },
    { loudness: 3, music_present: true, music_volume: 2, music_genre: 'lo-fi', has_lyrics: false, talk_level: 2, emotional_register: 'chill', summary: 'Quiet lo-fi, laptops open, perfect for pretending to work.' },
  ]
  return picks[Math.floor(Math.random() * picks.length)]
}
