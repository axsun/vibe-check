import { useEffect, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import type { Vibe } from '../../shared/types'
import { DEMO_CENTER } from '../../shared/seed-data'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
// Google's public development map id — renders AdvancedMarkers with no Cloud setup.
// Swap for your own styled Map ID later for custom map styling.
const MAP_ID = 'DEMO_MAP_ID'

type LatLngVibe = Vibe & { lat: number; lng: number }

// Color a pin by how "popping" the spot is, so the map reads at a glance.
function scoreColor(score: number): string {
  if (score >= 80) return '#ef4444' // 🔥 packed
  if (score >= 60) return '#f97316' // buzzing
  if (score >= 40) return '#eab308' // moderate
  if (score >= 20) return '#3b82f6' // quiet
  return '#64748b' // dead
}

// A quick read of the vibe — swapped in for the raw number on the pin (for now).
function scoreEmoji(score: number): string {
  if (score >= 80) return '🔥'
  if (score >= 60) return '🥳'
  if (score >= 40) return '😎'
  if (score >= 20) return '😴'
  return '💀'
}

/** Plays the first ~5s of a vibe clip, then auto-stops. */
function VibeSample({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [playing, setPlaying] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function stop() {
    const a = ref.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    window.clearTimeout(timer.current)
    setPlaying(false)
  }

  function toggle() {
    const a = ref.current
    if (!a) return
    if (playing) return stop()
    a.currentTime = 0
    void a.play()
    setPlaying(true)
    timer.current = window.setTimeout(stop, 5000)
  }

  return (
    <div className="vibe-sample">
      <audio ref={ref} src={url} preload="none" onEnded={stop} />
      <button className="vibe-sample-btn" onClick={toggle}>
        {playing ? '⏹ Stop' : '▶ 5s sample'}
      </button>
    </div>
  )
}

export function MapView({ vibes, center }: { vibes: Vibe[]; center?: { lat: number; lng: number } }) {
  const c = center ?? DEMO_CENTER
  const pins = vibes.filter((v): v is LatLngVibe => v.lat != null && v.lng != null)
  const [openId, setOpenId] = useState<string | null>(null)

  if (!API_KEY) {
    return (
      <div className="map map--fallback">
        <p>🗺️ Map disabled — set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code>.</p>
      </div>
    )
  }

  const open = pins.find((v) => v.id === openId)

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        className="map"
        mapId={MAP_ID}
        defaultCenter={c}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {pins.map((v) => (
          <AdvancedMarker
            key={v.id}
            position={{ lat: v.lat, lng: v.lng }}
            zIndex={v.popping_score}
            onClick={() => setOpenId(v.id)}
          >
            <div
              className="vibe-pin"
              style={{ background: scoreColor(v.popping_score) }}
              title={`${v.place_name} · ${v.popping_score}/100`}
            >
              {scoreEmoji(v.popping_score)}
            </div>
          </AdvancedMarker>
        ))}

        {open && (
          <InfoWindow
            position={{ lat: open.lat, lng: open.lng }}
            onCloseClick={() => setOpenId(null)}
            pixelOffset={[0, -40]}
          >
            <div className="vibe-popup">
              <strong>{open.place_name}</strong> · {open.popping_score}/100{' '}
              {scoreEmoji(open.popping_score)}
              <br />
              {open.summary}
              {open.clip_url && <VibeSample url={open.clip_url} />}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
