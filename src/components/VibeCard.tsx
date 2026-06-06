import { useState } from 'react'
import type { Vibe } from '../../shared/types'
import { heatFor } from '../lib/heat'
import { vibeTags } from '../lib/vibeTags'
import { freshnessLabel, formatDistance } from '../lib/distance'
import { friendsAt, isFriend } from '../../shared/friends'

interface Props {
  vibe: Vibe
  distanceKm?: number | null
  onSelect?: (vibe: Vibe) => void
  expanded?: boolean
}

function avatarEmoji(handle: string): string {
  return handle.match(/^\p{Emoji}/u)?.[0] ?? '🙂'
}

function SocialFooter({ vibe }: { vibe: Vibe }) {
  const others = friendsAt(vibe.place_name).filter((h) => h !== vibe.handle)
  const owner = isFriend(vibe.handle) ? [vibe.handle] : []
  const friends = [...owner, ...others]
  if (friends.length === 0) return null

  const head = friends[0]
  const rest = friends.length - 1
  const headName = head.replace(/^\p{Emoji}\s*/u, '')
  const line =
    rest === 0 ? `${headName} vibed here` : rest === 1 ? `${headName} & 1 friend vibed here` : `${headName} & ${rest} friends vibed here`

  return (
    <div className="social-footer">
      <div className="avatars">
        {friends.slice(0, 3).map((h, i) => (
          <span key={h} className="avatar" style={{ zIndex: 3 - i }}>{avatarEmoji(h)}</span>
        ))}
        {friends.length > 3 && <span className="avatar avatar-more">+{friends.length - 3}</span>}
      </div>
      <span className="social-line">{line}</span>
    </div>
  )
}

export function VibeCard({ vibe, distanceKm, onSelect, expanded }: Props) {
  const [open, setOpen] = useState(!!expanded)
  const heat = heatFor(vibe.popping_score)
  const tags = vibeTags(vibe)
  const friend = isFriend(vibe.handle) || friendsAt(vibe.place_name).length > 0

  function toggle() {
    if (onSelect) onSelect(vibe)
    else setOpen((o) => !o)
  }

  function takeMeThere(e: React.MouseEvent) {
    e.stopPropagation()
    if (vibe.lat == null || vibe.lng == null) return
    const url = `https://www.google.com/maps/search/?api=1&query=${vibe.lat},${vibe.lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={`card vibe-card ${friend ? 'is-friend' : ''} ${open ? 'is-open' : ''}`}
      style={{ ['--heat' as string]: heat.color }}
      onClick={toggle}
      role="button"
    >
      <div className="card-head">
        <div className="card-head-text">
          <div className="place t-h2">{vibe.place_name}</div>
          <div className="card-meta">
            <span className="handle">{vibe.handle}</span>
            <span className="dot-sep">·</span>
            <span className="freshness">{freshnessLabel(vibe.created_at)}</span>
            {distanceKm != null && (
              <>
                <span className="dot-sep">·</span>
                <span className="distance">{formatDistance(distanceKm)}</span>
              </>
            )}
          </div>
        </div>
        <span className="vibe-tier t-micro" style={{ color: heat.color }}>{heat.label}</span>
      </div>

      <p className="summary">"{vibe.summary}"</p>

      <div className="emoji-tags">
        {tags.map((t) => (
          <span key={t.key} className="emoji-tag">{t.label}</span>
        ))}
      </div>

      <SocialFooter vibe={vibe} />

      {open && (
        <div className="card-detail" onClick={(e) => e.stopPropagation()}>
          {vibe.clip_url ? (
            <audio className="clip-player" controls src={vibe.clip_url} preload="metadata" />
          ) : (
            <div className="clip-empty t-small">No recorded clip — heard via the people.</div>
          )}
          {vibe.lat != null && vibe.lng != null && (
            <button className="cta-take-me" onClick={takeMeThere}>Take me there</button>
          )}
        </div>
      )}
    </div>
  )
}
