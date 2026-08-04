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
  fontSize?: number
  /** Viewing distance for the projection. Matches CSS `perspective`. */
  perspective?: number
  /** Pixels below its resting place the ring rises in from. */
  introFrom?: number
  introDelay?: number
  introDuration?: number
}

/**
 * The product name standing up around the product — a band of type on a
 * turntable, not type printed flat on one. Each glyph faces the camera, so
 * the front of the ring reads square on.
 *
 * The cylinder is projected by hand rather than handed to CSS 3D, which is
 * what makes it affordable. The 3D version needed the glyphs duplicated
 * across two `preserve-3d` layers — one either side of the model, each hiding
 * the half it did not own — because a 3D rendering context sorts by depth and
 * ignores z-index, and the model is a WebGL canvas that cannot join that
 * context at all. At the tuned settings that came to ~590 spans, every one of
 * them re-rasterised each frame, because a rotated 3D transform is not
 * something the compositor can reuse.
 *
 * Projecting here instead means one set of glyphs, plain 2D transforms, and
 * z-index working normally against the canvas. `.ch-stage` carries
 * `isolation: isolate` so the far arc's -1 stays inside the stage rather than
 * dropping behind the page gradient.
 *
 * Two things to know before changing the geometry:
 *
 * Upright glyphs on a flattened 2D ellipse look right at the top and bottom
 * and fall apart at the sides, where the path runs vertical on screen the
 * horizontal gap between neighbours collapses and the letters pile up. The
 * cylinder spends that spacing as rotation, so it stays even the whole way
 * round.
 *
 * Perspective scale is what gives a word its taper, so glyphs are placed one
 * at a time rather than a word at a time. Rendering whole words would cut the
 * node count by an order of magnitude and flatten that taper out.
 */
export default function ProductRing({
  label,
  separator = '',
  gap = 2,
  repeats = 21,
  radius = 695,
  tiltX = -5,
  tiltZ = 18,
  offsetX = -16,
  offsetY = -68,
  period = -126,
  fontSize = 19,
  // How hard the near arc is magnified against the far one: the ratio across
  // the ring is (perspective + radius) / (perspective - radius), so the
  // smaller this gets the more violent the taper. 1100 matched the CSS
  // version's own `perspective` but reads far heavier at a 695 radius.
  perspective = 2100,
  introFrom = 730,
  introDelay = 0.5,
  introDuration = 2.4
}: ProductRingProps) {
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([])

  // One unit is the label and the space after it. With a separator the space
  // is split either side of it; without one it all falls between repeats.
  //
  // Spaces are dropped from the DOM but still consume their slot, so spacing
  // is unchanged and roughly a third of the nodes never exist. `slot` is the
  // position round the ring; `total` is how many slots there are.
  const { glyphs, total } = useMemo(() => {
    const pad = ' '.repeat(Math.max(1, gap))
    const unit = separator ? `${label}${pad}${separator}${pad}` : `${label}${pad}${pad}`
    const all = Array.from(unit.repeat(Math.max(1, repeats)))
    return {
      total: all.length,
      glyphs: all
        .map((char, slot) => ({ char, slot }))
        .filter(({ char }) => char.trim().length > 0)
    }
  }, [label, separator, gap, repeats])

  useEffect(() => {
    const count = glyphs.length
    if (!count) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = 360 / total
    const rx = (tiltX * Math.PI) / 180
    const rz = (tiltZ * Math.PI) / 180
    const cosX = Math.cos(rx)
    const sinX = Math.sin(rx)
    const cosZ = Math.cos(rz)
    const sinZ = Math.sin(rz)
    // Anything this close to the eye is past the viewer's shoulder; CSS clips
    // it, and without the guard the divide below blows up.
    const zLimit = perspective * 0.92

    const lastDepth = new Int8Array(count).fill(2)
    const startedAt = performance.now()
    let raf = 0

    const draw = (spin: number, rise: number) => {
      for (let i = 0; i < count; i += 1) {
        const el = glyphRefs.current[i]
        if (!el) continue

        const theta = ((glyphs[i].slot * step + spin) * Math.PI) / 180
        // A point on the cylinder, then tipped and rolled — the same order
        // the CSS version applied, solved rather than delegated.
        const x0 = radius * Math.sin(theta)
        const z0 = radius * Math.cos(theta)
        const y1 = -z0 * sinX
        const z1 = z0 * cosX
        const x2 = x0 * cosZ - y1 * sinZ
        const y2 = x0 * sinZ + y1 * cosZ

        if (z1 >= zLimit) {
          el.style.visibility = 'hidden'
          continue
        }

        const scale = perspective / (perspective - z1)
        const x = x2 * scale + offsetX
        const y = y2 * scale + offsetY + rise

        // Glyphs on the far arc are seen from behind, so they mirror. The 3D
        // version got this for free — the element genuinely faced away and
        // the browser drew its backface. Without it the back of the ring
        // reads as the label spelled backwards rather than as its reverse.
        const sx = z1 < 0 ? -scale : scale

        el.style.visibility = 'visible'
        el.style.transform =
          `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ` +
          `scale(${sx.toFixed(3)}, ${scale.toFixed(3)})`

        // Paint order and fade only change when a glyph crosses the seam, so
        // they are written then rather than every frame.
        const depth = z1 < 0 ? -1 : 1
        if (lastDepth[i] !== depth) {
          lastDepth[i] = depth
          el.style.zIndex = depth === -1 ? '-1' : '1'
          el.style.opacity = depth === -1 ? '0.45' : '1'
        }
      }
    }

    if (reduced) {
      draw(0, 0)
      return
    }

    const tick = () => {
      const seconds = (performance.now() - startedAt) / 1000
      const spin = period === 0 ? 0 : (seconds / period) * 360
      // Rises with the product, on the same clock and the same easing.
      const t = Math.min(1, Math.max(0, (seconds - introDelay) / introDuration))
      draw(spin, introFrom * Math.pow(1 - t, 3))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    glyphs,
    total,
    radius,
    tiltX,
    tiltZ,
    offsetX,
    offsetY,
    period,
    perspective,
    introFrom,
    introDelay,
    introDuration
  ])

  return (
    <>
      <div className="ch-ring" aria-hidden="true">
        {glyphs.map(({ char, slot }, i) => (
          <span
            key={slot}
            className="ch-ring-glyph"
            style={{ fontSize }}
            ref={(el) => {
              glyphRefs.current[i] = el
            }}
          >
            {char}
          </span>
        ))}
      </div>
      <span className="ch-ring-label">{label}</span>
    </>
  )
}
