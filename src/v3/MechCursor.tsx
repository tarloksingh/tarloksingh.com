import { useEffect, useRef, useState } from 'react'
import { sound } from './sound'

/* The reticle.

   Three parts. A pin that is effectively on the pointer, a ring that chases it
   a few frames behind, and a lock box that leaves the pointer entirely and
   snaps to whatever is under it. That last one is the difference between a
   decorated cursor and a targeting system: the brackets belong to the target,
   not to the mouse.

   Desktop only, and only where there is a real pointer. On a touch screen
   there is nothing to draw and the native cursor is never hidden. */

/** Per-frame approach, as a fraction of the distance left to cover. The ring
 *  trails, but not so far that you lose track of where you are actually
 *  pointing — everything stays inside its own 68px box. */
const PIN = 0.62
const RING = 0.3

/** Breathing room between a target's box and the brackets that acquire it. */
const PAD = 7

export default function MechCursor() {
  const ring = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const lock = useRef<HTMLDivElement>(null)
  const [hot, setHot] = useState(false)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    // Someone who has asked for less motion still needs a pointer — the native
    // one is hidden either way — so the reticle stays and only the chase goes.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ringRate = calm ? 1 : RING
    const pinRate = calm ? 1 : PIN

    const to = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const a = { ...to }
    const b = { ...to }
    let raf = 0
    let target: Element | null = null

    const place = (el: HTMLDivElement | null, at: { x: number; y: number }) => {
      if (el) el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, -50%)`
    }

    const tick = () => {
      a.x += (to.x - a.x) * ringRate
      a.y += (to.y - a.y) * ringRate
      b.x += (to.x - b.x) * pinRate
      b.y += (to.y - b.y) * pinRate
      place(ring.current, a)
      place(pin.current, b)

      // Measured every frame rather than once on entry: a tile slides a few
      // pixels under the pointer as it lights up, and brackets that were
      // placed before that move sit visibly off it.
      if (target && lock.current) {
        const box = target.getBoundingClientRect()
        const style = lock.current.style
        style.left = `${box.left - PAD}px`
        style.top = `${box.top - PAD}px`
        style.width = `${box.width + PAD * 2}px`
        style.height = `${box.height + PAD * 2}px`
      }

      raf = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      to.x = event.clientX
      to.y = event.clientY
      setLive(true)

      // Compared before setting, so a pointer crossing the page does not
      // re-render this on every one of the hundred moves it reports.
      const over = (event.target as Element | null)?.closest?.('a, button') ?? null
      if (over !== target) {
        // Only on acquiring, not on losing: a chirp every time the pointer
        // slides off something is half again as much noise for nothing.
        if (over) sound.lock()
        target = over
        setHot(Boolean(over))
      }
    }

    const onLeave = () => setLive(false)

    // The first gesture is what a browser will let an AudioContext start on.
    window.addEventListener('pointerdown', sound.wake, { once: true })
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="mech-cursor" data-live={live} data-hot={hot} aria-hidden>
      {/* Everything is drawn about (50,50) of a 0-origin viewBox. A viewBox
          that starts anywhere else puts `transform-origin: center` at the
          centre of the viewport rather than of the shape, and the spinning
          arcs orbit that point instead of turning on the spot. */}
      <div className="mech-cursor-ring" ref={ring}>
        <svg viewBox="0 0 100 100">
          <circle className="mech-ring" cx="50" cy="50" r="30" strokeDasharray="35.4 11.8" />
          <g className="mech-brackets">
            <path d="M 12 20 v -8 h 8" />
            <path d="M 88 20 v -8 h -8" />
            <path d="M 12 80 v 8 h 8" />
            <path d="M 88 80 v 8 h -8" />
          </g>
        </svg>
      </div>

      <div className="mech-cursor-pin" ref={pin}>
        <svg viewBox="0 0 100 100">
          <circle className="mech-pin" cx="50" cy="50" r="9" strokeDasharray="10 4.14" />
          <path className="mech-cross" d="M 34 50 h 6 M 66 50 h -6 M 50 34 v 6 M 50 66 v -6" />
          <circle className="mech-dot" cx="50" cy="50" r="1.6" />
        </svg>
      </div>

      {/* The brackets the cursor hands off to. They sit on the target's own
          box, so a wide link gets a wide box and a tile gets a tile. */}
      <div className="mech-lock" ref={lock}>
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
