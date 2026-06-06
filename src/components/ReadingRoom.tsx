import { useEffect, useState } from 'react'

const COPY = ['tuning in…', 'reading the room…', 'asking the bartender…', 'feeling it out…']

export function ReadingRoom() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % COPY.length), 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="reading-room">
      <div className="rr-rings">
        <span className="rr-ring rr-r1" />
        <span className="rr-ring rr-r2" />
        <span className="rr-ring rr-r3" />
      </div>
      <div className="rr-copy t-h2">{COPY[i]}</div>
    </div>
  )
}
