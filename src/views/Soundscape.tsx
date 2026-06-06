import { useEffect, useMemo, useRef, useState } from 'react'
import type { ForecastResponse, Vibe } from '../../shared/types'
import { forecast, soundscapeUrl } from '../lib/api'
import { moodForScore } from '../lib/mood'

const TIME_SLOTS = ['tonight 10pm', 'fri 9pm', 'sat 2pm', 'sun 11am']

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="ss-kv">
      <span className="ss-k t-micro">{k}</span>
      <span className="ss-v">{v}</span>
    </div>
  )
}

export function Soundscape({ vibes }: { vibes: Vibe[]; center?: { lat: number; lng: number } }) {
  const places = useMemo(() => Array.from(new Set(vibes.map((v) => v.place_name))), [vibes])
  const [place, setPlace] = useState('')
  const [time, setTime] = useState(TIME_SLOTS[0])
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)

  function stopAudio() {
    audioRef.current?.pause()
    setPlaying(false)
  }
  function resetAudio() {
    stopAudio()
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }

  useEffect(() => { if (!place && places.length) setPlace(places[0]) }, [places, place])

  useEffect(() => {
    if (!place) return
    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)
    resetAudio()
    forecast(place, time)
      .then(async (r) => {
        if (cancelled) return
        setData(r)
        setLoading(false)
        // Prefetch the soundscape (generation takes a few seconds) so the tap
        // plays instantly AND synchronously — required for iOS autoplay rules.
        setLoadingAudio(true)
        try {
          const sp = r.forecast.future_soundscape_prompt
          const mood = moodForScore(r.forecast.future_atmosphere.energy_score).key
          const url = await soundscapeUrl(sp.audio_generation_prompt, mood, `${r.place_name}|${r.target_time}`)
          if (cancelled || !audioRef.current) { URL.revokeObjectURL(url); return }
          urlRef.current = url
          audioRef.current.src = url
          audioRef.current.loop = true
        } catch {
          /* tap will lazily fetch as a fallback */
        } finally {
          if (!cancelled) setLoadingAudio(false)
        }
      })
      .catch((e) => { if (!cancelled) { setError(e?.message ?? 'forecast failed'); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, time])

  useEffect(() => () => resetAudio(), [])

  async function toggleSound() {
    if (!data) return
    const a = audioRef.current
    if (!a) return
    if (playing) return stopAudio()

    // Prefetched → play synchronously within the gesture (works on iOS).
    if (urlRef.current) {
      a.loop = true
      try { await a.play(); setPlaying(true) } catch { setPlaying(false) }
      return
    }

    // Not ready yet — fetch then play (fallback for an early tap).
    setLoadingAudio(true)
    try {
      const sp = data.forecast.future_soundscape_prompt
      const mood = moodForScore(data.forecast.future_atmosphere.energy_score).key
      const url = await soundscapeUrl(sp.audio_generation_prompt, mood, `${data.place_name}|${data.target_time}`)
      urlRef.current = url
      a.src = url
      a.loop = true
    } catch {
      setError('soundscape unavailable')
      setLoadingAudio(false)
      return
    }
    setLoadingAudio(false)
    try { await a.play(); setPlaying(true) } catch { setPlaying(false) }
  }

  const f = data?.forecast
  const mood = f ? moodForScore(f.future_atmosphere.energy_score) : null

  return (
    <div className="ss-stage" style={mood ? { ['--mood' as string]: mood.color } : undefined}>
      <div className="ss-selectors">
        <div className="ss-chips">
          {places.map((p) => (
            <button key={p} className={`pill ${place === p ? 'on' : ''}`} onClick={() => setPlace(p)}>{p}</button>
          ))}
        </div>
        <div className="ss-chips">
          {TIME_SLOTS.map((t) => (
            <button key={t} className={`pill ${time === t ? 'on' : ''}`} onClick={() => setTime(t)}>{t}</button>
          ))}
        </div>
      </div>

      {loading && <div className="ss-loading t-small">reading the aura ahead…</div>}
      {error && <p className="error">{error}</p>}

      {f && mood && !loading && (
        <div className="ss-forecast">
          {/* Aura hero */}
          <div className="ss-aura">
            <div className="ss-aura-glow" />
            <div className="ss-aura-place t-micro">{data!.place_name} · {data!.target_time}</div>
            <div className="ss-aura-word">{mood.label}</div>
            <div className="ss-aura-traj t-small">{f.future_atmosphere.trajectory}</div>
          </div>

          {/* Headline + read */}
          <div className="ss-headline t-display-l">{f.atmosphere_summary.headline}</div>
          <p className="ss-desc">{f.atmosphere_summary.description}</p>

          {/* Hear the forecast — the signature moment */}
          <div className="ss-player">
            <button className={`ss-play ${playing ? 'on' : ''}`} onClick={toggleSound}>
              {loadingAudio ? 'tuning…' : playing ? '⏸  playing' : '▶  hear the forecast'}
            </button>
            <div className={`ss-viz ${playing ? 'on' : ''}`} aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            <div className="ss-ss-title t-micro">{f.future_soundscape_prompt.title}</div>
            <div className="ss-ss-desc t-small">{f.future_soundscape_prompt.description}</div>
          </div>

          {/* Crowd */}
          <div className="ss-section">
            <div className="ss-section-title t-micro">crowd</div>
            <div className="ss-chips wrap">
              {f.crowd_profile.primary_archetypes.map((a) => <span key={a} className="emoji-tag">{a}</span>)}
            </div>
            <KV k="social" v={f.crowd_profile.social_behavior} />
            <KV k="groups" v={f.crowd_profile.group_dynamics} />
          </div>

          {/* Environment */}
          <div className="ss-section">
            <div className="ss-section-title t-micro">environment</div>
            <KV k="lighting" v={f.environmental_cues.lighting} />
            <KV k="movement" v={f.environmental_cues.movement} />
            <KV k="talk" v={f.environmental_cues.conversation_density} />
            <KV k="mood" v={f.environmental_cues.dominant_mood} />
          </div>

          {/* Sound */}
          <div className="ss-section">
            <div className="ss-section-title t-micro">sound</div>
            <KV k="music" v={f.sound_profile.music_presence} />
            <div className="ss-chips wrap">
              {f.sound_profile.genre_influences.map((g) => <span key={g} className="emoji-tag">{g}</span>)}
            </div>
            <KV k="volume" v={f.sound_profile.volume_level} />
            <KV k="crowd" v={f.sound_profile.crowd_noise_level} />
            <div className="ss-chips wrap">
              {f.sound_profile.signature_sounds.map((s) => <span key={s} className="emoji-tag">{s}</span>)}
            </div>
          </div>
        </div>
      )}

      {places.length === 0 && !loading && <p className="empty">no places to forecast yet — record a vibe first.</p>}
      <audio ref={audioRef} />
    </div>
  )
}
