import { useEffect, useMemo, useRef, useState } from 'react'

interface TapeSealProps {
  /** Carried along each strip, repeated. */
  label?: string
  /** Fires once the tape is off and the page underneath should start. */
  onOpen: () => void
  /** Seconds the tape takes to leave. Matches the CSS transition. */
  peelDuration?: number
}

// Two strips crossing at opposing angles, the way a box gets taped shut.
const STRIPS = [
  { angle: -14, top: '38%' },
  { angle: 11, top: '58%' }
]

/**
 * The page arrives sealed: strips of tape carrying the name, which have to be
 * broken to get in.
 *
 * It gates the page's own intro rather than playing alongside it — the copy
 * reveal, the ring unwrapping out of its line and the product turning into
 * place all start from the moment this clears, so the whole thing reads as
 * one continuous opening rather than an animation that ran while nobody was
 * looking.
 *
 * The strips carry the same repeated-label treatment the ring uses, so the
 * flat line the ring unwraps from is visually the tape that just came off.
 */
export default function TapeSeal({
  label = 'TARLOK SINGH',
  onOpen,
  peelDuration = 0.9
}: TapeSealProps) {
  const [peeling, setPeeling] = useState(false)
  const timer = useRef(0)

  // Long enough to run past the widest screen at any angle.
  const run = useMemo(() => `${label}  `.repeat(24), [label])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const open = () => {
    if (peeling) return
    setPeeling(true)
    timer.current = window.setTimeout(onOpen, peelDuration * 1000)
  }

  // Enter and Space land here through the button role, so a keyboard gets in
  // the same way a pointer does.
  return (
    <div
      className={`ch-seal${peeling ? ' is-peeling' : ''}`}
      onPointerDown={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${label} — open`}
      style={{ '--peel': `${peelDuration}s` } as React.CSSProperties}
    >
      {STRIPS.map((strip, i) => (
        <div
          key={i}
          className="ch-seal-strip"
          style={{
            top: strip.top,
            // Each strip leaves the way it lies, so the two part rather than
            // sliding off together.
            ['--angle' as string]: `${strip.angle}deg`,
            ['--exit' as string]: i % 2 === 0 ? '-120%' : '120%'
          }}
          aria-hidden="true"
        >
          <span className="ch-seal-run">{run}</span>
        </div>
      ))}

      <span className="ch-seal-cue">TAP TO OPEN</span>
    </div>
  )
}
