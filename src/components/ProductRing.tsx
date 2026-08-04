import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface ProductRingProps {
  /** Repeated around the ring once it is open. */
  label: string
  /** Repeated along the banner before it is cut. */
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
  /** Px between glyphs while the label is still a banner. */
  introSpacing?: number
  /** Extra degrees the ring unwinds through as it closes. */
  introWind?: number
  introDelay?: number
  introDuration?: number
  /** How far the banner hangs at the centre of the screen, px. */
  sag?: number
  /** How far the banner lifts and falls in the wind, px. */
  wind?: number
  /** How quickly the wind travels along it. */
  windSpeed?: number
  /** Degrees the cut ends swing down through. */
  fallAngle?: number
  /** Seconds the ends take to fall. */
  cutDuration?: number
  /** Fires when the cut is through and the page should start. */
  onCut?: () => void
}

/**
 * One banner of type that is the whole opening.
 *
 * It hangs across the screen reading the seal label, sags under its own
 * weight, and is cut where you click. The cut ends swing down from their
 * supports, and the same glyphs are then drawn up into the ring. There is no
 * tape graphic and nothing is layered over the page — this is the ring before
 * it has closed.
 *
 * Three decisions hold that together, and undoing any of them breaks it:
 *
 * **The slot count is fixed**, taken from whichever label is longer, with the
 * shorter one padded. So the glyphs are the same DOM elements before and
 * after — the text changes on them mid-flight. Sizing the run to the current
 * label instead re-mounts every glyph at the swap, which is what made the old
 * version read as two events: a banner leaving, then a different line
 * arriving.
 *
 * **Nothing leaves the screen.** The ends fall about their supports and are
 * gathered into the ring from wherever they got to. Throwing them off and
 * bringing them back is the same two-event problem in another form.
 *
 * **Every position is one blend.** `banner -> ring` is a single lerp per
 * glyph, with the fall folded into the banner side, so the transformation is
 * continuous by construction rather than a sequence that has to be timed.
 *
 * The cylinder is projected by hand rather than handed to CSS 3D. The 3D
 * version needed the glyphs duplicated across two `preserve-3d` layers,
 * because a 3D rendering context sorts by depth and ignores z-index — so no
 * layer could straddle the model, and the model is a WebGL canvas that cannot
 * join that context at all. At the tuned settings that was ~590 spans, each
 * re-rasterised every frame. `.ch-stage` carries `isolation: isolate` so the
 * far arc's -1 stays inside the stage rather than dropping behind the page
 * gradient.
 */
