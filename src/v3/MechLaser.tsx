import { useEffect, useRef, memo } from 'react'
import { sound } from './sound'
import { quarry } from './subject'

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

   **Both kinds of pointer.** A mouse fires on the way down; a finger fires on
   the way up and only if the press was a tap, because every scroll on a phone
   starts with a `pointerdown` and a bolt per flick is a page fighting you.
   See `TAP` below. */

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

function MechLaser() {
  const layer = useRef<HTMLDivElement>(null)
  const emitter = useRef<HTMLElement>(null)

  useEffect(() => {
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

        /* Tested against where each creature is *now* rather than where it
           was when you pressed. A bolt takes a couple of hundred milliseconds
           to cross the screen and nothing on the page holds still for it, so
           leading a target slightly is a real thing you can do.

           A set, not one target: there is more than one animal on the page
           now, and the gun has never known what it is shooting at. */
        let downed = false
        for (const creature of quarry.creatures) {
          const at = creature.at()
          if (!at) continue
          if (Math.hypot(at.x - x, at.y - y) > quarry.radius) continue
          if (!creature.hit()) continue
          mark(at.x, at.y, 'hit')
          finish(bolt)
          downed = true
          break
        }
        if (downed) continue

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

    /** Whether a press is one the gun should answer at all. */
    const allowed = (event: PointerEvent) => {
      // Left button only, and never while a clip has the whole screen: the
      // overlay this draws into is underneath a fullscreen element and a
      // shot nobody can see is a sound with no picture.
      if (event.button !== 0 || document.fullscreenElement) return false
      const target = event.target as Element | null
      if (!target?.closest?.('.mech, .v3-home')) return false
      // The panel and the pin editor are tools, not the page. While the
      // editor is open every press is a placement, so the gun is out.
      if (target.closest('#leva__root, .mech-pins, .mech[data-pins="true"]')) return false
      const control = target.closest(CONTROLS)
      // Creatures are the exception: they are `<button>`s so the reticle can
      // lock onto them, and pressing one has to fire a bolt like everything
      // else rather than killing it by touch.
      if (control && !control.classList.contains('mech-bird') && !control.classList.contains('mech-moth')) return false
      return true
    }

    /* ---- a press, on two kinds of pointer ----

       A mouse fires on the way down: you aimed, you clicked, and waiting for
       the button to come back up is a gun with lag.

       A finger cannot. Every scroll on this page starts with a `pointerdown`,
       so firing there means a bolt for every flick — which is the sort of
       thing that makes a page feel like it is fighting you. So a touch fires
       on the way *up*, and only if it was a tap: under `TAP.slop` pixels of
       travel and under `TAP.hold` milliseconds. Anything longer or further is
       a scroll or a press-and-hold, and neither is a shot. */
    const TAP = { slop: 12, hold: 600 }
    let press: { x: number; y: number; at: number; id: number } | null = null

    const onDown = (event: PointerEvent) => {
      if (!allowed(event)) return
      if (event.pointerType === 'mouse') {
        fire({ x: event.clientX, y: event.clientY })
        return
      }
      press = { x: event.clientX, y: event.clientY, at: performance.now(), id: event.pointerId }
    }

    const onUp = (event: PointerEvent) => {
      const started = press
      press = null
      if (!started || started.id !== event.pointerId) return
      if (performance.now() - started.at > TAP.hold) return
      if (Math.hypot(event.clientX - started.x, event.clientY - started.y) > TAP.slop) return
      if (!allowed(event)) return
      fire({ x: event.clientX, y: event.clientY })
    }

    // A finger that has started scrolling is not going to fire, and the
    // browser takes the pointer away from us the moment it decides that is
    // what is happening.
    const onCancel = () => {
      press = null
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('scroll', onCancel, { passive: true, capture: true })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('scroll', onCancel, { capture: true })
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

/* Memoised. It takes no props and nothing it draws depends on the readout's
   state, but the project screen re-renders on every phase of every frame swap
   — and without this, so does all of MechLaser. */
export default memo(MechLaser)
