import {
  Suspense,
  forwardRef,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { workProjects } from '../data/projects'
import { NARROW, NARROW_AT, PANEL_H, PANEL_W, STAGE_SHIFT, WIDE } from './room'
import type { RoomLayout, RoomTuning } from './room'
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
   and the row translates by `-progress` steps — every piece simply standing
   in its case, the way it would in a museum, with no arrival of its own. */

/* How the room is proportioned: `WIDE`, `NARROW`, `NARROW_AT` and
   `STAGE_SHIFT` in room.ts, in fractions of the window.

   They are resolved here, on the DOM side, and the finished `RoomLayout` is
   handed to the 3D row as a prop — the copy and the case have to travel the
   same distance, and one of them working from a base number while the other
   works from a corrected one is exactly how the label ends up a hand's width
   off its piece. So the tuning panel's spacing and shift are folded in *once*,
   below, and both sides read the result. */

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
  /** The old-film experiment — see `noir` in Site.tsx, which owns the one
   *  toggle for it across the whole stage. */
  noir?: boolean
}

export default function Gallery({ engine, onOpen, onFocus, noir = false }: GalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const grainRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef(new Map<number, HTMLElement>())
  // What the 3D row reads every frame. A ref rather than a prop, so sliding
  // the row is not a React render per frame.
  const progressRef = useRef(0)
  const [focus, setFocus] = useState(0)
  // Held back until the gallery is genuinely on its way: building the WebGL
  // context and its glTFs while the visitor is still looking at the name
  // competes with the entrance for exactly the frames it needs.
  const [awake, setAwake] = useState(false)
  const count = workProjects.length
  /* What the tuning panel has set. It lives inside the 3D chunk (leva is that
     chunk's dependency, not the initial bundle's) and reports back up here,
     because the room's proportions are this side's to own — the labels have
     to move with the cases, and only this side can move them. */
  const [tuning, setTuning] = useState<RoomTuning>({
    spacing: 1,
    shift: STAGE_SHIFT,
    narrowAt: NARROW_AT,
    panelW: PANEL_W,
    panelH: PANEL_H
  })
  const onTune = useCallback((next: RoomTuning) => setTuning(next), [])

  /* The old-film experiment. `noir` arrives as a prop now — Site.tsx owns the
     one toggle for it, so the look survives navigating into a case study and
     back rather than resetting. Read inside the scroll loop through a ref,
     same reason `layout` and `narrow` are: the subscription is set up once
     and must not be torn down every toggle. */
  const noirRef = useRef(noir)
  noirRef.current = noir

  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= NARROW_AT
  )

  const layout = useMemo<RoomLayout>(() => {
    const base = narrow ? NARROW : WIDE
    return {
      stepW: base.stepW * tuning.spacing,
      caseH: base.caseH,
      caseY: base.caseY,
      // Zero when the label is stacked under the case: there is nothing
      // standing beside the piece then, so the pair is already centred and
      // shifting it would only push it off.
      shiftW: narrow ? 0 : tuning.shift / 100
    }
  }, [narrow, tuning.spacing, tuning.shift])

  // Read inside the scroll loop, which must not be torn down and rebuilt
  // every time the window crosses the breakpoint.
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const narrowRef = useRef(narrow)
  narrowRef.current = narrow
  const onFocusRef = useRef(onFocus)
  onFocusRef.current = onFocus

  const mounted = useMemo(() => {
    const out: number[] = []
    for (let d = -NEIGHBOURS; d <= NEIGHBOURS; d++) out.push(wrap(focus + d, count))
    // A project list shorter than the window would otherwise mount the same
    // project into two slots and give it two cases.
    return [...new Set(out)]
  }, [focus, count])

  // Re-run on `narrowAt` as well as on resize, and check immediately: moving
  // the breakpoint has to take effect at the window's current width, not at
  // whatever width it is next dragged to.
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth <= tuning.narrowAt)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [tuning.narrowAt])

  /* The stage shift reaches the wall label through a custom property, because
     the label is placed by `left` in the stylesheet and by `transform` from
     the scroll loop below, and neither of those can be given a second value
     to add. Written inline, so it beats the stylesheet's own default and its
     narrow-window override — which is why `shiftW` is already zeroed for
     narrow above rather than being left to the media query. */
  useEffect(() => {
    rootRef.current?.style.setProperty('--stage-shift', `${(layout.shiftW * 100).toFixed(2)}%`)
  }, [layout.shiftW])

  // The panel's own size — see `.gl-panel` in Gallery.css, which reads these
  // rather than a fixed width and height now that the tuning panel controls
  // them (`panelW`/`panelH` in `LAYOUT_SCHEMA`, `Gallery3D.tsx`).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.style.setProperty('--panel-w', `${tuning.panelW}vw`)
    root.style.setProperty('--panel-h', `${tuning.panelH}vh`)
  }, [tuning.panelW, tuning.panelH])

  useEffect(() => {
    let lastFocus = -1
    let lastAwake = false
    /** Which 12th-of-a-second the DOM was last actually written on, in noir —
     *  see below. */
    let lastFrame = -1

    return engine.subscribe((state) => {
      const root = rootRef.current
      if (!root) return

      const progress = state.value - ARRIVE_AT
      progressRef.current = progress

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

      /* Only the grain steps to a real wall-clock 12fps in noir — an ambient
         flicker, not something anyone is tracking with their eye or their
         scroll wheel. Everything below this (the room's own opacity, and
         where every panel actually sits) keeps following the scroll at the
         display's own framerate regardless: it is what the visitor is
         scrolling *to see move*, and stepping the one thing that answers
         "where am I" is what a "true 12fps" pass first made feel laggy
         rather than cinematic. */
      if (noirRef.current) {
        const frame = Math.floor((performance.now() / 1000) * 12)
        if (frame !== lastFrame) {
          lastFrame = frame
          const grain = grainRef.current
          if (grain) {
            grain.style.transform = `translate3d(${(Math.random() * 180 - 90).toFixed(0)}px, ${(
              Math.random() * 180 - 90
            ).toFixed(0)}px, 0)`
            grain.style.opacity = (0.1 + Math.random() * 0.07).toFixed(3)
          }
        }
      }

      const arrival = ease(state.value, ARRIVE_FROM, ARRIVE_AT)
      root.style.opacity = arrival.toFixed(3)
      root.style.pointerEvents = arrival > 0.85 ? 'auto' : 'none'

      // Each mounted panel is placed along the row and faded by how far off
      // the front it is — written straight to the node, never through React.
      // `stepW` already carries the tuning panel's spacing, so the labels
      // spread and close with the cases rather than staying put while the row
      // moves out from under them.
      const step = window.innerWidth * layoutRef.current.stepW
      // The label stacks under the case on a phone instead of standing beside
      // it, which is a different resting transform. Read here rather than
      // left to the stylesheet: this writes `transform` every frame and would
      // overwrite whatever a media query had put there.
      const stacked = narrowRef.current
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
    <div className="gl" ref={rootRef} data-narrow={narrow} data-noir={noir}>
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
              onTune={onTune}
              noir={noir}
            />
          </Suspense>
        ) : null}
      </div>

      {mounted.map((index) => (
        <ProjectCopy
          key={index}
          project={workProjects[index]}
          onOpen={onOpen}
          ref={(el) => {
            if (el) panelRefs.current.set(index, el)
            else panelRefs.current.delete(index)
          }}
        />
      ))}

      {/* The old-film experiment's grain and vignette — the same
          print-and-projector language `Intro.css` uses for the opening. The
          one toggle for it lives in `Site.tsx` now, above the route. */}
      <div className="gl-grain" ref={grainRef} aria-hidden="true" />
      <div className="gl-vignette" aria-hidden="true" />
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
  project: (typeof workProjects)[number]
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