/** Wavelength of the gust travelling along the banner, px. */
const WIND_LENGTH = 320

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
  perspective = 2100,
  introSpacing = 15,
  introWind = 220,
  introDelay = 0.15,
  introDuration = 2.6,
  sag = 46,
  wind = 9,
  windSpeed = 0.9,
  fallAngle = 34,
  cutDuration = 0.7,
  onCut
}: ProductRingProps) {
  const [cut, setCut] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([])
  const cutSlot = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  // Set once, when the cut lands. The draw effect re-runs whenever `chars`
  // changes — which it does at the text swap, mid-animation — so a clock
  // started inside that effect resets there and the whole cut plays a second
  // time. Held out here it survives.
  const cutAt = useRef(0)

  // A fixed run length, so the same elements carry both labels and the text
  // can change on them mid-flight rather than re-mounting the whole ring.
  const { chars, total, unitLen } = useMemo(() => {
    const pad = ' '.repeat(Math.max(1, gap))
    const unitFor = (t: string) => (separator ? `${t}${pad}${separator}${pad}` : `${t}${pad}${pad}`)
    const sealUnit = unitFor(sealLabel)
    const openUnit = unitFor(label)
    const len = Math.max(sealUnit.length, openUnit.length)
    const active = (swapped ? openUnit : sealUnit).padEnd(len, ' ')
    const n = Math.max(1, repeats) * len
    return {
      unitLen: len,
      total: n,
      chars: Array.from({ length: n }, (_, i) => active[i % len])
    }
  }, [label, sealLabel, separator, gap, repeats, swapped])

  const lineHalf = ((total - 1) * introSpacing) / 2

  const startCut = useCallback(
    (clientX: number) => {
      if (cut) return
      const box = stageRef.current?.getBoundingClientRect()
      const centre = box ? box.left + box.width / 2 : window.innerWidth / 2
      cutSlot.current = (clientX - centre - offsetX + lineHalf) / introSpacing
      cutAt.current = performance.now()
      setCut(true)
    },
    [cut, offsetX, lineHalf, introSpacing]
  )

  useEffect(() => {
    if (!cut) return
    onCut?.()
    // Timers, not the draw loop. Frames are not guaranteed — a backgrounded
    // tab stops them and decoding the model starves them — and hanging a
    // state change off one leaves the banner stuck mid-cut.
    const id = window.setTimeout(
      () => setSwapped(true),
      (introDelay + introDuration * 0.45) * 1000
    )
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cut, introDelay, introDuration])

  useEffect(() => {
    if (!total) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = 360 / total
    const rx = (tiltX * Math.PI) / 180
    const rz = (tiltZ * Math.PI) / 180
    const cosX = Math.cos(rx)
    const sinX = Math.sin(rx)
    const cosZ = Math.cos(rz)
    const sinZ = Math.sin(rz)
    const zLimit = perspective * 0.92
    // The banner's supports, just off either edge of the screen.
    const half = window.innerWidth / 2

    const hidden = new Uint8Array(total)
    let raf = 0

    /** `wrap` 0 is the hanging banner; 1 is the closed ring. */
    const draw = (spin: number, wrap: number, fall: number, gust: number) => {
      const closed = wrap >= 0.999
      const theta0 = fallAngle * fall * (Math.PI / 180)

      for (let i = 0; i < total; i += 1) {
        const el = glyphRefs.current[i]
        if (!el) continue
        // Spaces hold their slot so the spacing is right, but they have
        // nothing to draw. Hidden once rather than every frame — a third of
        // the run is spaces, and the write is not free.
        if (chars[i] === ' ') {
          if (!hidden[i]) {
            hidden[i] = 1
            el.style.visibility = 'hidden'
          }
          continue
        }
        hidden[i] = 0

        // ---- banner ----
        // Hung between two supports and sagging in the middle. The curve is
        // scaled to the screen, not to the run: the run is several screens
        // wide, and a catenary across all of it leaves the visible stretch
        // dead flat, which is exactly the weightlessness this is fixing.
        const bx = i * introSpacing - lineHalf
        const u = Math.max(-1, Math.min(1, bx / half))
        // A travelling wave on top of the sag, so the cloth lifts and falls
        // along its length instead of hanging dead still. Held to zero at the
        // supports — a banner does not flap where it is tied.
        const ends = 1 - u * u
        const phase = bx / WIND_LENGTH + gust
        const by = sag * ends + wind * ends * Math.sin(phase)
        // Slope of the whole curve, so each glyph lies along the banner
        // rather than sitting bolt upright on it.
        const slope =
          (-2 * sag * u) / half + (wind * ends * Math.cos(phase)) / WIND_LENGTH
        const bAngle = Math.atan(slope)

        // The end that was cut swings down about its support; the support
        // itself does not move.
        const side = i < cutSlot.current ? -1 : 1
        const pivotX = side * half
        const dx = bx - pivotX
        const dy = by
        const swing = theta0 * -side
        const cosS = Math.cos(swing)
        const sinS = Math.sin(swing)
        const fx = pivotX + dx * cosS - dy * sinS
        const fy = dx * sinS + dy * cosS

        // ---- ring ----
        const angle = ((i * step + spin) * Math.PI) / 180
        const x0 = radius * Math.sin(angle)
        const z0 = radius * Math.cos(angle)
        const y1 = -z0 * sinX
        const z1 = z0 * cosX
        const x2 = x0 * cosZ - y1 * sinZ
        const y2 = x0 * sinZ + y1 * cosZ

        if (z1 >= zLimit && closed) {
          el.style.visibility = 'hidden'
          continue
        }

        const ringScale = z1 < zLimit ? perspective / (perspective - z1) : 1

        // ---- one blend, banner to ring ----
        const scale = 1 + (ringScale - 1) * wrap
        const x = fx * (1 - wrap) + x2 * ringScale * wrap + offsetX
        const y = fy * (1 - wrap) + y2 * ringScale * wrap + offsetY
        const spinDeg = (bAngle * (180 / Math.PI) + swing * (180 / Math.PI)) * (1 - wrap) + tiltZ * wrap

        // Glyphs on the far arc are seen from behind, so they mirror — the 3D
        // version got that free from the backface. Only once mostly closed,
        // or the banner reads inside out.
        const behind = z1 < 0 && wrap > 0.5
        const sx = behind ? -scale : scale

        el.style.visibility = 'visible'
        el.style.transform =
          `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ` +
          `rotate(${spinDeg.toFixed(2)}deg) ` +
          `scale(${sx.toFixed(3)}, ${scale.toFixed(3)})`
        el.style.zIndex = behind ? '-1' : '1'
        el.style.opacity = behind ? '0.45' : '1'
      }
    }

    if (reduced) {
      draw(0, cut ? 1 : 0, 0, 0)
      return
    }

    const tick = () => {
      const now = performance.now()
      const gust = (now / 1000) * windSpeed
      if (!cut) {
        // Hanging, waiting. Only the wind is moving.
        draw(0, 0, 0, gust)
      } else {
        // Measured from the cut itself, not from when this effect last ran.
        const seconds = (now - cutAt.current) / 1000
        // Gravity: the ends accelerate as they drop rather than easing out.
        const fall = Math.min(1, seconds / cutDuration) ** 2
        const t = Math.min(1, Math.max(0, (seconds - introDelay) / introDuration))
        const wrap = 1 - Math.pow(1 - t, 3)
        const spin = (period === 0 ? 0 : (seconds / period) * 360) + introWind * (1 - wrap)
        draw(spin, wrap, fall, gust)
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    chars,
    total,
    unitLen,
    lineHalf,
    cut,
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
    sag,
    wind,
    windSpeed,
    fallAngle,
    cutDuration
  ])

  return (
    <>
      <div className="ch-ring" ref={stageRef} aria-hidden="true">
        {chars.map((char, i) => (
          <span
            key={i}
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

      {!cut ? (
        <div
          className="ch-ring-cutter"
          role="button"
          tabIndex={0}
          aria-label={`${sealLabel} — cut to open`}
          onPointerDown={(e) => startCut(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              startCut(window.innerWidth / 2)
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
