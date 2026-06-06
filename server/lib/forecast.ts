import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { AtmosphereForecast, Vibe } from '../../shared/types'
import { env, flags } from './env'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPT_PATH = join(__dirname, '..', 'prompts', 'atmosphere-forecast.txt')

const S = SchemaType
const schema = {
  type: S.OBJECT,
  properties: {
    future_atmosphere: {
      type: S.OBJECT,
      properties: {
        energy_score: { type: S.INTEGER },
        energy_label: { type: S.STRING },
        trajectory: { type: S.STRING },
        confidence: { type: S.INTEGER },
      },
      required: ['energy_score', 'energy_label', 'trajectory'],
    },
    crowd_profile: {
      type: S.OBJECT,
      properties: {
        primary_archetypes: { type: S.ARRAY, items: { type: S.STRING } },
        social_behavior: { type: S.STRING },
        group_dynamics: { type: S.STRING },
      },
      required: ['primary_archetypes', 'social_behavior', 'group_dynamics'],
    },
    atmosphere_summary: {
      type: S.OBJECT,
      properties: { headline: { type: S.STRING }, description: { type: S.STRING } },
      required: ['headline', 'description'],
    },
    environmental_cues: {
      type: S.OBJECT,
      properties: {
        lighting: { type: S.STRING },
        movement: { type: S.STRING },
        conversation_density: { type: S.STRING },
        dominant_mood: { type: S.STRING },
      },
      required: ['lighting', 'movement', 'conversation_density', 'dominant_mood'],
    },
    sound_profile: {
      type: S.OBJECT,
      properties: {
        music_presence: { type: S.STRING },
        genre_influences: { type: S.ARRAY, items: { type: S.STRING } },
        volume_level: { type: S.STRING },
        crowd_noise_level: { type: S.STRING },
        signature_sounds: { type: S.ARRAY, items: { type: S.STRING } },
      },
      required: ['music_presence', 'genre_influences', 'volume_level', 'crowd_noise_level', 'signature_sounds'],
    },
    future_soundscape_prompt: {
      type: S.OBJECT,
      properties: {
        title: { type: S.STRING },
        description: { type: S.STRING },
        audio_generation_prompt: { type: S.STRING },
      },
      required: ['title', 'description', 'audio_generation_prompt'],
    },
  },
  required: [
    'future_atmosphere', 'crowd_profile', 'atmosphere_summary',
    'environmental_cues', 'sound_profile', 'future_soundscape_prompt',
  ],
} as const

export interface ForecastInput {
  venue: string
  location: string
  target_time: string
  current?: Vibe | null
  historical?: Vibe[]
}

function describeVibe(v?: Vibe | null): string {
  if (!v) return 'no recent reading'
  const music = v.music_present ? `${v.music_genre ?? 'music'} (${v.has_lyrics ? 'with lyrics' : 'instrumental'})` : 'no music'
  return `${v.emotional_register}, loudness ${v.loudness}/10, talk ${v.talk_level}/10, ${music} — "${v.summary}"`
}

/** Run the Atmosphere Intelligence Engine for a venue + future time. */
export async function forecastAtmosphere(input: ForecastInput): Promise<AtmosphereForecast> {
  if (flags.gemini) {
    try {
      return await askGemini(input)
    } catch (err: any) {
      console.warn('[forecast] Gemini failed, using fallback:', err?.message ?? err)
    }
  }
  return fallback(input)
}

async function askGemini(input: ForecastInput): Promise<AtmosphereForecast> {
  const tmpl = await readFile(PROMPT_PATH, 'utf8')
  const prompt = tmpl
    .replace('{{venue}}', input.venue)
    .replace('{{location}}', input.location || 'a city neighborhood')
    .replace('{{target_time}}', input.target_time)
    .replace('{{current_atmosphere}}', describeVibe(input.current))
    .replace('{{historical_vibes}}', (input.historical ?? []).map(describeVibe).join(' | ') || 'sparse')
    .replace('{{events}}', 'n/a')
    .replace('{{website_content}}', 'n/a')
    .replace('{{instagram_content}}', 'n/a')
    .replace('{{tiktok_content}}', 'n/a')
    .replace('{{weather}}', 'n/a')
    .replace('{{nearby_context}}', 'n/a')

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema as any },
  })
  const result = await model.generateContent(prompt)
  return JSON.parse(result.response.text()) as AtmosphereForecast
}

