import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, flags } from './env'

// Server-side client uses the service_role key (bypasses RLS for inserts/uploads).
// null when Supabase isn't configured — callers fall back to the in-memory store.
export const supabase: SupabaseClient | null = flags.supabase
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null
