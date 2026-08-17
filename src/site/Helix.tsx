import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { projects } from '../data/projects'
import type { MediaItem } from '../data/media'
import { clamp, ease, range } from './useScrollEngine'
import type { ScrollEngine } from './useScrollEngine'
import './Helix.css'

/* The media field the home page opens on: every project's work turning around
   the name in a vortex — a funnel of cards on two intertwined strands, seen
   from inside it.

   Built in CSS 3D rather than WebGL, for one reason that decides everything
   else — the name has to sit *inside* the same space, with near cards passing
   in front of it and far cards behind. A `preserve-3d` context sorts its
   children by depth and gives that for free; a WebGL canvas is one flat
   element that text can only ever be entirely above or entirely below.

   **Cards lie on the funnel wall, not facing the camera.** That single fact
   is what makes this read as a vortex rather than as pictures drifting on a
   plane: a card turns edge-on as it comes round the side, and shows you its
   back — mirrored, and veiled darker — once it has gone behind. Billboarding
   them at the viewer instead (which is what an earlier version did, with a
   17° token tilt) flattens the whole thing, because nothing about a card ever
   changes as it travels and the only cue left is scale.

   Cost is kept where CSS 3D is cheap. Cards only ever get `transform` and
   `opacity` written to them — both compositor properties, so no frame does
   layout or paint. Nothing is measured inside the loop. There is no blur
   filter anywhere near this (a blur re-rasterises its element every frame,
   which is what made an earlier version of this site janky); depth reads
   through scale, fade and overlap instead. */

const TAU = Math.PI * 2

/** Revolutions a strand makes across the full travelled span. More turns is
 *  a tighter spiral and a stronger vortex; much past 2 and neighbours on a
 *  strand start overlapping each other rather than the far wall. */
const TURNS = 1.9
/** How much taller than the viewport the loop is, so cards enter and leave
 *  off-screen rather than popping at the edges. Above about 2 the field
 *  thins out — most of the work ends up parked off-screen and the page reads
 *  as a few stray cards rather than a body of work. */
const SPAN_SCREENS = 1.95
/** The funnel. Radius is scaled from this at the bottom of the loop to
 *  `FUNNEL_TOP` at the top, so the wall leans instead of standing straight
 *  up — a cylinder and a vortex differ by exactly this taper. */
const FUNNEL_BOTTOM = 1.24
const FUNNEL_TOP = 0.74
/** Base drift with no input at all, in loops per second. Slow on purpose —
 *  this is the page at rest — but not so slow it reads as a still: below
 *  about 0.02 a card takes a minute to cross the frame and the motion stops
 *  being perceptible at all. */
const IDLE_SPEED = 0.045
/** How hard scrolling drives the drift on top of the idle rate. */
const SCROLL_BOOST = 0.19
/** Seconds between one card arriving and the next during the entrance. */
const ENTRY_STAGGER = 0.075
const ENTRY_DURATION = 1.15

/** Per-card size multipliers. Deliberately a wide spread — a field where
 *  every card is within 20% of every other reads as a grid that happens to be
 *  in perspective. Nine entries against two strands, so a strand does not
 *  land on the same few sizes over and over. */
const WIDTH_STEPS = [1.0, 0.52, 1.46, 0.78, 1.14, 0.44, 0.92, 1.32, 0.66]

export interface HelixCard {
  media: MediaItem
  projectId: string
  projectTitle: string
  accent: string
}

/**
 * One card per clip, round-robin across projects so no two neighbours on a
 * strand come from the same piece of work, and never the same source twice.
 */
export function buildHelixCards(count: number): HelixCard[] {
  const pools = projects
    .filter((project) => project.media.length > 0)
    .map((project) => ({ project, queue: [...project.media] }))
  if (!pools.length) return []

  const cards: HelixCard[] = []
  let cursor = 0
  while (cards.length < count && pools.some((pool) => pool.queue.length > 0)) {
    const pool = pools[cursor % pools.length]
    cursor++
    const media = pool.queue.shift()
    if (!media) continue
    cards.push({
      media,
      projectId: pool.project.id,
      projectTitle: pool.project.title,
      accent: pool.project.accent
    })
  }
  return cards
}

/** Every poster the field will show — what the loader waits on. */
export function helixPosters(cards: HelixCard[]): string[] {
  return cards.map((card) => card.media.poster ?? card.media.src).filter(Boolean)
}

interface Frame {
  radius: number
  span: number
  baseWidth: number
  /** Half the name block's box, for the keep-clear below. */
  nameHalfW: number
  nameHalfH: number
}

