import type { Vibe } from '../../shared/types'
import { moodFor } from '../lib/mood'

const TAG_EMOJI: Record<string, string> = {
  hyped: '⚡',
  lively: '✨',
  chill: '😌',
  dead: '💀',
  lyrics: '🎤',
  'no lyrics': '🎵',
  'no music': '🗣️',
}

function tagsFor(v: Vibe): { key: string; label: string; emoji: string }[] {
  const out: { key: string; label: string; emoji: string }[] = []
  if (v.music_present && v.music_genre) out.push({ key: 'genre', label: v.music_genre, emoji: '🎶' })
  if (v.music_present) {
    const k = v.has_lyrics ? 'lyrics' : 'no lyrics'
    out.push({ key: k, label: k, emoji: TAG_EMOJI[k] })
  } else {
    out.push({ key: 'no music', label: 'no music', emoji: TAG_EMOJI['no music'] })
  }
  out.push({ key: v.emotional_register, label: v.emotional_register, emoji: TAG_EMOJI[v.emotional_register] ?? '✨' })
  return out
}

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
  const tags = tagsFor(vibe)

  return (
    <div className="reveal" style={{ ['--mood' as string]: mood.color }}>
      <div className="reveal-burst" />

      <div className="reveal-card">
        <div className="reveal-tier t-micro">the aura</div>
        <div className="reveal-aura">{mood.label}</div>

        <div className="reveal-place t-h1">{vibe.place_name}</div>
        <p className="reveal-summary">"{vibe.summary}"</p>

        <div className="reveal-tags">
          {tags.map((t, i) => (
            <span key={t.key} className="reveal-tag" style={{ animationDelay: `${300 + i * 90}ms` }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="reveal-actions">
        <button className="reveal-post" onClick={onPost}>post the aura</button>
        <button className="reveal-redo" onClick={onRedo}>redo</button>
      </div>
    </div>
  )
}
