import { useCallback, useEffect, useMemo, useState } from 'react'
import Detail from './Detail'
import StagePane from './Stage'
import { byYear, companiesIn, entries, FILTERS, matches, thumbOf, type Entry, type Filter } from './model'

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
  const [filter, setFilter] = useState<Filter>('all')
  const [company, setCompany] = useState<string | null>(null)
  /** Set the moment anything is clicked; `null` means the page is drifting. */
  const [pinned, setPinned] = useState<{ id: string; frame: number } | null>(
    initial ? { id: initial, frame: 0 } : null
  )
  const [drift, setDrift] = useState({ entry: 0, frame: 0 })
  const [open, setOpen] = useState<string | null>('overview')

  /* The tag row narrows first; the company row is drawn from what survives,
     so it can never offer a company with nothing behind it. */
  const tagged = useMemo(() => entries.filter((entry) => matches(entry, filter, null)), [filter])
  const companies = useMemo(() => companiesIn(tagged), [tagged])
  const visible = useMemo(
    () => tagged.filter((entry) => !company || entry.project.company === company),
    [tagged, company]
  )
  const showCompanies = filter === 'work' && companies.length > 1

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

  // A filter change re-cuts the set, so anything pinned inside the old one is
  // no longer necessarily in it. Start over rather than show a stale project.
  const changeFilter = (next: Filter) => {
    setFilter(next)
    setCompany(null)
    setPinned(null)
    setDrift({ entry: 0, frame: 0 })
  }

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
            <h1 className="v3-title">Filters</h1>
            <div className="v3-row v3-small">
              {FILTERS.map((name) => (
                <button
                  key={name}
                  className="v3-chip v3-small"
                  aria-pressed={filter === name}
                  onClick={() => changeFilter(name)}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Always rendered, so its height is held whether or not it has
                anything in it — the page does not scroll, and a row that
                appears would push everything below it down. */}
            <div className="v3-sub v3-small">
              {showCompanies && (
                <>
                  <button className="v3-chip v3-small" aria-pressed={company === null} onClick={() => setCompany(null)}>
                    everywhere
                  </button>
                  {companies.map((name) => (
                    <button
                      key={name}
                      className="v3-chip v3-small"
                      aria-pressed={company === name}
                      onClick={() => {
                        setCompany(name)
                        setPinned(null)
                        setDrift({ entry: 0, frame: 0 })
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

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
