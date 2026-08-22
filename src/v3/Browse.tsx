import { useCallback, useEffect, useState } from 'react'
import Detail from './Detail'
import StagePane from './Stage'
import { byYear, entries, thumbOf, type Entry } from './model'

/* Idle drift. With nothing picked the page walks itself: a few frames of a
   project, then on to the next one. Long enough to read a frame, short
   enough that the page is visibly alive. */
const DRIFT_MS = 4000
const DRIFT_FRAMES = 3

interface Props {
  /** A project to open on arrival — set when a wall tile sent us here. */
  initial?: string | null
  onHome: () => void
}

export default function Browse({ initial = null, onHome }: Props) {
  /** Set the moment anything is clicked; `null` means the page is drifting. */
  const [pinned, setPinned] = useState<{ id: string; frame: number } | null>(
    initial ? { id: initial, frame: 0 } : null
  )
  const [drift, setDrift] = useState({ entry: 0, frame: 0 })
  const [open, setOpen] = useState<string | null>('overview')

  /* No filtering: every project that has media is on the timeline. Ten
     projects is a row someone scans in a glance, not a set that needs
     narrowing — and a chip that returns nothing (`tools`, `motion`, `music`
     all currently do) reads as a hiring manager finding a gap, not as an
     empty state. Each project's tags print on its own card instead, in
     `Detail`, where they can never come back empty. */
  const visible = entries

  const active: Entry | null = pinned
    ? (visible.find((entry) => entry.project.id === pinned.id) ?? null)
    : (visible[drift.entry % Math.max(visible.length, 1)] ?? null)

  const frameIndex = Math.min(pinned ? pinned.frame : drift.frame, Math.max((active?.frames.length ?? 1) - 1, 0))

  // Drift, until something is pinned.
  useEffect(() => {
    if (pinned || visible.length === 0) return
    const timer = window.setInterval(() => {
      setDrift((current) => {
        const entry = visible[current.entry % visible.length]
        const limit = Math.min(entry?.frames.length ?? 1, DRIFT_FRAMES)
        if (current.frame + 1 < limit) return { ...current, frame: current.frame + 1 }
        return { entry: (current.entry + 1) % visible.length, frame: 0 }
      })
    }, DRIFT_MS)
    return () => window.clearInterval(timer)
  }, [pinned, visible])

  const step = useCallback(
    (index: number) => {
      if (!active) return
      setPinned({ id: active.project.id, frame: index })
    },
    [active]
  )

  return (
    <div className="v3">
      <header className="v3-head">
        <button className="v3-wordmark v3-linkish" onClick={onHome}>
          Tarlok Singh
        </button>
      </header>

      <div className="v3-column">
        <section className="v3-block v3-browse">
          <div className="v3-group">
            <h1 className="v3-title">Timeline</h1>
            <div className="v3-timeline-row">
              {byYear(visible).map(({ year, entries: group }) => (
                <div className="v3-year" key={year}>
                  <span className="v3-small">{year}</span>
                  <div className="v3-thumbs">
                    {group.map((entry) => {
                      /* One square per project — its first frame. The
                         timeline reaches a project; the carousel is what
                         goes through it. */
                      const frame = entry.frames[0]
                      const thumb = thumbOf(frame)
                      return (
                        <button
                          key={entry.project.id}
                          className={`v3-thumb${thumb ? '' : ' v3-thumb-model'}`}
                          style={{
                            ...(thumb ? { backgroundImage: `url(${thumb})` } : {}),
                            ['--a' as string]: frame.aspect
                          }}
                          aria-pressed={active?.project.id === entry.project.id}
                          aria-label={entry.project.title}
                          title={entry.project.title}
                          onClick={() => {
                            setPinned({ id: entry.project.id, frame: 0 })
                            setOpen('overview')
                          }}
                        >
                          {thumb ? null : '3D'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="v3-block v3-project">
          {/* Opening a fold is someone settling in to read, so it pins the
              project too — drifting off mid-paragraph is the one thing the
              idle behaviour must never do. */}
          <Detail
            entry={active}
            open={open}
            onToggle={(id) => {
              setOpen((current) => (current === id ? null : id))
              if (active) setPinned({ id: active.project.id, frame: frameIndex })
            }}
          />
          <StagePane entry={active} index={frameIndex} onStep={step} />
        </section>
      </div>

      <footer className="v3-foot">
        <a className="v3-email" href="mailto:hello@tarloksingh.com">
          hello@tarloksingh.com
        </a>
      </footer>
    </div>
  )
}
