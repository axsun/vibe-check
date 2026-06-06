import { useEffect, useState } from 'react'

const COPY = ['tuning in…', 'reading the room…', 'asking the bartender…', 'feeling it out…']

export function ReadingRoom() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % COPY.length), 1200)
    return () => clearInterval(t)
  }, [])

  // Just the status line now — the orb is the only visual while analyzing.
  return (
    <div className="reading-room">
      <div className="rr-copy t-h2">{COPY[i]}</div>
    </div>
  )
}
