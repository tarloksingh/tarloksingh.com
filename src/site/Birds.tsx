import { useEffect, useRef } from 'react'
import { BIRD_BODY, BIRD_SIT, BIRD_SIT_WING, BIRD_WING_DOWN, BIRD_WING_UP } from './frames'
import './Birds.css'

/* Birds on the page.
 *
 * Three of them, drawn in the same hand as the frames they land on. Each one
 * comes in off the edge of the window, settles on a horizontal rail somewhere
 * on screen, sits there — drawing itself as it lands, then shifting its
 * weight and shaking its wings out — and eventually leaves again, because it
 * has sat long enough, because the cursor came too close, or because someone
 * touched it. Off screen it waits a few seconds and comes back to a different
 * spot, so the flock is never twice in the same arrangement.
 *
 * One rAF loop for all three, writing transforms straight to the nodes. Three
 * birds is not a lot, but it is the same reasoning as everywhere else on this
 * site: React renders the elements once, and where they *are* is not state.
 *
 * What counts as a rail is a CSS selector the page hands in, and it is
 * resolved at the moment a bird chooses a perch rather than measured up
 * front. Both screens move what they are made of — the stage shrinks the vine
 * onto the parked mark as you scroll, a case study scrolls under a sticky bar
 * — and a bird that measured once would land where the rail used to be.
 */

/** How many. Three reads as "some birds"; two reads as a pair, and a pair is
 *  a composition — something arranged rather than something that happened. */
const COUNT = 3

/** The drawing's width on screen, in px, and the two numbers derived off it:
 *  the box is 44 x 30 in its own units and the feet stand on y = 28. Small
 *  enough to read as a bird noticed at the edge of a page rather than as an
 *  illustration of one; the stroke is thickened to match (see Birds.css), so
 *  going smaller made them darker rather than fainter. Written out to the
 *  stylesheet as `--bd-size`, so this is the only place it is stated. */
const SIZE = 28
const HEIGHT = (SIZE * 30) / 44
const FEET = (SIZE * 28) / 44

/** How close the cursor gets before a perched bird gives up on the spot. A
 *  little over a thumb's width — near enough that it reads as the bird having
 *  noticed you, far enough that you cannot herd them by accident while
 *  reaching for the menu. */
const STARTLE = 110

/** Seconds a bird will sit if nothing disturbs it, and seconds it waits off
 *  screen before coming back. Both are ranges, picked per trip: birds that
 *  come and go on the same clock read as a mechanism. */
const SIT = [7, 22]
const AWAY = [2.5, 9]

/** Px per second in the air, and the bounds on how long any one flight may
 *  take — a bird crossing a wide monitor should not take five seconds over
 *  it, and one hopping a short gap should not snap. */
const SPEED = 300
const FLIGHT = [1.1, 2.8]

/** Seconds between one fidget and the next while perched, and how long each
 *  of the two kinds lasts. Short, and short gaps: a bird that holds still for
 *  ten seconds at a time is a sticker of a bird. The durations have to agree
 *  with the animations in Birds.css — the attribute is what starts them, and
 *  it has to stay set for as long as they run. */
const FIDGET = [0.7, 2.9]
const FLAP_FOR = 0.44
const TURN_FOR = 0.9

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

type Mode = 'in' | 'perched' | 'out'
/** What a perched bird is doing this second: shaking its wings out, looking
 *  about, or nothing. */
type Fidget = '' | 'flap' | 'turn'

interface Bird {
  el: HTMLDivElement | null
  mode: Mode
  /** 0 to 1 along the current flight. */
  t: number
  dur: number
  fx: number
  fy: number
  tx: number
  ty: number
  /** The flight's control point — what makes it a swoop and not a ruler. */
  cx: number
  cy: number
  /** Seconds left of a sit, or of a wait off screen. */
  hold: number
  x: number
  y: number
  /** -1 when travelling left, so the drawing faces where it is going. */
  flip: number
  rot: number
  /** Seconds until the next fidget, what it is, and what is left of it. */
  next: number
  fidget: Fidget
  fidgetLeft: number
}

/** A point off the side of the window, at a height a bird might plausibly
 *  arrive from — never the very top or the very bottom of the screen. */
const offscreen = () => ({
  x: Math.random() < 0.5 ? -80 : window.innerWidth + 80,
  y: rand(window.innerHeight * 0.12, window.innerHeight * 0.72)
})

/** Everything matching the page's perch selector that a bird could actually
 *  stand on right now: wide enough to be a rail, on screen, and not faded
 *  out. That last one is what keeps birds off the stage's vine once it has
 *  been shrunk onto the parked mark — it is still in the document there, at
 *  zero opacity, and a bird standing on nothing is worse than no bird. */
const railsOn = (selector: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    const box = el.getBoundingClientRect()
    if (box.width < 90) return false
    if (box.bottom < HEIGHT * 2 || box.top > window.innerHeight - HEIGHT) return false
    return Number.parseFloat(getComputedStyle(el).opacity) > 0.2
  })

