import { useEffect, useRef } from 'react'
import { sound } from './sound'
import { gaze, quarry } from './subject'

/* The gun.

   The reticle was a targeting system before there was anything to shoot with.
   This is the other half: press anywhere on the readout that is not something
   you could press *for* a reason, and a bolt leaves the bottom of the frame
   for wherever you aimed. It is meant for the bird — the bird is the only
   thing on the page with a hitbox — but it fires at empty black just as
   happily, because a gun that only works when there is a target is a button.

   One muzzle, in the middle of the bottom edge: you are behind the gun, not
   beside a pair of them, and a shot that leaves from somewhere different every
   time reads as coming from the page rather than from you.

   And it goes *away* from you. The bolt is longest and thickest as it leaves
   the muzzle, and shrinks the whole way out — which, with an eased travel that
   covers less screen the further it gets, is the whole of the depth. There is
   no tracer: a line held between the muzzle and the target is a line drawn
   across a flat page, and it was the one thing that gave the trick away.

   Nothing here is React state. A shot is a handful of divs, a transform per
   frame, and a `remove()`; putting bolts in state would re-render the whole
   project screen several times a second while somebody was enjoying
   themselves.

   Desktop only, and only where there is a real pointer. */

/** Everything you can press. A press that lands on one of these is that
 *  control's, and the gun stays quiet — the whole point is that the page does
 *  not fight you for its own buttons. The bird is the exception: it is a
 *  `<button>` so the reticle can lock onto it, and clicking it has to fire a
 *  bolt like everything else rather than killing it by touch. */
const CONTROLS = 'a, button, input, select, textarea, label, video, [contenteditable], [data-nogun]'

/** Pixels a second. Fast enough to read as a shot rather than a projectile,
 *  slow enough that you see it travel — anything past about 4000 is a line
 *  that appears and vanishes. */
const SPEED = 3200

/** Seconds. A near shot still gets a moment of flight; a shot across the
 *  screen still lands before you have stopped looking at it. */
const FLIGHT = { min: 0.075, max: 0.34 }

/** Length of the bolt itself, in pixels, at its nearest. */
const BOLT = 92

/** How big the bolt is leaving the muzzle and how small it is landing. The
 *  ratio is the depth: anything under about two reads as a streak that got a
 *  bit shorter, and much over four reads as a firework. */
const NEAR = 1.5
const FAR = 0.38

const el = (className: string) => {
  const node = document.createElement('div')
  node.className = className
  return node
}

