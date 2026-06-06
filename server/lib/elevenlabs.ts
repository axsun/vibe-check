import { env, flags } from './env'

// ElevenLabs Sound Effects caps the prompt at 450 chars. Trim at a word boundary.
function capText(s: string, max = 450): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()
}

/**
 * The "Vibe Narrator": turn a vibe summary into spoken audio in a persona voice.
 * Uses ElevenLabs flash model for low latency. Returns an MP3 buffer.
 * Throws if no key — the route translates that into a clean 503.
 */
export async function narrate(text: string, voiceId = env.ELEVENLABS_VOICE_ID): Promise<Buffer> {
  if (!flags.elevenlabs) throw new Error('ElevenLabs not configured (set ELEVENLABS_API_KEY)')

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.5 },
    }),
  })

  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Generate an ambient venue soundscape from a text prompt via ElevenLabs Sound
 * Effects (text-to-sound). Returns an MP3 buffer that can be fed straight into the
 * same analyzer pipeline a real recording uses. Max ~22s per the API.
 */
export async function soundEffect(prompt: string, durationSeconds = 20): Promise<Buffer> {
  if (!flags.elevenlabs) throw new Error('ElevenLabs not configured (set ELEVENLABS_API_KEY)')

  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: capText(prompt, 450),
      duration_seconds: Math.max(0.5, Math.min(22, durationSeconds)),
      prompt_influence: 0.5, // lean toward the described scene over model improv
    }),
  })

  if (!res.ok) {
    throw new Error(`ElevenLabs sound-generation ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Generate the Atmosphere Forecast soundscape via the ElevenLabs Music API
 * (POST /v1/music). The forecast's scene description is shaped into an
 * instrumental music brief (no vocals) so it reads as a cohesive atmosphere bed.
 * Returns an MP3 buffer; the player loops it via <audio loop>. Throws if no key.
 */
export async function soundscape(prompt: string, lengthMs = 22000): Promise<Buffer> {
  if (!flags.elevenlabs) throw new Error('ElevenLabs not configured (set ELEVENLABS_API_KEY)')

  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      // Shape the forecast's scene into an instrumental music brief (no vocals).
      prompt: capText(`Instrumental atmosphere music, no vocals, loopable ambient bed. Scene: ${prompt}`, 1800),
      music_length_ms: Math.max(10000, Math.min(60000, lengthMs)),
    }),
  })

  if (!res.ok) {
    throw new Error(`ElevenLabs music ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}