/** Somewhere to sit: a point along one of those elements' horizontal edges,
 *  held in from the ends where a frame's ornaments and a bar's own words are.
 *  Falls back to the window's own edges if nothing on the page qualifies, so
 *  a bird never has nowhere to go. */
const perch = (selector: string) => {
  const rails = railsOn(selector)
  const box = rails.length ? rails[Math.floor(Math.random() * rails.length)].getBoundingClientRect() : null
  const left = box ? box.left : window.innerWidth * 0.12
  const right = box ? box.right : window.innerWidth * 0.88
  const top = box ? box.top : window.innerHeight * 0.2
  const bottom = box ? box.bottom : window.innerHeight * 0.8
  const inset = Math.min(120, (right - left) * 0.22)
  /* Which edge. A box tall enough to have two distinct rails offers both —
     the vine around the name is one of those. A bar or a rule is a single
     line, and its top is the line you can see. Either way a rail with no room
     for a bird above it is not offered: a sticky header's own top edge is
     level with the window's, and a bird there would be half off the page. */
  const rail =
    bottom - top < 24
      ? top
      : top > HEIGHT * 1.6 && Math.random() < 0.55
        ? top
        : bottom
  return {
    x: rand(left + inset, right - inset) - SIZE / 2,
    // The rail is where the feet go, so the box sits above it by exactly the
    // distance from the top of the drawing down to the feet.
    y: rail - FEET
  }
}

/** Sets a bird on a course, and works out how long it should take and how
 *  far the swoop should bow. The control point is pushed off the straight
 *  line perpendicular to it, either side at random — which is the whole
 *  difference between a bird crossing a room and a paper plane. */
const launch = (bird: Bird, to: { x: number; y: number }, mode: Mode) => {
  bird.fx = bird.x
  bird.fy = bird.y
  bird.tx = to.x
  bird.ty = to.y
  const dx = to.x - bird.x
  const dy = to.y - bird.y
  const dist = Math.hypot(dx, dy) || 1
  bird.dur = Math.min(FLIGHT[1], Math.max(FLIGHT[0], dist / SPEED))
  const bow = dist * rand(0.12, 0.26) * (Math.random() < 0.5 ? 1 : -1)
  bird.cx = bird.x + dx / 2 - (dy / dist) * bow
  bird.cy = bird.y + dy / 2 + (dx / dist) * bow
  bird.t = 0
  bird.mode = mode
}

// Slow at both ends: a bird leaves a rail and arrives at one, it does not
// start and stop at cruising speed.
const smooth = (t: number) => t * t * (3 - 2 * t)

interface BirdsProps {
  /** A CSS selector for whatever on this page counts as a rail — the vine on
   *  the stage, the sticky bar on a case study. Several may be listed; a bird
   *  picks between whichever of them are on screen when it chooses a perch,
   *  so a page whose furniture scrolls past simply offers different rails as
   *  you go. */
  perch: string
  /** False while the page is not somewhere birds belong: everything perched
   *  takes off, and nothing new arrives until it is true again. */
  active: boolean
}

