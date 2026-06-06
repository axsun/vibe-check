// One-shot Supabase setup check: ensures the `clips` bucket exists and reports
// whether the `vibes` table is ready. Run: npm run setup
import { supabase } from '../server/lib/supabase'
import { env, flags } from '../server/lib/env'

async function main() {
  if (!flags.supabase || !supabase) {
    console.error('✖ Supabase not configured in .env')
    process.exit(1)
  }

  // 1. Storage bucket (public so the feed can play clips without signed URLs)
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some((b) => b.name === env.SUPABASE_BUCKET)) {
    console.log(`✓ bucket "${env.SUPABASE_BUCKET}" exists`)
  } else {
    const { error } = await supabase.storage.createBucket(env.SUPABASE_BUCKET, { public: true })
    console.log(error ? `✖ bucket create failed: ${error.message}` : `✓ created public bucket "${env.SUPABASE_BUCKET}"`)
  }

  // 2. vibes table
  const { error, count } = await supabase.from('vibes').select('*', { count: 'exact', head: true })
  if (error) {
    console.log(`✖ table "vibes" not ready: ${error.message}`)
    console.log('  → paste supabase/schema.sql into the Supabase SQL editor, then re-run.')
  } else {
    console.log(`✓ table "vibes" ready (${count ?? 0} rows)`)
  }
}

main()
