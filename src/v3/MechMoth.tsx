import { memo, useEffect, useRef, useState } from 'react'
import { kills } from './kills'
import { sound } from './sound'
import { quarry, type Creature } from './subject'

/* The second animal, and deliberately not a second bird.

   The bird is a clean thing: it enters at one edge, crosses on a bezier, and
   leaves at the other. You lead it and you hit it. Reskinning that with
   different wings would be a recolour, so this one is built around the other
   half of hunting — the part where something is already there and you have
   not noticed it.

   A moth settles somewhere on the panel and sits still, dim, with its wings
   shut. It is a shape you could easily read as another mark on the readout.
   Bring the reticle near it and it *startles*: it bursts off its perch and
   flies a jittery, unpredictable path — no arc to lead, no constant speed,
   just a thing panicking across the screen — until it is off the edge, and
   then some seconds later there is another one somewhere else.

   Which makes the two animals two different problems. The bird is a timing
   shot at something that has not seen you. The moth is a snap shot at
   something that has, and it is much harder, which is the point.

   Same plumbing as the bird: it registers itself in `quarry.creatures`, it
   knows nothing about the gun, and a hit goes through `kills.add()`. Same
   `pointer: fine` gate too — startling something with a cursor requires a
   cursor. See PLAN.md on why touch is still open. */

const rand = (min: number, max: number) => min + Math.random() * (max - min)

const SIZE = 26
/** How near the reticle has to come, in pixels, before it bolts. */
const STARTLE = 120
/** Seconds it flies for before it is gone off an edge. */
const FLIGHT = [2.6, 4.2] as const
/** Seconds between one going and the next settling, and after one is hit. */
const GAP = [7, 16] as const
const DOWNED = [4, 9] as const
/** Seconds it falls for once it is hit. */
const FALL = 0.9

/** Pixels a second at a panic. Fast, and it does not hold this — the whole
 *  path is a random walk with a drift on it, so the speed is what it has
 *  *this* moment rather than a constant to lead. */
const DASH = [340, 620] as const

/** How far in from the window's edges a moth will settle. It should be on the
 *  panel, not tucked under the chrome at the very edge where nothing would
 *  find it. */
const INSET = 0.14

type Phase = 'perched' | 'flying' | 'hit' | 'away'

function MechMoth() {
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)
  const [mode, setMode] = useState<Phase>('away')
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    let phase: Phase = 'away'
    let wait = rand(1.2, 3)
    const at = { x: 0, y: 0 }
    /** Where it is heading this instant. Re-rolled constantly while flying,
     *  which is the whole of the erratic. */
    const to = { x: 0, y: 0 }
    let speed = 0
    let flown = 0
    let flight = 0
    let fell = 0
    let drop = 0
    let raf = 0
    let previous = performance.now()
    const pointer = { x: -9999, y: -9999 }

    const enter = (next: Phase) => {
      phase = next
      setMode(next)
    }

    const settle = () => {
      at.x = rand(INSET, 1 - INSET) * window.innerWidth
      at.y = rand(INSET, 1 - INSET) * window.innerHeight
      place(0)
      enter('perched')
    }

    /** A fresh heading, biased away from wherever the pointer is — a startled
     *  thing goes away from what startled it, and then keeps changing its
     *  mind. */
    const veer = () => {
      const away = Math.atan2(at.y - pointer.y, at.x - pointer.x)
      const angle = away + rand(-1.5, 1.5)
      const reach = rand(160, 420)
      to.x = at.x + Math.cos(angle) * reach
      to.y = at.y + Math.sin(angle) * reach
      speed = rand(DASH[0], DASH[1])
    }

    const place = (tilt: number) => {
      const el = wrap.current
      if (!el) return
      el.style.transform = `translate3d(${at.x - SIZE / 2}px, ${at.y - SIZE / 2}px, 0) rotate(${tilt}deg)`
    }

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    window.addEventListener('pointermove', onMove)

    const self: Creature = {
      at: () => (phase === 'perched' || phase === 'flying' ? { x: at.x, y: at.y } : null),
      hit: () => {
        if (phase !== 'perched' && phase !== 'flying') return false
        fell = 0
        drop = rand(-60, 20)
        sound.hit()
        kills.add()
        enter('hit')
        return true
      }
    }
    quarry.creatures.add(self)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now

      if (phase === 'away') {
        wait -= dt
        if (wait <= 0) settle()
        return
      }

      if (phase === 'perched') {
        // The one thing it does while sitting: notice you.
        if (Math.hypot(pointer.x - at.x, pointer.y - at.y) <= STARTLE) {
          flown = 0
          flight = rand(FLIGHT[0], FLIGHT[1])
          veer()
          enter('flying')
        }
        return
      }

      if (phase === 'hit') {
        fell += dt
        drop += 1100 * dt
        at.y += drop * dt
        at.x += Math.sin(fell * 22) * 60 * dt
        place(fell * 420)
        if (fell >= FALL) {
          wait = rand(DOWNED[0], DOWNED[1])
          enter('away')
        }
        return
      }

      // Flying. A step toward the current heading, and a new heading often
      // enough that there is never a line to read off it.
      flown += dt
      const dx = to.x - at.x
      const dy = to.y - at.y
      const distance = Math.hypot(dx, dy) || 1
      at.x += (dx / distance) * speed * dt
      at.y += (dy / distance) * speed * dt
      place(Math.sin(flown * 26) * 16)

      const gone =
        at.x < -SIZE * 2 || at.x > window.innerWidth + SIZE * 2 || at.y < -SIZE * 2 || at.y > window.innerHeight + SIZE * 2

      if (gone || flown >= flight) {
        wait = rand(GAP[0], GAP[1])
        enter('away')
        return
      }

      if (distance < 40) veer()
    }

    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      quarry.creatures.delete(self)
      cancelAnimationFrame(raf)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="mech-moths" data-mode={mode} aria-hidden>
      <div className="mech-moth-wrap" ref={wrap}>
        {/* Two wings and a body, at the same weight of line as the bird and
            the reticle. Shut when it is perched, beating when it is not —
            one stepped animation, the same twelve-frames-a-second everything
            drawn by hand on this site runs at. */}
        <button className="mech-moth" style={{ width: SIZE, height: SIZE }} tabIndex={-1}>
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <path className="mech-moth-wing mech-moth-left" d="M 12 8 C 6 3 1 6 2.5 11 C 3.6 15 8 16 12 15 Z" />
            <path className="mech-moth-wing mech-moth-right" d="M 12 8 C 18 3 23 6 21.5 11 C 20.4 15 16 16 12 15 Z" />
            <path className="mech-moth-body" d="M 12 6.5 v 10.5 M 12 6.5 l -2.4 -2.6 M 12 6.5 l 2.4 -2.6" />
          </svg>
          <span className="mech-burst" />
        </button>
      </div>
    </div>
  )
}

/* Memoised for the same reason the bird is: it takes no props, and the
   screens it sits on re-render on every beat of every swap. */
export default memo(MechMoth)
