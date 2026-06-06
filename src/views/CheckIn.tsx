import { useEffect, useRef, useState } from 'react'
import type { Vibe } from '../../shared/types'
import { startRecording, type Recording } from '../lib/recorder'
import { getLocation } from '../lib/geo'
import { checkIn } from '../lib/api'
import { VibeCard } from '../components/VibeCard'

const CLIP_SECONDS = 20

export function CheckIn({ onPosted }: { onPosted: (v: Vibe) => void }) {
  const [placeName, setPlaceName] = useState('')
  const [handle, setHandle] = useState('🙂 anon')
  const [phase, setPhase] = useState<'idle' | 'recording' | 'analyzing' | 'done'>('idle')
  const [countdown, setCountdown] = useState(CLIP_SECONDS)
  const [result, setResult] = useState<Vibe | null>(null)
  const [error, setError] = useState('')
  const recRef = useRef<Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), [])

  async function record() {
    setError('')
    setResult(null)
    try {
      recRef.current = await startRecording()
      setPhase('recording')
      setCountdown(CLIP_SECONDS)
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { finish(); return 0 }
          return c - 1
        })
      }, 1000)
    } catch {
      setError('Mic blocked. Allow microphone access (and use https/localhost).')
      setPhase('idle')
    }
  }

  async function finish() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!recRef.current) return
    setPhase('analyzing')
    try {
      const clip = await recRef.current.stop()
      const loc = await getLocation()
      const vibe = await checkIn(clip, {
        place_name: placeName.trim() || 'My spot',
        handle: handle.trim() || 'anon',
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      })
      setResult(vibe)
      setPhase('done')
      onPosted(vibe)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
      setPhase('idle')
    }
  }

  return (
    <div className="checkin">
      <input className="input" placeholder="Where are you? (place name)" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
      <input className="input" placeholder="Your handle" value={handle} onChange={(e) => setHandle(e.target.value)} />

      {phase === 'idle' && (
        <button className="record-btn" onClick={record}>🎙️ Record the vibe ({CLIP_SECONDS}s)</button>
      )}
      {phase === 'recording' && (
        <button className="record-btn rec" onClick={finish}>● Listening… {countdown}s (tap to stop)</button>
      )}
      {phase === 'analyzing' && <div className="analyzing">🧠 Reading the room…</div>}

      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <p className="result-label">Your vibe is live 👇</p>
          <VibeCard vibe={result} />
        </>
      )}
    </div>
  )
}
