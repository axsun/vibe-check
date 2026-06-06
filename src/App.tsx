import { useEffect, useState } from 'react'
import type { Vibe } from '../shared/types'
import { getFeed } from './lib/api'
import { getLocation } from './lib/geo'
import { Feed } from './components/Feed'
import { CheckIn } from './views/CheckIn'
import { Soundscape } from './views/Soundscape'

type View = 'checkin' | 'feed' | 'soundscape'

const VIEWS: { key: View; label: string }[] = [
  { key: 'checkin', label: 'RECORD' },
  { key: 'feed', label: 'FEED' },
  { key: 'soundscape', label: 'SOUNDSCAPE' },
]

export default function App() {
  const [view, setView] = useState<View>('checkin')
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
        <div className="wordmark t-micro">VIBE&nbsp;CHECK · read the aura</div>
        <nav className="island">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={`island-seg ${view === v.key ? 'on' : ''}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {view === 'feed' && <Feed vibes={vibes} center={center} />}
        {view === 'checkin' && <CheckIn onPosted={onPosted} />}
        {view === 'soundscape' && <Soundscape vibes={vibes} center={center} />}
      </main>
    </div>
  )
}
