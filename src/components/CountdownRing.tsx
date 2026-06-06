// Circular ring that winds down from 1 → 0 over `total` seconds.
// Stroke uses the vibe gradient via a defs gradient.
export function CountdownRing({ remaining, total, size = 240 }: { remaining: number; total: number; size?: number }) {
  const stroke = 6
  const r = size / 2 - stroke
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, remaining / total))
  const dash = c * pct

  return (
    <svg width={size} height={size} className="countdown-ring">
      <defs>
        <linearGradient id="vibe-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4A3DFF" />
          <stop offset="40%" stopColor="#6E5BFF" />
          <stop offset="75%" stopColor="#A468FF" />
          <stop offset="100%" stopColor="#E254FF" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#vibe-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 200ms linear' }}
      />
    </svg>
  )
}
