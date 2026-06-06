import { useRef, useState } from 'react'
import type { DiscoverEvent } from '../../shared/types'
import { discover } from '../lib/api'
import { moodFor } from '../lib/mood'
import { ClipSample } from './ClipSample'

function InspectSheet({ ev, onClose }: { ev: DiscoverEvent; onClose: () => void }) {
  const mood = moodFor(ev)
  function takeMeThere() {
    if (ev.lat == null || ev.lng == null) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lng}`, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className="inspect-backdrop" onClick={onClose}>
      <div className="inspect-sheet" style={{ ['--mood' as string]: mood.color }} onClick={(e) => e.stopPropagation()}>
        <button className="inspect-close" onClick={onClose} aria-label="Close">×</button>
        <div className="disc-when">
          <span className={`disc-kind ${ev.kind}`}>{ev.kind === 'now' ? 'NOW' : 'SOON'}</span>
          <span className="disc-time">{ev.when}</span>
        </div>
        <div className="inspect-name t-display-l">{ev.name}</div>
        <div className="disc-tier t-micro">{mood.label}</div>
        <p className="inspect-summary">"{ev.summary}"</p>
        <div className="emoji-tags">
          {ev.music_genre && <span className="emoji-tag">{ev.music_genre}</span>}
          <span className="emoji-tag">{ev.emotional_register}</span>
        </div>
        {ev.clip_url && <ClipSample url={ev.clip_url} />}
        {ev.lat != null && ev.lng != null && (
          <button className="cta-take-me" onClick={takeMeThere}>Take me there</button>
        )}
      </div>
    </div>
  )
}

export function Discover() {
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<DiscoverEvent[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<DiscoverEvent | null>(null)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  async function run(q: string) {
    const text = q.trim()
    if (!text) return
    setLoading(true)
    setError('')
    setEvents(null)
    try {
      const res = await discover(text)
      setEvents(res.events)
    } catch (e: any) {
      setError(e?.message ?? 'discovery failed')
    } finally {
      setLoading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    void run(query)
  }

  function toggleVoice() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Ctor) {
      setError('Voice search needs Chrome (Web Speech API). Type your vibe instead.')
      return
    }
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (ev: any) => {
      const said = ev.results?.[0]?.[0]?.transcript ?? ''
      setQuery(said)
      void run(said)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    setListening(true)
    rec.start()
  }

  return (
    <div className="discover">
      <form className="discover-search" onSubmit={submit}>
        <span className="discover-icon">✨</span>
        <input
          className="discover-input"
          placeholder="find an aura — “chill jazz tonight”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`discover-mic ${listening ? 'on' : ''}`}
          onClick={toggleVoice}
          aria-label="Voice search"
        >
          🎤
        </button>
        <button type="submit" className="discover-go" disabled={loading || !query.trim()}>
          {loading ? '…' : 'Search'}
        </button>
      </form>

      {error && <p className="discover-error t-small">{error}</p>}
      {loading && <div className="discover-loading t-small">reading the city…</div>}

      {events && events.length > 0 && (
        <div className="discover-carousel">
          {events.map((ev) => {
            const mood = moodFor(ev)
            return (
              <button
                key={ev.id}
                className="disc-card"
                style={{ ['--mood' as string]: mood.color }}
                onClick={() => setSelected(ev)}
              >
                <div className="disc-when">
                  <span className={`disc-kind ${ev.kind}`}>{ev.kind === 'now' ? 'NOW' : 'SOON'}</span>
                  <span className="disc-time">{ev.when}</span>
                </div>
                <div className="disc-name t-h2">{ev.name}</div>
                <div className="disc-tier t-micro">{mood.label}</div>
                <p className="disc-summary">{ev.summary}</p>
                <div className="disc-reason t-small">{ev.match_reason}</div>
              </button>
            )
          })}
        </div>
      )}

      {events && events.length === 0 && !loading && (
        <p className="discover-empty t-small">No matches — try another vibe.</p>
      )}

      {selected && <InspectSheet ev={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
