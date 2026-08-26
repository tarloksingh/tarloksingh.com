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
   would cost more than everything it sits under.

   `gridOn` is the one exception, and it is the flat grid alone — the bloom
   and the sweep still show. Its control lives on the Wave tab, next to the
   3D wave's own on/off, even though this one has nothing to do with that
   shader: see `grid` on `CastWave` in castTuning.ts. */

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

/* ---- the heading, drawn rather than typed ----

   The same seven-segment grammar as `Segment.tsx` — a digit is which of eight
   short lines come up, not a glyph in a font — but reimplemented small and
   local instead of mounting `Segment` here. `Segment` holds its word in React
   state and re-renders on every change, which is exactly right for a display
   that changes when someone picks a project; this one changes on every
   `pointermove`, and the file's whole architecture is "nothing here goes
   through React state" for precisely that reason. So the geometry is drawn
   once, and only the lit segments' opacity is written per frame — three
   digits, eight segments each, the same shape as every write already made
   in this file. */
const HEADING_CELL = { w: 11, advance: 16 }
const HEADING_L = 1.5
const HEADING_R = 12.5
const HEADING_T = 1.5
const HEADING_MY = 8
const HEADING_B = 14.5
const HEADING_MX = (HEADING_L + HEADING_R) / 2
const HEADING_GAP = 1.3
const HEADING_HUB = 0.9

const HEADING_SEGMENTS: Record<string, [number, number, number, number]> = {
  A: [HEADING_L + HEADING_GAP, HEADING_T, HEADING_R - HEADING_GAP, HEADING_T],
  B: [HEADING_R, HEADING_T + HEADING_GAP, HEADING_R, HEADING_MY - HEADING_GAP],
  C: [HEADING_R, HEADING_MY + HEADING_GAP, HEADING_R, HEADING_B - HEADING_GAP],
  D: [HEADING_L + HEADING_GAP, HEADING_B, HEADING_R - HEADING_GAP, HEADING_B],
  E: [HEADING_L, HEADING_MY + HEADING_GAP, HEADING_L, HEADING_B - HEADING_GAP],
  F: [HEADING_L, HEADING_T + HEADING_GAP, HEADING_L, HEADING_MY - HEADING_GAP],
  G1: [HEADING_L + HEADING_GAP, HEADING_MY, HEADING_MX - HEADING_HUB, HEADING_MY],
  G2: [HEADING_MX + HEADING_HUB, HEADING_MY, HEADING_R - HEADING_GAP, HEADING_MY]
}

const HEADING_KEYS = Object.keys(HEADING_SEGMENTS)

/** Digits only — the heading never shows a letter, so there is no reason to
 *  carry the other six segments `Segment.tsx` needs for the alphabet. */
const HEADING_FONT: Record<string, string[]> = {
  '0': ['A', 'B', 'C', 'D', 'E', 'F'],
  '1': ['B', 'C'],
  '2': ['A', 'B', 'G1', 'G2', 'E', 'D'],
  '3': ['A', 'B', 'C', 'D', 'G1', 'G2'],
  '4': ['F', 'G1', 'G2', 'B', 'C'],
  '5': ['A', 'F', 'G1', 'G2', 'C', 'D'],
  '6': ['A', 'F', 'E', 'D', 'C', 'G1', 'G2'],
  '7': ['A', 'B', 'C'],
  '8': ['A', 'B', 'C', 'D', 'E', 'F', 'G1', 'G2'],
  '9': ['A', 'B', 'C', 'D', 'F', 'G1', 'G2']
}

const HEADING_DIGITS = 3
/** The block's own width and height, in the same local unit its segments are
 *  drawn in — three cells wide, one cell tall, folded into the `<g transform>`
 *  below so the block centres on the marker box regardless of where that box
 *  is sized in `Mech.css`. */
const HEADING_W = HEADING_DIGITS * HEADING_CELL.advance
const HEADING_H = HEADING_B + HEADING_T

function MechHud({ gridOn = true }: { gridOn?: boolean }) {
  const hud = useRef<HTMLDivElement>(null)
  const strip = useRef<SVGGElement>(null)
  const headingLines = useRef<Array<Record<string, SVGLineElement | null>>>(
    Array.from({ length: HEADING_DIGITS }, () => ({}))
  )
  const lastHeading = useRef('')
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
      const value = spinning ? Math.random() * 360 : (degrees + 360) % 360
      const text = pad(value, 3)
      if (text !== lastHeading.current) {
        lastHeading.current = text
        for (let n = 0; n < HEADING_DIGITS; n += 1) {
          const mask = HEADING_FONT[text[n]] ?? []
          for (const key of HEADING_KEYS) {
            const line = headingLines.current[n][key]
            if (line) line.style.opacity = mask.includes(key) ? '1' : '0'
          }
        }
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
      {gridOn && <div className="mech-grid" />}
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
          <rect className="mech-marker-box" x="-28" y="-10.5" width="56" height="21" />

          {/* Centred on the box: half its own width and height either side of
              the origin, in the digits' own local unit — see the note above
              `HEADING_CELL`. */}
          <g className="mech-heading" transform={`translate(${-HEADING_W / 2} ${-HEADING_H / 2})`}>
            <g className="mech-heading-off">
              {Array.from({ length: HEADING_DIGITS }, (_, n) =>
                HEADING_KEYS.map((key) => {
                  const [x1, y1, x2, y2] = HEADING_SEGMENTS[key]
                  const dx = n * HEADING_CELL.advance + (HEADING_CELL.advance - HEADING_CELL.w) / 2
                  return <line key={`${n}-${key}`} x1={x1 + dx} y1={y1} x2={x2 + dx} y2={y2} />
                })
              )}
            </g>
            <g className="mech-heading-on">
              {Array.from({ length: HEADING_DIGITS }, (_, n) =>
                HEADING_KEYS.map((key) => {
                  const [x1, y1, x2, y2] = HEADING_SEGMENTS[key]
                  const dx = n * HEADING_CELL.advance + (HEADING_CELL.advance - HEADING_CELL.w) / 2
                  return (
                    <line
                      key={`${n}-${key}`}
                      ref={(el) => {
                        headingLines.current[n][key] = el
                      }}
                      x1={x1 + dx}
                      y1={y1}
                      x2={x2 + dx}
                      y2={y2}
                    />
                  )
                })
              )}
            </g>
          </g>
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
