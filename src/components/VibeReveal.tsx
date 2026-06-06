import type { Vibe } from '../../shared/types'
import { moodFor } from '../lib/mood'

export function VibeReveal({
  vibe,
  onPost,
  onRedo,
}: {
  vibe: Vibe
  onPost: () => void
  onRedo: () => void
}) {
  const mood = moodFor(vibe)

  return (
    <div className="reveal" style={{ ['--mood' as string]: mood.color }}>
      <div className="reveal-burst" />

      <div className="reveal-card">
        <div className="reveal-orb" />
        <div className="reveal-mood t-micro">{mood.label}</div>
        <div className="reveal-place t-display-l">{vibe.place_name}</div>
        <p className="reveal-summary">"{vibe.summary}"</p>
      </div>

      <div className="reveal-actions">
        <button className="reveal-post" onClick={onPost}>POST</button>
        <button className="reveal-redo" onClick={onRedo}>REDO</button>
      </div>
    </div>
  )
}
