import { useEffect, useState } from 'react'
import type { Vibe } from '../../shared/types'
import { heatFor, heatGlow } from '../lib/heat'

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

function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return n
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
  const heat = heatFor(vibe.popping_score)
  const score = useCountUp(vibe.popping_score)
  const tags = tagsFor(vibe)

  return (
    <div className="reveal">
      <div className="reveal-burst" style={{ background: `radial-gradient(circle at 50% 30%, ${heat.color}55 0%, transparent 60%)` }} />

      <div className="reveal-card" style={{ borderColor: `${heat.color}55` }}>
        <div className="reveal-tier t-micro" style={{ color: heat.color }}>{heat.label}</div>

        <div className="reveal-score-wrap">
          <span
            className="reveal-score t-display-xl"
            style={{ color: heat.color, textShadow: `0 0 24px ${heat.color}88` }}
          >
            {score}
          </span>
          <span className="reveal-score-suffix t-micro">/100</span>
        </div>

        <div className="reveal-place t-h1">{vibe.place_name}</div>
        <p className="reveal-summary">"{vibe.summary}"</p>

        <div className="reveal-tags">
          {tags.map((t, i) => (
            <span key={t.key} className="reveal-tag" style={{ animationDelay: `${300 + i * 90}ms` }}>
              <span className="reveal-tag-emoji">{t.emoji}</span>
              {t.label}
            </span>
          ))}
        </div>

        <div className="reveal-score-chip" style={{ background: heat.color, boxShadow: heatGlow(vibe.popping_score, 22) }}>
          <span>🔥</span>
          <span className="t-micro">called it</span>
        </div>
      </div>

      <div className="reveal-actions">
        <button
          className="reveal-post"
          onClick={onPost}
          style={{
            background: 'var(--vibe-gradient)',
            boxShadow: `0 8px 28px ${heat.color}55`,
          }}
        >
          Post the vibe
        </button>
        <button className="reveal-redo" onClick={onRedo}>Redo</button>
      </div>
    </div>
  )
}