export default function MechLaser() {
  const layer = useRef<HTMLDivElement>(null)
  const emitter = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    // Someone who has asked for less motion still gets the shot — it is a
    // thing they did, not a thing the page decided to do at them — but it
    // crosses in the shortest flight rather than travelling.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let settle = 0

    interface Bolt {
      node: HTMLDivElement
      from: { x: number; y: number }
      to: { x: number; y: number }
      angle: number
      /** Seconds the crossing takes, and when it started. */
      flight: number
      fired: number
    }

    const bolts = new Set<Bolt>()

    /** A ring where something was hit, or a tap where nothing was. Both are
     *  one element that removes itself when its animation is over, so a
     *  session's worth of shooting does not accumulate in the DOM. */
    const mark = (x: number, y: number, kind: 'hit' | 'miss') => {
      const node = el('mech-impact')
      node.dataset.kind = kind
      node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      node.addEventListener('animationend', () => node.remove(), { once: true })
      layer.current?.append(node)
    }

    const finish = (bolt: Bolt) => {
      bolt.node.remove()
      bolts.delete(bolt)
      if (bolts.size === 0) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      for (const bolt of bolts) {
        const at = Math.min(1, (now - bolt.fired) / (bolt.flight * 1000))
        /* Eased out, because something receding covers less screen the
           further away it gets. A constant crossing is a sprite sliding
           across a page, whatever size you draw it. */
        const along = 1 - (1 - at) * (1 - at)
        const x = bolt.from.x + (bolt.to.x - bolt.from.x) * along
        const y = bolt.from.y + (bolt.to.y - bolt.from.y) * along
        const size = NEAR + (FAR - NEAR) * along

        /* The order matters. `translate(-100%, -50%)` is applied first, in the
           element's own space, which puts the head of the streak on the
           origin — so it stays exactly on the point through the scale and the
           rotation that follow, at any distance. The tail is the only thing
           that moves when the bolt shrinks. */
        bolt.node.style.transform =
          `translate3d(${x}px, ${y}px, 0) rotate(${bolt.angle}deg) scale(${size}) translate(-100%, -50%)`

        /* Tested against where the bird is *now* rather than where it was
           when you pressed. A bolt takes a couple of hundred milliseconds to
           cross the screen and the bird keeps flying the whole time, so
           leading it slightly is a real thing you can do. */
        if (gaze.bird.active && quarry.hit) {
          const near = Math.hypot(gaze.bird.x - x, gaze.bird.y - y)
          if (near <= quarry.radius && quarry.hit()) {
            mark(gaze.bird.x, gaze.bird.y, 'hit')
            finish(bolt)
            continue
          }
        }

        if (at >= 1) {
          /* Landed. If the subject is on the stage and the bolt came down
             inside its box, it is the subject that was hit — which it takes
             personally, in `MechModel`. */
          const box = quarry.subject?.rect()
          const struck =
            box !== null &&
            box !== undefined &&
            x >= box.left &&
            x <= box.right &&
            y >= box.top &&
            y <= box.bottom

          if (struck) {
            quarry.subject!.hit()
            mark(x, y, 'hit')
          } else {
            sound.splash()
            mark(bolt.to.x, bolt.to.y, 'miss')
          }
          finish(bolt)
        }
      }
    }

    const fire = (to: { x: number; y: number }) => {
      const host = layer.current
      if (!host) return

      const from = {
        x: window.innerWidth / 2,
        // On the bottom edge rather than under it: the layer clips, and a
        // discharge nobody can see is a sound with no picture.
        y: window.innerHeight - 2
      }
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.hypot(dx, dy)
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI

      const node = el('mech-bolt')
      node.style.width = `${BOLT}px`
      node.style.transform =
        `translate3d(${from.x}px, ${from.y}px, 0) rotate(${angle}deg) scale(${NEAR}) translate(-100%, -50%)`

      host.append(node)

      // The wash along the bottom edge flares with the shot and settles back.
      const glow = emitter.current
      if (glow) {
        glow.dataset.on = 'true'
        window.clearTimeout(settle)
        settle = window.setTimeout(() => {
          glow.dataset.on = 'false'
        }, 90)
      }

      const flash = el('mech-muzzle')
      flash.style.transform = `translate3d(${from.x}px, ${from.y}px, 0) rotate(${angle}deg) translate(-50%, -50%)`
      flash.addEventListener('animationend', () => flash.remove(), { once: true })
      host.append(flash)

      bolts.add({
        node,
        from,
        to,
        angle,
        flight: calm ? FLIGHT.min : Math.max(FLIGHT.min, Math.min(FLIGHT.max, distance / SPEED)),
        fired: performance.now()
      })

      sound.shot()
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onDown = (event: PointerEvent) => {
      // Left button only, and never while a clip has the whole screen: the
      // overlay this draws into is underneath a fullscreen element and a
      // shot nobody can see is a sound with no picture.
      if (event.button !== 0 || document.fullscreenElement) return
      const target = event.target as Element | null
      if (!target?.closest?.('.mech')) return
      // The panel and the pin editor are tools, not the page. While the
      // editor is open every press is a placement, so the gun is out.
      if (target.closest('#leva__root, .mech-pins, .mech[data-pins="true"]')) return
      const control = target.closest(CONTROLS)
      if (control && !control.classList.contains('mech-bird')) return
      fire({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.clearTimeout(settle)
      cancelAnimationFrame(raf)
      for (const bolt of bolts) bolt.node.remove()
      bolts.clear()
    }
  }, [])

  return (
    <div className="mech-guns" ref={layer} aria-hidden>
      <i className="mech-emitter" ref={emitter} data-on="false" />
    </div>
  )
}
