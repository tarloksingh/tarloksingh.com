import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Phase = 'sealed' | 'cutting' | 'open'

interface ProductRingProps {
  /** Repeated around the ring once it is open. */
  label: string
  /** Repeated along the flat line before it is cut. */
  sealLabel?: string
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
  /** Px between glyphs while the label is still a straight line. */
  introSpacing?: number
  /** Extra degrees the ring unwinds through as it closes. */
  introWind?: number
  introDelay?: number
  introDuration?: number
  /** Seconds the two cut halves take to clear the screen. */
  cutDuration?: number
  /** Fires when the cut is through and the page should start. */
  onCut?: () => void
}

/**
 * One run of type that is the whole opening.
 *
 * It starts as a flat line reading the seal label, laid out by the same
 * per-glyph engine that draws the ring — so it is not a tape graphic sitting
 * over the page, it is the ring before it has closed. Clicking cuts the line
 * where you clicked: the glyphs either side of that point travel off in
 * opposite directions. What comes back is the same line reading the product's
 * name, and it curls into the ring.
 *
 * The cylinder is projected by hand rather than handed to CSS 3D, which is
 * what makes it affordable. The 3D version needed the glyphs duplicated
 * across two `preserve-3d` layers — one either side of the model, each hiding
 * the half it did not own — because a 3D rendering context sorts by depth and
 * ignores z-index, and the model is a WebGL canvas that cannot join that
 * context at all. At the tuned settings that came to ~590 spans, every one
 * re-rasterised each frame, because a rotated 3D transform is not something
 * the compositor can reuse.
 *
 * Projecting here instead means one set of glyphs, plain 2D transforms, and
 * z-index working normally against the canvas. `.ch-stage` carries
 * `isolation: isolate` so the far arc's -1 stays inside the stage rather than
 * dropping behind the page gradient.
 *
 * Three things are easy to undo by accident:
 *
 * Upright glyphs on a flattened 2D ellipse look right at the top and bottom
 * and fall apart at the sides, where the path runs vertical on screen the
 * horizontal gap between neighbours collapses and the letters pile up. The
 * cylinder spends that spacing as rotation, so it stays even the whole way
 * round.
 *
 * The roll has to reach the glyph, not just its position, or every letter
 * stays bolt upright while the baseline runs diagonally — a staircase rather
 * than tilted type.
 *
 * Perspective scale is what gives a word its taper, so glyphs are placed one
 * at a time rather than a word at a time. Rendering whole words would cut the
 * node count by an order of magnitude and flatten that taper out.
 */
