import { useEffect } from 'react'
import type { RefObject } from 'react'
import Matter from 'matter-js'

const { Engine, Bodies, Body, Composite } = Matter

// Matter integrates at a fixed 60Hz. Stepping it with raw frame deltas makes it
// unstable, so the loop accumulates real time and steps in fixed increments.
const STEP_MS = 1000 / 60
const WALL = 400

export interface GravityDropOptions {
  enabled: boolean
  gravity: number
  bounciness: number
  friction: number
  dropHeight: number
  stagger: number
  spin: number
  floorVh: number
}

// Measure the element's layout box with any physics transform removed, so the
// physics offset is always relative to where the element actually belongs.
function layoutRect(el: HTMLElement) {
  const previous = el.style.transform
  el.style.transform = ''
  const rect = el.getBoundingClientRect()
  el.style.transform = previous
  return rect
}

/**
 * Runs the given elements as rigid bodies: they fall from above the viewport
 * under real gravity, bounce, and settle in a heap on the floor. The elements
 * keep their place in the layout — only a transform moves them — so they stay
 * ordinary, clickable DOM.
 */
export function useGravityDrop(refs: RefObject<HTMLElement | null>[], options: GravityDropOptions) {
  const { enabled, gravity, bounciness, friction, dropHeight, stagger, spin, floorVh } = options

  useEffect(() => {
    if (!enabled) return
    const elements = refs.map((ref) => ref.current)
    if (elements.some((el) => el === null)) return
    const els = elements as HTMLElement[]

    const engine = Engine.create()
    engine.gravity.y = gravity
    engine.enableSleeping = true

    let viewportW = window.innerWidth
    let viewportH = window.innerHeight

    // Floor sits `floorVh` above the bottom edge; the side walls stop anything
    // from tumbling out of frame.
    const surface = { isStatic: true, friction, frictionStatic: 1 }
    const floor = Bodies.rectangle(0, 0, viewportW * 4, WALL, surface)
    const leftWall = Bodies.rectangle(0, 0, WALL, viewportH * 6, surface)
    const rightWall = Bodies.rectangle(0, 0, WALL, viewportH * 6, surface)

    const placeWalls = () => {
      viewportW = window.innerWidth
      viewportH = window.innerHeight
      const floorY = viewportH - viewportH * (floorVh / 100)
      Body.setPosition(floor, { x: viewportW / 2, y: floorY + WALL / 2 })
      Body.setPosition(leftWall, { x: -WALL / 2, y: viewportH / 2 })
      Body.setPosition(rightWall, { x: viewportW + WALL / 2, y: viewportH / 2 })
    }
    placeWalls()
    Composite.add(engine.world, [floor, leftWall, rightWall])

    let rects = els.map(layoutRect)

    // Square collision boxes even though the buttons are pills: a rounded body
    // rolls like a wheel and slides right off across the floor.
    const bodies = rects.map((rect) =>
      Bodies.rectangle(
        rect.left + rect.width / 2,
        -viewportH * (dropHeight / 100) - rect.height,
        rect.width,
        rect.height,
        { restitution: bounciness, friction, frictionStatic: 1, frictionAir: 0.02 }
      )
    )

    els.forEach((el) => {
      el.style.visibility = 'hidden'
      el.style.willChange = 'transform'
    })

    const onResize = () => {
      placeWalls()
      rects = els.map(layoutRect)
    }
    window.addEventListener('resize', onResize)

    let frame = 0
    let last = performance.now()
    let accumulator = 0
    let simTime = 0
    let released = 0

    const step = () => {
      // Bodies are held out of the world until their turn, rather than toggled
      // static — Body.setStatic(body, false) leaves mass at Infinity and the
      // whole simulation goes NaN.
      while (released < bodies.length && simTime >= released * stagger * 1000) {
        Composite.add(engine.world, bodies[released])
        Body.setAngularVelocity(bodies[released], (released % 2 === 0 ? 1 : -1) * spin)
        els[released].style.visibility = 'visible'
        released += 1
      }

      Engine.update(engine, STEP_MS)
      simTime += STEP_MS
    }

    const tick = (now: number) => {
      // Clamp so a backgrounded tab doesn't resume with a huge catch-up burst.
      accumulator += Math.min(now - last, 100)
      last = now

      while (accumulator >= STEP_MS) {
        step()
        accumulator -= STEP_MS
      }

      bodies.forEach((body, i) => {
        const rect = rects[i]
        const dx = body.position.x - (rect.left + rect.width / 2)
        const dy = body.position.y - (rect.top + rect.height / 2)
        els[i].style.transform = `translate(${dx}px, ${dy}px) rotate(${body.angle}rad)`
      })

      // Everything has come to rest — stop burning frames.
      if (released === bodies.length && bodies.every((body) => body.isSleeping)) return

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      // The transform is deliberately left in place: when the sim is switched
      // off, whatever animation takes over needs the bodies where they landed.
      els.forEach((el) => {
        el.style.willChange = ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, gravity, bounciness, friction, dropHeight, stagger, spin, floorVh])
}
