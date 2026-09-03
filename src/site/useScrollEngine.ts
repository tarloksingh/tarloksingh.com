import { useEffect, useMemo, useRef } from 'react'

/* The one clock the stage runs on.

   The home page is `position: fixed` — there is no document to scroll — so
   wheel, touch and keyboard are accumulated into a single number instead.
   That number is the whole navigation model: 0 is the name on screen, 1 is
   the first project square-on, 2 the second, and so on. Everything visible
   (helix speed, name opacity, rotunda angle, which project is named) is a
   pure function of it.

   Two values, not one. `target` is where input has pushed things; `value`
   chases it with an exponential ease. That gap is the entire reason the page
   feels heavy rather than twitchy: a flick sends `target` a long way at once
   and `value` takes most of a second to arrive, gliding the whole time. It is
   also what makes the detents below feel like a heavy mechanism rather than a
   jump cut — a step moves `target` a whole unit at once, and the ease is the
   drum taking a second to turn there.

   Nothing here is React state. It moves every wheel tick and, mid-fling,
   every frame, and a render per pixel scrolled would make the page unusable.
   Subscribers read the mutable object directly inside one shared rAF. */

export interface ScrollState {
  /** Where input has pushed it. */
  target: number
  /** Damped position — what everything actually draws from. */
  value: number
  /** Units per second, signed. Drives spin and motion blur-ish cues. */
  velocity: number
  /** Absolute velocity, smoothed — steadier to drive visuals with. */
  speed: number
}

export type Subscriber = (state: ScrollState, dt: number) => void

interface Options {
  /** Wheel pixels that make up one whole unit. */
  pixelsPerUnit?: number
  /** Seconds for `value` to cover most of the distance to `target`. */
  smoothing?: number
  min?: number
  /** Omit for an open-ended track. */
  max?: number
  /** Touch travel is scaled against this instead of `pixelsPerUnit` — a
   *  finger crossing the screen should mean more than a wheel notch. */
  touchPixelsPerUnit?: number
  /** Multiplies input on the free-scrub stretch *below* the first detent.
   *  Above 1 makes the entrance shorter than a project step, which is what
   *  lets one swipe or one deliberate scroll carry the whole way through it.
   *
   *  It is a separate number because the two stretches are separate gestures.
   *  A detent is a step through a list and wants a deliberate push — the
   *  distance is the deliberation. The entrance is one continuous move with
   *  nothing to choose between, and asking for a project's worth of travel to
   *  get through it reads as the page being stuck, not as care. */
  entranceGain?: number
  /** Whole units at and above this are **detents**: one gesture moves exactly
   *  one, and the track never comes to rest between two of them. Below it the
   *  track is a free scrub. Omit for a free track throughout.
   *
   *  This is the difference between a list and a scrubber. The stretch from
   *  the name to the first project is one continuous move and wants scrubbing
   *  — you are flying through the field, and every position in between is a
   *  real picture. The work is a list of separate things, and every position
   *  between two of them is a half-turned wall with two projects' titles
   *  drawn across each other: a place the page can be, but not a place anyone
   *  meant to be. */
  detentFrom?: number
}

/** Units of travel within one gesture that commit a step. Low enough that a
 *  single mouse-wheel notch (about 100px, so ~0.08 units) is a step on its
 *  own — a wheel that needed three notches per project would read as broken. */
const DETENT_TRIGGER = 0.05
/** Seconds of quiet that end a gesture. A trackpad keeps firing wheel events
 *  for most of a second after the finger has left it, so a gesture cannot be
 *  ended by an event — only by the absence of one. Below about 0.12s a single
 *  flick steps several projects; far above it a deliberate second flick is
 *  swallowed. */
const DETENT_REST = 0.18
/** How far a step *below* the first detent releases the track. It cannot land
 *  on the detent it is leaving, and jumping the whole entrance in one gesture
 *  is too much for one notch — so it lets go just under, and the free scrub
 *  takes the rest. */
const DETENT_RELEASE = 0.1

