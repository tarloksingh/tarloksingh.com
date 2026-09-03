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
 *  come and go on the same clock read as a mechanism. A bird that left
 *  because the page moved under it waits the longer time — it was not bored,
 *  it was startled, and coming straight back turns being spooked into a
 *  shuttle service. */
const SIT = [7, 22]
const AWAY = [2.5, 9]
const SPOOKED = [5, 13]

/** Seconds of a genuinely still page before anything lands. Scrolling is not
 *  one gesture but a run of them with pauses in it, and without this the flock
 *  spends the whole run diving at the page every time your finger stops. */
const SETTLE = 1.2

/** How far a bird holds off the last place it stood, and off wherever another
 *  bird is standing. The first is why the flock never lands twice in the same
 *  arrangement; the second is why two of them never end up drawn on top of
 *  each other. Both in px, against a drawing `SIZE` wide. */
const NOT_AGAIN = SIZE * 2.2
const ELBOW = SIZE * 1.5

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
const FIDGET = [0.4, 1.9]
const FLAP_FOR = 0.5
const TURN_FOR = 0.833

/** How often a bird's position is painted while it is in the air: twice for
 *  every frame it is drawn on.
 *
 *  The wings and the fidgets stay at twelve — `--bd-frame` in Birds.css, the
 *  rate everything else drawn on this site moves at. Travel is the one thing
 *  that wants more. A wingbeat is two poses and the eye filling in the rest,
 *  so stepping it is what makes it read as a wingbeat at all; a body crossing
 *  the window is not a sequence of poses but one thing going somewhere, and
 *  at twelve the going somewhere comes apart into a stutter. Twenty-four is
 *  the old answer to exactly this: hold the drawing at twelve and move it on
 *  every frame. */
const FRAME = 1 / 24

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
  /** Where it last stood, so it does not stand there again. */
  wasX: number
  wasY: number
  /** How long to stay away, decided at the moment it leaves — which is the
   *  only moment it is still known whether it was bored or startled. */
  awayFor: number
}

/** One place a bird could stand: a point on a line somebody can actually see.
 *  `y` is the line itself, not the box around it. */
interface Rail {
  left: number
  right: number
  y: number
}

/** A point off the side of the window, at a height a bird might plausibly
 *  arrive from — never the very top or the very bottom of the screen. */
const offscreen = () => ({
  x: Math.random() < 0.5 ? -80 : window.innerWidth + 80,
  y: rand(window.innerHeight * 0.12, window.innerHeight * 0.72)
})

/** Everything an ancestor chain does to an element's opacity. A bird must not
 *  stand on the stage's vine once it has been shrunk onto the parked mark, and
 *  what is faded there is the vine's own box — the rails inside it still read
 *  as fully opaque if you only ask them. */
const shows = (el: HTMLElement) => {
  let seen = 1
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    seen *= Number.parseFloat(getComputedStyle(node).opacity) || 0
    if (seen < 0.2) return false
  }
  return seen >= 0.2
}

/* Where the line somebody can actually see is.
 *
 * This is the whole difference between a bird standing on something and a
 * bird hovering near it, and none of the three kinds of rule on this site
 * puts its line at the edge of its own box:
 *
 *  - the frames draw theirs as a path inside a stretched svg, nine px down
 *    from the top of the box on the top rail and twenty-two up from the
 *    bottom of it on the bottom one;
 *  - the footer's scrub rules are two px of background inside nine px of
 *    padding, so that a hairline can still be pressed;
 *  - a case study's rules are ordinary `border-top`s.
 *
 * So each is measured for what it paints rather than for how big it is. */
