import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import BlurText, { reveal } from '../components/BlurText'
import Helix from './Helix'
import type { HelixCard } from './Helix'
import Gallery from './Gallery'
import { workProjects, sideProjects } from '../data/projects'
import { useScrollEngine, clamp, ease, range } from './useScrollEngine'
import './Home.css'

/* The stage. One continuous scroll from the name to the last project.

   `engine.value` is the only navigation state on the page:

       0        the name, the field turning slowly around it
       0 → 1    the field opens outward and streams past; the drum arrives
       1        the first project, square-on
       n        the nth project

   Every visible thing is a pure function of that number, which is why the
   two halves never disagree about where the page is — there is no "phase"
   flag to get out of step, and scrolling back up genuinely reverses rather
   than replaying an exit animation. */

/** No cards ride the field any more — the name stands alone in it. Kept as a
 *  stable reference so `Helix` doesn't get a fresh array identity every
 *  render. */
const NO_CARDS: HelixCard[] = []

/** Where the name has completely gone. */
const NAME_OUT = 0.62
/** Where the drum has taken over — what the menu calls being in the work. */
const IN_WORK_AT = 0.75

/* The wall of disciplines printed behind everything.

   Every one of these used to be a single line under the name reading
   "Product · 3D · Motion · Film · Music · AI", which is a caption: it tells
   you the list and asks you to read it. Set enormous, tracked wide, stacked
   up the whole page and pulled back almost to the paper, the same words stop
   being a list and become the ground the name stands on — you take them in
   without ever deciding to read them.

   Each line is specified by the fraction of the window it should *span*, not
   by a font size — `fitWall` below sets the size that actually achieves it.
   A wall this size is only right when its ragged edges are composed, and one
   line running off both sides while the next stops short is the difference
   between a set page and an accident. No `vw` size can hold a line to a given
   width, because how wide a word sets depends on which letters are in it:
   MUSICIAN and MOTION are eight and six characters, and at the same size the
   six-character one is nearly as wide.

   `ink` is how far each line comes up off the paper; the spread is what stops
   the block reading as one flat watermark. */
const DISCIPLINES = [
  { text: '3D DESIGN', fill: 0.6, track: 0.42, ink: 0.05 },
  { text: 'PRODUCT DESIGN', fill: 0.84, track: 0.3, ink: 0.075 },
  { text: 'ENGINEERING', fill: 0.7, track: 0.36, ink: 0.045 },
  { text: 'CINEMATOGRAPHY', fill: 0.96, track: 0.22, ink: 0.09 },
  { text: 'MUSICIAN', fill: 0.64, track: 0.44, ink: 0.06 },
  { text: 'MOTION', fill: 0.48, track: 0.5, ink: 0.04 },
  { text: 'ARTIFICIAL INTELLIGENCE', fill: 0.88, track: 0.18, ink: 0.07 }
]

/** Size the wall is measured at before being scaled to fit. Arbitrary, but
 *  large enough that hinting and subpixel rounding do not skew the ratio. */
const WALL_PROBE = 200

/**
 * Set every wall line to the size at which it spans the fraction of the
 * window it asked for.
 *
 * Measured rather than derived from a per-character metric, because the
 * metric is a property of whichever serif the machine actually resolved
 * `--font-times` to — Times New Roman here, Liberation Serif on a Linux box,
 * something else again where neither is installed — and a wall composed
 * against the wrong one is a wall that overhangs the window.
 *
 * Written in two passes rather than one loop, so the seven size writes and
 * the seven width reads are two layout flushes rather than fourteen.
 */
function fitWall(wall: HTMLElement) {
  const lines = Array.from(wall.querySelectorAll<HTMLElement>('.hm-wall-line'))
  for (const el of lines) el.style.fontSize = `${WALL_PROBE}px`
  const widths = lines.map((el, i) => {
    // The box carries a trailing letter-space that the type does not; the
    // same air `.hm-wall-line`'s negative margin takes back off for centring.
    const track = DISCIPLINES[i]?.track ?? 0
    return el.getBoundingClientRect().width - WALL_PROBE * track
  })
  lines.forEach((el, i) => {
    const natural = widths[i]
    const fill = DISCIPLINES[i]?.fill ?? 0
    el.style.fontSize = natural > 0 ? `${(WALL_PROBE * fill * window.innerWidth) / natural}px` : ''
  })
}

