import { useEffect, useRef, memo } from 'react'

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

/** Seconds the compass spends spinning up before it starts telling the truth.
 *  A gauge that is simply correct the instant the page paints has never been
 *  switched on; one that races and settles has. */
const SPIN = 1.15

function MechHud() {
  const hud = useRef<HTMLDivElement>(null)
  const strip = useRef<SVGGElement>(null)
  const heading = useRef<SVGTextElement>(null)
  const readX = useRef<HTMLSpanElement>(null)
  const readY = useRef<HTMLSpanElement>(null)

  /* The panel moves with the page.
 
     The grid is a fixed layer, which on the wide layout is right — nothing
     scrolls there, the whole composition is the window. Narrow, the page runs
     under it, and a grid welded to the glass while the readout slides past
     reads as a screenshot with a texture on top rather than as a surface the
     screen is printed on.
 
     So it takes the scroll and moves, slower than the page — the grid is
     *behind* everything and parallax is the only thing that says so. One
     custom property, written from a rAF and only when it has changed, and the
     stylesheet does the rest.
 
     Captured, because on this layout the scroller is `.mech` rather than the
     document, and a listener on the window would never hear it. */
  useEffect(() => {
    const node = hud.current
    if (!node) return
    let raf = 0
    let last = -1

    const read = (event: Event) => {
      const target = event.target as HTMLElement | Document | null
      const top = target && 'scrollTop' in target ? (target as HTMLElement).scrollTop : window.scrollY
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const at = Math.round(top)
        if (at === last) return
        last = at
        node.style.setProperty('--scrolled', `${at}px`)
      })
    }

    window.addEventListener('scroll', read, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', read, { capture: true })
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    const to = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const at = { ...to }
    const started = performance.now()
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

      /* Spin-up. The strip races several turns and eases into where it should
         have been all along, so the last frame of the boot is the needle
         arriving rather than the needle appearing. Eased out of the cube, and
         the readout races with it. */
      const since = (performance.now() - started) / 1000
      const spinning = since < SPIN
      const settle = spinning ? Math.pow(1 - since / SPIN, 3) : 0

      if (strip.current) {
        const slide = -across * window.innerWidth * TRAVEL - settle * window.innerWidth * 2.2
        strip.current.setAttribute('transform', `translate(${slide} 0)`)
      }
      if (heading.current) {
        const value = spinning ? Math.random() * 360 : (degrees + 360) % 360
        heading.current.textContent = pad(value, 3)
      }
      if (readX.current) readX.current.textContent = pad(spinning ? Math.random() * 4000 : at.x)
      if (readY.current) readY.current.textContent = pad(spinning ? Math.random() * 4000 : at.y)

    }

    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="mech-hud" ref={hud} aria-hidden>
      {/* Home only, and off everywhere else — the stylesheet decides, so this
          component stays propless and memoised. It sits *under* the grid
          rather than over it: the grid is the instrument surface and has to
          stay the top layer, or the whole page stops reading as something
          printed on glass. See `.mech-wave` in Mech.css. */}
      <div className="mech-wave" />
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
          <rect className="mech-marker-box" x="-23" y="-8.5" width="46" height="17" />
          <text className="mech-heading" ref={heading} x="0" y="4" textAnchor="middle">
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

/* Memoised. It takes no props and nothing it draws depends on the readout's
   state, but the project screen re-renders on every phase of every frame swap
   — and without this, so does all of MechHud. */
export default memo(MechHud)
