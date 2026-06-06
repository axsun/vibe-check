import { useEffect, useRef, useState } from 'react'
import type { Vibe } from '../../shared/types'
import { startRecording, type Recording } from '../lib/recorder'
import { getLocation } from '../lib/geo'
import { mockVibeFromLevels } from '../lib/mockVibe'
import { useAmbientMic } from '../lib/ambientMic'
import { Orb, type AgentState } from '../components/Orb'
import { ReadingRoom } from '../components/ReadingRoom'
import { VibeReveal } from '../components/VibeReveal'
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
    setPhase('reading')

    const [{ blob }, loc] = await Promise.all([
      recRef.current.stop(),
      getLocation(),
    ])

    const elapsed = performance.now() - startedAtRef.current
    const minWait = elapsed < CLIP_SECONDS * 1000 ? READING_MS : Math.max(900, READING_MS)
    await new Promise((r) => setTimeout(r, minWait))

    const v = mockVibeFromLevels({
      levels: capturedLevelsRef.current,
      place_name: placeName.trim() || 'My spot',
      handle: handle.trim() || '🙂 anon',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      clipBlob: blob,
    })
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
        <div className="ci-orb-bg">
          <Orb
            colors={ORB_BASE}
            colorsRef={colorsRef}
            agentState="thinking"
            volumeMode="manual"
            inputVolumeRef={mic.levelRef}
            manualOutput={0.6}
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
        <div className="t-small ci-sub">
          {phase === 'listening'
            ? 'listening in…'
            : mic.status === 'live'
              ? 'tap when you\'re ready — 20 seconds'
              : mic.status === 'requesting'
                ? 'asking for the mic…'
                : mic.status === 'denied'
                  ? 'mic denied — allow it in site settings to feel the room'
                  : '20 seconds. let the room speak.'}
        </div>
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
