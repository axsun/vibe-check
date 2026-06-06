import { useState } from 'react'
import type { Vibe } from '../../shared/types'
import { narrateUrl } from '../lib/api'

function scoreColor(s: number): string {
  if (s >= 75) return '#ff2d78'
  if (s >= 50) return '#ff9f1c'
  if (s >= 25) return '#3ddc97'
  return '#6c7a89'
}

function tags(v: Vibe): string[] {
  const t: string[] = []
  if (v.music_present && v.music_genre) t.push(v.music_genre)
  if (v.music_present) t.push(v.has_lyrics ? 'lyrics' : 'no lyrics')
  if (!v.music_present) t.push('no music')
  t.push(v.emotional_register)
  return t
}

export function VibeCard({ vibe }: { vibe: Vibe }) {
  const [narrating, setNarrating] = useState(false)

  async function hearTheVibe() {
    try {
      setNarrating(true)
      const url = await narrateUrl(`${vibe.place_name}. ${vibe.summary}`)
      await new Audio(url).play()
    } catch (e: any) {
      alert(e.message ?? 'Narrator unavailable')
    } finally {
      setNarrating(false)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="place">{vibe.place_name}</div>
          <div className="handle">{vibe.handle}</div>
        </div>
        <div className="score" style={{ color: scoreColor(vibe.popping_score) }}>
          {vibe.popping_score}
          <span className="score-label">popping</span>
        </div>
      </div>

      <p className="summary">“{vibe.summary}”</p>

      <div className="tags">
        {tags(vibe).map((t) => (
          <span className="tag" key={t}>{t}</span>
        ))}
      </div>

      <div className="card-actions">
        {vibe.clip_url && (
          <audio controls src={vibe.clip_url} preload="none" style={{ height: 32 }} />
        )}
        <button className="btn-narrate" onClick={hearTheVibe} disabled={narrating}>
          {narrating ? '🔊 …' : '🔊 Hear the vibe'}
        </button>
      </div>
    </div>
  )
}
