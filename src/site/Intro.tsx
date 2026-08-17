import { useCallback, useEffect, useRef, useState } from 'react'
import { NAME_BOX, NAME_OUTLINE, NAME_PEN, PEN_WIDTH } from './nameGlyphs'
import { createVeil } from './veil'
import type { Flock } from './flock'
import './Intro.css'

/* The opening.

   A dark room, lit like a print running through a projector, and a hand
   writing the name into it. Then two words and a door. Then the dark itself
   turns out to have been butterflies, and they leave.

   Two things about it are unusual enough to be worth stating up front.

   The first is that it runs at 24fps. Not "looks like" 24fps — every visible
   value on screen is sampled from a clock quantised to 1/24s, and nothing
   moves between those samples. That is the whole reason it reads as film
   rather than as a web page with a grain overlay on it: the strobe on a
   moving edge, the way the flicker sits still for two display frames and then
   jumps, the fact that the pen advances in discrete bites. A 60fps version of
   exactly this animation looks like an advert. The moment the visitor asks
   for the work, the quantiser is dropped and the butterflies run at whatever
   the display can do, because a curtain that stutters just looks broken.

   The second is that everything here is driven from one `requestAnimationFrame`
   loop writing inline styles, rather than from CSS transitions or a timeline
   library. Both of those interpolate on their own clock, which is precisely
   the clock this screen is trying not to have.

   `Intro` also stands in for the loading screen on the way to the stage: it
   is already covering the page for four seconds, and making someone watch a
   progress bar and *then* an entrance is two waits where the design only has
   room for one. The name writes regardless; what waits on the images is the
   invitation to leave. */

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

/* ---- the exit, in seconds from the click ---- */
/** Bottom to top: the door, the name, then the word over it. */
const OUT_ENTER_AT = 0
const OUT_NAME_AT = 0.18
const OUT_ARTIST_AT = 0.44
const OUT_IN = 0.4
const FLOCK_AT = 0.72
const FLOCK_FOR = 2.6
/** How far ahead of the sheet giving way the flock is let go. */
const LEAD = 0.34
const FLIGHT_IN = 1.5

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
  /** Stills to have decoded before the visitor is invited through. */
  preload: string[]
  /** The visitor has asked for the work: put the page behind into position. */
  onCommit: () => void
  /** The butterflies have gone; nothing here is on screen any more. */
  onDone: () => void
}

/* Scratches and dust, placed once and then only moved. Both are lifted
   straight off a print: a scratch is a hair in the gate that stays for a
   while and then is gone, and dust is one frame and never the same twice. */
const SCRATCHES = 3
const DUST = 7

