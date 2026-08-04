import { useEffect, useMemo, useRef, useState } from 'react'

interface TapeSealProps {
  /** Carried along the tape, repeated. */
  label?: string
  /** Matches the ring's own offset so the tape sits exactly where the flat
   *  line of the product name is about to appear. */
  offsetY?: number
  /** Matches the ring's glyph size, for the same reason. */
  fontSize?: number
  /** Fires once the tape is off and the page underneath should start. */
  onOpen: () => void
  /** Seconds the cut halves take to clear. Matches the CSS transition. */
  cutDuration?: number
}

/**
 * The page arrives sealed under a single strip of tape carrying the name.
 * Clicking cuts it — at the point you clicked, not at some fixed seam — and
 * the two halves retract.
 *
 * The strip is deliberately the same shape, position and type size as the
 * flat line `ProductRing` unwraps from, so the handoff reads as one object:
 * the tape you just cut is what curls up into the product's name. That only
 * holds while the two agree, so `offsetY` and `fontSize` are passed in from
 * the ring's own settings rather than duplicated here.
 */
export default function TapeSeal({
  label = 'TARLOK SINGH',
  offsetY = 0,
  fontSize = 19,
  onOpen,
  cutDuration = 0.75
}: TapeSealProps) {
  const [cutAt, setCutAt] = useState<number | null>(null)
  const timer = useRef(0)

  // Long enough to run past the widest screen.
  const run = useMemo(() => `${label}  `.repeat(30), [label])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const cut = (clientX: number) => {
    if (cutAt !== null) return
    setCutAt((clientX / window.innerWidth) * 100)
    timer.current = window.setTimeout(onOpen, cutDuration * 1000)
  }

  const isCut = cutAt !== null
  // Before the cut the two halves meet at the middle and read as one strip.
  const seam = cutAt ?? 50

  return (
    <div
      className={`ch-seal${isCut ? ' is-cut' : ''}`}
      onPointerDown={(e) => cut(e.clientX)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          cut(window.innerWidth / 2)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${label} — cut to open`}
      style={{ '--cut': `${cutDuration}s` } as React.CSSProperties}
    >
      <div className="ch-seal-band" style={{ top: `calc(50% + ${offsetY}px)` }}>
        {/* Two copies of the same run, each clipped to its side of the seam.
            Clipping rather than splitting the text keeps the letters landing
            in identical places, so the cut can fall mid-glyph the way a real
            blade would. */}
        <div
          className="ch-seal-half is-left"
          style={{ clipPath: `inset(-50% ${100 - seam}% -50% -50%)` }}
        >
          <span className="ch-seal-run" style={{ fontSize }}>
            {run}
          </span>
        </div>
        <div
          className="ch-seal-half is-right"
          style={{ clipPath: `inset(-50% -50% -50% ${seam}%)` }}
        >
          <span className="ch-seal-run" style={{ fontSize }}>
            {run}
          </span>
        </div>
      </div>

      <span className="ch-seal-cue">TAP TO CUT</span>
    </div>
  )
}
