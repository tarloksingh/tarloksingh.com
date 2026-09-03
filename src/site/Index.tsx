import { useEffect, useRef } from 'react'
import { projects } from '../data/projects'
import './Index.css'

/* Every project, as a list.

   The stage is the good way to browse and a bad way to *find* — you cannot
   see what is on the other side of the drum from inside it. This is the
   contents page: the whole body of work at once, reachable from anywhere,
   and the only navigation on a phone that doesn't require turning the drum
   past everything in between. */

interface IndexProps {
  open: boolean
  onClose: () => void
  onOpen: (projectId: string) => void
  /** Highlighted as where you currently are. */
  currentId?: string | null
}

export default function ProjectIndex({ open, onClose, onOpen, currentId }: IndexProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // `inert` while closed, so the rows are not still in the tab order behind
  // the page. Set on the node rather than as a JSX prop: React 18's types
  // don't carry the attribute, and toggling it here needs no cast.
  useEffect(() => {
    rootRef.current?.toggleAttribute('inert', !open)
  }, [open])

  // Escape closes it, and focus is sent inside so a keyboard visitor is not
  // left tabbing through the page behind.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    rootRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* The preview follows the pointer. Written on a rAF from the last known
     position rather than inside the pointermove handler: pointermove can
     fire well above 60Hz on a high-polling mouse, and a transform written
     three times between two frames is two writes thrown away. */
  useEffect(() => {
    if (!open) return
    let x = 0
    let y = 0
    let raf = 0
    let queued = false

    const draw = () => {
      queued = false
      const el = previewRef.current
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    const onMove = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!queued) {
        queued = true
        raf = requestAnimationFrame(draw)
      }
    }

    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [open])

  const preview = (src?: string) => {
    const el = previewRef.current
    const img = imageRef.current
    if (!el || !img) return
    if (src) {
      img.src = src
      el.dataset.on = 'true'
    } else {
      el.dataset.on = 'false'
    }
  }

  return (
    <div
      className={`ix${open ? ' is-open' : ''}`}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Project index"
      aria-hidden={!open}
    >
      <div className="ix-sheet">
        <header className="ix-head">
          <p className="u-label">Index — {String(projects.length).padStart(2, '0')} projects</p>
          <button type="button" className="ix-close u-link" onClick={onClose}>
            Close
          </button>
        </header>

        <ul className="ix-list">
          {projects.map((project, i) => (
            <li
              key={project.id}
              className="ix-row"
              data-current={project.id === currentId}
              style={{ ['--row' as string]: i }}
            >
              <button
                type="button"
                className="ix-row-hit"
                onClick={() => onOpen(project.id)}
                onPointerEnter={() => preview(project.hero?.poster ?? project.hero?.src)}
                onPointerLeave={() => preview(undefined)}
                onFocus={() => preview(project.hero?.poster ?? project.hero?.src)}
                onBlur={() => preview(undefined)}
              >
                <span className="u-label ix-row-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ix-row-title">{project.title}</span>
                <span className="ix-row-tagline">{project.tagline}</span>
                <span className="u-label ix-row-year">{project.timeline}</span>
                <span className="ix-row-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="15" height="15">
                    <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Sits outside the sheet so it is never clipped by the list's scroll. */}
      <div className="ix-preview" ref={previewRef} data-on="false" aria-hidden="true">
        <img ref={imageRef} alt="" decoding="async" />
      </div>
    </div>
  )
}
