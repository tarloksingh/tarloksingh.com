import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Entry, Frame } from './model'

const ModelFrame = lazy(() => import('./ModelFrame'))

/* The right-hand pane: one caption row and one box.

   Every frame of the project is mounted at once and cross-faded, so stepping
   through never shows an empty box while the next file decodes. Videos are
   paused unless they are the frame on screen — eighteen clips playing behind
   a fade is a lot of decoder for something nobody can see.

   Nothing here is cropped. A frame renders at its own aspect in the top-left
   of the box; `--a` carries that aspect to the CSS, which is also what puts
   the scrubber on the video's own bottom edge rather than the box's. */

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function Video({ frame, active }: { frame: Extract<Frame, { kind: 'flat' }>; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [at, setAt] = useState(0)
  const [length, setLength] = useState(0)

  // Only the frame on screen plays. Leaving one rewinds it, so coming back to
  // a clip starts it again rather than resuming from wherever it was paused.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) {
      void el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [active])

  const toggle = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }

  const seek = (value: number) => {
    const el = ref.current
    if (el) el.currentTime = value
    setAt(value)
  }

  return (
    <>
      <video
        ref={ref}
        src={frame.src}
        poster={frame.poster}
        muted={!frame.hasSound}
        loop
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setAt(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setLength(event.currentTarget.duration)}
      />
      <div className="v3-scrub v3-small">
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❙❙' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={length || 0}
          step={0.01}
          value={at}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek"
        />
        <span className="v3-time v3-small">
          {clock(at)} / {clock(length)}
        </span>
      </div>
    </>
  )
}

function Slide({ frame, active }: { frame: Frame; active: boolean }) {
  return (
    <div className="v3-slide" data-active={active}>
      <div className="v3-media" style={{ ['--a' as string]: frame.aspect }}>
        {frame.kind === 'model' ? (
          // Mounted only once it has been reached — a WebGL context is too
          // expensive to hold open for a frame nobody has asked for yet.
          active && (
            <Suspense fallback={<div className="v3-empty v3-small">loading model…</div>}>
              <ModelFrame src={frame.src} />
            </Suspense>
          )
        ) : frame.type === 'video' ? (
          <Video frame={frame} active={active} />
        ) : (
          <img src={frame.src} alt={frame.label ?? ''} loading="lazy" />
        )}
      </div>
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
