import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { TAGS } from '../data/projects'
import { entries, thumbOf, type Entry, type Frame } from './model'
import './Mech.css'

const MechModel = lazy(() => import('./MechModel'))

/* The project screen.

   One fixed 1920×1080 frame, scaled to whatever the window is, with black
   around it. Everything on the page is positioned in those coordinates —
   which is the only reason the leader lines can be drawn as raw geometry and
   still land on the model. Percentages of a viewport would put the elbow of
   the "animations" line through the middle of his jaw on a laptop.

   Left: who made it, and the folds. Middle: the thing itself, with its parts
   named. Right: everything else the project has to show. */

/* ---- the leaders ----

   Written per project rather than derived. They name parts of the object on
   screen — a jaw, an enclosure, a shader — and no field in the project data
   knows what is being pointed at.

   `x` is the outer end of the horizontal run and where the text sits;
   `dir` is which way the run travels from there (-1 back toward the left,
   which is a leader on the right of the model, +1 the other way). `tip` is
   where it touches. All in frame coordinates. */
interface Callout {
  label: string
  value: string
  x: number
  y: number
  len: number
  dir: -1 | 1
  tip: [number, number]
}

const CALLOUTS: Record<string, Callout[]> = {
  'mr-takahashi': [
    { label: 'name', value: 'mr.takahashi', x: 1321, y: 258, len: 119, dir: -1, tip: [1149, 313] },
    { label: '3D model', value: 'blender', x: 589, y: 391, len: 146, dir: 1, tip: [769, 420] },
    { label: 'animations', value: 'blender', x: 589, y: 727, len: 141, dir: 1, tip: [777, 673] }
  ]
}

/** The model goes first. "Open a project" means the object, and the stills are
 *  what you step to afterwards — `model.ts` appends it because the index
 *  screen wants it last. */
const modelFirst = (entry: Entry): Frame[] => [
  ...entry.frames.filter((frame) => frame.kind === 'model'),
  ...entry.frames.filter((frame) => frame.kind !== 'model')
]

function Leaders({ callouts }: { callouts: Callout[] }) {
  return (
    <svg className="mech-leaders" viewBox="0 0 1920 1080" aria-hidden>
      {callouts.map((callout, i) => {
        const elbow = callout.x + callout.dir * callout.len
        const length =
          callout.len + Math.hypot(callout.tip[0] - elbow, callout.tip[1] - callout.y)
        const delay = 220 + i * 130

        return (
          <g key={callout.label}>
            <polyline
              className="mech-leader"
              points={`${callout.x},${callout.y} ${elbow},${callout.y} ${callout.tip[0]},${callout.tip[1]}`}
              style={{ ['--l' as string]: length, animationDelay: `${delay}ms` }}
            />
            <text
              className="mech-leader-label"
              x={callout.x}
              y={callout.y - 9}
              textAnchor={callout.dir === -1 ? 'end' : 'start'}
              style={{ animationDelay: `${delay + 300}ms` }}
            >
              {callout.label}
            </text>
            <text
              className="mech-leader-value"
              x={callout.x}
              y={callout.y + 21}
              textAnchor={callout.dir === -1 ? 'end' : 'start'}
              style={{ animationDelay: `${delay + 380}ms` }}
            >
              {callout.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Flat({ frame }: { frame: Extract<Frame, { kind: 'flat' }> }) {
  if (frame.type === 'video') {
    // Muted whether or not the clip carries audio: this screen has no player
    // chrome, and an unmuted clip is one a browser refuses to start — which
    // reads as a broken frame rather than as a considered silence.
    return <video className="mech-flat" src={frame.src} poster={frame.poster} muted loop autoPlay playsInline />
  }
  return <img className="mech-flat" src={frame.src} alt={frame.label ?? ''} />
}

interface Props {
  id: string
  onHome: () => void
}

export default function Mech({ id, onHome }: Props) {
  const entry = entries.find((item) => item.project.id === id) ?? null
  const frames = useMemo(() => (entry ? modelFirst(entry) : []), [entry])
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState<string | null>('overview')
  const rail = useRef<HTMLDivElement>(null)

  const current = frames[index]

  // A project with a dozen frames outruns the rail's height, so stepping with
  // the arrow keys has to bring the tile back into view.
  useEffect(() => {
    rail.current?.children[index]?.scrollIntoView({ block: 'nearest' })
  }, [index])

  // ← / → step the rail, the same as clicking it.
  useEffect(() => {
    if (frames.length < 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') setIndex((at) => (at - 1 + frames.length) % frames.length)
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') setIndex((at) => (at + 1) % frames.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length])

  if (!entry || !current) return <div className="mech" />

  const { project } = entry
  const roles = project.sections.find((section) => section.id === 'roles')?.tags ?? []
  const callouts = current.kind === 'model' ? (CALLOUTS[project.id] ?? []) : []

  const folds = [
    ...(project.intro ? [{ id: 'overview', title: 'project overview', text: project.intro, tags: undefined }] : []),
    ...project.sections
      .filter((section) => section.id !== 'roles')
      .map((section) => ({ id: section.id, title: section.title.toLowerCase(), text: section.text, tags: section.tags }))
  ]

  return (
    <div className="mech">
      <div className="mech-frame">
        <header className="mech-head">
          <button className="mech-wordmark" onClick={onHome}>
            Tarlok Singh
          </button>
          <nav className="mech-nav">
            <span className="mech-nav-here">{project.title.toLowerCase()}</span>
            {TAGS.filter((tag) => tag !== 'work').map((tag) => (
              <span key={tag} data-on={project.tags.includes(tag)}>
                {tag}
              </span>
            ))}
          </nav>
        </header>

        {/* The object, and its parts named. Both live in the frame rather than
            in a box of their own — the leaders run right out past the model
            into the left column's gutter, which a box would clip. */}
        <div className="mech-stage">
          {current.kind === 'model' ? (
            <Suspense fallback={null}>
              <MechModel src={current.src} />
            </Suspense>
          ) : (
            <Flat frame={current} />
          )}
        </div>

        {/* Keyed on the frame so stepping away and back redraws the leaders
            rather than leaving them already extended. */}
        {callouts.length > 0 && <Leaders key={current.id} callouts={callouts} />}

        <section className="mech-side">
          <h1 className="mech-title">{project.title}</h1>
          {roles.length > 0 && <p className="mech-roles">{roles.join(', ').toLowerCase()}</p>}

          <div className="mech-folds">
            {folds.map((fold) => {
              const isOpen = open === fold.id
              return (
                <div className="mech-fold" key={fold.id} data-open={isOpen}>
                  <button onClick={() => setOpen(isOpen ? null : fold.id)} aria-expanded={isOpen}>
                    <span className="mech-pip" />
                    <span>{fold.title}</span>
                  </button>
                  {isOpen && (
                    <div className="mech-fold-body">
                      {fold.tags ? fold.tags.join(', ').toLowerCase() : fold.text}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div className="mech-rail" ref={rail}>
          {frames.map((frame, i) => {
            const thumb = thumbOf(frame)
            return (
              <button
                key={frame.id}
                className="mech-tile"
                aria-pressed={i === index}
                aria-label={frame.label ?? project.title}
                title={frame.label ?? project.title}
                style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                onClick={() => setIndex(i)}
              >
                {thumb ? null : <span>3D</span>}
              </button>
            )
          })}
        </div>

        <footer className="mech-foot">
          <span className="mech-caption">{current.label ?? project.tagline}</span>
          <a href="mailto:hello@tarloksingh.com">hello@tarloksingh.com</a>
        </footer>
      </div>
    </div>
  )
}
