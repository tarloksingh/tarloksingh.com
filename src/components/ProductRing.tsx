import { useEffect, useMemo, useRef } from 'react'

interface ProductRingProps {
  /** Repeated around the circle, separated by `separator`. */
  label: string
  separator?: string
  /** How many times the label appears in one full turn. */
  repeats?: number
  /** Circle radius in px, before the plane is tilted. */
  radius?: number
  /** Seconds for one full revolution. Negative runs it anticlockwise. */
  period?: number
  /** Blur applied to the glyph nearest the camera. */
  maxBlur?: number
  fontSize?: number
}

/**
 * Type printed flat on a disc that is lying almost horizontal, so the circle
 * reads as an ellipse and the far arc runs upside-down.
 *
 * Each glyph is its own absolutely-positioned element rather than an SVG
 * `textPath`, because the look depends on treating them individually: the arc
 * swinging toward the camera is blurred and faded, which is what sells the
 * disc as a physical object rather than a flat ellipse of text.
 *
 * Positions are written straight to the DOM from a rAF loop. Driving this
 * through React state would re-render every glyph 60 times a second for
 * transforms that never touch the component tree.
 */
export default function ProductRing({
  label,
  separator = '|',
  repeats = 6,
  radius = 300,
  period = 24,
  maxBlur = 6,
  fontSize = 26
}: ProductRingProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([])

  // One unit is the label plus its separator, padded so the two never collide
  // once they are spread round the circle.
  const glyphs = useMemo(() => {
    const unit = `${label}   ${separator}   `
    return Array.from(unit.repeat(repeats))
  }, [label, separator, repeats])

  useEffect(() => {
    const count = glyphs.length
    if (!count) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = 360 / count
    let raf = 0
    let start = 0

    const draw = (spin: number) => {
      for (let i = 0; i < count; i += 1) {
        const el = glyphRefs.current[i]
        if (!el) continue

        const angle = i * step + spin
        const rad = (angle * Math.PI) / 180

        // CSS +Y runs down the screen, so a glyph below the centre is the one
        // the tilt brings toward the camera. Clamping at zero leaves the whole
        // far arc crisp — spreading the blur across both halves washes the
        // label out and there is nothing left to read.
        const nearness = Math.max(0, Math.sin(rad))

        // Rotate into place, push out to the rim, then turn a further quarter
        // turn so the glyph sits tangent to the circle instead of pointing at
        // the middle of it.
        el.style.transform =
          `rotate(${angle}deg) translateX(${radius}px) rotate(90deg) translate(-50%, -50%)`
        el.style.filter = `blur(${(maxBlur * Math.pow(nearness, 1.4)).toFixed(2)}px)`
        el.style.opacity = (1 - 0.55 * nearness).toFixed(3)
      }
    }

    if (reduced || period === 0) {
      draw(0)
      return
    }

    const tick = (now: number) => {
      if (!start) start = now
      const turns = ((now - start) / 1000 / period) * 360
      draw(turns)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [glyphs, radius, period, maxBlur])

  return (
    <div className="ch-ring-wrap" aria-label={label}>
      <div className="ch-ring-shadow" aria-hidden="true" />
      <div className="ch-ring" ref={ringRef}>
        {glyphs.map((ch, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="ch-ring-glyph"
            style={{ fontSize }}
            ref={(el) => {
              glyphRefs.current[i] = el
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  )
}
