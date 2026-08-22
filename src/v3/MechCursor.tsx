import { useEffect, useRef, useState } from 'react'

/* The reticle.

   Two rings that chase the pointer at different rates — the inner one is
   effectively on it, the outer one lags a few frames behind. That gap is the
   whole effect: a targeting system tracking a thing, rather than a decal
   stuck to the mouse.

   Desktop only, and only where there is a real pointer. On a touch screen
   there is nothing to draw and the native cursor is never hidden. */

/** Per-frame approach, as a fraction of the remaining distance. The outer
 *  ring's is deliberately loose enough to visibly swing past on a fast flick. */
const INNER = 0.5
const OUTER = 0.17

export default function MechCursor() {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [hot, setHot] = useState(false)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    // Someone who has asked for less motion still needs a pointer — the
    // native one is hidden either way — so the reticle stays and only the
    // chase is dropped.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nearRate = calm ? 1 : INNER
    const farRate = calm ? 1 : OUTER

    const to = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const a = { ...to }
    const b = { ...to }
    let raf = 0
    let wasHot = false

    const place = (el: HTMLDivElement | null, at: { x: number; y: number }) => {
      if (el) el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, -50%)`
    }

    const tick = () => {
      a.x += (to.x - a.x) * farRate
      a.y += (to.y - a.y) * farRate
      b.x += (to.x - b.x) * nearRate
      b.y += (to.y - b.y) * nearRate
      place(outer.current, a)
      place(inner.current, b)
      raf = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      to.x = event.clientX
      to.y = event.clientY
      setLive(true)

      // Compared before setting, so a pointer crossing the page does not
      // re-render this on every one of the hundred moves it reports.
      const over = Boolean((event.target as Element | null)?.closest?.('a, button'))
      if (over !== wasHot) {
        wasHot = over
        setHot(over)
      }
    }

    const onLeave = () => setLive(false)

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
      <div className="mech-cursor-outer" ref={outer}>
        <svg viewBox="-50 -50 100 100">
          {/* Four arcs with gaps on the diagonals, turning slowly. */}
          <circle className="mech-ring" r="30" strokeDasharray="35.4 11.8" />
          {/* Corner brackets, which are what snap in over a target. */}
          <g className="mech-brackets">
            <path d="M -38 -30 v -8 h 8" />
            <path d="M 38 -30 v -8 h -8" />
            <path d="M -38 30 v 8 h 8" />
            <path d="M 38 30 v 8 h -8" />
          </g>
        </svg>
      </div>

      <div className="mech-cursor-inner" ref={inner}>
        <svg viewBox="-50 -50 100 100">
          <circle className="mech-pin" r="9" strokeDasharray="10 4.14" />
          <path className="mech-cross" d="M -16 0 h 6 M 16 0 h -6 M 0 -16 v 6 M 0 16 v -6" />
          <circle className="mech-dot" r="1.6" />
        </svg>
      </div>
    </div>
  )
}