export default function Birds({ perch: selector, active }: BirdsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const birdsRef = useRef<Bird[]>([])
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = rootRef.current
    if (!root) return

    const birds = birdsRef.current
    // Staggered starts, so the three do not arrive in formation.
    birds.forEach((bird, i) => {
      const from = offscreen()
      bird.x = from.x
      bird.y = from.y
      bird.mode = 'out'
      bird.hold = 0.4 + i * rand(0.8, 2.2)
    })

    /* Mouse only. A touch that lands on a bird is a tap, handled below, and
       a touch that lands anywhere else should not scare one off the far side
       of the page — but a touchscreen reports its drags through the same
       event, so without this every scroll would clear the rails. */
    const pointer = { x: -9999, y: -9999 }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    /* And the tap itself. Only a perched bird answers — `.bd` takes its
       pointer events back in Birds.css for exactly as long as it is standing
       still — because a hit target crossing the window at three hundred
       pixels a second is not one anybody meant to press. */
    const releases = birds.map((bird) => {
      const el = bird.el
      if (!el) return () => {}
      const onTap = () => {
        if (bird.mode !== 'perched') return
        bird.fidget = ''
        launch(bird, offscreen(), 'out')
      }
      el.addEventListener('pointerdown', onTap)
      return () => el.removeEventListener('pointerdown', onTap)
    })

    let raf = 0
    let previous = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      // Capped: a tab coming back should not teleport the whole flock.
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now

      for (const bird of birds) {
        if (bird.mode === 'perched') {
          bird.hold -= dt
          const near =
            Math.hypot(pointer.x - (bird.x + SIZE / 2), pointer.y - (bird.y + HEIGHT / 2)) < STARTLE
          if (near || bird.hold <= 0 || !activeRef.current) {
            // Startled birds leave the way they were facing; bored ones pick
            // an edge. Either way it is a flight off the screen, not a hop.
            bird.fidget = ''
            launch(bird, offscreen(), 'out')
          } else if (bird.fidget) {
            bird.fidgetLeft -= dt
            // Cleared rather than left set, because setting the attribute is
            // what starts the animation: it has to go away before the same
            // fidget can happen twice in a row.
            if (bird.fidgetLeft <= 0) bird.fidget = ''
          } else {
            bird.next -= dt
            if (bird.next <= 0) {
              // Mostly wings. Looking about is the quieter of the two and
              // reads as punctuation between them.
              bird.fidget = Math.random() < 0.66 ? 'flap' : 'turn'
              bird.fidgetLeft = bird.fidget === 'flap' ? FLAP_FOR : TURN_FOR
              bird.next = bird.fidgetLeft + rand(FIDGET[0], FIDGET[1])
            }
          }
        } else if (bird.mode === 'out' && bird.t >= 1) {
          bird.hold -= dt
          if (bird.hold <= 0 && activeRef.current) {
            const from = offscreen()
            bird.x = from.x
            bird.y = from.y
            launch(bird, perch(selector), 'in')
          }
        }

        if (bird.mode !== 'perched' && bird.t < 1) {
          bird.t = Math.min(1, bird.t + dt / bird.dur)
          const t = smooth(bird.t)
          const u = 1 - t
          const x = u * u * bird.fx + 2 * u * t * bird.cx + t * t * bird.tx
          const y = u * u * bird.fy + 2 * u * t * bird.cy + t * t * bird.ty
          /* Which way it is pointing, off the curve's own tangent rather than
             off the straight line between the ends — on a swoop those are
             different, and a bird banking the wrong way through the middle of
             its own arc is the one thing that would give the whole effect
             away. Held well short of vertical: this is a drawing of a bird,
             not a physics toy. */
          const dx = 2 * u * (bird.cx - bird.fx) + 2 * t * (bird.tx - bird.cx)
          const dy = 2 * u * (bird.cy - bird.fy) + 2 * t * (bird.ty - bird.cy)
          bird.flip = dx < 0 ? -1 : 1
          bird.rot = Math.max(-22, Math.min(22, (Math.atan2(dy, Math.abs(dx) || 1) * 180) / Math.PI * 0.5))
          bird.x = x
          bird.y = y

          if (bird.t >= 1) {
            if (bird.mode === 'in') {
              bird.mode = 'perched'
              bird.hold = rand(SIT[0], SIT[1])
              bird.rot = 0
              // Not straight away: the perched pose is still drawing itself
              // on for the first quarter-second (see `.bd-sit path`).
              bird.next = rand(0.5, 1.6)
            } else {
              bird.hold = rand(AWAY[0], AWAY[1])
            }
          }
        }

        const el = bird.el
        if (!el) continue
        el.style.transform = `translate3d(${bird.x.toFixed(1)}px, ${bird.y.toFixed(1)}px, 0) rotate(${bird.rot.toFixed(1)}deg) scaleX(${bird.flip})`
        const mode = bird.mode === 'perched' ? 'perched' : 'flying'
        if (el.dataset.mode !== mode) el.dataset.mode = mode
        if (el.dataset.fidget !== bird.fidget) el.dataset.fidget = bird.fidget
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      releases.forEach((release) => release())
    }
  }, [selector])

  return (
    <div
      className="bd-flock"
      ref={rootRef}
      data-on={active ? 'true' : undefined}
      aria-hidden="true"
      style={{ ['--bd-size' as string]: `${SIZE}px` }}
    >
      {Array.from({ length: COUNT }, (_, i) => (
        <div
          key={i}
          className="bd"
          data-mode="flying"
          ref={(el) => {
            const list = birdsRef.current
            if (!list[i]) {
              list[i] = {
                el,
                mode: 'out',
                t: 1,
                dur: 1,
                fx: 0,
                fy: 0,
                tx: 0,
                ty: 0,
                cx: 0,
                cy: 0,
                hold: 0,
                x: -200,
                y: -200,
                flip: 1,
                rot: 0,
                next: 0,
                fidget: '',
                fidgetLeft: 0
              }
            } else {
              list[i].el = el
            }
          }}
        >
          {/* Two poses in one box, cross-faded by `data-mode` — the flying
              one is always drawn, and the perched one writes itself on as the
              bird settles. See Birds.css. */}
          <svg className="bd-art" viewBox="0 0 44 30" fill="none" focusable="false">
            <g className="bd-fly">
              {BIRD_BODY.map((d) => (
                <path key={d} d={d} />
              ))}
              {BIRD_WING_UP.map((d) => (
                <path key={d} className="bd-wing-up" d={d} />
              ))}
              {BIRD_WING_DOWN.map((d) => (
                <path key={d} className="bd-wing-down" d={d} />
              ))}
            </g>
            <g className="bd-sit">
              {BIRD_SIT.map((d, s) => (
                <path
                  key={d}
                  className={s === BIRD_SIT_WING ? 'bd-sit-wing' : undefined}
                  d={d}
                  pathLength="1"
                  strokeDasharray="1"
                  style={{ ['--sp-i' as string]: s }}
                />
              ))}
            </g>
          </svg>
        </div>
      ))}
    </div>
  )
}
