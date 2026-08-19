import { useEffect, useRef } from 'react'
import { NAME_BOX, NAME_OUTLINE, NAME_PEN, PEN_WIDTH } from './nameGlyphs'
import './Intro.css'

/* The opening.

   A dark room, lit like a print running through a projector, and a hand
   writing the name into it. Then two words and a door, and the dark burns
   open under the visitor's own scroll.

   Three things about it are unusual enough to be worth stating up front.

   The first is that it runs at 24fps until the visitor starts scrolling. Not
   "looks like" 24fps — every visible value on screen is sampled from a clock
   quantised to 1/24s, and nothing moves between those samples. That is the
   whole reason it reads as film rather than as a web page with a grain
   overlay on it: the strobe on a moving edge, the way the flicker sits still
   for two display frames and then jumps, the fact that the pen advances in
   discrete bites. A 60fps version of exactly this animation looks like an
   advert. The moment the visitor scrolls, the quantiser is dropped and
   everything runs at whatever the display can do, because a burn that
   stutters just looks broken.

   The second is that leaving the room is not a timed animation at all — it is
   scroll position, full stop. `progressRef` is 0 at rest and 1 once the page
   is completely uncovered, and every visual on the way — the hole burning
   through the veil, the glow at its edge, the name and the word above it
   lifting off — is a pure function of that one number. Scroll down and it
   advances; scroll back up and it reverses, because nothing here is played
   once and left to finish on its own clock.

   The third is that everything is driven from one `requestAnimationFrame`
   loop writing inline styles, rather than from CSS transitions or a timeline
   library. Both of those interpolate on their own clock, which is precisely
   the clock this screen is trying not to have.

   `Intro` also stands in for the loading screen on the way to the stage: it
   is already covering the page for four seconds, and making someone watch a
   progress bar and *then* an entrance is two waits where the design only has
   room for one. The name writes regardless; what waits on the images is
   whether scrolling is allowed to do anything yet. */

/** Frames a second, while the film is running. */
const FPS = 24

/* ---- the entrance, in seconds ---- */
/** Dark and grain alone, so the writing arrives into an established room. */
const HOLD = 0.45
const WRITE = 2.8
/** Cross-fade to the unmasked name — see `nameGlyphs.ts` on the last 1%. */
const SETTLE = 0.36
const ARTIST_AT = 0.1
const ARTIST_IN = 0.75
const ENTER_AT = 0.55
const ENTER_IN = 0.75

/* ---- the exit, driven by scroll rather than the clock ----
   `progress` runs 0..1: 0 is fully in the room, 1 is the page fully lit.
   Each element lifts off at its own point along that range so the name goes
   before the word above it — the same bottom-to-top order the click used to
   give, just run by the wheel instead of a timer. (There was a third, the
   scroll cue, which went first; it has no element left to move.) */
const OUT_NAME_AT = 0.14
const OUT_ARTIST_AT = 0.3
const OUT_SPAN = 0.4
/** Where the hole in the veil is centred, and the biggest it ever grows. */
const BURN_X = 0.5
const BURN_Y = 0.56
const BURN_MAX = 1.65
/** Cumulative wheel/touch travel, in pixels, to burn all the way through. */
const SCROLL_RANGE = 1400
/** Seconds the black takes to fade off on its own. */
const AUTO_FADE = 1.2
/** Longest the invitation waits on images that are not arriving. */
const PATIENCE = 6

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** The site's expo-out, in numbers rather than in a cubic-bezier string. */
const out = (v: number) => 1 - Math.pow(1 - clamp01(v), 4)
const inOut = (v: number) => {
  const k = clamp01(v)
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}
/** `at`..`at + over`, as 0..1. */
const span = (t: number, at: number, over: number) => clamp01((t - at) / over)

interface IntroProps {
  /** Stills to have decoded before scrolling is allowed to do anything. */
  preload: string[]
  /** The visitor has started leaving: put the page behind into position. */
  onCommit: () => void
  /** The veil has finished burning away: the page underneath is fully
   *  visible and should unlock. */
  onReveal: () => void
  /** Nothing here is on screen any more. */
  onDone: () => void
}