/* ---- telling a second flick apart from the first one still coasting ----

   Quiet alone is not enough to end a gesture on a trackpad. A hard flick
   coasts for the better part of two seconds, and DETENT_REST is a fifth of
   one — so a second swipe that lands anywhere in that tail used to be
   swallowed whole, because the latch that stops one gesture stepping four
   projects had never been released. That is the "scrolling doesn't always
   work" bug, and it is worst exactly when the page feels most responsive to
   use: swiping briskly through the work.

   Momentum has two properties a finger does not. It never reverses, and it
   only ever fades. Both are read below. */

/** How far below its peak the tail has to have fallen before a *rise* in
 *  input can mean a finger. Without this the opening ramp of a single flick —
 *  where each event is legitimately bigger than the last — reads as a second
 *  gesture and steps two projects on one swipe. */
const MOMENTUM_FADED = 0.45
/** ...and how far above the faded tail that rise has to land. */
const REACCEL = 1.7
/** Units per event below which input is treated as the tail guttering out
 *  rather than as anything anybody did. The last ticks of a flick are a pixel
 *  or two, and a one-pixel jitter is a 2x "surge" without this. */
const LIVE_INPUT = 0.004
/** Seconds a latched gesture may run before real input releases it anyway. A
 *  slow steady drag never reverses and never surges, so nothing above would
 *  ever let go of it — and a drag that has been going this long with events
 *  still above LIVE_INPUT is a finger that never left, not a tail. */
const DETENT_HOLD_MAX = 1.2

export interface ScrollEngine {
  state: ScrollState
  subscribe: (fn: Subscriber) => () => void
  /** Jump the target; `value` still eases there. */
  goTo: (unit: number) => void
  nudge: (units: number) => void
  /** Ignore input (used while a page transition is covering the stage). */
  setLocked: (locked: boolean) => void
  /** Override how far a finger has to travel for one unit, live. The tuning
   *  panel drives this (see `touchPerUnit` in room.ts) — a swipe is the one
   *  input that cannot be judged from a desk, so it has to be adjustable on
   *  the phone it is being judged on. `null` restores the prop. */
  setTouchPixelsPerUnit: (px: number | null) => void
}

