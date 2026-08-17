import { Suspense, forwardRef, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { projects } from '../data/projects'
import { clamp, ease } from './useScrollEngine'
import type { ScrollEngine } from './useScrollEngine'
import './Gallery.css'

// The 3D stack on its own chunk — see ProductStage.tsx. Requested the first
// time the gallery wakes, which is a scroll's worth of time after first paint.
const ProductStage = lazy(() => import('./ProductStage'))

/* The work: a row of vitrines you walk along, one project at a time.

   It was a drum before — the panels on the inside wall of a cylinder, turning
   as you scrolled. Two things killed that, and both are worth writing down
   because the drum is a tempting shape to come back to:

   **A turning wall and a flat canvas cannot both be right.** The products are
   WebGL and the panels are DOM, and a canvas standing in for a cell on a
   turning wall stops matching that cell the instant it turns. The drum's
   answer was to fade the canvas out for the length of every turn, which meant
   the piece vanished every single time you moved. Sliding a row sideways has
   no such moment: nothing rotates, so nothing ever stops matching.

   **A drum has no rest.** You could stop it anywhere, and anywhere but
   square-on is two projects' titles drawn across each other. That is what
   `detentFrom` in `useScrollEngine` fixes, and once the track has detents,
   the perspective the drum was buying is being paid for at every position
   except the ones anybody ever sees.

   So: a filmstrip. `progress` is the project you are standing in front of,
   the row translates by `-progress` steps, and the piece in the case you have
   arrived at rises and fades up while the one you left sinks away. */

/* How the room is proportioned, in fractions of the window.

   Declared here, on the DOM side, and handed to the 3D row as a prop — the
   copy and the case have to travel the same distance, and a constant written
   out in both places is a constant that will be changed in one. It cannot go
   the other way: `Gallery3D` is behind the lazy chunk boundary, and importing
   anything from `../three/*` here pulls the whole 3D stack into the initial
   bundle (see ProductStage.tsx).

   Wide: the case is centred with the label beside it, and the next project is
   just off-frame at two thirds of a window away. Narrow: there is no beside,
   so a project takes the whole window, the case shrinks and rises into the
   top half, and the label goes underneath it. */
const WIDE = { stepW: 0.66, caseH: 0.46, caseY: 0 }
const NARROW = { stepW: 1, caseH: 0.3, caseY: 0.15 }
/** Below this the label cannot stand beside the case. */
const NARROW_AT = 900
/** Scroll position at which the gallery has fully arrived. */
const ARRIVE_AT = 1
/** ...and where it starts arriving, overlapping the field's departure. */
const ARRIVE_FROM = 0.5
/** Panels either side of the one in front of you that are mounted at all.
 *  One: at this step, two away is entirely off-frame, and every mounted
 *  project is a glTF or a playing video behind the scenes. */
const NEIGHBOURS = 1

const wrap = (i: number, n: number) => ((i % n) + n) % n

interface GalleryProps {
  engine: ScrollEngine
  onOpen: (projectId: string) => void
  /** Fires when a different project comes to the front — the page chrome
   *  names it, so it needs telling. */
  onFocus?: (index: number) => void
}

export default function Gallery({ engine, onOpen, onFocus }: GalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef(new Map<number, HTMLElement>())
  // What the 3D row reads every frame. A ref rather than a prop, so sliding
  // the row is not a React render per frame.
  const progressRef = useRef(0)
  const [focus, setFocus] = useState(0)
  // Held back until the gallery is genuinely on its way: building the WebGL
  // context and its glTFs while the visitor is still looking at the name
  // competes with the entrance for exactly the frames it needs.
  const [awake, setAwake] = useState(false)
  const count = projects.length
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= NARROW_AT
  )
  const layout = narrow ? NARROW : WIDE
  // Read inside the scroll loop, which must not be torn down and rebuilt
  // every time the window crosses the breakpoint.
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const onFocusRef = useRef(onFocus)
  onFocusRef.current = onFocus

  const mounted = useMemo(() => {
    const out: number[] = []
    for (let d = -NEIGHBOURS; d <= NEIGHBOURS; d++) out.push(wrap(focus + d, count))
    // A project list shorter than the window would otherwise mount the same
    // project into two slots and give it two cases.
    return [...new Set(out)]
  }, [focus, count])

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= NARROW_AT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let lastFocus = -1
    let lastAwake = false

    return engine.subscribe((state) => {
      const root = rootRef.current
      if (!root) return

      const progress = state.value - ARRIVE_AT
      const arrival = ease(state.value, ARRIVE_FROM, ARRIVE_AT)
      progressRef.current = progress

      root.style.opacity = arrival.toFixed(3)
      root.style.pointerEvents = arrival > 0.85 ? 'auto' : 'none'

      const index = wrap(Math.round(progress), count)
      if (index !== lastFocus) {
        lastFocus = index
        setFocus(index)
        onFocusRef.current?.(index)
      }

      const shouldWake = state.value > ARRIVE_FROM - 0.35
      if (shouldWake !== lastAwake) {
        lastAwake = shouldWake
        setAwake(shouldWake)
      }

      // Each mounted panel is placed along the row and faded by how far off
      // the front it is — written straight to the node, never through React.
      const step = window.innerWidth * layoutRef.current.stepW
      // The label stacks under the case on a phone instead of standing beside
      // it, which is a different resting transform. Read here rather than
      // left to the stylesheet: this writes `transform` every frame and would
      // overwrite whatever a media query had put there.
      const stacked = window.innerWidth <= NARROW_AT
      panelRefs.current.forEach((el, panelIndex) => {
        // Shortest signed distance, so passing the last project walks onward
        // into the first instead of unwinding all the way back.
        let delta = panelIndex - progress
        delta = delta - Math.round(delta / count) * count
        const x = delta * step
        el.style.transform = stacked
          ? `translate3d(calc(${x.toFixed(1)}px - 50%), 0, 0)`
          : `translate3d(${x.toFixed(1)}px, -50%, 0)`
        // Held back rather than hidden: the next label should be legible as
        // it comes, which is most of what makes the row read as a row.
        el.style.opacity = clamp(1 - Math.abs(delta) * 0.45, 0, 1).toFixed(3)
      })
    })
  }, [engine, count])

  return (
    <div className="gl" ref={rootRef}>
      {/* One canvas, holding the whole row of cases. It is *not* inside the
          track: the row slides in world units inside the scene, so the canvas
          itself never moves and the WebGL context is built exactly once. */}
      <div className="gl-room" aria-hidden="true">
        {awake ? (
          <Suspense fallback={null}>
            <ProductStage
              slots={mounted}
              count={count}
              focus={focus}
              progressRef={progressRef}
              layout={layout}
            />
          </Suspense>
        ) : null}
      </div>

      {mounted.map((index) => (
        <ProjectCopy
          key={index}
          project={projects[index]}
          onOpen={onOpen}
          ref={(el) => {
            if (el) panelRefs.current.set(index, el)
            else panelRefs.current.delete(index)
          }}
        />
      ))}
    </div>
  )
}

