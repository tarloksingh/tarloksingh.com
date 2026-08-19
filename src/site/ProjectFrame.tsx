import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { frameFor } from './frames'
import './ProjectFrame.css'

/* The frame drawn around one project's exhibit.
 *
 * One per project, and it travels with its project — Gallery.tsx writes the
 * same step along the row onto it that it writes onto that project's wall
 * label, so a frame arrives and leaves with the piece it belongs to rather
 * than sitting over the window while the row passes underneath it.
 *
 * Two drawings, shown six times: a corner, flipped onto all four; and a crest,
 * flipped onto the top and bottom edges. Written once and mirrored so a frame
 * can never disagree with itself edge to edge. See frames.ts.
 *
 * Both of its clocks are wall-clock, quantised to 12fps — the same trick the
 * opening's film is on, and the reason the line lays itself down in bites
 * rather than gliding.
 *
 * The drawing used to be a readout of scroll position, on the reasoning that a
 * pure function of the scroll answers a reversal with nothing to cancel. That
 * is true and it was still wrong: past the first project the track is
 * *detented*, so there is no slow approach to read from — one gesture sends
 * the target a whole project and `value` eases after it in a few hundred
 * milliseconds. The frame was drawing during that flight and was finished
 * before the piece had settled, so it was never seen being drawn at all.
 *
 * So Gallery.tsx says only whether the row has come to *rest* at this project
 * — not whether it is heading for it, which is a different thing and half a
 * move earlier — and the drawing is timed from there: a long attack once you
 * have landed, a quick release when you leave. It is still interruptible:
 * leaving halfway through retracts from wherever it had got to rather than
 * restarting, which was the part of the old approach worth keeping.
 */

interface ProjectFrameProps {
  /** Which project's frame to draw — an index into the row. */
  index: number
  /** Whether the visitor is standing at this project. The frame draws itself
   *  in while this is true and pulls back off while it is not; Gallery.tsx
   *  decides it, since it is the one that knows where the row is. */
  active: boolean
}

/** Seconds the frame takes to draw itself in once its project is stood at,
 *  and to pull back off once it isn't. Drawing is much the slower of the two:
 *  it is the thing you are meant to watch, while an exit is only clearing the
 *  way for the next one. */
const DRAW_IN = 3.2
const DRAW_OUT = 0.4

/** Wall-clock frames per second for the wobble. The opening runs its film at
 *  24; this is half that on purpose — a frame is a held drawing, not a moving
 *  picture, and at 24 the wobble reads as a shiver rather than as the line
 *  having been redrawn. */
const FPS = 12
/** How far the drawing may move between frames, in px, and how far it may
 *  turn, in degrees. Small, and smaller than they first were: the effect
 *  wanted is the same hand having drawn it again, and anything you can
 *  actually measure by eye reads as the page shaking instead. */
const JITTER_PX = 0.55
const JITTER_DEG = 0.09

const CORNERS = ['pf-c--tl', 'pf-c--tr', 'pf-c--br', 'pf-c--bl']
const CRESTS = ['pf-k--t', 'pf-k--b']

/** Strokes are drawn in order, each starting a little after the one before.
 *  `--pf-i` carries the position; ProjectFrame.css does the arithmetic. */
const stroke = (d: string, i: number) => (
  <path
    key={d}
    d={d}
    /* Normalised, so the dash pattern is written in fractions of the stroke's
       own length and nothing has to measure a path to animate it. */
    pathLength="1"
    strokeDasharray="1"
    style={{ '--pf-i': i } as CSSProperties}
  />
)

export default function ProjectFrame({ index, active }: ProjectFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const variant = frameFor(index)
  /* Read inside the loop rather than closed over, so changing it does not tear
     the loop down and restart it — which would drop the drawing back to zero
     every time the visitor moved. */
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let raf = 0
    let frame = -1
    let draw = 0
    const start = performance.now()
    let previous = start

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const next = Math.floor(((now - start) / 1000) * FPS)
      // Two or three display frames in a row are identical, which is what a
      // projected frame does — and what stops this costing style writes at
      // 120Hz for a wobble nobody can see at that rate.
      if (next === frame) return
      // Real elapsed time, not a fixed step, so a dropped frame costs the
      // drawing nothing; capped so a backgrounded tab coming back does not
      // finish the whole line in one bite.
      const step = Math.min(0.25, (now - previous) / 1000)
      previous = now
      frame = next

      /* Advanced at a steady rate rather than eased toward the target. A pen
         travels at roughly one speed, and an exponential — which is what the
         rest of the site moves on — would spend the whole back half of the
         drawing creeping through the last stroke and never quite close the
         frame. Still interruptible: leaving halfway retracts from where it had
         got to, it just retreats at the exit's own faster rate. */
      const target = activeRef.current ? 1 : 0
      draw =
        target > draw
          ? Math.min(target, draw + step / DRAW_IN)
          : Math.max(target, draw - step / DRAW_OUT)
      root.style.setProperty('--pf-draw', draw.toFixed(4))

      const r = () => Math.random() * 2 - 1
      root.style.setProperty('--pf-x', `${(r() * JITTER_PX).toFixed(2)}px`)
      root.style.setProperty('--pf-y', `${(r() * JITTER_PX).toFixed(2)}px`)
      root.style.setProperty('--pf-r', `${(r() * JITTER_DEG).toFixed(3)}deg`)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="pf"
      ref={rootRef}
      aria-hidden="true"
      style={
        {
          '--pf-reach': variant.reach,
          /* How many strokes there are to get through. ProjectFrame.css
             spreads their start times across the draw from it, so every
             variant finishes at exactly the same point however many lines it
             is made of — a fixed stagger would leave the nine-stroke ones
             still drawing at a project the visitor is already standing at. */
          '--pf-n': variant.corner.length + variant.crest.length
        } as CSSProperties
      }
    >
      {CORNERS.map((className) => (
        <svg key={className} className={`pf-c ${className}`} viewBox="0 0 160 160" fill="none">
          {variant.corner.map(stroke)}
        </svg>
      ))}
      {CRESTS.map((className) => (
        <svg key={className} className={`pf-k ${className}`} viewBox="0 0 160 56" fill="none">
          {/* Offset past the corners, so the crest is the last thing to
              arrive — the frame closes along the edges after its corners have
              been set down. */}
          {variant.crest.map((d, i) => stroke(d, i + variant.corner.length))}
        </svg>
      ))}
    </div>
  )
}
