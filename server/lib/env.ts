import 'dotenv/config'

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || 'clips',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  // "Rachel" — a clean default. Swap to a hype/bouncer voice via ELEVENLABS_VOICE_ID.
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  // Storage backend: 'local' (default — data/ files) or 'supabase'.
  STORAGE_MODE: (process.env.STORAGE_MODE || 'local').toLowerCase(),
}

// Feature flags: each piece lights up only when its keys are present.
// Storage defaults to local; Supabase only when explicitly opted in AND configured.
export const flags = {
  gemini: !!env.GEMINI_API_KEY,
  supabase: env.STORAGE_MODE === 'supabase' && !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  elevenlabs: !!env.ELEVENLABS_API_KEY,
}

export function logStartup() {
  console.log('🎧 Vibe Check backend')
  console.log(`   • analyzer:   ${flags.gemini ? 'Gemini 2.5 Flash' : 'MOCK (no GEMINI_API_KEY)'}`)
  console.log(`   • storage:    ${flags.supabase ? 'Supabase' : 'Local files (data/)'}`)
  console.log(`   • narrator:   ${flags.elevenlabs ? 'ElevenLabs TTS' : 'DISABLED (no ELEVENLABS_API_KEY)'}`)
}
