// Seed starter vibes so the map/feed is never empty.
// Local mode (default): overwrites data/vibes.json. Supabase mode: inserts rows.
//   npm run seed
import { makeSeedVibes, DEMO_CENTER } from '../shared/seed-data'
import { flags } from '../server/lib/env'
import { localReseed } from '../server/lib/localStore'
import { supabase } from '../server/lib/supabase'

async function main() {
  if (flags.supabase && supabase) {
    const rows = makeSeedVibes(DEMO_CENTER).map(({ id, ...rest }) => rest)
    const { data, error } = await supabase.from('vibes').insert(rows).select()
    if (error) {
      console.error('✖ seed failed:', error.message)
      process.exit(1)
    }
    console.log(`✓ seeded ${data?.length ?? 0} vibes to Supabase near (${DEMO_CENTER.lat}, ${DEMO_CENTER.lng})`)
  } else {
    const n = await localReseed()
    console.log(`✓ seeded ${n} vibes to data/vibes.json near (${DEMO_CENTER.lat}, ${DEMO_CENTER.lng})`)
  }
}

main()
