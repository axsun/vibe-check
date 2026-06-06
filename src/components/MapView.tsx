import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vibe } from '../../shared/types'
import { DEMO_CENTER } from '../../shared/seed-data'

// Fix Leaflet's default marker icons under a bundler (otherwise they 404).
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

export function MapView({ vibes, center }: { vibes: Vibe[]; center?: { lat: number; lng: number } }) {
  const c = center ?? DEMO_CENTER
  const pins = vibes.filter((v) => v.lat != null && v.lng != null)

  return (
    <MapContainer center={[c.lat, c.lng]} zoom={14} className="map">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((v) => (
        <Marker key={v.id} position={[v.lat!, v.lng!]}>
          <Popup>
            <strong>{v.place_name}</strong> · {v.popping_score}/100
            <br />
            {v.summary}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
