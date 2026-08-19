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
 * Three drawings, shown twelve times: a corner, flipped onto all four; a
 * crest, flipped onto the top and bottom edges; and a rail, the plain run of
 * line between one ornament and the next, on all six stretches of edge that
 * have one. Written once and mirrored so a frame can never disagree with
 * itself edge to edge. See frames.ts.
 *
 * The rails are the reason it is a frame rather than four decorations near a
 * picture. The ornaments are square and drawn at a fixed size, so on a wide
 * window they cannot reach each other however large they are set; the rails
 * are the part that stretches, and they take whatever is left over on each
 * edge after the ornaments have had their room. `--pf-corner` is solved from
 * the box itself rather than from the viewport, so the proportion holds on a
 * phone and on a monitor.
 *
 * Both of its clocks are wall-clock, quantised to 12fps — the same trick the
 * opening's film is on, and the reason the line lays itself down in bites
 * rather than gliding. On that same clock every stroke is *redrawn*: its
 * coordinates are nudged, and a second, looser copy of it is nudged further,
 * so where the two lie together the line reads heavy and where they part it
 * reads light. That is the whole of the thick-and-thin — no stroke is ever
 * two widths at once, but a pair of them at twelve a second is a line with a
 * pen's pressure in it, and it never stops moving.
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

/** Wall-clock frames per second for the hand. The opening runs its film at
 *  24; this is half that on purpose — a frame is a held drawing, not a moving
 *  picture, and at 24 the redrawing reads as a shiver rather than as the line
 *  having been put down again. */
const FPS = 12
/** How far the whole drawing may drift between frames, in px, and how far it
 *  may turn, in degrees. Small, and smaller than they first were: the effect
 *  wanted is the same hand having drawn it again, and anything you can
 *  actually measure by eye reads as the page shaking instead. */
const JITTER_PX = 0.55
const JITTER_DEG = 0.09
/** How far a coordinate may move when a stroke is redrawn, in the ornament's
 *  own units (its box is 160 of them across) — and how much further the loose
 *  second copy of that stroke may go. The gap between the two is what the
 *  line's weight is made of, so the second number is the one that decides how
 *  much pressure the pen appears to have. */
const INK_WOBBLE = 0.7
const GHOST_WOBBLE = 2.1

/** The corner is a fixed square; the crest is drawn this many times its width,
 *  which is what leaves the ornaments in proportion to each other however the
 *  window is shaped. */
const CREST_SCALE = 1.6
/** The ornaments' share of the box: the corner is the smaller of these two
 *  fractions of it, so a wide window grows the ornament off its height and a
 *  tall one off its width, and there is always some edge left over for a rail
 *  to run along. */
const CORNER_OF_W = 0.24
const CORNER_OF_H = 0.4

const CORNERS = ['pf-c--tl', 'pf-c--tr', 'pf-c--br', 'pf-c--bl']
const CRESTS = ['pf-k--t', 'pf-k--b']
/** The four half-edges the crest leaves either side of it, and the two whole
 *  ones down the sides. */
const RAILS_H = ['pf-r--tl', 'pf-r--tr', 'pf-r--bl', 'pf-r--br']
const RAILS_V = ['pf-r--l', 'pf-r--r']

/* A rail is a run of line at one arm's height, bowed by a hair so that it is
   still something a hand did. Generated rather than authored: it carries no
   ornament, and one per variant per edge would be six copies of the same
   straight line to keep in agreement with the corner it leaves.

   Their boxes are 100 units along the edge — stretched to whatever room is
   left, since the length is the whole point — and 32 across, which is the
   corner's own scale, so an arm at y=8 and its rail at y=8 are on one line. */
const railH = (y: number) => `M0 ${y} C33 ${y - 0.5} 67 ${y + 0.5} 100 ${y}`
const railV = (y: number) => `M${y} 0 C${y - 0.5} 33 ${y + 0.5} 67 ${y} 100`

/** Every coordinate in a path, moved. `d` is only ever M/L/C here, so the
 *  numbers are strictly x, y pairs and no command needs to be understood —
 *  which is what keeps this a few lines rather than a path parser. The two
 *  amplitudes are separate because a rail's box is stretched along the edge
 *  and square across it: moving it along its own length by a unit is a dozen
 *  pixels, and across it is one. */
const redraw = (d: string, ax: number, ay: number) => {
  let even = true
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
    const amp = even ? ax : ay
    even = !even
    return (parseFloat(n) + (Math.random() * 2 - 1) * amp).toFixed(2)
  })
}

/** Strokes are drawn in order, each starting a little after the one before.
 *  `--pf-i` carries the position; ProjectFrame.css does the arithmetic.
 *
 *  Two paths, not one: the same line laid down twice, and redrawn apart every
 *  frame. See the note at the top of the file. */
const stroke = (d: string, i: number) => {
  const style = { '--pf-i': i } as CSSProperties
  return (
    <g key={d}>
      {/* Normalised, so the dash pattern is written in fractions of the
          stroke's own length and nothing has to measure a path to animate
          it. */}
      <path className="pf-ink" d={d} pathLength="1" strokeDasharray="1" style={style} />
      <path className="pf-ghost" d={d} pathLength="1" strokeDasharray="1" style={style} />
    </g>
  )
}

