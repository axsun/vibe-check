import { useEffect, useRef, useState } from 'react'

/**
 * Plays the first ~N seconds of a clip, then auto-stops. Stops click-through so
 * it can sit on a clickable card. Reused on the feed, the map, and discovery.
 */
export function ClipSample({ url, seconds = 5, label }: { url: string; seconds?: number; label?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [playing, setPlaying] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function stop() {
    const a = ref.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    window.clearTimeout(timer.current)
    setPlaying(false)
  }

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    const a = ref.current
    if (!a) return
    if (playing) return stop()
    a.currentTime = 0
    void a.play()
    setPlaying(true)
    timer.current = window.setTimeout(stop, seconds * 1000)
  }

  return (
    <div className="vibe-sample">
      <audio ref={ref} src={url} preload="none" onEnded={stop} />
      <button className="vibe-sample-btn" onClick={toggle}>
        {playing ? '⏹ stop' : (label ?? `▶ ${seconds}s sample`)}
      </button>
    </div>
  )
}
