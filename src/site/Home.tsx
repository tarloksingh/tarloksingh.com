import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import Helix from './Helix'
import type { HelixCard } from './Helix'
import Gallery from './Gallery'
import Wordmark from './Wordmark'
import ProjectFrame from './ProjectFrame'
import Birds from './Birds'
import Sprig from './Sprig'
import Menu from './Menu'
import { DATE_PIN, VINE_FRAME } from './frames'
import { workProjects, sideProjects } from '../data/projects'
import { SCROLL_BOX, SCROLL_OUTLINE } from './cueGlyphs'
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

/** Seconds the vine around the name takes to grow in, and to pull back off.
 *
 *  Most visitors will scroll in well before it finishes, and see a third or
 *  half of it — which is the intended picture. With `--pf-hold` down at a
 *  sixth (Home.css) one thing opens at a time rather than the whole line
 *  unrolling at once, so at any moment it is visibly still going.
 *
 *  Leaving no longer un-draws it: the vine belongs to the name, and it now
 *  travels with the name instead — see `placeSign`. Un-drawing only happens
 *  if the whole screen is taken away underneath it. */
const VINE_DRAW = 4
const VINE_UNDRAW = 0.5

/** How much of the whole journey to the menu bar the vine is still visible
 *  for. It is a frame around the first screen, and a frame the size of a
 *  postage stamp sitting in the corner is not one — so it is gone well before
 *  the mark it shrank with has finished parking. */
const VINE_GONE_BY = 0.62

/** The one year a piece of work goes under, for the date line.
 *
 *  `timeline` is written for a case study's masthead — 'Jan — Jul 2026',
 *  '2024 — 2025', '2015 — Present' — and the rule across the room is not a
 *  masthead. It is a date line, and what a date line carries is a date. The
 *  last four-figure year in the string is the one that reads right in every
 *  shape the field takes: the year a finished piece finished, and the year an
 *  ongoing one started, there being no second year in it to take. */
const oneYear = (timeline: string) => {
  const years = timeline.match(/\d{4}/g)
  return years ? years[years.length - 1] : timeline
}

/* Putting a date on the rule and taking it off again. Two calls rather than
   one flag because there are three places that do it — the scroll-driven
   readout, the hover scrubber, and the scrubber letting go — and every one of
   them has to set the same three things. `data-on` is the one worth naming: it
   is what grows the pin down out of the label onto the rule — see
   `.hm-foot-pin` in Home.css. */
const showYear = (year: HTMLElement, text: HTMLElement, timeline: string) => {
  text.textContent = oneYear(timeline)
  year.style.opacity = '1'
  year.dataset.on = 'true'
}

const hideYear = (year: HTMLElement) => {
  year.style.opacity = '0'
  year.removeAttribute('data-on')
}

/** Which entry in a list of `count` a pointer is standing over, along the rule
 *  it is standing on. Shared by the hover label and the press, so the year you
 *  are shown and the place you are sent can never be two different pieces. */
const trackIndex = (e: ReactMouseEvent<HTMLElement>, count: number) => {
  if (count === 0) return -1
  const box = e.currentTarget.getBoundingClientRect()
  return Math.round(clamp((e.clientX - box.left) / box.width, 0, 1) * (count - 1))
}

interface HomeProps {
  /** Navigates, with the shell's curtain over the top. */
  onOpen: (projectId: string) => void
  /** True while a transition covers the page — input is ignored then. */
  locked: boolean
  /** The film over this page has begun to lift — see `onLeaving` in Intro.tsx.
   *  Earlier than `locked` coming off, which is the film being *gone*: the
   *  vine starts growing here so that it is already under way while the last
   *  of the black fades off it. */
  unveiling: boolean
  /** Opens the project index overlay. */
  onIndex: () => void
  /** Which project to arrive at, when coming back from a case study. */
  arriveAt?: string | null
  /** The old-film experiment — see `noir` in Site.tsx, which owns the toggle. */
  noir?: boolean
}

