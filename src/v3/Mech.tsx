import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { TAGS } from '../data/projects'
import MechCursor from './MechCursor'
import { entries, thumbOf, type Entry, type Frame } from './model'
import './Mech.css'

const MechModel = lazy(() => import('./MechModel'))

/* The project screen.

   Laid out in the Figma's 1920×1080 coordinates, but not confined to them.
   `--px` is one of those coordinates in real pixels, scaled to whatever the
   window is; the chrome hangs off the true viewport edges while the subject
   and its leader lines share one centred 16:9 box. So the page fills the
   screen at any shape, and the labels still touch the thing they name —
   which is the entire job of a readout.

   Left: who made it, and the folds. Middle: the thing itself, with its parts
   named. Right: everything else the project has to show. */

/* ---- the leaders ---- */

/** One line of a readout: what is being pointed at, and what it is. */
interface Note {
  label: string
  value: string
}

/** Where a leader leaves its subject and where its text ends up.
 *
 *  `at` is a fraction of the subject's box, `elbow` the corner's offset from
 *  that tip, `run` how far the horizontal reaches, and `dir` which way it
 *  travels. The three are traced off the Figma's takahashi frame and reused
 *  for every subject — a still gets the same arms the model does. */
const SLOTS = [
  { at: [0.94, 0.08], elbow: [53, -55], run: 119, dir: 1 },
  { at: [0.0, 0.285], elbow: [-34, -29], run: 146, dir: -1 },
  { at: [0.02, 0.764], elbow: [-47, 54], run: 141, dir: -1 }
] as const

/** How far in from the frame's edges a leader's text may land — clear of the
 *  left column on one side and the rail on the other. A wide still pushes its
 *  elbows outward, and without this the "made in" line would be set on top of
 *  the project overview. */
const GUTTER = { left: 470, right: 1450 }

/** The subject's box in frame coordinates. The model's is measured off the
 *  Figma; a still's is wherever the media actually lands, which is the same
 *  sum the CSS makes so the two can never disagree. */
const MODEL_BOX = { x: 769, y: 269, w: 403, h: 529 }
const MEDIA_MAX = { w: 780, h: 730 }

const mediaBox = (aspect: number) => {
  const w = Math.min(MEDIA_MAX.w, MEDIA_MAX.h * aspect)
  const h = w / aspect
  return { x: 960 - w / 2, y: 540 - h / 2, w, h }
}

const boxOf = (frame: Frame) => (frame.kind === 'model' ? MODEL_BOX : mediaBox(frame.aspect))

const leadersFor = (notes: Note[], box: { x: number; y: number; w: number; h: number }) =>
  notes.slice(0, SLOTS.length).map((note, i) => {
    const slot = SLOTS[i]
    const tip = [box.x + slot.at[0] * box.w, box.y + slot.at[1] * box.h]
    const elbow = [tip[0] + slot.elbow[0], tip[1] + slot.elbow[1]]
    const room = slot.dir === 1 ? GUTTER.right - elbow[0] : elbow[0] - GUTTER.left
    const run = Math.max(40, Math.min(slot.run, room))
    return {
      ...note,
      tip,
      elbow,
      end: elbow[0] + slot.dir * run,
      anchor: slot.dir === 1 ? ('end' as const) : ('start' as const)
    }
  })

/* What each frame's leaders say. Keyed by frame id — "<project>/<file>", the
   id the media already carries — so adding a line is two words and no
   geometry. A frame not written here gets a derived pair instead, which is a
   placeholder and reads like one. */
const NOTES: Record<string, Note[]> = {
  'mr-takahashi/model': [
    { label: 'name', value: 'mr.takahashi' },
    { label: '3D model', value: 'blender' },
    { label: 'animations', value: 'blender' }
  ]
}