export default function ProductRing({
  label,
  sealLabel = 'TARLOK SINGH',
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
  // smaller this gets the more violent the taper.
  perspective = 2100,
  introSpacing = 15,
  introWind = 220,
  introDelay = 0.15,
  introDuration = 2.6,
  cutDuration = 0.7,
  onCut
}: ProductRingProps) {
  const [phase, setPhase] = useState<Phase>('sealed')
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([])
  // Slot the blade fell on, so each glyph knows which way to leave.
  const cutSlot = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)

  const sealed = phase === 'sealed'
  const cutting = phase === 'cutting'

  // The line carries the seal's text until the cut is through, then the
  // product's. Same engine either way — the swap happens while both halves
  // are off screen, so the line that comes back is the one that left.
  const text = sealed || cutting ? sealLabel : label

  // One unit is the label and the space after it. With a separator the space
  // is split either side of it; without one it all falls between repeats.
  //
  // Spaces are dropped from the DOM but still consume their slot, so spacing
  // is unchanged and roughly a third of the nodes never exist. `slot` is the
  // position round the ring; `total` is how many slots there are.
  const { glyphs, total } = useMemo(() => {
    const pad = ' '.repeat(Math.max(1, gap))
    const unit = separator ? `${text}${pad}${separator}${pad}` : `${text}${pad}${pad}`
    const all = Array.from(unit.repeat(Math.max(1, repeats)))
    return {
      total: all.length,
      glyphs: all
        .map((char, slot) => ({ char, slot }))
        .filter(({ char }) => char.trim().length > 0)
    }
  }, [text, separator, gap, repeats])

  const lineHalf = ((total - 1) * introSpacing) / 2

  const cut = useCallback(
    (clientX: number) => {
      if (!sealed) return
      const box = stageRef.current?.getBoundingClientRect()
      const centre = box ? box.left + box.width / 2 : window.innerWidth / 2
      // Back out of the flat-line placement to find which slot was under the
      // pointer, so the split lands on the letter that was clicked.
      cutSlot.current = (clientX - centre - offsetX + lineHalf) / introSpacing
      setPhase('cutting')
    },
    [sealed, offsetX, lineHalf, introSpacing]
  )

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
    // Far enough that both halves are gone whatever the screen width.
    const cutTravel = window.innerWidth * 1.2

    const lastDepth = new Int8Array(count).fill(2)
    const startedAt = performance.now()
    let raf = 0

    /** `wrap` 0 lays the label out flat; 1 is the closed ring. */
    const draw = (spin: number, wrap: number, split: number) => {
      const closed = wrap >= 0.999

      for (let i = 0; i < count; i += 1) {
        const el = glyphRefs.current[i]
        if (!el) continue

        const slot = glyphs[i].slot
        const theta = ((slot * step + spin) * Math.PI) / 180
        // A point on the cylinder, then tipped and rolled — the same order
        // the CSS version applied, solved rather than delegated.
        const x0 = radius * Math.sin(theta)
        const z0 = radius * Math.cos(theta)
        const y1 = -z0 * sinX
        const z1 = z0 * cosX
        const x2 = x0 * cosZ - y1 * sinZ
        const y2 = x0 * sinZ + y1 * cosZ

        if (z1 >= zLimit && closed) {
          el.style.visibility = 'hidden'
          continue
        }

        const ringScale = z1 < zLimit ? perspective / (perspective - z1) : 1
        // Flat, the label is one straight run of type through the centre at
        // its natural size; closed, it is the projected ring. Everything in
        // between is a blend of the two, which is what makes the line appear
        // to curl into the ring rather than slide into place.
        const scale = 1 + (ringScale - 1) * wrap
        const flatX = slot * introSpacing - lineHalf
        // Each half leaves the way it is already pointing, away from the cut.
        const leaving = split * cutTravel * (slot < cutSlot.current ? -1 : 1)
        const x = flatX * (1 - wrap) + x2 * ringScale * wrap + offsetX + leaving
        const y = y2 * ringScale * wrap + offsetY

        // Glyphs on the far arc are seen from behind, so they mirror. The 3D
        // version got this for free — the element genuinely faced away and
        // the browser drew its backface. Without it the back of the ring
        // reads as the label spelled backwards rather than as its reverse.
        // Only once it is mostly closed, or the flat line reads inside out.
        const behind = z1 < 0 && wrap > 0.5
        const sx = behind ? -scale : scale

        el.style.visibility = 'visible'
        el.style.transform =
          `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ` +
          `rotate(${(tiltZ * wrap).toFixed(2)}deg) ` +
          `scale(${sx.toFixed(3)}, ${scale.toFixed(3)})`

        // Paint order and fade only change when a glyph crosses the seam, so
        // they are written then rather than every frame.
        const depth = behind ? -1 : 1
        if (lastDepth[i] !== depth) {
          lastDepth[i] = depth
          el.style.zIndex = depth === -1 ? '-1' : '1'
          el.style.opacity = depth === -1 ? '0.45' : '1'
        }
      }
    }

    if (sealed) {
      // Nothing is moving yet, so it is drawn once rather than looped.
      draw(0, 0, 0)
      return
    }

    if (reduced) {
      draw(0, cutting ? 0 : 1, 0)
      if (cutting) setPhase('open')
      return
    }

    const tick = () => {
      const seconds = (performance.now() - startedAt) / 1000

      if (cutting) {
        const t = Math.min(1, seconds / cutDuration)
        // power2.in — the halves start with the blade and accelerate away.
        draw(0, 0, t * t)
      } else {
        const t = Math.min(1, Math.max(0, (seconds - introDelay) / introDuration))
        // power3.out, matching the copy reveal and the product's entrance.
        const wrap = 1 - Math.pow(1 - t, 3)
        // The ring overshoots its resting angle and unwinds into it, so the
        // label arrives already turning rather than from a standstill.
        const spin = (period === 0 ? 0 : (seconds / period) * 360) + introWind * (1 - wrap)
        // Picks the halves up exactly where the cut threw them and draws them
        // back in as the ring closes. Dropping to 0 here instead snaps the
        // line back to a flat, centred run of the *new* text — which reads as
        // the product's name simply appearing, and is the one thing this
        // whole sequence is meant to avoid.
        draw(spin, wrap, 1 - wrap)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    glyphs,
    total,
    lineHalf,
    phase,
    sealed,
    cutting,
    radius,
    tiltX,
    tiltZ,
    offsetX,
    offsetY,
    period,
    perspective,
    introSpacing,
    introWind,
    introDelay,
    introDuration,
    cutDuration
  ])

  // Handing off once, as the halves start moving, so the page opens with the
  // cut rather than after it.
  //
  // The move to `open` is a timer rather than something the draw loop decides
  // when its progress reaches 1. Frames are not guaranteed — a backgrounded
  // tab stops them outright and decoding the model can starve them — and
  // hanging a state change off one leaves the line stuck mid-cut, still
  // reading the seal, with no way forward. A timer still fires.
  useEffect(() => {
    if (!cutting) return
    onCut?.()
    const id = window.setTimeout(() => setPhase('open'), cutDuration * 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutting, cutDuration])

  return (
    <>
      <div className="ch-ring" ref={stageRef} aria-hidden="true">
        {glyphs.map(({ char, slot }, i) => (
          <span
            key={`${text}-${slot}`}
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

      {sealed ? (
        <div
          className="ch-ring-cutter"
          role="button"
          tabIndex={0}
          aria-label={`${sealLabel} — cut to open`}
          onPointerDown={(e) => cut(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              cut(window.innerWidth / 2)
            }
          }}
        >
          <span className="ch-ring-cue">TAP TO CUT</span>
        </div>
      ) : null}

      <span className="ch-ring-label">{label}</span>
    </>
  )
}
