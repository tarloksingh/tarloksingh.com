import { useEffect, useRef, useState } from 'react'
import './Loader.css'

/* The wait, made worth watching.

   It is measuring something real: the stills the field paints with, and the
   fonts the whole page is set in. A fake timer bar would be easier and would
   also be a lie — and worse, it would clear *before* the images it was
   pretending to count, so the first thing a visitor saw would be a field of
   empty rectangles.

   Two guards around that honesty. A floor, so a warm cache doesn't flash the
   loader for 80ms — a frame of type appearing and vanishing reads as a bug.
   And a ceiling, because one asset stalled behind a dead connection must
   never hold the entire site hostage; past it the page opens anyway and the
   stragglers arrive when they arrive. */

const MIN_MS = 1250
const MAX_MS = 9000

interface LoaderProps {
  /** Images to have decoded before the page opens. */
  preload: string[]
  onDone: () => void
}

export default function Loader({ preload, onDone }: LoaderProps) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const shownRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const startedAt = performance.now()
    let done = 0
    let settled = false
    // The real ratio, which jumps; `shownRef` chases it so the counter always
    // climbs smoothly however lumpily the assets actually land.
    let actual = 0
    const total = preload.length + 1 // + the font set
    const timers: number[] = []

    /* Finishing is driven by timers and real load events. Frames only smooth
       the number on the way there.

       That split matters: a background tab gets no `requestAnimationFrame` at
       all, so a loader whose exit condition lives inside the draw loop simply
       never exits. Open the site in a background tab, come back a minute
       later, and you would be staring at a half-drawn name. Timers keep
       running when frames do not. */
    const finishUp = () => {
      if (settled) return
      settled = true
      shownRef.current = 1
      setProgress(1)
      setLeaving(true)
      // Matches the sheet's travel in Loader.css. The page underneath is
      // already mounted and mid-entrance by the time it clears.
      timers.push(window.setTimeout(onDone, 900))
    }

    const maybeFinish = () => {
      if (settled || done < total) return
      // The floor: a warm cache would otherwise flash the loader for a frame
      // or two, which reads as a glitch rather than as speed.
      timers.push(window.setTimeout(finishUp, Math.max(0, MIN_MS - (performance.now() - startedAt))))
    }

    const bump = () => {
      done++
      actual = done / total
      maybeFinish()
    }

    // `decode()` rather than the load event: it resolves once the bitmap is
    // ready to paint, not merely downloaded. Counting downloads would clear
    // the loader while the browser was still decoding two dozen JPEGs, which
    // is exactly the stall the loader exists to cover.
    for (const src of preload) {
      const img = new Image()
      img.src = src
      img.decode().then(bump, bump)
    }

    if (document.fonts?.ready) document.fonts.ready.then(bump, bump)
    else bump()

    // The ceiling: one asset stalled behind a dead connection must never hold
    // the whole site hostage.
    timers.push(window.setTimeout(finishUp, MAX_MS))

    let raf = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      // Frame-rate independent, so the counter climbs at the same speed on a
      // 120Hz display as on a 60Hz one.
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      shownRef.current += (actual - shownRef.current) * (1 - Math.exp(-dt / 0.28))
      setProgress(shownRef.current)
      if (!settled) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(window.clearTimeout)
    }
  }, [preload, onDone])

  const percent = Math.round(progress * 100)

  return (
    <div className={`ld${leaving ? ' is-leaving' : ''}`} ref={rootRef} role="status" aria-live="polite">
      <div className="ld-sheet">
        <div className="ld-inner">
          <p className="u-label ld-eyebrow">Tarlok Singh — Portfolio</p>

          {/* The name is printed twice, exactly on top of itself: a faint
              impression underneath and the full-strength ink above, clipped
              to the progress. The type is not fading in — it is being
              *inked*, left to right, as the work arrives. */}
          <div className="ld-word" aria-hidden="true">
            <span className="ld-word-ghost">Tarlok Singh</span>
            <span className="ld-word-ink" style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}>
              Tarlok Singh
            </span>
          </div>

          <div className="ld-meter">
            <span className="ld-meter-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>

          <div className="ld-foot">
            <span className="u-label">Loading</span>
            {/* Tabular figures, or the counter jogs sideways on every digit
                that happens to be a 1. */}
            <span className="ld-count">{String(percent).padStart(3, '0')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
