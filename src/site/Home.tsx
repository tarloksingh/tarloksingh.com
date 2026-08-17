import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import BlurText, { reveal } from '../components/BlurText'
import Helix, { buildHelixCards } from './Helix'
import Gallery from './Gallery'
import { projects } from '../data/projects'
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

const CARD_COUNT_DESKTOP = 24
const CARD_COUNT_PHONE = 14
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
}

export default function Home({ onOpen, locked, onIndex, arriveAt }: HomeProps) {
  // `detentFrom: 1` is where the scrubber becomes a list — see the option's
  // documentation. Below 1 you are flying through the field and every
  // position is a real picture; at 1 and above you are looking at one piece
  // of work at a time, and there is no such thing as being between two.
  const engine = useScrollEngine({ pixelsPerUnit: 1250, smoothing: 0.4, min: 0, detentFrom: 1 })
  const nameRef = useRef<HTMLDivElement>(null)
  const wallRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)
  const yearRef = useRef<HTMLSpanElement>(null)
  const [focus, setFocus] = useState(0)
  const [inWork, setInWork] = useState(false)

  const cards = useMemo(
    () =>
      buildHelixCards(
        typeof window !== 'undefined' && window.innerWidth < 760
          ? CARD_COUNT_PHONE
          : CARD_COUNT_DESKTOP
      ),
    []
  )

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
    const index = projects.findIndex((p) => p.id === arriveAt)
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

      // The rule fills as you travel through the work, and the year rides the
      // end of the fill. Both from the same number, so the mark can never
      // drift off the length it is marking.
      const through =
        projects.length > 1 ? clamp((p - 1) / (projects.length - 1), 0, 1) : p >= 1 ? 1 : 0
      const track = trackRef.current
      if (track) track.style.transform = `scaleX(${through.toFixed(4)})`
      const year = yearRef.current
      // Percent of the track's own width, and the label centres itself on
      // that point — so it stays on the mark at any window size without the
      // track ever being measured.
      if (year) year.style.left = `${(through * 100).toFixed(2)}%`

      const nowInWork = p > IN_WORK_AT
      if (nowInWork !== lastInWork) {
        lastInWork = nowInWork
        setInWork(nowInWork)
      }
    })
  }, [engine])

  const goToProject = useCallback(
    (projectId: string) => {
      const index = projects.findIndex((p) => p.id === projectId)
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

      <Helix cards={cards} engine={engine} onOpen={goToProject}>
        {/* Inside the field's 3D space, at depth zero, so near cards pass in
            front of the name and far ones behind it. */}
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

      <Gallery engine={engine} onOpen={onOpen} onFocus={setFocus} />

      {/* ---- chrome. Fixed above both stages, present the whole way through. ---- */}

      <div className="hm-mark" ref={markRef}>
        <p className="hm-mark-name">Tarlok Singh</p>
        <p className="u-label">Artist &amp; Engineer</p>
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

      {/* A rule across the room with the year you are standing in marked on
          it. It is the same progress bar it always was, read as a date line
          rather than as a loading state — a gallery tells you what period
          you are in, not what percentage of it you have seen. The year rides
          the fill, so the mark and the length always agree. */}
      <footer className="hm-foot" data-in-work={inWork}>
        <span className="hm-foot-year" ref={yearRef}>
          {projects[focus]?.timeline}
        </span>
        <div className="hm-foot-track">
          <span className="hm-foot-track-fill" ref={trackRef} />
        </div>
      </footer>
    </main>
  )
}