export default function Intro({ preload, onCommit, onDone }: IntroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const artistRef = useRef<HTMLParagraphElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const penRef = useRef<SVGPathElement[]>([])
  const settledRef = useRef<SVGPathElement>(null)
  const enterRef = useRef<HTMLButtonElement>(null)
  const grainRef = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLCanvasElement>(null)
  const flockRef = useRef<HTMLCanvasElement>(null)
  const marksRef = useRef<HTMLDivElement>(null)

  /* Only for the button's own affordances — the animation itself never
     re-renders, so nothing here may be state the loop reads. */
  const [leaving, setLeaving] = useState(false)

  /** Set the instant the visitor asks to leave; the loop watches it. */
  const leftAtRef = useRef<number | null>(null)
  /** When the images settled, so the invitation can wait on them. */
  const readyAtRef = useRef<number | null>(null)

  const leave = useCallback(() => {
    if (leftAtRef.current != null) return
    leftAtRef.current = performance.now() / 1000
    setLeaving(true)
    onCommit()
  }, [onCommit])

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
    const enter = enterRef.current
    const grain = grainRef.current
    const vignette = vignetteRef.current
    const veil = veilRef.current
    const canvas = flockRef.current
    const marks = marksRef.current
    if (!root || !stack || !artist || !name || !settledInk || !enter) return
    if (!grain || !vignette || !veil || !canvas || !marks) return
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

    const sheet = createVeil(veil, '#1a1a1a')
    // Capped: past 2x this is a lot of fill rate for a flat dark sheet.
    const fit = () => sheet.resize(window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1))
    fit()
    window.addEventListener('resize', fit)

    /* The flock arrives late on purpose. It drags in three.js and a GPGPU
       renderer, and at rest it is invisible — near enough the colour of the
       sheet it is standing on — so nothing about the opening waits for it.
       Loading it here rather than at the top of the module is the difference
       between the name starting to write immediately and it starting to write
       once half a megabyte of WebGL has parsed. If it never arrives, the
       reveal is the sheet tearing on its own. */
    let flock: Flock | null = null
    let dropped = false
    import('./flock')
      .then(({ createFlock }) => {
        if (dropped) return
        const made = createFlock(canvas, '/sprites/butterflies.png')
        // Without an alpha channel its canvas is an opaque black rectangle
        // over the whole page, which would hide the reveal rather than be
        // part of it. Better no butterflies than that.
        if (!made.hasAlpha) {
          made.dispose()
          canvas.style.display = 'none'
          return
        }
        flock = made
      })
      .catch(() => {})

    const scratches = Array.from(marks.querySelectorAll<HTMLElement>('.in-scratch'))
    const dust = Array.from(marks.querySelectorAll<HTMLElement>('.in-dust'))

    /* One origin for the whole screen. Every time below is seconds since it,
       including the two refs the click and the preloader write — they record
       `performance.now()` because they run outside this loop, and are pulled
       back onto this clock the moment the loop reads them. */
    const start = performance.now() / 1000
    let frame = -1
    let raf = 0

    /** Everything that is a function of the film clock, sampled on the 24s. */
    const paintFilm = (t: number, alive: number) => {
      // Grain: one turbulence tile, oversized and thrown to a new offset every
      // frame. Moving it is a compositor transform; regenerating noise per
      // frame would not survive on a phone.
      grain.style.transform = `translate3d(${(Math.random() * 180 - 90).toFixed(0)}px, ${(
        Math.random() * 180 - 90
      ).toFixed(0)}px, 0)`
      grain.style.opacity = (alive * (0.1 + Math.random() * 0.07)).toFixed(3)

      // Lamp flicker, and the weave of the gate. Both are tiny on purpose: at
      // this size they are felt rather than seen, and any larger reads as a
      // fault rather than as a projector.
      root.style.setProperty('--flicker', (0.9 + Math.random() * 0.12).toFixed(3))
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
        line.style.opacity = (alive * Math.random() * 0.34).toFixed(3)
        line.style.height = `${(30 + Math.random() * 70).toFixed(0)}%`
        line.style.top = `${(Math.random() * 40).toFixed(0)}%`
      })
      dust.forEach((speck) => {
        speck.style.left = `${(Math.random() * 100).toFixed(2)}%`
        speck.style.top = `${(Math.random() * 100).toFixed(2)}%`
        speck.style.opacity = (alive * (Math.random() < 0.4 ? Math.random() * 0.4 : 0)).toFixed(3)
      })
    }

    const paint = (t: number, left: number | null) => {
      const alive = left == null ? 1 : 1 - clamp01((t - left - FLOCK_AT) / (FLOCK_FOR * 0.4))

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
      // Held until the stills are in: the name is the entrance, the button is
      // a promise, and a promise should not be made before it can be kept.
      const ready = readyAtRef.current
      const openedAt = Math.max(HOLD + WRITE, ready == null ? Infinity : ready - start)
      const artistOn = still ? 1 : out(span(t, openedAt + ARTIST_AT, ARTIST_IN))
      const enterOn = still ? 1 : out(span(t, openedAt + ENTER_AT, ENTER_IN))

      // ---- the exit, bottom to top ----
      const goEnter = left == null ? 0 : inOut(span(t, left + OUT_ENTER_AT, OUT_IN))
      const goName = left == null ? 0 : inOut(span(t, left + OUT_NAME_AT, OUT_IN))
      const goArtist = left == null ? 0 : inOut(span(t, left + OUT_ARTIST_AT, OUT_IN))

      artist.style.opacity = (artistOn * (1 - goArtist)).toFixed(3)
      artist.style.transform = `translate3d(0, ${((1 - artistOn) * 10 - goArtist * 14).toFixed(1)}px, 0)`

      name.style.opacity = (1 - goName).toFixed(3)
      name.style.transform = `translate3d(0, ${(-goName * 16).toFixed(1)}px, 0)`

      enter.style.opacity = (enterOn * (1 - goEnter)).toFixed(3)
      enter.style.transform = `translate3d(0, ${((1 - enterOn) * 12 - goEnter * 18).toFixed(1)}px, 0)`
      enter.style.pointerEvents = enterOn > 0.9 && left == null ? 'auto' : 'none'

      paintFilm(t, alive)

      /* ---- the flock ----
         Linear, not eased. The stagger across the field is already the shape
         of this movement, and putting a curve on top of it only makes the
         whole flock hesitate and then bolt in unison. */
      const reveal = left == null ? 0 : span(t, left + FLOCK_AT, FLOCK_FOR)
      // The flock is let go a little before the sheet starts to give, so the
      // wings are already up when the dark begins to come away under them.
      flock?.setFlight(left == null ? 0 : span(t, left + FLOCK_AT - LEAD, FLIGHT_IN))
      sheet.erode(reveal)
      return reveal
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now() / 1000 - start
      const left = leftAtRef.current == null ? null : leftAtRef.current - start

      /* Before the click the clock is quantised: `t` only ever takes values on
         the 24ths, so two or three display frames in a row are *identical*,
         which is what a projected frame does. After it, real time — the
         curtain has to be smooth. */
      if (left == null) {
        const next = Math.floor(now * FPS)
        if (next === frame) return
        frame = next
        paint(next / FPS, null)
        return
      }

      const reveal = paint(now, left)
      if (reveal >= 1) {
        cancelAnimationFrame(raf)
        onDone()
      }
    }

    paint(0, null)
    raf = requestAnimationFrame(tick)

    return () => {
      dropped = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
      flock?.dispose()
    }
  }, [onDone])

  const [x, y, w, h] = NAME_BOX
  /* The viewBox is the ink and nothing else, so the element's box and the
     letterforms are the same rectangle and the words above and below can be
     set off it directly. The pen is wider than the ink and hangs outside that
     box on every side, which is what `pad` is for — but it only widens the
     *mask's* region, never the view. */
  const pad = PEN_WIDTH

  return (
    <div className="in" ref={rootRef}>
      {/* The dark. See `veil.ts` — it is torn away rather than faded, and it
          rather than the flock is what actually hides the page. */}
      <canvas className="in-veil" ref={veilRef} aria-hidden="true" />
      <canvas className="in-flock" ref={flockRef} aria-hidden="true" />

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

        <button
          type="button"
          className="in-enter"
          ref={enterRef}
          onClick={leave}
          disabled={leaving}
          tabIndex={leaving ? -1 : 0}
        >
          See my work
        </button>
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
