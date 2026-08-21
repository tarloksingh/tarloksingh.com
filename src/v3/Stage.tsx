import { lazy, Suspense, useEffect } from 'react'
import type { Entry, Frame } from './model'

const ModelFrame = lazy(() => import('./ModelFrame'))

/* The right-hand pane: one caption row and one 629×630 box.

   Every frame of the project is mounted at once and cross-faded, so stepping
   through never shows an empty box while the next file decodes. Videos are
   paused unless they are the frame on screen — eighteen clips playing behind
   a fade is a lot of decoder for something nobody can see. */

function Slide({ frame, active }: { frame: Frame; active: boolean }) {
  if (frame.kind === 'model') {
    return (
      <div className="v3-slide" data-active={active}>
        {/* Mounted only once it has been reached — a WebGL context is too
            expensive to hold open for a frame nobody has asked for yet. */}
        {active && (
          <Suspense fallback={<div className="v3-empty v3-small">loading model…</div>}>
            <ModelFrame src={frame.src} />
          </Suspense>
        )}
      </div>
    )
  }

  if (frame.type === 'video') {
    return (
      <div className="v3-slide" data-active={active}>
        <video
          src={frame.src}
          poster={frame.poster}
          muted={!frame.hasSound}
          loop
          playsInline
          preload="metadata"
          ref={(el) => {
            if (!el) return
            if (active) void el.play().catch(() => {})
            else el.pause()
          }}
        />
      </div>
    )
  }

  return (
    <div className="v3-slide" data-active={active}>
      <img src={frame.src} alt={frame.label ?? ''} loading="lazy" />
    </div>
  )
}

interface Props {
  entry: Entry | null
  index: number
  onStep: (index: number) => void
}

export default function StagePane({ entry, index, onStep }: Props) {
  const frames = entry?.frames ?? []
  const current = frames[index]

  // ← / → step the carousel whenever a project is on screen.
  useEffect(() => {
    if (frames.length < 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onStep((index - 1 + frames.length) % frames.length)
      if (event.key === 'ArrowRight') onStep((index + 1) % frames.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length, index, onStep])

  if (!entry || !current) {
    return (
      <div className="v3-stage">
        <div className="v3-caption" />
        <div className="v3-frame">
          <div className="v3-empty v3-small">nothing here yet</div>
        </div>
      </div>
    )
  }

  const step = (delta: number) => onStep((index + delta + frames.length) % frames.length)

  return (
    <div className="v3-stage">
      <div className="v3-caption">
        <span className="v3-italic">{current.label ?? entry.project.title}</span>
        <span className="v3-small">{entry.year}</span>
      </div>

      <div className="v3-frame">
        {frames.map((frame, i) => (
          <Slide key={frame.id} frame={frame} active={i === index} />
        ))}

        {frames.length > 1 && (
          <>
            <button className="v3-arrow" data-side="prev" onClick={() => step(-1)} aria-label="Previous">
              ‹
            </button>
            <button className="v3-arrow" data-side="next" onClick={() => step(1)} aria-label="Next">
              ›
            </button>
            <div className="v3-dots">
              {frames.map((frame, i) => (
                <button
                  key={frame.id}
                  className="v3-dot"
                  aria-current={i === index}
                  aria-label={frame.label ?? `Frame ${i + 1}`}
                  onClick={() => onStep(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
