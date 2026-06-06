import { useEffect, useState } from 'react'
import type { Vibe } from '../shared/types'
import { getFeed } from './lib/api'
import { getLocation } from './lib/geo'
import { Feed } from './components/Feed'
import { CheckIn } from './views/CheckIn'

type View = 'feed' | 'checkin'

export default function App() {
  const [view, setView] = useState<View>('feed')
  const [vibes, setVibes] = useState<Vibe[]>([])
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>()

  async function refresh() {
    const loc = center ?? (await getLocation()) ?? undefined
    if (loc && !center) setCenter(loc)
    setVibes(await getFeed(loc?.lat, loc?.lng).catch(() => []))
  }

  useEffect(() => { refresh() }, [])

  function onPosted(v: Vibe) {
    setVibes((prev) => [v, ...prev])
    setView('feed')
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Vibe&nbsp;Check</h1>
        <span className="tagline">is it popping?</span>
      </header>

      <main className="content">
        {view === 'feed' && <Feed vibes={vibes} center={center} />}
        {view === 'checkin' && <CheckIn onPosted={onPosted} />}
      </main>

      <nav className="dock">
        <button
          className={`dock-btn ${view === 'feed' ? 'on' : ''}`}
          onClick={() => setView('feed')}
        >
          <span className="dock-glyph">📰</span>
          <span className="dock-label">Feed</span>
        </button>

        <button
          className="dock-orb"
          onClick={() => setView('checkin')}
          aria-label="Check in"
        >
          <span className="dock-orb-inner">🎙️</span>
        </button>

        <span className="dock-spacer" aria-hidden="true" />
      </nav>
    </div>
  )
}