function measure(): Frame {
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    radius: clamp(w * 0.34, 170, 560),
    span: h * SPAN_SCREENS,
    baseWidth: clamp(w * 0.15, 112, 280),
    nameHalfW: 0,
    nameHalfH: 0
  }
}

interface HelixProps {
  cards: HelixCard[]
  engine: ScrollEngine
  /** Scroll position at which the field has fully receded behind the work. */
  fadeBy?: number
  /** Seconds after mount that the first card arrives. */
  startDelay?: number
  onOpen: (projectId: string) => void
  /** Rendered at the centre of the space, at depth zero — the name. Passed in
   *  rather than owned here so it shares this element's 3D context and cards
   *  can occlude it. */
  children?: ReactNode
}

export default function Helix({
  cards,
  engine,
  fadeBy = 1.15,
  startDelay = 0.35,
  onOpen,
  children
}: HelixProps) {
  const spaceRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const veilRefs = useRef<Array<HTMLElement | null>>([])
  // Replaced on the first resize pass, which runs on mount.
  const frameRef = useRef<Frame>({ radius: 320, span: 2000, baseWidth: 200, nameHalfW: 0, nameHalfH: 0 })
  /* How many clips may decode at once.

     On a desktop, every one of them: the field is a field of *footage*, and a
     card holding a frozen frame reads as a picture of the work rather than
     the work. That is affordable only because what plays here is the 400px
     proxy from `scripts/field-clips.sh` — a couple of dozen of those cost
     less than the four case-study masters this used to ration.

     A phone still rations, and not for bandwidth: iOS caps how many hardware
     decoders a page may hold, and past it videos simply refuse to play. */
  const maxLive =
    typeof window !== 'undefined' && window.innerWidth < 760 ? 6 : cards.length
  const allLive = maxLive >= cards.length

  // Which cards are worth decoding video for. State, because it mounts and
  // unmounts <video> elements — but only ever changes a few times a second.
  // Starts empty even when everything is going to play: a card's clip is
  // fetched as the card itself arrives, so the entrance's stagger spreads
  // two dozen requests over a second and a half instead of putting them all
  // in front of the stills the loader is still waiting on.
  const [live, setLive] = useState<Set<number>>(() => new Set())
  const liveRef = useRef(live)
  liveRef.current = live
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  hoveredRef.current = hovered

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Sizes are fixed per card and never recomputed in the loop — they come out
  // of the generated dimensions manifest, so nothing resizes as media decodes.
  const layout = useMemo(
    () =>
      cards.map((card, i) => ({
        widthStep: WIDTH_STEPS[i % WIDTH_STEPS.length],
        aspect: card.media.aspect,
        strand: i % 2,
        // Spread along the strand: each strand gets its own evenly spaced run.
        u: Math.floor(i / 2) / Math.max(1, Math.ceil(cards.length / 2)),
        // A fixed per-card wobble so the field reads as hand-placed rather
        // than machined. Deterministic, so it never changes between renders.
        jitter: Math.sin(i * 12.9898) * 0.5 + Math.cos(i * 78.233) * 0.5,
        roll: Math.sin(i * 3.7) * 3.4
      })),
    [cards]
  )

  useEffect(() => {
    const onResize = () => {
      frameRef.current = measure()
      // Measured rather than assumed: the name is passed in as children, and
      // its box drives the keep-clear that stops cards parking on top of it.
      const nameEl = spaceRef.current?.querySelector<HTMLElement>(':scope > :not(.hx-card)')
      if (nameEl) {
        frameRef.current.nameHalfW = nameEl.offsetWidth / 2
        frameRef.current.nameHalfH = nameEl.offsetHeight / 2
      }
      const { baseWidth } = frameRef.current
      // Written once per resize rather than per frame: width and height are
      // layout properties and setting them in the loop would cost a reflow
      // for all twenty-odd cards, every frame.
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const spec = layout[i]
        if (!spec) return
        let width = baseWidth * spec.widthStep
        let height = width / spec.aspect
        // Capped against the card's *own* width, not the base: a cap in
        // absolute px would pull every tall portrait down to the same height
        // and quietly undo the size spread the field is laid out with.
        const maxHeight = width * 1.62
        if (height > maxHeight) {
          height = maxHeight
          width = height * spec.aspect
        }
        el.style.width = `${Math.round(width)}px`
        el.style.height = `${Math.round(height)}px`
      })
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [layout])

  useEffect(() => {
    const started = performance.now() / 1000 + startDelay
    let travel = 0
    // Eased rather than switched, so hovering a card slows the field to a
    // near-stop over half a second instead of stopping it dead.
    let hoverDamp = 1
    let liveCheck = 0

    const unsubscribe = engine.subscribe((state, dt) => {
      const now = performance.now() / 1000
      const { radius: baseRadius, span, nameHalfW, nameHalfH } = frameRef.current

      const wantDamp = hoveredRef.current === null ? 1 : 0.12
      hoverDamp += (wantDamp - hoverDamp) * (1 - Math.exp(-dt / 0.28))

      // Scroll drives the drift on top of the idle rate. `value` is signed so
      // scrolling back up runs the field backwards, which is what makes the
      // scroll feel connected to it rather than merely correlated.
      const drive = reduced ? 0 : IDLE_SPEED + state.speed * SCROLL_BOOST
      travel += drive * hoverDamp * dt + state.velocity * dt * 0.16

      // How far into the work we are: the field opens outward and dims as the
      // rotunda takes over, so it reads as flying through rather than a
      // crossfade between two unrelated things.
      const depart = ease(state.value, 0, fadeBy)
      const radius = baseRadius * (1 + depart * 1.25)
      const fieldOpacity = 1 - depart * 0.9

      const space = spaceRef.current
      if (space) space.style.opacity = fieldOpacity.toFixed(3)

      const entrance = now - started
      // One of the two is filled, depending on whether the field is
      // rationing clips at all.
      const scores: Array<{ index: number; score: number }> = []
      const arrived: number[] = []

      for (let i = 0; i < layout.length; i++) {
        const el = cardRefs.current[i]
        const spec = layout[i]
        if (!el || !spec) continue

        // Position along the loop, wrapped. Cards leave the top and re-enter
        // at the bottom; both ends are faded out, so the wrap is never seen.
        const t = (((spec.u + travel) % 1) + 1) % 1
        const angle = t * TURNS * TAU + spec.strand * Math.PI
        // The funnel: the wall leans in as the loop climbs, so a card spirals
        // inward on its way up rather than tracking a straight tube.
        const wall = radius * (FUNNEL_BOTTOM + (FUNNEL_TOP - FUNNEL_BOTTOM) * t)
        const x = Math.cos(angle) * wall + spec.jitter * 22
        const z = Math.sin(angle) * wall
        const y = (0.5 - t) * span

        // Depth: 0 at the far wall, 1 nearest the viewer. `sin(angle)` rather
        // than `z / wall`, so the jitter and the taper cannot push it out of
        // range at a small radius.
        const facing = Math.sin(angle)
        const depth = (facing + 1) / 2

        // Cards arrive one at a time after the name, each rising into place.
        const entry = reduced ? 1 : range(entrance - i * ENTRY_STAGGER, 0, ENTRY_DURATION)
        const eased = entry * entry * (3 - 2 * entry)

        const focus = hoveredRef.current === i ? 1 : 0
        const scale = (0.72 + 0.28 * eased) * (1 + focus * 0.06)

        /* Keep-clear around the name.

           A card genuinely near the camera is *allowed* to cross the name —
           that overlap is the single strongest thing selling the depth, and
           removing it flattens the field to a ring of pictures. What is not
           allowed is a card at the name's own depth sitting on the words,
           which reads as clutter rather than as foreground. So the veil is
           weighted by how far from the camera the card is, and lifts entirely
           once the name has gone. */
        const overName =
          nameHalfW > 0
            ? (1 - clamp(Math.abs(x) / (nameHalfW + 90), 0, 1)) *
              (1 - clamp(Math.abs(y) / (nameHalfH + 70), 0, 1)) *
              clamp(1 - depth * 1.4, 0, 1) *
              (1 - depart)
            : 0

        let opacity =
          eased *
          // Both ends of the loop, so the wrap point is invisible.
          range(t, 0, 0.1) *
          range(1 - t, 0, 0.12) *
          // Far cards sit back rather than competing with the near ones.
          (0.42 + 0.58 * depth) *
          (1 - overName * 0.8) *
          fieldOpacity
        // Anything else dims while one card is being looked at.
        if (hoveredRef.current !== null && hoveredRef.current !== i) opacity *= 0.4

        /* Lying on the wall.

           The card's normal has to point away from the funnel's axis, so a
           card at the front faces the camera, one at the side is edge-on, and
           one at the back shows its mirrored reverse. `rotateY(φ)` sends the
           normal to (sin φ, 0, cos φ) and the outward normal here is
           (cos θ, 0, sin θ), so φ = 90° − θ. The `-scaleY` further down is
           not needed: the browser is already drawing the element's backface,
           which is the mirroring, for free. */
        const spin = 90 - (angle * 180) / Math.PI

        el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
          `rotateY(${spin.toFixed(2)}deg) rotateZ(${spec.roll}deg) scale(${scale.toFixed(3)})`
        el.style.opacity = opacity.toFixed(3)
        // The veil that darkens a card once it has turned away. Written to a
        // child rather than applied as a `filter` on the card, because a
        // filter re-rasterises its subtree every frame and opacity does not.
        const veil = veilRefs.current[i]
        if (veil) veil.style.opacity = (clamp(-facing, 0, 1) * 0.62).toFixed(3)
        // Below a threshold, or edge-on, there is nothing to see and it
        // should not swallow a click meant for whatever is behind it.
        el.style.pointerEvents = opacity > 0.35 && facing > 0.1 ? 'auto' : 'none'

        if (allLive) {
          // Everything plays; the only question is whether this one has
          // turned up yet.
          if (entry > 0) arrived.push(i)
        } else {
          // Worth decoding video for? Near the camera and near the middle of
          // the screen — a card at the top of frame is on its way out.
          scores.push({ index: i, score: depth * 2 - Math.abs(y) / span })
        }
      }

      // Re-picked a few times a second, not every frame: each change mounts
      // or unmounts a <video>, and doing that at 60Hz would be far more
      // expensive than the decoding it is meant to ration.
      liveCheck += dt
      if (liveCheck > 0.3 && !reduced) {
        liveCheck = 0
        let next: Set<number>
        if (allLive) {
          next = new Set(arrived)
        } else {
          scores.sort((a, b) => b.score - a.score)
          next = new Set<number>()
          for (const { index } of scores.slice(0, maxLive)) next.add(index)
          // Hysteresis: something already playing keeps playing while it is
          // still roughly in contention, so the set does not thrash on the
          // boundary and restart videos every second.
          for (const { index } of scores.slice(maxLive, maxLive + 3)) {
            if (liveRef.current.has(index)) next.add(index)
          }
        }
        const current = liveRef.current
        const changed = next.size !== current.size || [...next].some((i) => !current.has(i))
        if (changed) setLive(next)
      }
    })

    return unsubscribe
  }, [engine, layout, fadeBy, startDelay, reduced, maxLive, allLive])

  const setCardRef = useCallback((index: number) => (el: HTMLElement | null) => {
    cardRefs.current[index] = el
  }, [])

  const setVeilRef = useCallback((index: number) => (el: HTMLElement | null) => {
    veilRefs.current[index] = el
  }, [])

  return (
    <div className="hx" aria-hidden="true">
      <div className="hx-space" ref={spaceRef}>
        {children}
        {cards.map((card, i) => (
          <button
            type="button"
            key={card.media.id}
            className="hx-card"
            ref={setCardRef(i)}
            tabIndex={-1}
            style={{ ['--card-accent' as string]: card.accent }}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
            onClick={() => onOpen(card.projectId)}
          >
            <span className="hx-card-frame">
              {/* The poster is always the thing on screen. A video, when one
                  is warranted, fades in over the top of it once it can
                  actually play — swapping the elements instead would blink
                  a hole in the card at the moment of the swap. */}
              <img
                className="hx-card-still"
                src={card.media.poster ?? card.media.src}
                alt=""
                loading="eager"
                decoding="async"
                draggable={false}
              />
              {card.media.type === 'video' && live.has(i) ? (
                /* The proxy, not the master — see `MediaItem.clip`. Falling
                   back to the master keeps a newly added clip visible before
                   `scripts/field-clips.sh` has been run for it. */
                <LiveClip src={card.media.clip ?? card.media.src} />
              ) : null}
              {/* Written per frame once the card turns away from the camera. */}
              <span className="hx-card-veil" ref={setVeilRef(i)} />
            </span>
            <span className="hx-card-tag">{card.projectTitle}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A clip that only reveals itself once it can play through, so a card never
 * flashes to black between mounting the element and the first decoded frame.
 */
function LiveClip({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    // Autoplay is refused often enough (low power mode, a background tab)
    // that it has to be handled rather than assumed; the poster underneath
    // is a complete fallback, so nothing needs to be done about it.
    video.play().catch(() => {})
    return () => {
      video.pause()
      // Dropping the source is what actually frees the decoder. Without it a
      // long visit accumulates one paused pipeline per card ever shown.
      video.removeAttribute('src')
      video.load()
    }
  }, [src])

  return (
    <video
      ref={ref}
      className="hx-card-clip"
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      data-ready={ready}
      onCanPlay={() => setReady(true)}
    />
  )
}
