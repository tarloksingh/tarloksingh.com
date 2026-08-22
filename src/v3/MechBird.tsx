import { useEffect, useRef, useState } from 'react'
import { BIRD_BODY, BIRD_WING_DOWN, BIRD_WING_UP } from '../site/frames'
import { sound } from './sound'
import { gaze } from './subject'

/* A bird crosses the readout, and you can shoot it.

   The drawing is v2's, down to the twelve-frame wingbeat — the same three
   paths off `site/frames.ts`, so there is one bird on this site and not two.
   What is different is everything around it: it does not perch, it does not
   care where the page's rails are, and it is a hit target. It comes in off
   one edge, crosses on a bowed path, and leaves by another; some seconds
   later it comes back on a different line.

   It is a `<button>` on purpose. The reticle already acquires anything that
   is one, so the lock brackets snap to the bird with no special case — the
   cursor was a targeting system before there was anything to shoot at.

   Desktop only, and only where there is a real pointer. */

/** The drawing is 44 × 30 in its own units. */
const SIZE = 38
const HEIGHT = (SIZE * 30) / 44

/** Seconds. How long the first crossing waits, how long a crossing takes, and
 *  how long the bird stays gone between them — a range each, so it never
 *  reads as being on a timer. A bird that was shot stays down longer. */
const FIRST = [5, 11]
const CROSS = [7.5, 13]
const GAP = [11, 24]
const DOWNED = [16, 30]

/** Seconds a hit takes to play out before the bird is gone. */
const FALL = 1.1

const rand = (a: number, b: number) => a + Math.random() * (b - a)

type Mode = 'away' | 'flying' | 'hit'

export default function MechBird() {
  const wrap = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('away')
  const [enabled, setEnabled] = useState(false)
  const hit = useRef<() => void>(() => {})

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setEnabled(true)

    /* One crossing: where it enters, where it leaves, and the control point
       that bows the line between them. Quadratic rather than straight because
       a bird that crosses a screen on a ruler is a paper aeroplane. */
    let from = { x: 0, y: 0 }
    let via = { x: 0, y: 0 }
    let to = { x: 0, y: 0 }
    let took = 0
    let at = 0
    let facing = 1

    // A hit freezes the flight and hands the bird to gravity.
    let fell = 0
    let drop = 0

    let raf = 0
    let previous = performance.now()
    let wait = rand(FIRST[0], FIRST[1])
    let phase: Mode = 'away'

    const enter = (next: Mode) => {
      phase = next
      gaze.bird.active = next !== 'away'
      setMode(next)
    }

    const launch = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const rightward = Math.random() < 0.5
      from = { x: rightward ? -SIZE * 2 : w + SIZE * 2, y: rand(h * 0.12, h * 0.7) }
      to = { x: rightward ? w + SIZE * 2 : -SIZE * 2, y: rand(h * 0.12, h * 0.7) }
      // Bowed off the midpoint, either way, by up to a fifth of the crossing.
      via = {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2 + rand(-0.2, 0.2) * h * (Math.random() < 0.5 ? 1 : -1)
      }
      took = rand(CROSS[0], CROSS[1])
      at = 0
      facing = rightward ? 1 : -1
      enter('flying')
    }

    const place = (x: number, y: number, roll: number) => {
      const el = wrap.current
      if (!el) return
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${roll}deg) scaleX(${facing})`
      // Published for the face to watch — see `gaze.ts`. A bird tumbling out
      // of the sky is still worth following, so this keeps running through a
      // hit and only stops once the bird is gone.
      gaze.bird.x = x
      gaze.bird.y = y
    }

    hit.current = () => {
      if (phase !== 'flying') return
      fell = 0
      drop = rand(-120, -40)
      sound.hit()
      enter('hit')
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      // Capped, so a tab coming back does not teleport the bird across.
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now

      if (phase === 'away') {
        wait -= dt
        if (wait <= 0) launch()
        return
      }

      if (phase === 'hit') {
        fell += dt
        drop += 1400 * dt
        const t = at
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * via.x + t * t * to.x
        const y =
          (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * via.y + t * t * to.y + drop * fell * 0.5
        place(x, y, facing * fell * 520)
        if (fell >= FALL) {
          wait = rand(DOWNED[0], DOWNED[1])
          enter('away')
        }
        return
      }

      at += dt / took
      if (at >= 1) {
        wait = rand(GAP[0], GAP[1])
        enter('away')
        return
      }

      const t = at
      const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * via.x + t * t * to.x
      const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * via.y + t * t * to.y
      // Nose follows the path: the derivative of the same curve, in degrees,
      // and damped so a steep bow does not stand the bird on its tail.
      const dx = 2 * (1 - t) * (via.x - from.x) + 2 * t * (to.x - via.x)
      const dy = 2 * (1 - t) * (via.y - from.y) + 2 * t * (to.y - via.y)
      place(x, y, facing * Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.45)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      gaze.bird.active = false
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!enabled) return null

  return (
    <div className="mech-sky" data-mode={mode} aria-hidden>
      <div className="mech-bird-wrap" ref={wrap}>
        <button
          className="mech-bird"
          style={{ width: SIZE, height: HEIGHT }}
          onPointerDown={() => hit.current()}
          tabIndex={-1}
        >
          <svg viewBox="0 0 44 30" fill="none" focusable="false">
            {BIRD_BODY.map((d) => (
              <path key={d} d={d} />
            ))}
            {BIRD_WING_UP.map((d) => (
              <path key={d} className="mech-wing-up" d={d} />
            ))}
            {BIRD_WING_DOWN.map((d) => (
              <path key={d} className="mech-wing-down" d={d} />
            ))}
          </svg>
          <span className="mech-burst" />
        </button>
      </div>
    </div>
  )
}
