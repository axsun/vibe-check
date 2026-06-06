import { useMemo, useState } from 'react'
import type { Vibe } from '../../shared/types'
import { VibeCard } from './VibeCard'

type Filter = 'all' | 'lively' | 'chill'

export function Feed({ vibes }: { vibes: Vibe[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const shown = useMemo(() => {
    if (filter === 'lively') return vibes.filter((v) => v.popping_score >= 50)
    if (filter === 'chill') return vibes.filter((v) => v.popping_score < 50)
    return vibes
  }, [vibes, filter])

  return (
    <div className="feed">
      <div className="filterbar">
        {(['all', 'lively', 'chill'] as Filter[]).map((f) => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'everything' : f}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="empty">No vibes yet — go check one in.</p>}
      {shown.map((v) => (
        <VibeCard key={v.id} vibe={v} />
      ))}
    </div>
  )
}
