import { useEffect, useState } from 'react'
import type { Vibe } from '../shared/types'
import { getFeed } from './lib/api'
import { getLocation } from './lib/geo'
import { MapView } from './components/MapView'
import { Feed } from './components/Feed'
import { CheckIn } from './views/CheckIn'

type Tab = 'map' | 'checkin' | 'feed'

export default function App() {
  const [tab, setTab] = useState<Tab>('map')
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
    setTab('feed')
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Vibe&nbsp;Check</h1>
        <span className="tagline">is it popping?</span>
      </header>

      <main className="content">
        {tab === 'map' && <MapView vibes={vibes} center={center} />}
        {tab === 'checkin' && <CheckIn onPosted={onPosted} />}
        {tab === 'feed' && <Feed vibes={vibes} />}
      </main>

      <nav className="tabbar">
        <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>🗺️ Map</button>
        <button className={tab === 'checkin' ? 'on' : ''} onClick={() => setTab('checkin')}>🎙️ Check in</button>
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => { setTab('feed'); refresh() }}>📰 Feed</button>
      </nav>
    </div>
  )
}
