// Seed Supabase with believable nearby vibes so the map/feed is never empty.
// Run once after creating the table:  npm run seed
import { makeSeedVibes, DEMO_CENTER } from '../shared/seed-data'
import { supabase } from '../server/lib/supabase'
import { flags } from '../server/lib/env'

async function main() {
  if (!flags.supabase || !supabase) {
    console.error('✖ Supabase not configured. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to .env')
    process.exit(1)
  }

  const rows = makeSeedVibes(DEMO_CENTER).map(({ id, ...rest }) => rest) // let DB assign ids
  const { data, error } = await supabase.from('vibes').insert(rows).select()
  if (error) {
    console.error('✖ seed failed:', error.message)
    process.exit(1)
  }
  console.log(`✓ seeded ${data?.length ?? 0} vibes near (${DEMO_CENTER.lat}, ${DEMO_CENTER.lng})`)
}

main()