// No-LLM fallback: a plausible forecast derived from the current reading + time,
// so the feature always demos. Never invents operational/attendance numbers.
function fallback(input: ForecastInput): AtmosphereForecast {
  const v = input.current
  const reg = v?.emotional_register ?? 'lively'
  const base = v?.popping_score ?? 55
  const t = input.target_time.toLowerCase()
  const lateBoost = /1[01]pm|midnight|late|night/.test(t) ? 18 : /afternoon|2pm|11am|matinee|sun/.test(t) ? -16 : 6
  const energy = Math.max(8, Math.min(98, base + lateBoost))
  const label = energy >= 80 ? 'peaking' : energy >= 60 ? 'building' : energy >= 40 ? 'easy' : 'quiet'
  const genre = v?.music_present ? (v.music_genre ?? 'ambient') : 'ambient room tone'
  const place = input.venue

  return {
    future_atmosphere: { energy_score: energy, energy_label: label, trajectory: lateBoost > 10 ? 'warming up → peaks later' : 'steady, easy to settle into', confidence: 60 },
    crowd_profile: {
      primary_archetypes: reg === 'hyped' ? ['regulars', 'dancers', 'groups out late'] : reg === 'dead' ? ['solo readers', 'quiet pairs'] : ['locals', 'small groups', 'after-work crowd'],
      social_behavior: reg === 'dead' ? 'heads-down, low chatter' : reg === 'hyped' ? 'loud, moving, hands in the air' : 'warm conversation, easy mingling',
      group_dynamics: reg === 'hyped' ? 'big groups, high contact' : 'pairs and small clusters',
    },
    atmosphere_summary: {
      headline: reg === 'hyped' ? `${place} hits its stride` : reg === 'dead' ? `${place}, hushed and unhurried` : `${place} settles into a warm groove`,
      description: `Around ${input.target_time}, ${place} feels ${label}. ${v?.summary ?? 'A room finding its rhythm.'}`,
    },
    environmental_cues: {
      lighting: energy >= 70 ? 'low and saturated' : 'soft, warm',
      movement: energy >= 70 ? 'constant, bodies in motion' : 'relaxed, people lingering',
      conversation_density: reg === 'dead' ? 'sparse' : reg === 'hyped' ? 'shouted over the music' : 'steady murmur',
      dominant_mood: reg,
    },
    sound_profile: {
      music_presence: v?.music_present ? 'present' : 'minimal',
      genre_influences: [genre],
      volume_level: energy >= 70 ? 'loud' : energy >= 40 ? 'moderate' : 'low',
      crowd_noise_level: reg === 'dead' ? 'low' : reg === 'hyped' ? 'high' : 'moderate',
      signature_sounds: reg === 'dead' ? ['page turns', 'distant hum'] : reg === 'hyped' ? ['bass', 'cheers', 'clinking glasses'] : ['conversation', 'glassware', 'ambient music'],
    },
    future_soundscape_prompt: {
      title: `${place} · ${input.target_time}`,
      description: `An ambient preview of ${place} at ${input.target_time}.`,
      audio_generation_prompt:
        reg === 'hyped'
          ? `A packed ${place} at ${input.target_time}: ${genre} pulsing under a dense, energetic crowd, cheers and laughter rising and falling, glassware and movement throughout — loud, euphoric, building.`
          : reg === 'dead'
            ? `A quiet ${place} at ${input.target_time}: near silence, faint room tone, occasional footsteps and page turns, calm and sparse.`
            : `A warm ${place} at ${input.target_time}: ${genre} at a comfortable volume, steady conversation in small groups, glassware and gentle movement — relaxed, social, easy.`,
    },
  }
}
