import { useMemo, useState } from 'react'
import type { Vibe } from '../../shared/types'
import { VibeCard } from './VibeCard'
import { MapView } from './MapView'
import { kmBetween } from '../lib/distance'
import { isFriend, friendsAt } from '../../shared/friends'

type Filter = 'all' | 'lively' | 'chill' | 'lyrics' | 'genre'
type Lens = 'feed' | 'map'

interface Props {
  vibes: Vibe[]
  center?: { lat: number; lng: number }
}

function applyFilter(vibes: Vibe[], filter: Filter): Vibe[] {
  switch (filter) {
    case 'lively': return vibes.filter((v) => v.popping_score >= 50)
    case 'chill': return vibes.filter((v) => v.popping_score < 50)
    case 'lyrics': return vibes.filter((v) => v.music_present && v.has_lyrics === true)
    case 'genre': return vibes.filter((v) => v.music_present && !!v.music_genre)
    default: return vibes
  }
}

function applySearch(vibes: Vibe[], q: string): Vibe[] {
  const s = q.trim().toLowerCase()
  if (!s) return vibes
  return vibes.filter((v) =>
    v.place_name.toLowerCase().includes(s) ||
    v.summary.toLowerCase().includes(s) ||
    (v.music_genre ?? '').toLowerCase().includes(s) ||
    v.handle.toLowerCase().includes(s) ||
    v.emotional_register.includes(s),
  )
}

export function Feed({ vibes, center }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [lens, setLens] = useState<Lens>('feed')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const filtered = applySearch(applyFilter(vibes, filter), query)
    const withDist = filtered.map((v) => {
      const dist = center && v.lat != null && v.lng != null
        ? kmBetween(center, { lat: v.lat, lng: v.lng })
        : null
      return { v, dist, friendly: isFriend(v.handle) || friendsAt(v.place_name).length > 0 }
    })
    // Friends first (taste), then by proximity ascending (null distance last).
    withDist.sort((a, b) => {
      if (a.friendly !== b.friendly) return a.friendly ? -1 : 1
      const ad = a.dist ?? Infinity
      const bd = b.dist ?? Infinity
      return ad - bd
    })
    return withDist
  }, [vibes, filter, query, center])

  const FILTERS: { key: Filter; label: string; emoji?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'lively', label: 'Lively', emoji: '⚡' },
    { key: 'chill', label: 'Chill', emoji: '😌' },
    { key: 'lyrics', label: 'Lyrics', emoji: '🎤' },
    { key: 'genre', label: 'Music', emoji: '🎶' },
  ]

  return (
    <div className="feed-shell">
      <div className="feed-controls">
        <div className="search-row">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search a place, a vibe…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear">×</button>
          )}
        </div>

        <div className="filter-row">
          <div className="filter-pills">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`pill ${filter === f.key ? 'on' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.emoji && <span className="pill-emoji">{f.emoji}</span>}
                {f.label}
              </button>
            ))}
          </div>

          <div className="lens-toggle" role="tablist">
            <button
              className={`lens-btn ${lens === 'feed' ? 'on' : ''}`}
              onClick={() => setLens('feed')}
              role="tab"
              aria-selected={lens === 'feed'}
            >
              Feed
            </button>
            <button
              className={`lens-btn ${lens === 'map' ? 'on' : ''}`}
              onClick={() => setLens('map')}
              role="tab"
              aria-selected={lens === 'map'}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {lens === 'feed' ? (
        <div className="feed">
          {ranked.length === 0 && (
            <p className="empty t-small">
              {query ? 'Nothing matches that search.' : 'Quiet around here. Be the first to call it.'}
            </p>
          )}
          {ranked.map(({ v, dist }) => (
            <VibeCard
              key={v.id}
              vibe={v}
              distanceKm={dist}
              expanded={selected === v.id}
              onSelect={(picked) => setSelected((cur) => (cur === picked.id ? null : picked.id))}
            />
          ))}
        </div>
      ) : (
        <div className="feed-map">
          <MapView vibes={ranked.map((r) => r.v)} center={center} />
        </div>
      )}
    </div>
  )
}
