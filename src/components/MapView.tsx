import { useMemo } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Vibe } from '../../shared/types'
import { DEMO_CENTER } from '../../shared/seed-data'
import { isFriend } from '../../shared/friends'
import { heatFor } from '../lib/heat'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || 'DEMO_MAP_ID'
const FRESH_MS = 10 * 60 * 1000

function isFresh(iso: string): boolean {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return false
  return Date.now() - t < FRESH_MS
}

function VibePin({ vibe }: { vibe: Vibe }) {
  const heat = heatFor(vibe.popping_score)
  const friend = isFriend(vibe.handle)
  const fresh = isFresh(vibe.created_at)
  const size = 14 + Math.round((vibe.popping_score / 100) * 14) // 14–28px

  return (
    <div
      className={`vibe-pin ${fresh ? 'fresh' : ''} ${friend ? 'friend' : ''}`}
      style={{
        width: size,
        height: size,
        background: heat.color,
        boxShadow: `0 0 ${Math.round(size * 0.9)}px ${heat.color}aa, 0 0 4px rgba(0,0,0,0.6)`,
      }}
      title={`${vibe.place_name} · ${vibe.popping_score}`}
    />
  )
}

export function MapView({ vibes, center }: { vibes: Vibe[]; center?: { lat: number; lng: number } }) {
  const c = center ?? DEMO_CENTER
  const pins = useMemo(() => vibes.filter((v) => v.lat != null && v.lng != null), [vibes])

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
          <AdvancedMarker key={v.id} position={{ lat: v.lat!, lng: v.lng! }}>
            <VibePin vibe={v} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}