/* ---- one project's copy ----

   Set as the label beside a piece, not as a panel of interface: who it was
   for, when, what it is, what I did on it, and then the piece's own
   paragraph. Everything else a project has — its footage, its sections, its
   links — belongs to the case study, and putting a grid of clips next to the
   case turns the exhibit into a slide. */

interface CopyProps {
  project: (typeof projects)[number]
  onOpen: (projectId: string) => void
}

// `forwardRef`, and not a `ref` prop: this is React 18, where `ref` is not a
// prop on a function component — it is stripped before the component is
// called. Passed as one it arrives as `undefined`, no ref is ever attached,
// and every panel silently stacks on top of the first at its resting
// position, which looks like a layout bug and is not one.
const ProjectCopy = forwardRef<HTMLElement, CopyProps>(function ProjectCopy(
  { project, onOpen },
  ref
) {
  // The opening paragraph only. The intro is several paragraphs on some
  // projects, and a wall label is one.
  const lead = useMemo(() => project.intro.split('\n').filter(Boolean)[0] ?? '', [project.intro])

  /* Deliberately not animated.
     The label used to play the site's per-character reveal each time its
     project came to the front, and it read as busy rather than as arriving:
     the piece is already rising and turning a foot to the right, and a second
     thing moving at the same moment splits the arrival in two. A wall label
     is printed. It is simply there when you get to it. */
  return (
    <article className="gl-panel" ref={ref} style={{ ['--accent' as string]: project.accent }}>
      <p className="gl-client">{project.company}</p>
      <p className="gl-year">{project.timeline}</p>
      <h2 className="gl-title">{project.title}</h2>
      <p className="gl-role">{project.role}</p>
      <p className="gl-lead">{lead}</p>
      <button type="button" className="gl-open" onClick={() => onOpen(project.id)}>
        {project.restricted ? 'Read More' : 'View Project'}
      </button>
    </article>
  )
})