interface HomeProps {
  /** Navigates, with the shell's curtain over the top. */
  onOpen: (projectId: string) => void
  /** True while a transition covers the page — input is ignored then. */
  locked: boolean
  /** Opens the project index overlay. */
  onIndex: () => void
  /** Which project to arrive at, when coming back from a case study. */
  arriveAt?: string | null
  /** The old-film experiment — see `noir` in Site.tsx, which owns the toggle. */
  noir?: boolean
}

export default function Home({ onOpen, locked, onIndex, arriveAt, noir }: HomeProps) {
  // `detentFrom: 1` is where the scrubber becomes a list — see the option's
  // documentation. Below 1 you are flying through the field and every
  // position is a real picture; at 1 and above you are looking at one piece
  // of work at a time, and there is no such thing as being between two.
  // `max` stops the track at the last project rather than letting it run on
  // forever: without it, scrolling past the end wrapped `Gallery`'s row back
  // to the first project over and over — the same work rotating past
  // indefinitely — while the footer's fill, already clamped to the real
  // range, sat stuck at the end and stopped telling you where you were.
  const engine = useScrollEngine({
    pixelsPerUnit: 1250,
    smoothing: 0.4,
    min: 0,
    max: workProjects.length,
    detentFrom: 1
  })
  const nameRef = useRef<HTMLDivElement>(null)
  const wallRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)
  const yearRef = useRef<HTMLSpanElement>(null)
  // Only the setter is used — see `scrubTrack` for why the footer no longer
  // reads which project is focused.
  const [, setFocus] = useState(0)
  const [inWork, setInWork] = useState(false)
  // Read by the hover-scrub below, which runs outside the scroll loop and so
  // cannot close over `inWork` without going stale.
  const inWorkRef = useRef(false)
  // True while the pointer is over either track — the scroll-driven year
  // below backs off while a hover is in control of the label, and takes it
  // back the instant the pointer leaves.
  const hoveringRef = useRef(false)

  useEffect(() => {
    engine.setLocked(locked)
  }, [engine, locked])

  // Layout, not effect: the wall is set at a probe size in the markup and
  // would paint at it for one frame otherwise.
  useLayoutEffect(() => {
    const wall = wallRef.current
    if (!wall) return
    const fit = () => fitWall(wall)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Returning from a case study lands on that project rather than at the top:
  // going back should put you where you left, not make you scroll there again.
  useEffect(() => {
    if (!arriveAt) return
    const index = workProjects.findIndex((p) => p.id === arriveAt)
    if (index < 0) return
    engine.goTo(1 + index)
    // No ease from zero — that would fly the whole entrance backwards on the
    // way in. It should already be there when the curtain lifts.
    engine.state.value = 1 + index
    setFocus(index)
    setInWork(true)
  }, [engine, arriveAt])

  useEffect(() => {
    let lastInWork = false

    return engine.subscribe((state) => {
      const p = state.value

      // The name recedes *through* the viewer rather than fading in place —
      // it is inside the field's 3D space, so pushing it toward the camera as
      // the field opens out reads as flying past it.
      const leaving = ease(p, 0, NAME_OUT)
      const name = nameRef.current
      if (name) {
        name.style.transform = `translate3d(-50%, -50%, ${(leaving * 430).toFixed(1)}px)`
        name.style.opacity = (1 - leaving).toFixed(3)
      }

      // The wall goes with the name, but a beat behind and travelling less —
      // it is further away, so it should not leave at the same rate as the
      // thing standing in front of it.
      const wall = wallRef.current
      if (wall) {
        const off = ease(p, 0.08, NAME_OUT + 0.16)
        wall.style.transform = `scale(${(1 + off * 0.12).toFixed(4)})`
        wall.style.opacity = (1 - off).toFixed(3)
      }

      // The small mark takes over as the big name goes: the identity is never
      // absent from the page, it just changes size.
      const mark = markRef.current
      if (mark) {
        const on = ease(p, 0.22, 0.7)
        mark.style.opacity = on.toFixed(3)
        mark.style.transform = `translateY(${((1 - on) * 8).toFixed(1)}px)`
      }

      // The scroll cue is for someone who hasn't scrolled. It goes on the
      // first input and does not come back.
      const cue = cueRef.current
      if (cue) {
        const on = engine.hasMoved() ? 0 : 1 - range(p, 0, 0.05)
        cue.style.opacity = on.toFixed(3)
      }

      // The rule fills as you travel through the work. The year no longer
      // rides it — see `scrubTrack` below, which is what puts a date on the
      // footer now.
      const through =
        workProjects.length > 1 ? clamp((p - 1) / (workProjects.length - 1), 0, 1) : p >= 1 ? 1 : 0
      const track = trackRef.current
      if (track) track.style.transform = `scaleX(${through.toFixed(4)})`

      // The year label defaults to naming whichever project you're actually
      // standing at, sitting over the point on the rule the fill has reached
      // — a hover on either track (see `scrubTrack`) takes it over instead,
      // and gives it back the moment the pointer leaves.
      if (!hoveringRef.current) {
        const foot = footRef.current
        const year = yearRef.current
        const workTrack = track?.parentElement as HTMLElement | null
        if (foot && year && workTrack && p > IN_WORK_AT) {
          const index = Math.round(clamp(p - 1, 0, workProjects.length - 1))
          const project = workProjects[index]
          if (project) {
            const trackRect = workTrack.getBoundingClientRect()
            const footRect = foot.getBoundingClientRect()
            const x = trackRect.left + through * trackRect.width
            year.style.left = `${(((x - footRect.left) / footRect.width) * 100).toFixed(2)}%`
            year.textContent = project.timeline
            year.style.opacity = '1'
          }
        } else if (year) {
          year.style.opacity = '0'
        }
      }

      const nowInWork = p > IN_WORK_AT
      inWorkRef.current = nowInWork
      if (nowInWork !== lastInWork) {
        lastInWork = nowInWork
        setInWork(nowInWork)
      }
    })
  }, [engine])

  /* The footer's two rules are a hover scrubber, not a readout of where the
     scroll is: move along either one and the year at that point stands in
     for the whole design's one date label, `.hm-foot-year`, wherever the
     cursor is — not tied to `focus`, so scrubbing the side line doesn't fight
     the work line's own scroll-driven fill above. */
  const scrubTrack = useCallback((e: ReactMouseEvent<HTMLDivElement>, list: typeof workProjects) => {
    if (!inWorkRef.current || list.length === 0) return
    const foot = footRef.current
    const year = yearRef.current
    if (!foot || !year) return

    hoveringRef.current = true
    const trackRect = e.currentTarget.getBoundingClientRect()
    const t = clamp((e.clientX - trackRect.left) / trackRect.width, 0, 1)
    const project = list[Math.round(t * (list.length - 1))]
    if (!project) return

    const footRect = foot.getBoundingClientRect()
    year.style.left = `${(((e.clientX - footRect.left) / footRect.width) * 100).toFixed(2)}%`
    year.textContent = project.timeline
    year.style.opacity = '1'
  }, [])

  // Hands the label back to the scroll-driven year rather than hiding it —
  // see the block above, in the engine subscription.
  const hideScrub = useCallback(() => {
    hoveringRef.current = false
  }, [])

  const goToProject = useCallback(
    (projectId: string) => {
      const index = workProjects.findIndex((p) => p.id === projectId)
      if (index >= 0) engine.goTo(1 + index)
    },
    [engine]
  )

  return (
    <main className="hm">
      {/* Behind the field, not inside it: this is the paper, not something
          standing on it. */}
      <div className="hm-wall" ref={wallRef} aria-hidden="true">
        {DISCIPLINES.map((line) => (
          <span
            key={line.text}
            className="hm-wall-line"
            style={
              {
                '--tr': `${line.track}em`,
                '--ink': line.ink
              } as CSSProperties
            }
          >
            {line.text}
          </span>
        ))}
      </div>

      <Helix cards={NO_CARDS} engine={engine} onOpen={goToProject}>
        {/* Inside the field's 3D space, at depth zero. */}
        <div className="hm-name" ref={nameRef}>
          <h1 className="u-sr">Tarlok Singh — artist, engineer, filmmaker</h1>
          {/* The rubric over the name. One word, in Times, because a date and
              the word "portfolio" describe the *document*; this describes the
              person, which is the only thing the page is about. */}
          <BlurText text="ARTIST" className="hm-name-label" {...reveal(0.1)} />
          <div className="hm-name-lines" aria-hidden="true">
            <BlurText text="TARLOK" className="hm-name-line" {...reveal(0.26)} />
            <BlurText text="SINGH" className="hm-name-line" {...reveal(0.36)} />
          </div>
        </div>
      </Helix>

      <Gallery engine={engine} onOpen={onOpen} onFocus={setFocus} noir={noir} />

      {/* ---- chrome. Fixed above both stages, present the whole way through. ---- */}

      <div className="hm-mark" ref={markRef}>
        <p className="hm-mark-name">Tarlok Singh</p>
      </div>

      {/* Two of these three are places on this one scroll, so the menu marks
          which one you are standing in rather than merely offering links.
          `aria-current` is the real signal; `data-on` is what draws the rule
          under it, and is the same underline every link on the site uses. */}
      <nav className="hm-menu" aria-label="Main">
        <button
          type="button"
          className="u-link"
          data-on={!inWork}
          aria-current={!inWork ? 'true' : undefined}
          onClick={() => engine.goTo(0)}
        >
          Home
        </button>
        {/* Does two things, because there are only three items and the index
            overlay would otherwise be unreachable from this page: from the
            name it turns the drum to the first project, and once you are
            already in the work it opens the contents. Pressing the section
            you are standing in to see all of it is the ordinary reading. */}
        <button
          type="button"
          className="u-link"
          data-on={inWork}
          aria-current={inWork ? 'true' : undefined}
          onClick={() => (inWork ? onIndex() : engine.goTo(1))}
        >
          Work
        </button>
        {/* Never marked: it leaves the page rather than being a third place
            on it. */}
        <a className="u-link" href="mailto:tarloksinghfilms@gmail.com">
          Contact
        </a>
      </nav>

      <div className="hm-cue" ref={cueRef}>
        <span className="u-label">Scroll</span>
        <span className="hm-cue-rule" />
      </div>

      {/* A rule across the room, read as a date line rather than as a
          loading state — a gallery tells you what period you are in, not
          what percentage of it you have seen. The main line still fills as
          you travel through the work; the year on it is a hover scrubber
          now, not a readout of the scroll (see `scrubTrack`).

          The dot and the shorter line after it are the side projects — the
          same rule, at a smaller scale, for the work that isn't client
          work. */}
      <footer className="hm-foot" data-in-work={inWork} ref={footRef}>
        <span className="hm-foot-year" ref={yearRef} />
        <div className="hm-foot-tracks">
          <div
            className="hm-foot-track hm-foot-track--work"
            onMouseMove={(e) => scrubTrack(e, workProjects)}
            onMouseLeave={hideScrub}
          >
            <span className="hm-foot-track-fill" ref={trackRef} />
          </div>
          <span className="hm-foot-dot" aria-hidden="true" />
          <div
            className="hm-foot-track hm-foot-track--side"
            onMouseMove={(e) => scrubTrack(e, sideProjects)}
            onMouseLeave={hideScrub}
          />
        </div>
      </footer>
    </main>
  )
}

