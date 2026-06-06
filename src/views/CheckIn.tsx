import { useEffect, useRef, useState } from 'react'
import type { Vibe } from '../../shared/types'
import { startRecording, type Recording } from '../lib/recorder'
import { getLocation } from '../lib/geo'
import { checkIn } from '../lib/api'
import { mockVibeFromLevels } from '../lib/mockVibe'
import { useAmbientMic } from '../lib/ambientMic'
import { Orb, type AgentState } from '../components/Orb'
import { ReadingRoom } from '../components/ReadingRoom'
import { VibeReveal } from '../components/VibeReveal'
import { Discover } from '../components/Discover'
import { heatFor } from '../lib/heat'

const CLIP_SECONDS = 20
const READING_MS = 1800
const ORB_BASE: [string, string] = ['#4A3DFF', '#6E5BFF']

type Phase = 'invite' | 'listening' | 'reading' | 'reveal'

export function CheckIn({ onPosted }: { onPosted: (v: Vibe) => void }) {
  const mic = useAmbientMic(true)

  const [phase, setPhase] = useState<Phase>('invite')
  const [placeName, setPlaceName] = useState('')
  const [handle, setHandle] = useState('🙂 anon')
  const [remaining, setRemaining] = useState(CLIP_SECONDS)
  const [vibe, setVibe] = useState<Vibe | null>(null)
  const [error, setError] = useState('')

  const recRef = useRef<Recording | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const capturedLevelsRef = useRef<number[]>([])
  // Drives the orb's loop speed during analysis (read every frame by the Orb):
  // high while Gemini works → fast looping animation; drops to idle when done.
  const orbOutRef = useRef(0)

  const agentState: AgentState = phase === 'listening' ? 'listening' : phase === 'reading' ? 'thinking' : null

  // Live orb colors — driven by mic level via a rAF loop. Hotter room = brighter magenta.
  // The Orb component reads colorsRef every frame and lerps toward it.
  const colorsRef = useRef<[string, string]>([...ORB_BASE])
  const smoothLevelRef = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const target = mic.levelRef.current ?? 0
      smoothLevelRef.current += (target - smoothLevelRef.current) * 0.08
      const lvl = smoothLevelRef.current
      // Map mic RMS (0–1) to a synthetic 0–100 score so heat scale agrees w/ rest of app.
      const synthScore = Math.min(100, lvl * 220)
      const heat = heatFor(synthScore)
      // Tuple: deep base → bright tier color.
      const baseDark = lvl > 0.3 ? '#3D2BB8' : '#2A1B6B'
      colorsRef.current = [baseDark, heat.color]
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mic])

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (sampleRef.current) clearInterval(sampleRef.current)
    recRef.current?.cancel()
  }, [])

  async function startListening() {
    setError('')
    setRemaining(CLIP_SECONDS)
    capturedLevelsRef.current = []

    let status = mic.status
    if (status !== 'live') {
      status = await mic.request()
    }
    if (status !== 'live') {
      if (status === 'denied') {
        setError("Permission denied. Click the lock icon in the address bar → Site settings → Microphone → Allow, then reload.")
      } else if (status === 'unavailable') {
        setError('Mic unavailable. Open at http://localhost:5173 (https or localhost only).')
      } else {
        setError(`Mic not live (status: ${status}).`)
      }
      return
    }

    const stream = mic.getStream()
    if (!stream) {
      setError('Mic stream missing.')
      return
    }

    try {
      recRef.current = await startRecording({ stream })
      startedAtRef.current = performance.now()
      setPhase('listening')
      tickRef.current = setInterval(() => {
        const elapsed = (performance.now() - startedAtRef.current) / 1000
        const left = Math.max(0, CLIP_SECONDS - elapsed)
        setRemaining(left)
        if (left <= 0) finishListening()
      }, 100)
      sampleRef.current = setInterval(() => {
        capturedLevelsRef.current.push(mic.levelRef.current ?? 0)
      }, 50)
    } catch (e: any) {
      setError(`Recording failed: ${e?.message ?? e}`)
    }
  }

  async function finishListening() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (sampleRef.current) { clearInterval(sampleRef.current); sampleRef.current = null }
    if (!recRef.current) return
    orbOutRef.current = 0.85 // spin the orb up into an active "thinking" loop
    setPhase('reading')

    const [{ blob }, loc] = await Promise.all([
      recRef.current.stop(),
      getLocation(),
    ])

    const input = {
      place_name: placeName.trim() || 'My spot',
      handle: handle.trim() || '🙂 anon',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    }

    // Keep the orb looping for at least READING_MS, but let the real analysis take
    // as long as it needs — the orb keeps animating for the whole duration.
    const minWait = new Promise((r) => setTimeout(r, READING_MS))

    let v: Vibe
    try {
      // Real analysis: upload the clip to /api/vibe → transcode → Gemini → score.
      const [real] = await Promise.all([checkIn(blob, input), minWait])
      v = real
    } catch (err) {
      // Graceful fallback: if the analyzer is down/quota'd, derive a vibe from the
      // captured mic levels so the check-in still completes.
      console.warn('[check-in] real analysis failed, using local estimate:', err)
      await minWait
      v = mockVibeFromLevels({ levels: capturedLevelsRef.current, ...input, clipBlob: blob })
    }

    // Analysis complete → let the orb wind down to idle, then reveal.
    orbOutRef.current = 0.3
    await new Promise((r) => setTimeout(r, 700))

    setVibe(v)
    setPhase('reveal')
  }

  function post() {
    if (vibe) onPosted(vibe)
    reset()
  }

  function reset() {
    setVibe(null)
    setRemaining(CLIP_SECONDS)
    capturedLevelsRef.current = []
    setPhase('invite')
  }

  // Reveal phase — full takeover, no orb behind
  if (phase === 'reveal' && vibe) {
    return (
      <div className="ci-stage">
        <VibeReveal vibe={vibe} onPost={post} onRedo={reset} />
      </div>
    )
  }

  if (phase === 'reading') {
    return (
      <div className="ci-stage ci-reading">
        <div className="ci-reading-orb">
          <Orb
            colors={ORB_BASE}
            colorsRef={colorsRef}
            agentState="thinking"
            volumeMode="manual"
            inputVolumeRef={mic.levelRef}
            outputVolumeRef={orbOutRef}
          />
        </div>
        <ReadingRoom />
      </div>
    )
  }

  return (
    <div className="ci-stage ci-invite">
      <div className="ci-invite-copy">
        <div className="t-display-l">What's the vibe?</div>
        {phase === 'listening' && (
          <div className="ci-countdown t-display-l" aria-live="polite">
            {Math.ceil(remaining)}<span className="ci-countdown-unit">s</span>
          </div>
        )}
      </div>

      <button
        className="ci-orb-btn"
        onClick={phase === 'listening' ? finishListening : startListening}
        aria-label={phase === 'listening' ? 'Stop recording' : 'Start recording'}
      >
        <Orb
          colors={ORB_BASE}
          colorsRef={colorsRef}
          agentState={agentState}
          volumeMode="manual"
          inputVolumeRef={mic.levelRef}
          manualOutput={phase === 'listening' ? 0.7 : 0.35}
        />
      </button>

      {phase !== 'listening' && (
        <div className="ci-orb-hint t-small">👆 Tap the orb to record · 20s</div>
      )}

      {phase !== 'listening' && <Discover />}

      <div className="ci-invite-meta">
        <input
          className="ci-meta-input"
          placeholder="Where are you?"
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
        />
        <input
          className="ci-meta-input"
          placeholder="@handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </div>

      {phase === 'listening' && (
        <button className="ci-stop" onClick={finishListening}>Stop early</button>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