const derive = (entry: Entry, frame: Frame): Note[] => {
  const tools = entry.project.sections.find((section) => section.id === 'tools')?.tags ?? []
  const kind = frame.kind === 'model' ? 'model' : frame.type === 'video' ? 'clip' : 'still'
  return [
    { label: kind, value: (frame.label ?? entry.project.title).toLowerCase() },
    ...(tools.length > 0 ? [{ label: 'made in', value: tools[0].toLowerCase() }] : [])
  ]
}

/** The model goes first. "Open a project" means the object, and the stills are
 *  what you step to afterwards — `model.ts` appends it because the index
 *  screen wants it last. */
const modelFirst = (entry: Entry): Frame[] => [
  ...entry.frames.filter((frame) => frame.kind === 'model'),
  ...entry.frames.filter((frame) => frame.kind !== 'model')
]

function Leaders({ notes, box }: { notes: Note[]; box: ReturnType<typeof boxOf> }) {
  return (
    <svg className="mech-leaders" viewBox="0 0 1920 1080" preserveAspectRatio="none" aria-hidden>
      {leadersFor(notes, box).map((leader, i) => {
        const y = leader.elbow[1]
        const length =
          Math.abs(leader.end - leader.elbow[0]) +
          Math.hypot(leader.tip[0] - leader.elbow[0], leader.tip[1] - y)
        const delay = 200 + i * 130

        return (
          <g key={leader.label}>
            <polyline
              className="mech-leader"
              points={`${leader.end},${y} ${leader.elbow[0]},${y} ${leader.tip[0]},${leader.tip[1]}`}
              style={{ ['--l' as string]: length, animationDelay: `${delay}ms` }}
            />
            <text
              className="mech-leader-label"
              x={leader.end}
              y={y - 9}
              textAnchor={leader.anchor}
              style={{ animationDelay: `${delay + 300}ms` }}
            >
              {leader.label}
            </text>
            <text
              className="mech-leader-value"
              x={leader.end}
              y={y + 21}
              textAnchor={leader.anchor}
              style={{ animationDelay: `${delay + 380}ms` }}
            >
              {leader.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Flat({ frame }: { frame: Extract<Frame, { kind: 'flat' }> }) {
  const box = mediaBox(frame.aspect)
  const size = { width: `calc(${box.w} * var(--px))`, height: `calc(${box.h} * var(--px))` }

  if (frame.type === 'video') {
    // Muted whether or not the clip carries audio: this screen has no player
    // chrome, and an unmuted clip is one a browser refuses to start — which
    // reads as a broken frame rather than as a considered silence.
    return <video className="mech-flat" style={size} src={frame.src} poster={frame.poster} muted loop autoPlay playsInline />
  }
  return <img className="mech-flat" style={size} src={frame.src} alt={frame.label ?? ''} />
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

  // The arrow keys step the rail, the same as clicking it.
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
  const notes = NOTES[current.id] ?? derive(entry, current)

  const folds = [
    ...(project.intro ? [{ id: 'overview', title: 'project overview', text: project.intro, tags: undefined }] : []),
    ...project.sections
      .filter((section) => section.id !== 'roles')
      .map((section) => ({ id: section.id, title: section.title.toLowerCase(), text: section.text, tags: section.tags }))
  ]

  return (
    <div className="mech">
      <MechCursor />

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

      {/* The subject and its labels share one box so that scaling the window
          moves them together. */}
      <div className="mech-stage">
        {current.kind === 'model' ? (
          <Suspense fallback={null}>
            <MechModel src={current.src} />
          </Suspense>
        ) : (
          <Flat frame={current} />
        )}
        {/* Keyed on the frame, so stepping the rail draws the leaders out
            again rather than revealing them already extended. */}
        <Leaders key={current.id} notes={notes} box={boxOf(current)} />
      </div>

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

                {/* Always mounted, and opened by growing its row from 0fr to
                    1fr — the only way a panel of unknown height can animate
                    shut as well as open. */}
                <div className="mech-fold-body">
                  <div>
                    <span className="mech-fold-rule" />
                    <p>{fold.tags ? fold.tags.join(', ').toLowerCase() : fold.text}</p>
                  </div>
                </div>
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
  )
}
