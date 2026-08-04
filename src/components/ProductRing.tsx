import { useEffect, useMemo, useRef } from 'react'

interface ProductRingProps {
  /** Repeated around the ring. */
  label: string
  /** Character between repeats. Empty runs the label round on its own. */
  separator?: string
  /** Spaces padding each repeat, which is what sets the gap between them. */
  gap?: number
  /** How many times the label appears in one full turn. */
  repeats?: number
  /** Radius of the cylinder in px. */
  radius?: number
  /** How far the ring is tipped toward the viewer, degrees. */
  tiltX?: number
  /** Screen-plane tilt of the whole ring, degrees. */
  tiltZ?: number
  /** Nudges the ring off the stage's centre, px. */
  offsetX?: number
  offsetY?: number
  /** Seconds for one full revolution. Negative runs it anticlockwise. */
  period?: number
  /** Blur on the glyph furthest from the camera. */
  maxBlur?: number
  fontSize?: number
}

/**
 * The product name standing up around the product — a band of type on a
 * turntable, not type printed flat on one. Each glyph sits on the surface of
 * a cylinder facing outward, so the front of the ring reads square to camera.
 *
 * Two things to know before changing this:
 *
 * A flattened 2D ellipse with upright glyphs looks right at the top and
 * bottom and falls apart at the sides: where the path runs vertical on screen
 * the horizontal gap between neighbours collapses and the letters pile up.
 * Placing them on a real cylinder spends the spacing as rotation instead, so
 * it stays even the whole way round.
 *
 * The glyphs are duplicated across two layers, one behind the model and one
 * in front, each hiding the half it does not own. `preserve-3d` puts every
 * glyph in a single 3D rendering context that sorts by depth and ignores
 * z-index, so one layer could never straddle the model — and the model is a
 * WebGL canvas, which cannot join that context at all.
 */
export default function ProductRing({
  label,
  separator = '',
  gap = 4,
  repeats = 6,
  radius = 300,
  tiltX = -12,
  tiltZ = -15,
  offsetX = 0,
  offsetY = 0,
  period = 24,
  maxBlur = 3.5,
  fontSize = 26
}: ProductRingProps) {
  const backRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  const backGlyphs = useRef<(HTMLSpanElement | null)[]>([])
  const frontGlyphs = useRef<(HTMLSpanElement | null)[]>([])

  // One unit is the label and the space after it. With a separator the space
  // is split either side of it; without one it all falls between repeats.
  const glyphs = useMemo(() => {
    const pad = ' '.repeat(Math.max(1, gap))
    const unit = separator ? `${label}${pad}${separator}${pad}` : `${label}${pad}${pad}`
    return Array.from(unit.repeat(Math.max(1, repeats)))
  }, [label, separator, gap, repeats])

  useEffect(() => {
    const count = glyphs.length
    if (!count) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = 360 / count
    // Last style bucket written per glyph, so unchanged ones are skipped.
    const lastKey = new Int32Array(count).fill(-1)
    let raf = 0
    let start = 0

    const draw = (spin: number) => {
      // One write per layer turns the whole ring; the glyphs inside are
      // static and just come along for the ride.
      const frame =
        `translate(${offsetX}px, ${offsetY}px) ` +
        `rotateZ(${tiltZ}deg) rotateX(${tiltX}deg) rotateY(${spin}deg)`
      if (backRef.current) backRef.current.style.transform = frame
      if (frontRef.current) frontRef.current.style.transform = frame

      for (let i = 0; i < count; i += 1) {
        const rad = ((i * step + spin) * Math.PI) / 180
        // +1 dead ahead, -1 directly behind the product.
        const facing = Math.cos(rad)
        const behind = Math.max(0, -facing)

        // Quantised, and only written when the bucket actually changes.
        // A blur is a full re-rasterisation of the element, so pushing ~200
        // of them every frame is what makes the ring expensive — most frames
        // move a glyph far too little to be visible anyway.
        const blurStep = Math.round((maxBlur * Math.pow(behind, 1.4)) / 0.25)
        const dimStep = Math.round((1 - 0.55 * behind) / 0.02)

        const isFront = facing > 0
        // Bit 0 carries which half owns the glyph, so a glyph crossing the
        // seam still writes even when its blur and opacity have not moved.
        const key = (blurStep << 9) | (dimStep << 1) | (isFront ? 1 : 0)
        if (lastKey[i] === key) continue
        lastKey[i] = key

        const blur = blurStep ? `blur(${(blurStep * 0.25).toFixed(2)}px)` : 'none'
        const dim = (dimStep * 0.02).toFixed(2)

        const back = backGlyphs.current[i]
        if (back) {
          back.style.opacity = isFront ? '0' : dim
          back.style.filter = blur
        }
        const front = frontGlyphs.current[i]
        if (front) {
          front.style.opacity = isFront ? dim : '0'
          front.style.filter = blur
        }
      }
    }

    if (reduced || period === 0) {
      draw(0)
      return
    }

    const tick = (now: number) => {
      if (!start) start = now
      draw(((now - start) / 1000 / period) * 360)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [glyphs, radius, tiltX, tiltZ, offsetX, offsetY, period, maxBlur])

  const layer = (
    which: 'back' | 'front',
    ref: React.RefObject<HTMLDivElement>,
    store: React.MutableRefObject<(HTMLSpanElement | null)[]>
  ) => (
    <div className={`ch-ring-layer is-${which}`} ref={ref} aria-hidden="true">
      {glyphs.map((ch, i) => (
        <span
          key={i}
          className="ch-ring-glyph"
          style={{
            fontSize,
            transform: `translate(-50%, -50%) rotateY(${i * (360 / glyphs.length)}deg) translateZ(${radius}px)`
          }}
          ref={(el) => {
            store.current[i] = el
          }}
        >
          {ch}
        </span>
      ))}
    </div>
  )

  return (
    <>
      {layer('back', backRef, backGlyphs)}
      {layer('front', frontRef, frontGlyphs)}
      <span className="ch-ring-label">{label}</span>
    </>
  )
}
