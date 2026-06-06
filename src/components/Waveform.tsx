import { useEffect, useRef } from 'react'

// Live waveform: keeps a rolling buffer of recent mic levels (0–1) and renders
// mirrored bars across the full width. Bars use the vibe gradient.
export function Waveform({ levels, height = 96 }: { levels: number[]; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = height
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }
    ctx.clearRect(0, 0, w, h)

    const BAR_W = 4
    const GAP = 3
    const bars = Math.floor(w / (BAR_W + GAP))
    const sample = levels.slice(-bars)
    const offset = Math.max(0, bars - sample.length)

    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, '#4A3DFF')
    grad.addColorStop(0.4, '#6E5BFF')
    grad.addColorStop(0.75, '#A468FF')
    grad.addColorStop(1, '#E254FF')
    ctx.fillStyle = grad

    for (let i = 0; i < sample.length; i++) {
      const lvl = Math.min(1, sample[i] * 4) // amplify for stage presence
      const barH = Math.max(3, lvl * h * 0.95)
      const x = (offset + i) * (BAR_W + GAP)
      const y = (h - barH) / 2
      ctx.fillRect(x, y, BAR_W, barH)
    }
  }, [levels, height])

  return <canvas ref={canvasRef} className="waveform" style={{ width: '100%', height }} />
}