const railsOf = (el: HTMLElement): Rail[] => {
  const box = el.getBoundingClientRect()
  if (box.width < 90) return []

  /* A frame's rail: one stretched svg per edge, one path per line in it.
     `preserveAspectRatio="none"`, so the viewBox maps straight onto the box
     and the path's own bounding box says where the line landed. */
  const svg = el.querySelector('svg')
  const view = svg?.viewBox.baseVal
  if (svg && view && view.height > 0) {
    const rails: Rail[] = []
    svg.querySelectorAll<SVGPathElement>('path').forEach((path) => {
      let bounds: DOMRect
      try {
        bounds = path.getBBox()
      } catch {
        return
      }
      if (bounds.height > view.height * 0.4) return
      rails.push({
        left: box.left,
        right: box.right,
        y: box.top + ((bounds.y + bounds.height / 2) / view.height) * box.height
      })
    })
    return rails
  }

  const style = getComputedStyle(el)
  const border = Number.parseFloat(style.borderTopWidth) || 0
  if (border > 0) return [{ left: box.left, right: box.right, y: box.top + border / 2 }]

  // Whatever is painted in the content box, if that is thin enough to be a
  // line rather than a panel.
  const top = box.top + border + (Number.parseFloat(style.paddingTop) || 0)
  const height = el.clientHeight - (Number.parseFloat(style.paddingTop) || 0) - (Number.parseFloat(style.paddingBottom) || 0)
  if (height > 0 && height <= 6) return [{ left: box.left, right: box.right, y: top + height / 2 }]
  return []
}

/** Every line on the page right now that a bird could get to: painted, on
 *  screen, and with room above it for a bird to stand without hanging off the
 *  top of the window. */
const railsOn = (selector: string): Rail[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector))
    .filter(shows)
    .flatMap(railsOf)
    .filter((rail) => rail.y > HEIGHT * 1.6 && rail.y < window.innerHeight - 8)

/** Somewhere to sit, held in from the ends of the line where a frame's
 *  ornaments and a bar's own words are.
 *
 *  Tried a dozen times over, because where a bird lands is only half the
 *  question and the other half is where it is *not* landing: not where this
 *  bird just was, and not on top of one of the others. A run of tries rather
 *  than arithmetic that solves for a gap, because the answer depends on how
 *  many rails the page is offering and how crowded they already are, and
 *  twelve throws at it is both shorter and better behaved than the closed
 *  form. If all twelve are refused the last one stands: a bird landing
 *  somewhere imperfect beats a bird that never comes back. */