export default function Home({ onOpen, locked, unveiling, onIndex, arriveAt, noir }: HomeProps) {
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
  /* The cue writes itself once, and only after the opening has gone: `locked`
     is exactly that — it is held while the film is still over the page — and
     this latches on the first moment it lifts, so the word is not un-written
     again later when the index opens and locks the stage a second time. On a
     deep link there is no film and no lock, and it writes straight away. */
  const [wrote, setWrote] = useState(false)
  useEffect(() => {
    if (!locked) setWrote(true)
  }, [locked])

  const sigRef = useRef<HTMLDivElement>(null)
  const artistRef = useRef<HTMLParagraphElement>(null)
  const vineRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)
  const yearRef = useRef<HTMLSpanElement>(null)
  // The label's text, separately: the label itself also holds its two sprigs,
  // and writing `textContent` on the whole thing would take them out with it.
  const yearTextRef = useRef<HTMLSpanElement>(null)
  // Only the setter is used — see `scrubTrack` for why the footer no longer
  // reads which project is focused.
  const [, setFocus] = useState(0)
  const [inWork, setInWork] = useState(false)
  /* The vine grows for as long as the screen is yours. Leaving is not its
     business any more: it shrinks onto the mark and fades with it, in
     `placeSign`, so the exit is a pure function of the scroll and reverses
     exactly on the way back up. */
  const vineActive = unveiling
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

    /* The vine goes with it. It is the frame around the name, so it collapses
       onto the name rather than staying the size of the window while the
       thing it is drawn around walks out of it: the same `out`, and a
       transform-origin sitting on the parked mark's own centre (written in
       `measure` below), so shrinking it is shrinking it *toward* where the
       mark is going.

       `1 / grow` is the ratio the mark itself shrinks by over the journey —
       reading it off the same number is what keeps the two in step at any
       width rather than at the one this was tuned on. It fades out over the
       first two thirds of the trip, because a frame does not survive being
       drawn at a quarter of its size; by the time the mark parks there is
       nothing left of it to see. */
    const vine = vineRef.current
    if (vine) {
      const vs = 1 / grow + (1 - 1 / grow) * out
      vine.style.transform = `scale(${vs.toFixed(4)})`
      vine.style.opacity = (1 - ease(p, 0, NAME_DOCK * VINE_GONE_BY)).toFixed(3)
    }
    // The rubric belongs to the big pose only: parked, it would be a caption
    // on something the size of a caption.
    const artist = artistRef.current
    if (artist) artist.style.opacity = (1 - ease(p, 0, NAME_DOCK * 0.45)).toFixed(3)
    /* Parked, the mark sits in the menu bar in a row with the three links, and
       there it answers a pointer the way they do — see `.hm-sig` in Home.css
       and `Sprig`. On the way out to the middle of the screen it does not: it
       is a foot wide there, already inside a drawn frame, and a hover flourish
       on top of that is one flourish too many. `out` is 1 at the hero pose and
       0 parked, so this only opens up once it has arrived. */
    sig.style.pointerEvents = out < 0.02 ? 'auto' : 'none'
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
      /* Where the vine has to shrink to: the parked mark's own centre, in the
         vine's coordinates, since a transform-origin is written against the
         element's own box. Measured here rather than guessed at from the two
         insets, and re-measured on resize with everything else, because both
         boxes are pinned to rails that move at their own breakpoints and a
         hard-coded corner would drift off the mark on any width but one.
         Its transform is cleared first for the same reason the signature's
         is: otherwise it measures its own last frame. */
      const vine = vineRef.current
      if (vine) {
        vine.style.transform = 'none'
        const vbox = vine.getBoundingClientRect()
        const ox = box.x + box.width / 2 - vbox.x
        const oy = box.y + box.height / 2 - vbox.y
        vine.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`
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

      /* The scroll cue belongs to the name, not to a visitor who has never
         scrolled. It used to latch off on the first input and never return,
         which is right if you read it as an onboarding hint and wrong if you
         read it as part of this screen — and it is part of this screen: scroll
         back up to the name and the invitation under it should be there again,
         the same way the rubric above it and the vine around it are. A pure
         function of `p`, like everything else here. */
      const on = 1 - range(p, 0, 0.05)
      const cue = cueRef.current
      if (cue) cue.style.opacity = on.toFixed(3)

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
        const yearText = yearTextRef.current
        const workTrack = track?.parentElement as HTMLElement | null
        if (foot && year && yearText && workTrack && p > IN_WORK_AT) {
          const index = Math.round(clamp(p - 1, 0, workProjects.length - 1))
          const project = workProjects[index]
          if (project) {
            const trackRect = workTrack.getBoundingClientRect()
            const footRect = foot.getBoundingClientRect()
            const x = trackRect.left + through * trackRect.width
            year.style.left = `${(((x - footRect.left) / footRect.width) * 100).toFixed(2)}%`
            showYear(year, yearText, project.timeline)
          }
        } else if (year) {
          hideYear(year)
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
     the work line's own scroll-driven fill above.

     It answers from the name too now. It used to sit dead until you were
     already in the work, which is defensible while it is only a readout and
     wrong the moment it is also the way to travel: a rule you can press to go
     to a year has to be pressable from the screen you start on. What it says
     when you are standing at the name is what it does. */
  const scrubTrack = useCallback((e: ReactMouseEvent<HTMLDivElement>, list: typeof workProjects) => {
    const foot = footRef.current
    const year = yearRef.current
    const yearText = yearTextRef.current
    if (!foot || !year || !yearText) return
    const index = trackIndex(e, list.length)
    const project = list[index]
    if (!project) return

    hoveringRef.current = true
    const footRect = foot.getBoundingClientRect()
    year.style.left = `${(((e.clientX - footRect.left) / footRect.width) * 100).toFixed(2)}%`
    showYear(year, yearText, project.timeline)
  }, [])

  // Hands the label back to the scroll-driven year rather than hiding it —
  // see the block above, in the engine subscription.
  const hideScrub = useCallback(() => {
    hoveringRef.current = false
  }, [])

  /* And the rules as a way to get somewhere, which is what makes the date line
     a date line rather than a progress bar: press a point on it and you are at
     that year's work.

     The two lines answer differently because they are two different kinds of
     thing. The work line is this page's own scroll, so a press turns the drum
     to the piece standing at that point. The side projects are not places on
     this scroll at all — they appear on no part of it — so there is nowhere to
     send the drum, and pressing one opens its case study instead. */
  const pickWork = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const index = trackIndex(e, workProjects.length)
      if (index >= 0) engine.goTo(1 + index)
    },
    [engine]
  )

  const pickSide = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const project = sideProjects[trackIndex(e, sideProjects.length)]
      if (project) onOpen(project.id)
    },
    [onOpen]
  )

  const goToProject = useCallback(
    (projectId: string) => {
      const index = workProjects.findIndex((p) => p.id === projectId)
      if (index >= 0) engine.goTo(1 + index)
    },
    [engine]
  )

  /* The cue's viewBox is the ink and nothing else, so the sweep that reveals
     it and the box it is laid out in are the same rectangle. */
  const [cx, cy, cw, ch] = SCROLL_BOX

  return (
    <main className="hm">
      <Helix cards={NO_CARDS} engine={engine} onOpen={goToProject} />

      <Gallery engine={engine} onOpen={onOpen} onFocus={setFocus} noir={noir} />

      {/* ---- chrome. Fixed above both stages, present the whole way through. ---- */}

      {/* The vine. The same drawing machinery the projects' frames are made of
          (ProjectFrame.tsx), held off the window's own edges the way a
          project's frame is held off its exhibit: this is the frame for the
          whole first screen, not a ring cinched round the name in the middle
          of it. It starts the moment the film starts to lift, and it keeps
          going for as long as you stand here — see `VINE_DRAW`.

          Leaving is not handled here. `placeSign` shrinks this box onto the
          parked mark and fades it as the name walks there, so the vine goes
          the way the thing it is drawn around goes — `drawOut` is only what
          happens if the whole screen is taken out from under it.

          Before the signature, so the name is drawn over the line rather than
          under it — they share `--z-chrome`, and at equal z-index the later
          element wins. */}
      <div className="hm-vine" ref={vineRef} aria-hidden="true">
        <ProjectFrame
          variant={VINE_FRAME}
          drawIn={VINE_DRAW}
          drawOut={VINE_UNDRAW}
          active={vineActive}
        />
      </div>

      {/* And what lives on it. Three birds come in off the edge of the window,
          sit on a rail, and go again — startled by the cursor, pressed, or
          simply having sat long enough. Outside `.hm-vine` rather than inside
          it, because that box is being scaled onto the parked mark as you
          scroll and a bird standing on it would be scaled with it; they read
          the rail's position for themselves instead.

          What is offered is the vine's own four horizontal rail segments and
          the footer's two scrub rules — the drawn lines themselves rather
          than the boxes they are drawn in, which is what Birds.tsx measures.
          Which of them a bird gets is a question of where the scroll is
          rather than of anything set here: the vine while the name is on
          screen, and once it has shrunk onto the parked mark the footer,
          because a faded rail is not offered. So the flock moves down the
          page with you instead of leaving at the top of it — and turning the
          drum puts every one of them back in the air. */}
      <Birds perch=".hm-vine .pf-r--h, .hm-foot-track" active={vineActive} />

      {/* The one mark on the page. Laid out parked in the menu bar and
          transformed out to the middle of the screen — see `placeSign`.

          `u-vine` puts a sprig either side of it, the same one the button on
          an exhibit gets. It can only ever be seen parked:
          `placeSign` hands the element back its pointer events at the end of
          the journey and takes them away again on the way out, because at the
          hero pose this is already standing inside a drawn frame. */}
      <div className="hm-sig u-vine" ref={sigRef}>
        <Sprig />
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

      {/* Two of these three are places on this one scroll — see Menu.tsx,
          which also carries a case study's own copy of this nav, so the two
          screens never disagree about what it looks like. */}
      <Menu
        className="hm-menu"
        current={inWork ? 'work' : 'home'}
        onHome={() => engine.goTo(0)}
        /* Does two things, because there are only three items and the index
           overlay would otherwise be unreachable from this page: from the
           name it turns the drum to the first project, and once you are
           already in the work it opens the contents. Pressing the section
           you are standing in to see all of it is the ordinary reading. */
        onWork={() => (inWork ? onIndex() : engine.goTo(1))}
      />

      {/* The invitation, in the same hand as the name and drawn on the same
          way — the opening writes the signature, and this is the first thing
          the page says after it, so it should be the same voice. The reveal
          is a sweep along the writing direction rather than a pen (see
          `cueGlyphs.ts`). The word itself is drawing, so the readable one is
          the label.

          It hangs under the signature at exactly the distance the rubric hangs
          above it, so the three read as one stack rather than as a mark in the
          middle of the screen and a note at the foot of it — see `.hm-cue` in
          Home.css, which is where that arithmetic lives.

          The stroke under the word is `.hm-vine-cue`, laid out in the flow
          right after it rather than hung off the vine itself: the vine is the
          width of the window now, and its own bottom bloom is nowhere near
          this stack any more. Still the same drawn line, laying itself down
          and gone again — it just answers to this word's own opacity now,
          being inside the element that carries it, instead of needing a
          fade of its own. */}
      <div className="hm-cue" ref={cueRef} data-wrote={wrote ? 'true' : undefined}>
        <span className="u-sr">Scroll</span>
        <span className="hm-cue-word" aria-hidden="true">
          <svg viewBox={`${cx} ${cy} ${cw} ${ch}`} focusable="false">
            <path d={SCROLL_OUTLINE} fill="currentColor" />
          </svg>
        </span>
        <span className="hm-vine-cue" aria-hidden="true">
          <span className="hm-vine-cue-line" />
        </span>
      </div>

      {/* A rule across the room, read as a date line rather than as a
          loading state — a gallery tells you what period you are in, not
          what percentage of it you have seen. The main line still fills as
          you travel through the work; the year on it is a hover scrubber, not
          a readout of the scroll (see `scrubTrack`), and pressing a point on
          it takes you there (`pickWork`, `pickSide`).

          The dot and the shorter line after it are the side projects — the
          same rule, at a smaller scale, for the work that isn't client
          work.

          The keyboard's way to the same places is the contents overlay, which
          the menu's second item opens; these two rules are a pointer
          affordance on top of it, not the only door. */}
      <footer className="hm-foot" data-in-work={inWork} ref={footRef}>
        {/* One date, and one year of it — see `oneYear`. Its own span inside
            the label, because the label also carries the drawing that grows
            with it and writing text onto the whole thing would remove it.

            The drawing is `DATE_PIN`, not the sprig every other pressable
            thing on the site gets: this label is pointing at a place on the
            rule under it, so its mark grows down onto that place. Same
            `data-on` the label is shown with — see `showYear`. */}
        <span className="hm-foot-year" ref={yearRef}>
          <span ref={yearTextRef} />
          <svg className="hm-foot-pin" viewBox="0 0 20 44" fill="none" focusable="false" aria-hidden="true">
            {DATE_PIN.map((d, i) => (
              <path key={d} d={d} pathLength="1" strokeDasharray="1" style={{ '--sp-i': i } as CSSProperties} />
            ))}
          </svg>
        </span>
        <div className="hm-foot-tracks">
          <div
            className="hm-foot-track hm-foot-track--work"
            onMouseMove={(e) => scrubTrack(e, workProjects)}
            onMouseLeave={hideScrub}
            onClick={pickWork}
          >
            <span className="hm-foot-track-fill" ref={trackRef} />
          </div>
          <span className="hm-foot-dot" aria-hidden="true" />
          <div
            className="hm-foot-track hm-foot-track--side"
            onMouseMove={(e) => scrubTrack(e, sideProjects)}
            onMouseLeave={hideScrub}
            onClick={pickSide}
          />
        </div>
      </footer>
    </main>
  )
}