export function useScrollEngine({
  pixelsPerUnit = 1100,
  smoothing = 0.42,
  min = 0,
  max,
  touchPixelsPerUnit = 620,
  entranceGain = 1,
  detentFrom
}: Options = {}): ScrollEngine {
  const stateRef = useRef<ScrollState>({ target: 0, value: 0, velocity: 0, speed: 0 })
  const subsRef = useRef(new Set<Subscriber>())
  const lockedRef = useRef(false)
  /** Set by the tuning panel; takes precedence over the prop while it is not
   *  null. See `setTouchPixelsPerUnit`. */
  const touchOverrideRef = useRef<number | null>(null)
  const touchPerUnit = () => touchOverrideRef.current ?? optsRef.current.touchPixelsPerUnit
  // Read live in the loop and in the handlers, so retuning any of them takes
  // effect without tearing down the listeners mid-scroll.
  const optsRef = useRef({
    pixelsPerUnit,
    smoothing,
    min,
    max,
    touchPixelsPerUnit,
    entranceGain,
    detentFrom
  })
  optsRef.current = {
    pixelsPerUnit,
    smoothing,
    min,
    max,
    touchPixelsPerUnit,
    entranceGain,
    detentFrom
  }

  const engine = useMemo<ScrollEngine>(
    () => ({
      state: stateRef.current,
      subscribe: (fn) => {
        subsRef.current.add(fn)
        return () => {
          subsRef.current.delete(fn)
        }
      },
      goTo: (unit) => {
        stateRef.current.target = unit
      },
      nudge: (units) => {
        stateRef.current.target += units
      },
      setTouchPixelsPerUnit: (px) => {
        touchOverrideRef.current = px
      },
      setLocked: (locked) => {
        lockedRef.current = locked
      }
    }),
    []
  )

  useEffect(() => {
    const state = stateRef.current

    const clamp = () => {
      const { min: lo, max: hi } = optsRef.current
      if (state.target < lo) state.target = lo
      if (hi !== undefined && state.target > hi) state.target = hi
    }

    /* Gesture bookkeeping for the detented half of the track. A gesture is
       "how much has arrived since the last quiet moment or the last thing
       that looked like a finger", not an event — see DETENT_REST and the
       momentum notes above it. */
    let travel = 0
    let open = true
    let lastInputAt = 0
    let latchedAt = 0
    /** The shape of the tail: the largest event this gesture has delivered,
     *  and the smallest one since. Together they say whether momentum has
     *  faded, which is what makes a rise trustworthy. */
    let peak = 0
    let trough = Infinity
    let direction = 0

    /** Release the latch and forget the tail. Called on quiet, on anything
     *  that reads as a finger, and on `touchstart` — which, unlike a wheel
     *  event, is an unambiguous beginning and needs no inferring at all. */
    const openGesture = () => {
      travel = 0
      open = true
      peak = 0
      trough = Infinity
      direction = 0
    }

    const push = (units: number) => {
      if (lockedRef.current) return

      const { detentFrom: from, min: lo, max: hi } = optsRef.current
      if (from === undefined) {
        state.target += units
        clamp()
        return
      }

      const now = performance.now()
      const magnitude = Math.abs(units)
      const sign = units > 0 ? 1 : units < 0 ? -1 : 0

      if (now - lastInputAt > DETENT_REST * 1000) {
        // Quiet for longer than any tail runs on for: whatever this is, it
        // started here.
        openGesture()
      } else if (!open) {
        const reversed = sign !== 0 && direction !== 0 && sign !== direction
        const faded = trough < peak * MOMENTUM_FADED
        const surged = faded && magnitude > trough * REACCEL
        const held = now - latchedAt > DETENT_HOLD_MAX * 1000
        if (reversed || ((surged || held) && magnitude > LIVE_INPUT)) openGesture()
      }

      lastInputAt = now
      if (sign !== 0) direction = sign
      if (magnitude > peak) {
        peak = magnitude
        trough = magnitude
      } else if (magnitude < trough) {
        trough = magnitude
      }

      if (state.target < from - 1e-3) {
        // Free scrub below the first detent — and it *stops* there rather
        // than sliding on through, so arriving in the work is itself a
        // detent rather than something a long flick overshoots. `entranceGain`
        // is applied only here, so shortening the entrance cannot shorten a
        // step through the work.
        const next = state.target + units * optsRef.current.entranceGain
        if (next >= from) {
          state.target = from
          travel = 0
          open = false
          latchedAt = now
        } else {
          state.target = Math.max(lo, next)
        }
        return
      }

      travel += units
      if (!open || Math.abs(travel) < DETENT_TRIGGER) return
      // Measured from the *rounded* position, not the live one: mid-flight
      // between two detents the raw value is fractional, and stepping from it
      // would land somewhere that is not a detent at all.
      const step = Math.round(state.target) + (travel > 0 ? 1 : -1)
      travel = 0
      open = false
      latchedAt = now
      state.target =
        step < from
          ? Math.max(lo, from - DETENT_RELEASE)
          : hi === undefined
            ? step
            : Math.min(hi, step)
    }

    // The dev tuning panel (Leva) floats over the stage and has its own
    // scrollable folders and drag-to-scrub number fields. The listeners below
    // are on `window` and know nothing about what they land on, so without
    // this a wheel over the panel — or a drag that starts on one of its
    // sliders — would scrub the *page* underneath it as well as whatever
    // Leva itself did with the same gesture.
    const withinLeva = (e: Event) => (e.target as HTMLElement | null)?.closest?.('#leva__root')

    const onWheel = (e: WheelEvent) => {
      // While locked (a modal like the index is open over the stage) the
      // engine ignores input entirely — leave the event alone so whatever is
      // on top, e.g. the index list, scrolls natively instead of being stuck
      // under a preventDefault() meant for the zero-height document.
      if (lockedRef.current) return
      if (withinLeva(e)) return
      // The page owns the gesture entirely; without this the browser also
      // scrolls the (zero-height) document and, on a trackpad, fires the
      // back-navigation gesture on horizontal drift.
      e.preventDefault()
      // Some mice report in lines or pages rather than pixels.
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
      push((e.deltaY * scale) / optsRef.current.pixelsPerUnit)
    }

    /* Touch is a drag, not a wheel: the finger moves the world under it, and
       letting go throws it. Velocity is measured over the last few moves
       rather than the last one — a single sample at the moment a finger
       lifts is usually near zero, which kills every fling. */
    let touchY: number | null = null
    let samples: Array<{ t: number; y: number }> = []
    let flingRaf = 0

    const onTouchStart = (e: TouchEvent) => {
      if (withinLeva(e)) {
        touchY = null
        return
      }
      cancelAnimationFrame(flingRaf)
      // A finger landing *is* the start of a gesture, so the latch can be
      // released outright here rather than inferred from the shape of the
      // input as it has to be for a wheel. Without this, a second swipe
      // during the fling the first one threw is read as part of it.
      openGesture()
      touchY = e.touches[0]?.clientY ?? null
      samples = touchY === null ? [] : [{ t: performance.now(), y: touchY }]
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null || lockedRef.current || withinLeva(e)) return
      const y = e.touches[0]?.clientY ?? touchY
      push((touchY - y) / touchPerUnit())
      touchY = y
      samples.push({ t: performance.now(), y })
      if (samples.length > 6) samples.shift()
      e.preventDefault()
    }

    const onTouchEnd = () => {
      touchY = null
      const first = samples[0]
      const last = samples[samples.length - 1]
      samples = []
      if (!first || !last) return
      const dt = (last.t - first.t) / 1000
      if (dt <= 0) return

      /* No momentum inside the detents. Below the first one the track is a
         free scrub — you are flying through the field, every position in
         between is a real picture, and a flick that coasts is the whole
         feel of it. At and above it the track is a *list*, where one gesture
         is meant to mean exactly one project.

         A fling could not honour that. It keeps pushing for well over a
         second after the finger has gone, and `push` reads a tail that long
         as a fresh gesture — `held` in the detent block below fires at
         DETENT_HOLD_MAX and reopens, then again, then again, so a single
         hard swipe walked through five projects. The touchmoves have already
         committed the one step by this point; there is nothing left for the
         momentum to do except overshoot it. (A wheel is unaffected: a
         trackpad's tail arrives as real events and the same code reads it
         correctly, which is why this is only about touch.) */
      const from = optsRef.current.detentFrom
      if (from !== undefined && state.target >= from - 1e-3) return

      // px/s at release, converted to units/s, then decayed.
      let fling = ((first.y - last.y) / dt / touchPerUnit()) * 0.34
      if (Math.abs(fling) < 0.05) return

      let previous = performance.now()
      const decay = () => {
        const now = performance.now()
        const step = Math.min(0.05, (now - previous) / 1000)
        previous = now
        fling *= Math.exp(-step / 0.38)
        push(fling * step)
        if (Math.abs(fling) > 0.02) flingRaf = requestAnimationFrame(decay)
      }
      flingRaf = requestAnimationFrame(decay)
    }

    const onKey = (e: KeyboardEvent) => {
      // Never steal a key from something the visitor is typing into.
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      const map: Record<string, number> = {
        ArrowDown: 1,
        ArrowRight: 1,
        PageDown: 1,
        ArrowUp: -1,
        ArrowLeft: -1,
        PageUp: -1,
        ' ': e.shiftKey ? -1 : 1
      }
      const step = map[e.key]
      if (step === undefined) return
      e.preventDefault()
      push(step)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
    window.addEventListener('keydown', onKey)

    let raf = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      // Capped: a backgrounded tab resumes with a multi-second delta, which
      // would otherwise teleport the page and spike every velocity-driven
      // visual on the first frame back.
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const previousValue = state.value
      const ease = 1 - Math.exp(-dt / Math.max(0.001, optsRef.current.smoothing))
      state.value += (state.target - state.value) * ease
      state.velocity = dt > 0 ? (state.value - previousValue) / dt : 0
      // Smoothed magnitude, so anything driven by "how fast are we going"
      // winds up and coasts down instead of chattering frame to frame.
      state.speed += (Math.abs(state.velocity) - state.speed) * (1 - Math.exp(-dt / 0.14))

      subsRef.current.forEach((fn) => fn(state, dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(flingRaf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return engine
}

/* ---- small maths the screens share ---- */

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** 0 below `from`, 1 above `to`, linear between. */
export const range = (v: number, from: number, to: number) =>
  from === to ? (v >= to ? 1 : 0) : clamp((v - from) / (to - from), 0, 1)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Smoothstep — a range() with the corners taken off. */
export const ease = (v: number, from: number, to: number) => {
  const t = range(v, from, to)
  return t * t * (3 - 2 * t)
}
