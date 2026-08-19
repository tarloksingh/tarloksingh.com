import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import Helix from './Helix'
import type { HelixCard } from './Helix'
import Gallery from './Gallery'
import Wordmark from './Wordmark'
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

/** Nothing rides the field any more: no cards, and the name has come out of
 *  it too — it is chrome now, travelling between the middle of the screen and
 *  the menu bar, which is a journey across the *window* and cannot be made
 *  from inside a perspective space. Kept as a stable reference so `Helix`
 *  doesn't get a fresh array identity every render. */
const NO_CARDS: HelixCard[] = []

/** Where the drum has taken over — what the menu calls being in the work. */
const IN_WORK_AT = 0.75

/** How far up the scroll the signature has finished travelling to its slot
 *  in the menu bar. Before this it is somewhere between the middle of the
 *  screen and the corner; after it, parked. */
const NAME_DOCK = 0.62

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
    /* The entrance is one move: the name goes up and the first project comes
       in, and it should cost one gesture. 2.6 was still five mouse notches,
       which is where "the name is already parked and the project still isn't
       here" came from — a notch is only ~100px, so a stretch quoted in a
       project's worth of travel is a stretch nobody arrives at. At 6 the whole
       entrance is about 210px of wheel: two notches, a short trackpad push, or
       a third of a phone screen of thumb. */
    entranceGain: 6,
    detentFrom: 1
  })
  const sigRef = useRef<HTMLDivElement>(null)
  const artistRef = useRef<HTMLParagraphElement>(null)
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

  /* The signature's two poses, and how to blend them.
     
     Only one of the two is measured: the element is *laid out* parked in the
     menu bar, so that pose is whatever the stylesheet says and needs no
     arithmetic — which is what keeps it landing exactly on the bar's baseline
     grid at every width instead of near it. The middle-of-the-screen pose is
     then described as a transform away from it, and every position in between
     is that transform scaled down. Nothing measures the big pose, so nothing
     can disagree about where it is.
     
     Measured with the transform off, or it would measure its own last frame. */
  const poseRef = useRef({ x: 0, y: 0, w: 0, h: 0, grow: 1 })

  const placeSign = useCallback((p: number) => {
    const sig = sigRef.current
    if (!sig) return
    const { x, y, w, h, grow } = poseRef.current
    if (w <= 0) return
    // 1 in the middle of the screen, 0 parked in the bar.
    const out = 1 - ease(p, 0, NAME_DOCK)
    const scale = 1 + (grow - 1) * out
    const tx = ((window.innerWidth - w * grow) / 2 - x) * out
    const ty = ((window.innerHeight - h * grow) / 2 - y) * out
    sig.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`
    // The rubric belongs to the big pose only: parked, it would be a caption
    // on something the size of a caption.
    const artist = artistRef.current
    if (artist) artist.style.opacity = (1 - ease(p, 0, NAME_DOCK * 0.45)).toFixed(3)
  }, [])

  // Layout, not effect: unmeasured, the signature would paint parked for one
  // frame before jumping to the middle of the screen.
  useLayoutEffect(() => {
    const sig = sigRef.current
    if (!sig) return
    const measure = () => {
      sig.style.transform = 'none'
      const box = sig.getBoundingClientRect()
      const style = getComputedStyle(sig)
      const num = (name: string, fallback: number) =>
        Number.parseFloat(style.getPropertyValue(name)) || fallback
      const hero = Math.max(
        num('--sig-hero-min', 240),
        Math.min((window.innerWidth * num('--sig-hero-vw', 19)) / 100, num('--sig-hero-max', 416))
      )
      poseRef.current = {
        x: box.x,
        y: box.y,
        w: box.width,
        h: box.height,
        grow: box.width > 0 ? hero / box.width : 1
      }
      placeSign(engine.state.value)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [engine, placeSign])

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

      /* The signature walks to the menu bar rather than fading out and a
         second, smaller copy fading in where it lands. It used to recede
         through the viewer while a second mark came up in the corner, which
         works as an exit but reads as two marks; one that travels reads as
         the same mark finding its place, and — because it is a pure function
         of `p` — it walks straight back to the middle when you scroll up. */
      placeSign(p)

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
      <Helix cards={NO_CARDS} engine={engine} onOpen={goToProject} />

      <Gallery engine={engine} onOpen={onOpen} onFocus={setFocus} noir={noir} />

      {/* ---- chrome. Fixed above both stages, present the whole way through. ---- */}

      {/* The one mark on the page. Laid out parked in the menu bar and
          transformed out to the middle of the screen — see `placeSign`. */}
      <div className="hm-sig" ref={sigRef}>
        <h1 className="u-sr">Tarlok Singh — artist, engineer, filmmaker</h1>
        {/* The rubric, set exactly as the opening sets it (`.in-artist`,
            Intro.css): lowercase, in the display serif, small over a very
            large signature. It named the person there and it names them
            here. */}
        <p className="hm-sig-artist" ref={artistRef} aria-hidden="true">
          artist
        </p>
        <Wordmark className="hm-sig-name" />
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

