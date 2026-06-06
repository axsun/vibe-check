import { useEffect, useMemo, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import type { Vibe } from '../../shared/types'
import { DEMO_CENTER } from '../../shared/seed-data'
import { isFriend } from '../../shared/friends'
import { moodFor, moodGlow } from '../lib/mood'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || 'DEMO_MAP_ID'
const FRESH_MS = 10 * 60 * 1000

type LatLngVibe = Vibe & { lat: number; lng: number }

function isFresh(iso: string): boolean {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return false
  return Date.now() - t < FRESH_MS
}

// A glowing mood dot. Energy reads as dot size + glow intensity — no number,
// no emoji (per the design system). Color is the venue's mood.
function VibePin({ vibe }: { vibe: LatLngVibe }) {
  const mood = moodFor(vibe)
  const friend = isFriend(vibe.handle)
  const fresh = isFresh(vibe.created_at)
  const size = 12 + Math.round((vibe.popping_score / 100) * 16)

  return (
    <div
      className={`vibe-pin ${fresh ? 'fresh' : ''} ${friend ? 'friend' : ''}`}
      style={{
        ['--mood' as string]: mood.color,
        width: size,
        height: size,
        background: mood.color,
        boxShadow: friend ? undefined : moodGlow(mood.color, vibe.popping_score),
      }}
      title={`${vibe.place_name} · ${mood.label}`}
    />
  )
}

/** Plays the first ~5s of a vibe clip, then auto-stops. */
function VibeSample({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [playing, setPlaying] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function stop() {
    const a = ref.current
    if (a) { a.pause(); a.currentTime = 0 }
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
  const pins = useMemo(
    () => vibes.filter((v): v is LatLngVibe => v.lat != null && v.lng != null),
    [vibes],
  )
  const [openId, setOpenId] = useState<string | null>(null)

  if (!API_KEY) {
    return (
      <div className="map-empty">
        <div className="map-empty-glow" />
        <div className="map-empty-copy">
          <div className="t-h2">Map unlocked when key lands</div>
          <p className="t-small">
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to light up the city.
          </p>
        </div>
      </div>
    )
  }

  const open = pins.find((v) => v.id === openId)

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId={MAP_ID}
        defaultCenter={c}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        colorScheme="DARK"
        className="map"
      >
        {pins.map((v) => (
          <AdvancedMarker
            key={v.id}
            position={{ lat: v.lat, lng: v.lng }}
            zIndex={v.popping_score}
            onClick={() => setOpenId(v.id)}
          >
            <VibePin vibe={v} />
          </AdvancedMarker>
        ))}

        {open && (
          <InfoWindow
            position={{ lat: open.lat, lng: open.lng }}
            onCloseClick={() => setOpenId(null)}
            pixelOffset={[0, -28]}
          >
            <div className="vibe-popup" style={{ ['--mood' as string]: moodFor(open).color }}>
              <strong>{open.place_name}</strong> <span className="mood-word">{moodFor(open).label}</span>
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
