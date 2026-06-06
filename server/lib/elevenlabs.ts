import { env, flags } from './env'

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
