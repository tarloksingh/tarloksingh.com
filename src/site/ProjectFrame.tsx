import { useEffect, useRef } from 'react'
import { frameFor } from './frames'
import './ProjectFrame.css'

/* The frame drawn around whatever the room is standing in front of.
 *
 * Four corners rather than a border: a closed rectangle around a piece reads
 * as a card, and this is meant to read as something pencilled around the
 * exhibit — which is what the corners alone do, because the eye closes the
 * rectangle itself and the drawing gets to stay sparse.
 *
 * One drawing, shown four times. The variant is written for the top-left
 * corner and the other three are the same paths flipped on one or both axes,
 * so a frame can never disagree with itself corner to corner. See frames.ts.
 *
 * It runs on two clocks that are deliberately not the same one:
 *
 *   - **Drawing** is scroll position. `settle` is 1 when the row is parked on
 *     a project and 0 halfway between two, so the frame draws itself in as a
 *     piece arrives and pulls back off as it leaves, and — being a readout of
 *     where the scroll actually is, not an animation fired at it — it answers the
 *     wheel both ways without anything to cancel or catch up.
 *   - **Jitter** is wall-clock, quantised to 12fps, the same trick the
 *     opening's film is on. It has to be its own rAF: it is at its most
 *     visible when the visitor is doing nothing, which is exactly when the
 *     scroll engine has stopped ticking and there are no frames to hang it on.
 */

interface ProjectFrameProps {
  /** Which project's frame to draw — an index into the row. */
  index: number
}

/** Wall-clock frames per second for the wobble. The opening runs its film at
 *  24; this is half that on purpose — a frame is a held drawing, not a moving
 *  picture, and at 24 the wobble reads as a shiver rather than as the line
 *  having been redrawn. */
const FPS = 12
/** How far the drawing is allowed to move between frames, in px, and how far
 *  it may turn, in degrees. Small: this is meant to look like the same hand
 *  drew it again, not like the page is shaking. */
const JITTER_PX = 1.6
const JITTER_DEG = 0.28

const CORNERS = [
  { className: 'pf-c pf-c--tl' },
  { className: 'pf-c pf-c--tr' },
  { className: 'pf-c pf-c--br' },
  { className: 'pf-c pf-c--bl' }
]

export default function ProjectFrame({ index }: ProjectFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const variant = frameFor(index)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let raf = 0
    let frame = -1
    const start = performance.now()

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const next = Math.floor(((performance.now() - start) / 1000) * FPS)
      // Two or three display frames in a row are identical, which is what a
      // projected frame does — and what stops this costing a style write at
      // 120Hz for a wobble nobody can see at that rate.
      if (next === frame) return
      frame = next
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
      style={{ '--pf-reach': variant.reach } as React.CSSProperties}
    >
      {CORNERS.map((corner) => (
        <svg key={corner.className} className={corner.className} viewBox="0 0 100 100" fill="none">
          {variant.strokes.map((d, i) => (
            <path
              key={d}
              d={d}
              /* Normalised, so the dash pattern is written in fractions of the
                 stroke's own length and nothing has to measure a path to
                 animate it. */
              pathLength="1"
              strokeDasharray="1"
              /* Each stroke starts a little after the one before it and takes
                 a little longer, so the ornament assembles rather than
                 unrolling as one line. Held in a variable so the whole set can
                 be driven from `--pf-draw` alone. */
              style={{ '--pf-i': i } as React.CSSProperties}
            />
          ))}
        </svg>
      ))}
    </div>
  )
}