/* Scratches and dust, placed once and then only moved. Both are lifted
   straight off a print: a scratch is a hair in the gate that stays for a
   while and then is gone, and dust is one frame and never the same twice. */
const SCRATCHES = 3
const DUST = 7
/** Sparks thrown off the burning edge, each living this long before the next
 *  one takes its place. */
const EMBERS = 14
const EMBER_LIFE = 1.05

export default function Intro({ preload, onCommit, onReveal, onDone }: IntroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const artistRef = useRef<HTMLParagraphElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const penRef = useRef<SVGPathElement[]>([])
  const settledRef = useRef<SVGPathElement>(null)
  const grainRef = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const burnRef = useRef<HTMLDivElement>(null)
  const burnCircleRef = useRef<SVGCircleElement>(null)
  const burnNoiseRef = useRef<SVGFETurbulenceElement>(null)
  const marksRef = useRef<HTMLDivElement>(null)

  /** How far through leaving the room the visitor has scrolled: 0..1, and
   *  read every frame rather than driving one, so scrolling back up is just
   *  the same number going the other way. */
  const progressRef = useRef(0)
  /** When the images settled, so scrolling can wait on them. */
  const readyAtRef = useRef<number | null>(null)

  /* Count the stills in, exactly as the loading screen did: `decode()` rather
     than the load event, because a decoded bitmap is the thing that can
     actually be painted. A ceiling, so one asset behind a dead connection
     cannot hold the door shut. */
  useEffect(() => {
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      readyAtRef.current = performance.now() / 1000
    }
    let left = preload.length
    const tick = () => {
      left--
      if (left <= 0) settle()
    }
    if (left === 0) settle()
    for (const src of preload) {
      const img = new Image()
      img.src = src
      img.decode().then(tick, tick)
    }
    const ceiling = window.setTimeout(settle, PATIENCE * 1000)
    return () => window.clearTimeout(ceiling)
  }, [preload])

  useEffect(() => {
    const root = rootRef.current
    const stack = stackRef.current
    const artist = artistRef.current
    const name = nameRef.current
    const strokes = penRef.current.filter(Boolean)
    const settledInk = settledRef.current
    const grain = grainRef.current
    const vignette = vignetteRef.current
    const veil = veilRef.current
    const burn = burnRef.current
    const burnCircle = burnCircleRef.current
    const burnNoise = burnNoiseRef.current
    const marks = marksRef.current
    if (!root || !stack || !artist || !name || !settledInk) return
    if (!grain || !vignette || !veil || !burn || !burnCircle || !burnNoise || !marks) return
    if (strokes.length !== NAME_PEN.length) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Each stroke measured, not computed: they are beziers, and only the
       browser knows quite what it makes of them.

       `LIFT` is charged between one stroke and the next as if it were travel.
       Nothing is drawn during it, so it comes out as a pause with the pen off
       the paper — which is a real part of how handwriting looks, and the one
       thing a single sweeping wipe can never give you. */
    const LIFT = 240
    const lengths = strokes.map((path) => path.getTotalLength())
    /** Where each stroke begins, along the pen's whole journey. */
    const startsAt: number[] = []
    let journey = 0
    lengths.forEach((length, i) => {
      startsAt[i] = journey
      journey += length + (i < lengths.length - 1 ? LIFT : 0)
    })
    strokes.forEach((path, i) => {
      path.style.strokeDasharray = String(lengths[i])
      path.style.strokeDashoffset = String(lengths[i])
    })

    const scratches = Array.from(marks.querySelectorAll<HTMLElement>('.in-scratch'))
    const dust = Array.from(marks.querySelectorAll<HTMLElement>('.in-dust'))
    const embers = Array.from(marks.querySelectorAll<HTMLElement>('.in-ember'))
    /** One ember's whole life: the angle it left the edge at, when it was
     *  born, and how it wanders — mutated in place rather than reallocated,
     *  since a new one is only ever due when the old one has fully faded. */
    const emberState = embers.map(() => ({ angle: 0, born: -Infinity, wobble: 0, drift: 0 }))

    /* One origin for the whole screen. Every time below is seconds since it,
       including the ref the preloader writes — it records `performance.now()`
       because it runs outside this loop, and is pulled back onto this clock
       the moment the loop reads it. */
    const start = performance.now() / 1000
    let frame = -1
    let raf = 0
    let seedTick = 0

    /** Whether scrolling is allowed to do anything yet — the writing has
     *  finished and the stills are in. Set inside `paint`, read by the wheel
     *  and touch handlers below. */
    let canLeave = false
    /** Whether the visitor has actually started scrolling. Once true the
     *  quantiser drops for good, even if they scroll straight back to 0. */
    let committed = false
    let calledCommit = false
    /** When the word above the name starts arriving — the auto-fade is timed
     *  from it, so the two are one movement rather than two waits. Written by
     *  `paint`, which is where the opening's clock is resolved. */
    let leaveFrom = 0
    let revealed = false

    /** Everything that is a function of the film clock, sampled on the 24s. */
    const paintFilm = (t: number, alive: number, heat: number) => {
      const boost = 1 + heat * 1.6

      // Grain: one turbulence tile, oversized and thrown to a new offset every
      // frame. Moving it is a compositor transform; regenerating noise per
      // frame would not survive on a phone.
      grain.style.transform = `translate3d(${(Math.random() * 180 - 90).toFixed(0)}px, ${(
        Math.random() * 180 - 90
      ).toFixed(0)}px, 0)`
      grain.style.opacity = (alive * (0.1 + Math.random() * 0.07) * boost).toFixed(3)

      // Lamp flicker, and the weave of the gate. Both are tiny on purpose: at
      // this size they are felt rather than seen, and any larger reads as a
      // fault rather than as a projector — except right at the burn, where
      // `heat` is allowed to push the lamp past that on purpose.
      root.style.setProperty('--flicker', (0.9 + Math.random() * 0.12 * boost).toFixed(3))
      stack.style.setProperty(
        '--weave',
        `${(Math.random() * 1.4 - 0.7).toFixed(2)}px, ${(Math.random() * 1.1 - 0.55).toFixed(2)}px`
      )
      vignette.style.opacity = (alive * (0.72 + Math.abs(Math.sin(t * 1.9)) * 0.28)).toFixed(3)

      scratches.forEach((line, i) => {
        // A hair in the gate sits for a beat before it moves, so it is not
        // re-thrown every frame like the dust is.
        if (Math.floor(t * 3) % SCRATCHES !== i) return
        line.style.left = `${(Math.random() * 100).toFixed(2)}%`
        line.style.opacity = (alive * Math.random() * 0.34 * boost).toFixed(3)
        line.style.height = `${(30 + Math.random() * 70).toFixed(0)}%`
        line.style.top = `${(Math.random() * 40).toFixed(0)}%`
      })
      dust.forEach((speck) => {
        speck.style.left = `${(Math.random() * 100).toFixed(2)}%`
        speck.style.top = `${(Math.random() * 100).toFixed(2)}%`
        speck.style.opacity = (
          alive * (Math.random() < 0.4 ? Math.random() * 0.4 * boost : 0)
        ).toFixed(3)
      })
    }

    /** Sparks thrown off wherever the fire currently is: each is born at the
     *  burning edge, rises and drifts outward as it ages, and fades in and
     *  back out over its life rather than blinking on and off. Nothing here
     *  is random per frame — a spark's whole arc is fixed the moment it is
     *  born, so it reads as a trajectory rather than as static. */
    const paintEmbers = (t: number, cx: number, cy: number, r: number, heat: number) => {
      if (heat < 0.015) {
        embers.forEach((el) => {
          el.style.opacity = '0'
        })
        return
      }
      embers.forEach((el, i) => {
        const st = emberState[i]
        let age = t - st.born
        if (age > EMBER_LIFE) {
          st.born = t - Math.random() * EMBER_LIFE * 0.3
          st.angle = Math.random() * Math.PI * 2
          st.wobble = Math.random() * 10 - 5
          st.drift = 0.6 + Math.random() * 0.5
          age = t - st.born
        }
        const k = clamp01(age / EMBER_LIFE)
        const rise = k * k * 60 * st.drift
        const outward = r * (0.92 + k * 0.22)
        const x = cx + Math.cos(st.angle) * outward + Math.sin(k * 7 + st.angle) * st.wobble
        const y = cy + Math.sin(st.angle) * outward * 0.62 - rise
        const fade = k < 0.2 ? k / 0.2 : (1 - k) / 0.8
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.5 + fade * 0.7).toFixed(2)})`
        el.style.opacity = (clamp01(fade) * heat).toFixed(3)
      })
    }

    /** `progress` is 0..1 and reversible: everything below it is a pure
     *  function of that number, never of how it got there. */
    const paint = (t: number, progress: number) => {
      // ---- the writing ----
      const written = still ? 1 : span(t, HOLD, WRITE)
      // Linear along the journey, not eased: a hand does not accelerate into
      // the middle of a word. What it does do is pause at a lift, and those
      // pauses come out of `LIFT` rather than out of a curve.
      const travelled = journey * written
      strokes.forEach((path, i) => {
        const drawn = clamp01((travelled - startsAt[i]) / lengths[i])
        path.style.strokeDashoffset = String(lengths[i] * (1 - drawn))
      })
      // The last sliver of ink that the pen's own width cannot reach, brought
      // up under the finish.
      settledInk.style.opacity = span(t, HOLD + WRITE - SETTLE * 0.5, SETTLE).toFixed(3)

      // ---- the two things that follow it ----
      // Held until the stills are in: the name is the entrance, and "scroll"
      // is a promise, and a promise should not be made before it can be kept.
      const ready = readyAtRef.current
      const openedAt = Math.max(HOLD + WRITE, ready == null ? Infinity : ready - start)
      const artistOn = still ? 1 : out(span(t, openedAt + ARTIST_AT, ARTIST_IN))
      if (Number.isFinite(openedAt)) leaveFrom = openedAt + ARTIST_AT
      /* `settledOn` is only a clock now — the cue it used to raise is gone
         (see the markup), but the moment it marked is still the one that
         matters: the signature has finished writing and the opening has said
         what it came to say. Everything that may only happen afterwards —
         leaving on the timer, or a scroll being allowed to burn through —
         hangs off it. */
      const settledOn = still ? 1 : out(span(t, openedAt + ENTER_AT, ENTER_IN))
      canLeave = settledOn > 0.05

      // ---- leaving, bottom to top, run entirely off `progress` ----
      const goName = inOut(span(progress, OUT_NAME_AT, OUT_SPAN))
      const goArtist = inOut(span(progress, OUT_ARTIST_AT, OUT_SPAN))

      artist.style.opacity = (artistOn * (1 - goArtist)).toFixed(3)
      artist.style.transform = `translate3d(0, ${((1 - artistOn) * 10 - goArtist * 14).toFixed(1)}px, 0)`

      name.style.opacity = (1 - goName).toFixed(3)
      name.style.transform = `translate3d(0, ${(-goName * 16).toFixed(1)}px, 0)`

      // ---- the burn ----
      // The veil is not fading, it is being eaten through: a hole grows from
      // one point until nothing of it is left. `reveal` is that hole's
      // radius, eased, as a fraction of the screen's own size — the same
      // number the mask's circle and the glow ring both read, so neither can
      // drift out of sync with the other.
      const reveal = out(progress)
      const vmax = Math.max(window.innerWidth, window.innerHeight)
      const cx = window.innerWidth * BURN_X
      const cy = window.innerHeight * BURN_Y
      const rVmax = reveal * BURN_MAX * 100
      const r = rVmax * vmax * 0.01
      burnCircle.setAttribute('cx', cx.toFixed(1))
      burnCircle.setAttribute('cy', cy.toFixed(1))
      burnCircle.setAttribute('r', r.toFixed(1))
      burn.style.setProperty('--burn-r', `${rVmax.toFixed(1)}vmax`)
      veil.style.setProperty('--burn-r', `${rVmax.toFixed(1)}vmax`)
      // The glow at the burning edge: a bump that rises as the hole opens and
      // falls away again once the room is fully lit, not a fade that only
      // ever goes one way.
      const heat = still ? 0 : Math.sin(clamp01(progress) * Math.PI)
      burn.style.opacity = (heat * 0.95).toFixed(3)
      // The edge is not a clean circle — turbulence bends it into the ragged,
      // uneven line an actual burn leaves, and reseeding it every few frames
      // while it is alight keeps that line alive rather than frozen.
      if (!still && heat > 0.02) {
        seedTick++
        if (seedTick % 3 === 0) burnNoise.setAttribute('seed', String(2 + Math.floor(Math.random() * 60)))
      }

      paintFilm(t, 1 - reveal, heat)
      paintEmbers(t, cx, cy, r, heat)

      // Once the veil is gone this element has nothing left to hide and
      // should not still be catching wheel and clicks meant for the page now
      // showing through it.
      root.style.pointerEvents = reveal >= 1 ? 'none' : ''
      return { reveal }
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now() / 1000 - start

      /* Before scrolling starts the clock is quantised: `t` only ever takes
         values on the 24ths, so two or three display frames in a row are
         *identical*, which is what a projected frame does. Once the visitor
         has scrolled at all, real time — the burn has to be smooth, and has
         to answer the wheel the instant it moves. */
      if (!committed) {
        const next = Math.floor(now * FPS)
        if (next !== frame) {
          frame = next
          paint(next / FPS, 0)
        }

        /* Leaving without being asked to.

           The black lifts on its own from the moment the word above the name
           starts to arrive: the rubric fading up and the room fading off are
           the same beat, rather than the opening saying its last word and
           then waiting to be let out. It *fades*, and the film keeps running
           on its 24ths underneath the whole way down, so what goes is the
           black and the crackle together, as one picture dimming.

           Deliberately not the burn. The burn is a hole eaten through the
           veil from a point, which is a thing a gesture does — it answers the
           wheel, which is why `progress` exists at all — and driving it off a
           timer instead read as a rip rather than an exit. A scroll still
           gets the burn; this is only the way out for someone who does
           nothing.

           And no `onCommit` on this path. That tells the shell to put the
           stage on the first project (`enterWork`, Site.tsx), which is right
           when a scroll asked to go there and wrong here: nobody asked for
           anything, so the page underneath should be its own opening frame,
           with the name still in the middle of the screen. Calling it was
           what sent the opening straight into the work. */
        if (!leaveFrom) return
        const k = clamp01((now - leaveFrom) / AUTO_FADE)
        if (k <= 0) return
        root.style.opacity = (1 - k).toFixed(3)
        // Half-faded, this is a sheet of glass over a live page. The wheel
        // and touch listeners are on `window` and still take the burn over,
        // so nothing is lost by letting clicks through as it goes.
        root.style.pointerEvents = 'none'
        if (k >= 1 && !revealed) {
          revealed = true
          onReveal()
          cancelAnimationFrame(raf)
          onDone()
        }
        return
      }

      const { reveal } = paint(now, progressRef.current)
      if (!revealed && reveal >= 1) {
        revealed = true
        onReveal()
        cancelAnimationFrame(raf)
        onDone()
      }
    }

    /** Wheel and touch both funnel into this: advance or retreat `progress`
     *  by a distance in the same units the browser already reports, so a
     *  small nudge burns a little and a hard scroll burns straight through. */
    const nudge = (delta: number) => {
      if (revealed) return
      if (!canLeave && delta > 0) return
      // Whatever the auto-fade had dimmed, hand back: from here the burn is
      // the picture, and it cannot eat through a veil that is half see-through.
      if (!committed) {
        committed = true
        root.style.opacity = '1'
      }
      progressRef.current = clamp01(progressRef.current + delta / SCROLL_RANGE)
      if (progressRef.current > 0 && !calledCommit) {
        calledCommit = true
        onCommit()
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!canLeave && e.deltaY <= 0) return
      e.preventDefault()
      nudge(e.deltaY)
    }

    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null) return
      const y = e.touches[0]?.clientY
      if (y == null) return
      const delta = touchY - y
      if (!canLeave && delta <= 0) return
      e.preventDefault()
      touchY = y
      nudge(delta)
    }

    /** A keyboard/AT path to the same door, since the burn itself only
     *  answers a wheel or a finger. */
    const onKeyDown = (e: KeyboardEvent) => {
      if (!canLeave) return
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowDown' && e.key !== 'PageDown') return
      e.preventDefault()
      nudge(SCROLL_RANGE)
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    paint(0, 0)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onCommit, onReveal, onDone])

  const [x, y, w, h] = NAME_BOX
  /* The viewBox is the ink and nothing else, so the element's box and the
     letterforms are the same rectangle and the words above and below can be
     set off it directly. The pen is wider than the ink and hangs outside that
     box on every side, which is what `pad` is for — but it only widens the
     *mask's* region, never the view. */
  const pad = PEN_WIDTH

  return (
    <div className="in" ref={rootRef}>
      {/* Nothing here paints on its own — it only defines the ragged edge the
          veil's hole and the glow ring both borrow, so a turbulence field
          that displaces one displaces the other identically. Sized to the
          viewport rather than left at 0×0, since percentages inside it (the
          mask's rect and circle) resolve against its own box. */}
      <svg className="in-burn-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="in-burn-edge" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              ref={burnNoiseRef}
              type="fractalNoise"
              baseFrequency="0.012 0.017"
              numOctaves={4}
              seed={7}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={130} xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation={2.5} />
          </filter>
          <mask id="in-burn-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="#fff" />
            <circle ref={burnCircleRef} cx="50%" cy="56%" r={0} fill="#000" filter="url(#in-burn-edge)" />
          </mask>
        </defs>
      </svg>

      {/* The dark. A hole burns through it on the site's own clock — see
          `paint` in the effect above — and it is what actually hides the
          page. */}
      <div className="in-veil" ref={veilRef} aria-hidden="true" />
      <div className="in-burn" ref={burnRef} aria-hidden="true" />

      <div className="in-stack" ref={stackRef}>
        <p className="in-artist" ref={artistRef}>
          artist
        </p>

        <div className="in-name" ref={nameRef}>
          <h1 className="u-sr">Tarlok Singh — artist</h1>
          <svg viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" focusable="false">
            <defs>
              <mask
                id="in-pen"
                maskUnits="userSpaceOnUse"
                x={x - pad}
                y={y - pad}
                width={w + pad * 2}
                height={h + pad * 2}
              >
                {/* One element per pen-down — see `nameGlyphs.ts` for why they
                    cannot be subpaths of one path. */}
                {NAME_PEN.map((stroke, i) => (
                  <path
                    key={stroke}
                    ref={(el) => {
                      if (el) penRef.current[i] = el
                    }}
                    d={stroke}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={PEN_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </mask>
            </defs>
            {/* Twice, exactly on top of itself: the stroke the pen has reached,
                and the whole thing brought up under the finish. */}
            <path d={NAME_OUTLINE} fill="#fff" mask="url(#in-pen)" />
            <path d={NAME_OUTLINE} fill="#fff" ref={settledRef} opacity="0" />
          </svg>
        </div>

        {/* No cue here any more. The opening leaves on its own, so a prompt
            to scroll would be asking for something that is about to happen
            regardless — and the page it hands to raises its own cue
            (`.hm-cue` in Home.css), which is where the invitation belongs,
            because that is the first screen where scrolling is a choice. */}
      </div>

      <div className="in-marks" ref={marksRef} aria-hidden="true">
        {Array.from({ length: SCRATCHES }, (_, i) => (
          <span className="in-scratch" key={`s${i}`} />
        ))}
        {Array.from({ length: DUST }, (_, i) => (
          <span className="in-dust" key={`d${i}`} />
        ))}
      </div>

      <div className="in-grain" ref={grainRef} aria-hidden="true" />
      <div className="in-vignette" ref={vignetteRef} aria-hidden="true" />
    </div>
  )
}
