// Ambient mic listener — opens getUserMedia, exposes a live RMS (0–1) via a ref.
// Used to drive the Orb's input volume *before* the user taps record, so it
// reacts to the room on arrival. Independent of the clip recorder.

import { useEffect, useRef, useState } from 'react'

export type MicStatus = 'idle' | 'requesting' | 'live' | 'denied' | 'unavailable'

export interface AmbientMic {
  status: MicStatus
  /** Live RMS (0–1). Updated every animation frame while status === 'live'. */
  levelRef: React.RefObject<number>
  /** Most-recent RMS for components that re-render on it. */
  level: number
  /** Manually request mic if status === 'idle' or 'denied' (requires user gesture on some browsers). Resolves to the new status. */
  request: () => Promise<MicStatus>
  /** Tear down without unmounting (e.g. before clip-recorder takes over). */
  release: () => void
  /** Live mic stream — reuse for MediaRecorder so the orb keeps reacting during clip capture. */
  getStream: () => MediaStream | null
}

export function useAmbientMic(autoStart = true): AmbientMic {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [level, setLevel] = useState(0)
  const levelRef = useRef(0)

  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef(0)
  const releasedRef = useRef(false)

  const teardown = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    ctxRef.current?.close().catch(() => {})
    streamRef.current = null
    ctxRef.current = null
    levelRef.current = 0
    setLevel(0)
  }

  const request = async (): Promise<MicStatus> => {
    if (releasedRef.current) return 'unavailable'
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return 'unavailable'
    }
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      const ctx = new AudioCtx()
      ctxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.5
      src.connect(analyser)
      const buf = new Uint8Array(analyser.fftSize)

      let frame = 0
      const tick = () => {
        if (releasedRef.current || !ctxRef.current) return
        analyser.getByteTimeDomainData(buf)
        let sumSq = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.min(1, Math.sqrt(sumSq / buf.length) * 4) // amplify
        levelRef.current = rms
        // Throttle React re-renders to ~10Hz; ref updates every frame for the orb.
        if (frame++ % 6 === 0) setLevel(rms)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
      setStatus('live')
      return 'live'
    } catch (e: any) {
      const name = e?.name ?? 'Error'
      const s: MicStatus = name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'unavailable'
      setStatus(s)
      return s
    }
  }

  const release = () => {
    releasedRef.current = true
    teardown()
  }

  useEffect(() => {
    releasedRef.current = false
    if (autoStart) request()
    return () => {
      releasedRef.current = true
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  return { status, level, levelRef, request, release, getStream: () => streamRef.current }
}