export default function ProjectFrame({ index, active }: ProjectFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const variant = frameFor(index)
  /* Read inside the loop rather than closed over, so changing it does not tear
     the loop down and restart it — which would drop the drawing back to zero
     every time the visitor moved. */
  const activeRef = useRef(active)
  activeRef.current = active

  /* The ornaments are sized off the box they are drawn around, not off the
     viewport: `vmin` is the window's short edge, which on a wide monitor is
     its height, and an ornament sized off the height of a landscape window is
     a sixth of the way along the top of it. Measured here rather than in the
     stylesheet because the two candidate sizes are fractions of *different*
     axes, and `min()` of a width percentage and a height percentage is not
     something CSS can be asked for. */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const size = () => {
      const { width, height } = root.getBoundingClientRect()
      const corner = Math.min(width * CORNER_OF_W, height * CORNER_OF_H) * variant.reach
      root.style.setProperty('--pf-corner', `${corner.toFixed(1)}px`)
      root.style.setProperty('--pf-crest', `${(corner * CREST_SCALE).toFixed(1)}px`)
    }
    size()
    const observer = new ResizeObserver(size)
    observer.observe(root)
    return () => observer.disconnect()
  }, [variant.reach])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    /* Every stroke on the frame, with the line it was drawn from and how far
       each of its two axes may be moved when it is drawn again. A rail is
       stretched along its length, so it is only ever moved across itself. */
    const inks = Array.from(root.querySelectorAll<SVGPathElement>('path')).map((el) => {
      const d = el.getAttribute('d') ?? ''
      const wobble = el.classList.contains('pf-ghost') ? GHOST_WOBBLE : INK_WOBBLE
      const rail = el.closest('.pf-r')
      const along = rail ? 0 : wobble
      const across = wobble
      const vertical = !!rail?.classList.contains('pf-r--v')
      return { el, d, ax: vertical ? across : along, ay: vertical ? along : across }
    })

    let raf = 0
    let frame = -1
    let draw = 0
    /** Whether the strokes are currently sitting on their redrawn coordinates,
     *  so the originals are put back exactly once on the way out rather than
     *  every frame the frame is not on screen. */
    let inked = false
    const start = performance.now()
    let previous = start

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const next = Math.floor(((now - start) / 1000) * FPS)
      // Two or three display frames in a row are identical, which is what a
      // projected frame does — and what stops this costing style writes at
      // 120Hz for a movement nobody can see at that rate.
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

      /* The hand, and the only expensive thing here — so it is only paid for
         while there is something on screen to redraw. Every other frame on the
         row is at `draw: 0` and writes nothing. */
      if (still) return
      if (draw < 0.002) {
        if (!inked) return
        inked = false
        for (const ink of inks) ink.el.setAttribute('d', ink.d)
        return
      }
      inked = true
      for (const ink of inks) ink.el.setAttribute('d', redraw(ink.d, ink.ax, ink.ay))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* The order the frame assembles in: the corners are set down, the rails run
     out from them, and the crest closes the middle of each edge last. */
  const railAt = variant.corner.length
  const crestAt = railAt + variant.rails.length

  return (
    <div
      className="pf"
      ref={rootRef}
      aria-hidden="true"
      style={
        {
          /* How many strokes there are to get through. ProjectFrame.css
             spreads their start times across the draw from it, so every
             variant finishes at exactly the same point however many lines it
             is made of — a fixed stagger would leave the nine-stroke ones
             still drawing at a project the visitor is already standing at. */
          '--pf-n': crestAt + variant.crest.length,
          /* Where the edge line runs, in each ornament's own units, so the
             crest can be hung on it — see `.pf-k` in ProjectFrame.css. */
          '--pf-arm': variant.rails[0],
          '--pf-crest-arm': variant.crestArm
        } as CSSProperties
      }
    >
      {CORNERS.map((className) => (
        <svg key={className} className={`pf-c ${className}`} viewBox="0 0 160 160" fill="none">
          {variant.corner.map(stroke)}
        </svg>
      ))}
      {/* Stretched, not scaled: `preserveAspectRatio="none"` is what lets one
          run of line fill an edge of any length, and `non-scaling-stroke` on
          the path is what keeps it the same weight as everything else while it
          does. The box around each is a plain element rather than the drawing
          itself: an absolutely positioned *replaced* element takes its own
          intrinsic width, so an svg pinned by `left` and `right` would ignore
          one of them and come out the size of its viewBox. */}
      {RAILS_H.map((className) => (
        <div key={className} className={`pf-r pf-r--h ${className}`}>
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" fill="none">
            {variant.rails.map((y, i) => stroke(railH(y), i + railAt))}
          </svg>
        </div>
      ))}
      {RAILS_V.map((className) => (
        <div key={className} className={`pf-r pf-r--v ${className}`}>
          <svg viewBox="0 0 32 100" preserveAspectRatio="none" fill="none">
            {variant.rails.map((y, i) => stroke(railV(y), i + railAt))}
          </svg>
        </div>
      ))}
      {CRESTS.map((className) => (
        <svg key={className} className={`pf-k ${className}`} viewBox="0 0 160 56" fill="none">
          {variant.crest.map((d, i) => stroke(d, i + crestAt))}
        </svg>
      ))}
    </div>
  )
}
