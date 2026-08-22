import { useEffect, useRef } from 'react'

/* The dashboard the readout sits on.

   A faint grid, a phosphor bloom, a sweep line that crosses every so often,
   and along the bottom a compass strip with the pointer's coordinates. All of
   it is chrome in the literal sense: it reports on the page rather than being
   part of it, which is why none of it takes the pointer and none of it is in
   the accessibility tree.

   Nothing here goes through React state. The strip and the numbers are
   rewritten from a rAF loop straight onto the nodes — a readout that
   re-rendered a component tree sixty times a second to print four digits
   would cost more than everything it sits under. */

/** Ticks either side of centre on the compass. The strip is wider than the
 *  window on purpose: it scrolls under a fixed marker, and the ends must
 *  never come into view. */
const TICKS = 90

/** Frame coordinates the strip spans, per tick. */
const TICK_GAP = 26

/** How far the strip slides for a pointer crossing the full width. Less than
 *  one-to-one, so the ticks read as a heading being tracked rather than as
 *  the mouse dragging a ruler. */
const TRAVEL = 0.55

const pad = (n: number, width = 4) => String(Math.round(n)).padStart(width, '0')

export default function MechHud() {
  const strip = useRef<SVGGElement>(null)
  const heading = useRef<SVGTextElement>(null)
  const readX = useRef<HTMLSpanElement>(null)
  const readY = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    const to = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const at = { ...to }
    let raf = 0

    const onMove = (event: PointerEvent) => {
      to.x = event.clientX
      to.y = event.clientY
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      at.x += (to.x - at.x) * 0.16
      at.y += (to.y - at.y) * 0.16

      // Centre of the window reads 000; the edges read a full turn either
      // way, so the strip behaves like a compass rather than a position bar.
      const across = at.x / window.innerWidth - 0.5
      const degrees = across * 360

      if (strip.current) {
        strip.current.setAttribute('transform', `translate(${-across * window.innerWidth * TRAVEL} 0)`)
      }
      if (heading.current) {
        heading.current.textContent = pad((degrees + 360) % 360, 3)
      }
      if (readX.current) readX.current.textContent = pad(at.x)
      if (readY.current) readY.current.textContent = pad(at.y)
    }

    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="mech-hud" aria-hidden>
      <div className="mech-grid" />
      <div className="mech-bloom" />
      <div className="mech-sweep" />

      <div className="mech-strip">
        <svg viewBox="-960 -22 1920 44" preserveAspectRatio="xMidYMid meet">
          <g ref={strip}>
            {Array.from({ length: TICKS * 2 + 1 }, (_, i) => {
              const n = i - TICKS
              // Every fifth tick is a major one, which is what gives the
              // strip a rhythm to read speed against as it slides.
              const major = n % 5 === 0
              return (
                <line
                  key={n}
                  className={major ? 'mech-tick mech-tick-major' : 'mech-tick'}
                  x1={n * TICK_GAP}
                  x2={n * TICK_GAP}
                  y1={major ? -8 : -4}
                  y2={major ? 8 : 4}
                />
              )
            })}
          </g>

          {/* The marker and its readout do not move — the strip moves under
              them, the same way an artificial horizon works. */}
          <path className="mech-marker" d="M -22 12 L -22 4 L 0 -4 L 22 4 L 22 12 Z" />
          <text className="mech-heading" ref={heading} x="0" y="10" textAnchor="middle">
            000
          </text>
        </svg>
      </div>

      <div className="mech-coords">
        <span>
          X<span ref={readX}>0000</span>
        </span>
        <span>
          Y<span ref={readY}>0000</span>
        </span>
      </div>
    </div>
  )
}