const perch = (selector: string, bird: Bird, flock: Bird[]) => {
  const rails = railsOn(selector)
  let spot = { x: 0, y: 0 }

  for (let attempt = 0; attempt < 12; attempt++) {
    if (rails.length) {
      const rail = rails[Math.floor(Math.random() * rails.length)]
      const inset = Math.min(120, (rail.right - rail.left) * 0.22)
      spot = {
        x: rand(rail.left + inset, rail.right - inset) - SIZE / 2,
        // The line is where the feet go, so the box stands above it by
        // exactly the distance from the top of the drawing down to the feet.
        y: rail.y - FEET
      }
    } else {
      // Nothing on the page qualifies — mid-transition, most likely. A bird
      // still needs somewhere to be.
      spot = {
        x: rand(window.innerWidth * 0.12, window.innerWidth * 0.88) - SIZE / 2,
        y: window.innerHeight * 0.3 - FEET
      }
    }

    const sameSpot = Math.abs(spot.x - bird.wasX) < NOT_AGAIN && Math.abs(spot.y - bird.wasY) < HEIGHT
    if (sameSpot) continue
    // Only birds on the same line can collide; one standing on the rail above
    // is not in the way however close it looks in x.
    const crowded = flock.some(
      (other) =>
        other !== bird &&
        other.mode !== 'out' &&
        Math.abs(spot.y - other.ty) < HEIGHT &&
        Math.abs(spot.x - other.tx) < ELBOW
    )
    if (!crowded) break
  }

  return spot
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
  /** A CSS selector for whatever on this page carries a line — the stage's
   *  frame rails and its footer rules, a case study's section rules. Several
   *  may be listed; a bird picks between whichever of them are on screen when
   *  it chooses a perch, so a page whose furniture scrolls past simply offers
   *  different rails as you go. What matters is that every one of them paints
   *  a line: `railsOf` measures the line, not the element. */
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

    /* Anything that moves the page. A bird stands on a line, so the moment
       that line goes anywhere — a case study scrolling, the drum turning to
       the next project, the vine shrinking onto the parked mark as you leave
       the name — the bird is standing on nothing and has to go.

       Read as gestures rather than as motion, because the stage does not
       scroll: it is a fixed screen driven by the wheel, so watching for the
       document to move would miss every one of those. Four events cover every
       way this site is got through, and `scroll` is captured so that a pane
       scrolling inside the page counts as well as the document.

       This is also the clock birds come back on. `still` has to run past
       `SETTLE` before anything lands, so a run of flicks with pauses in it
       reads as one movement rather than as a dozen invitations to land. */
    let still = 0
    const stir = () => {
      still = 0
    }
    window.addEventListener('wheel', stir, { passive: true })
    window.addEventListener('touchmove', stir, { passive: true })
    window.addEventListener('keydown', stir)
    window.addEventListener('scroll', stir, { passive: true, capture: true })

    /* And the tap itself. Only a perched bird answers — `.bd` takes its
       pointer events back in Birds.css for exactly as long as it is standing
       still — because a hit target crossing the window at three hundred
       pixels a second is not one anybody meant to press. */
    const releases = birds.map((bird) => {
      const el = bird.el
      if (!el) return () => {}
      const onTap = () => {
        if (bird.mode !== 'perched') return
        bird.wasX = bird.x
        bird.wasY = bird.y
        bird.fidget = ''
        bird.awayFor = rand(SPOOKED[0], SPOOKED[1])
        launch(bird, offscreen(), 'out')
      }
      el.addEventListener('pointerdown', onTap)
      return () => el.removeEventListener('pointerdown', onTap)
    })

    let raf = 0
    let previous = performance.now()
    let paint = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      // Capped: a tab coming back should not teleport the whole flock.
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      still += dt

      /* Whether anything gets drawn this time round.
       *
       * The flight itself is worked out every frame the display offers, so
       * that the timing of a landing is exact and the swoop is computed off
       * real elapsed time rather than off a frame count. What is *painted* is
       * `FRAME` apart, because a bird whose wings cut on a clock while its
       * body slides along at whatever the display happens to run at is two
       * different drawings at once — and the sliding one wins, which is why
       * it read as smooth however the wings were stepped.
       *
       * The pose goes with the position, in the same block: they have to agree
       * about which frame this is, or a bird arrives in its perched drawing an
       * eighth of a second before it arrives on the rail. */
      paint += dt
      const draw = paint >= FRAME
      if (draw) paint %= FRAME

      for (const bird of birds) {
        if (bird.mode === 'perched') {
          bird.hold -= dt
          const near =
            Math.hypot(pointer.x - (bird.x + SIZE / 2), pointer.y - (bird.y + HEIGHT / 2)) < STARTLE
          const moved = still < dt * 1.5
          if (near || moved || bird.hold <= 0 || !activeRef.current) {
            // Startled birds leave the way they were facing; bored ones pick
            // an edge. Either way it is a flight off the screen, not a hop.
            bird.wasX = bird.x
            bird.wasY = bird.y
            bird.fidget = ''
            launch(bird, offscreen(), 'out')
            // Decided on the way out rather than on arrival, because only
            // here is it still known *why* the bird left.
            const spooked = moved || near
            bird.awayFor = spooked ? rand(SPOOKED[0], SPOOKED[1]) : rand(AWAY[0], AWAY[1])
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
          // Its own wait *and* a page that has stopped moving. Either alone
          // lands birds on a line that is about to slide out from under them.
          if (bird.hold <= 0 && still > SETTLE && activeRef.current) {
            const from = offscreen()
            bird.x = from.x
            bird.y = from.y
            launch(bird, perch(selector, bird, birds), 'in')
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
              bird.hold = bird.awayFor
            }
          }
        }

        const el = bird.el
        if (!el || !draw) continue
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
      window.removeEventListener('wheel', stir)
      window.removeEventListener('touchmove', stir)
      window.removeEventListener('keydown', stir)
      window.removeEventListener('scroll', stir, { capture: true })
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
                fidgetLeft: 0,
                wasX: -9999,
                wasY: -9999,
                awayFor: 0
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
