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
 * It runs on two clocks that are deliberately not the same one:
 *
 *   - **Drawing** is scroll position. Gallery.tsx writes `--pf-draw` from how
 *     far this project is from the front of the room, so the frame draws
 *     itself in as its piece arrives and pulls back off as it leaves — and,
 *     being a readout of where the scroll actually is rather than an animation
 *     fired at it, it answers a reversal immediately with nothing to cancel.
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
