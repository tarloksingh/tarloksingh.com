import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { CastWave } from './castTuning'

/* ---- the panel's own green, drifting ----

   The wave under the cast turns its colour slowly — `hueShift` in
   `MechWave.tsx`, a rotation about the grey axis, `hueSpeed` degrees a
   second. Everything else on the home screen was fixed at one green while it
   did, which left the ground looking like a screensaver behind a printed
   page rather than like the same instrument lit from one supply.

   So the page drifts with it. Not a second effect — the *same* rotation, on
   the token every green thing here already comes out of: the phosphor grid,
   the title, the tagline, the index, the leaders, the reticle, the bloom's
   middle. `--accent` and `--accent-rgb` are one colour written two ways
   (Mech.css needs the triplet for every `rgba(…, 0.22)` it sets), so both are
   written and nothing else has to know this is happening.

   **Home only.** A project screen is about the project; a panel whose colour
   moves while you read a case study is a panel competing with it. The hook
   takes the wave it should follow, or `null`, and clears what it set when it
   is handed the second one.

   Why not CSS. Rotating a hue in a stylesheet needs either relative colour
   syntax — `rgb(from var(--accent) …)`, which cannot produce the bare `r, g,
   b` triplet the eighty `rgba()` calls in Mech.css are written against — or
   an `@property` angle, which costs the same style recalculation this does
   and can only reach a colour that is already expressed as an angle. This is
   two `setProperty` calls on one element, thirty times a second, and the
   recalculation is the cost either way. */

/** The green as authored, in Mech.css — the one this rotates *from*. Held
 *  here rather than read back off the element, because after the first frame
 *  what is on the element is a drifted colour and rotating that again
 *  compounds: a few seconds of it and the page has walked off anywhere. */
const ACCENT: [number, number, number] = [134, 226, 180]

/** 1/√3 — the grey axis of RGB space, normalised. The same constant the
 *  wave's fragment shader rotates about. */
const K = 0.5773502691896258

const clamp = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n))

/** Rodrigues' rotation about the grey axis, which is what a hue rotation is
 *  when it must not touch how bright the colour is. Written out rather than
 *  taken through HSL because this is the shader's own formula, and the point
 *  of the whole thing is that the page turns the same way the field does. */
const rotate = (rgb: [number, number, number], angle: number): [number, number, number] => {
  const [r, g, b] = rgb
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  // `k · dot(k, rgb) · (1 − cos)`, with both k's folded into the third.
  const grey = ((r + g + b) * (1 - c)) / 3
  return [
    clamp(r * c + K * (b - g) * s + grey),
    clamp(g * c + K * (r - b) * s + grey),
    clamp(b * c + K * (g - r) * s + grey)
  ]
}

/** Thirty a second, not sixty. Writing a custom property on `.mech`
 *  invalidates style for everything under it, and the whole readout is under
 *  it — so this is the one thing on the page that is deliberately not on the
 *  frame clock. At the drift rates the panel offers, twelve degrees a second
 *  at the outside, a step is a fraction of a degree and nothing on screen can
 *  tell the difference. */
const STEP_MS = 33

/** A full turn. At or above this the hue runs right round rather than rocking
 *  back and forth, which is the wave's own behaviour and the only setting
 *  where the two are literally doing the same thing. */
const WHOLE_TURN = 359.5

export function useAccentDrift(root: RefObject<HTMLElement | null>, wave: CastWave | null) {
  const swing = wave && wave.on ? wave.tint : 0
  const speed = wave?.hueSpeed ?? 0

  useEffect(() => {
    const node = root.current
    /* Nothing set at all when it is off, rather than the authored green set
       explicitly — the stylesheet is the authority on what that green is, and
       an inline copy of it is a second place to change it. */
    if (!node || swing <= 0 || speed === 0) return

    let raf = 0
    let last = 0
    const started = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < STEP_MS) return
      last = now

      const t = (now - started) / 1000
      const turn = (speed * Math.PI) / 180
      const angle =
        swing >= WHOLE_TURN
          ? t * turn
          : Math.sin(t * turn) * ((swing / 2) * (Math.PI / 180))

      const [r, g, b] = rotate(ACCENT, angle)
      node.style.setProperty('--accent', `rgb(${r}, ${g}, ${b})`)
      node.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      node.style.removeProperty('--accent')
      node.style.removeProperty('--accent-rgb')
    }
  }, [root, swing, speed])
}
