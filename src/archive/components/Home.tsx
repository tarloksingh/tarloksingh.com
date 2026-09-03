import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { button, Leva, useControls } from 'leva'
import {
  clearPersistedControls,
  exportPersistedControls,
  restoreSchema,
  usePersistControls
} from '../../hooks/persistControls'
import BlurText from '../../components/BlurText'
import { workProjects } from '../data/work'
import { getProjectMedia, type ProjectMediaItem } from '../data/projectMedia'

const CONTACT_EMAIL = 'tarloksinghfilms@gmail.com'

// Every card is hand-placed at irregular offsets (nothing shares a column
// or row line) so each set reads as a scattered cluster rather than a grid,
// sized generously so neighbours overlap by a wide margin — no gaps at the
// rounded corners. Each slot is ordered center-out, so a project with fewer
// distinct assets than slots still reads as one coherent cluster.
//
// Cycling through several arrangements is what makes a swipe land the cards
// somewhere new instead of dropping them back where they started.
// More resting spots than there are cards, all the same size. Every swipe
// advances which spots are occupied, so a new set never lands in exactly
// the arrangement the last one had — while the cards themselves keep their
// dimensions, so it still reads as contents changing rather than
// containers being swapped out.
//
// They overlap heavily and all sit near the middle, so any run of four
// still reads as one cluster with the centre covered for the title.
// Size belongs to the card, not the spot — so rotating through positions
// never resizes anything, while the cluster still mixes large and small.
// One size per slot rather than a repeating run of four, because wrapping
// put a large card and a small one on neighbouring spots and the small one
// disappeared inside it. This set is checked for counts 2..7 at every
// rotation: nothing is ever fully buried and the title always has artwork
// behind it. `z` runs smallest-on-top so a big card cannot cover a little
// one even partially.
const CARD_SIZES = [
  { width: 42, height: 46, z: 2 },
  { width: 36, height: 38, z: 5 },
  { width: 40, height: 44, z: 3 },
  { width: 34, height: 36, z: 6 },
  { width: 44, height: 48, z: 1 },
  { width: 38, height: 40, z: 4 },
  { width: 32, height: 34, z: 7 }
]

// Spread far enough apart that every card keeps some of itself clear —
// checked so no card ever lands entirely behind another, and so every
// rotation keeps artwork under the title (white type on a white page has
// nothing to sit against now the text shadow is gone).
const POSITIONS = [
  { left: 10, top: 20 },
  { left: 46, top: 2 },
  { left: 2, top: 0 },
  { left: 50, top: 30 },
  { left: 24, top: 40 },
  { left: 34, top: 14 },
  { left: 16, top: 38 }
]

// Drift is tied to the card, not the spot, so each one keeps its own
// rhythm however the cluster is arranged.
const FLOATS = [
  { amplitude: 9, duration: 4.2, delay: 0 },
  { amplitude: 6, duration: 3.4, delay: 0.4 },
  { amplitude: 8, duration: 3.8, delay: 0.2 },
  { amplitude: 7, duration: 4.6, delay: 0.55 }
]

// Four cards, because that is the fewest distinct assets any project has
// (block-builder) — every project fills all four without repeating, so the
// number on screen never changes between projects either.
const SLOT_COUNT = FLOATS.length

// Capped at the number of distinct resting spots, so every card still has
// somewhere of its own to sit.
const MAX_CARDS = POSITIONS.length

const padToCount = (items: ProjectMediaItem[], count: number) =>
  items.length === 0 || items.length >= count
    ? items
    : Array.from({ length: count }, (_, i) => items[i % items.length])

// Seconds for a full orbit, and how far into it the media/title swap fires.
// Swapping before halfway leaves the outgoing and incoming titles visibly
// overlapping, which is what makes the text feel handed off rather than
// queued.
const SWEEP_DURATION = 1.15
const SWAP_AT = 0.36

// How long the intro holds before the cards start arriving — long enough
// for the name and eyebrow to have read, so the page fills in top-down.
const INTRO_CARDS_AT = 1.15

// How far a finger has to travel before the sweep takes over. Small, so
// easing into a drag starts things moving rather than needing a flick.
const TOUCH_TRIGGER_PX = 12

// Longest the outgoing title can possibly take: its own duration plus the
// capped per-character stagger, with headroom.
const TITLE_EXIT_MAX_MS = 2400

// Open the page with `?tune` on the end to get the shuffle sliders.
const showTuner = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tune')

// Shared per-character reveal for every text block on the page — matches
// reactbits.dev/text-animations/split-text (duration=1.9, delay=90): no
// blur, chars fade + rise up from the floor beneath them. Each block's
// `startDelay` cascades it in after the one before.
const reveal = (startDelay: number) => ({
  animateBy: 'chars' as const,
  direction: 'bottom' as const,
  distance: 40,
  delay: 90,
  stepDuration: 1.9,
  ease: 'power3.out',
  blur: false,
  fade: true,
  startDelay
})

// The project title's own reveal is much quicker than the header's — a
// slot-machine tick, not an entrance. Kept short enough that the word is
// fully gone before the cards finish their shuffle, so the swap never waits
// on it. `direction` is set per transition so the exiting word and the
// incoming one keep travelling the same way, like one continuous reel.
const titleReveal = (direction: 'top' | 'bottom') => ({
  animateBy: 'chars' as const,
  direction,
  distance: 34,
  delay: 28,
  stepDuration: 0.62,
  ease: 'power3.out',
  blur: false,
  fade: true,
  startDelay: 0
})

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [titleMounted, setTitleMounted] = useState(false)
  // The title being animated away, kept mounted alongside the incoming one
  // so the two overlap instead of running back to back.
  const [exitingTitle, setExitingTitle] = useState<string | null>(null)
  const [titleDirection, setTitleDirection] = useState<'top' | 'bottom'>('bottom')
  const [positionOffset, setPositionOffset] = useState(0)

  // Live tuning for the shuffle. Hidden unless the page is opened with
  // `?tune` on the end, so it is there on a phone over the tailnet without
  // ever showing up for anyone else.
  const tuning = useControls(
    'Shuffle',
    restoreSchema('Shuffle', {
      duration: { value: SWEEP_DURATION, min: 0.3, max: 3, step: 0.05, label: 'Sweep time (s)' },
      // How many resting spots the cluster travels past before settling —
      // turn it up to send them further round the circle.
      steps: { value: 1, min: 1, max: 4, step: 1, label: 'Travel (spots)' },
      bow: { value: 0.3, min: 0, max: 1.2, step: 0.05, label: 'Arc bow' },
      swapAt: { value: SWAP_AT, min: 0.1, max: 0.9, step: 0.02, label: 'Swap point' },
      press: { value: 0.95, min: 0.6, max: 1, step: 0.01, label: 'Press-in scale' }
    })
  )

  const layoutControls = useControls(
    'Cards',
    restoreSchema('Cards', {
      cardCount: { value: SLOT_COUNT, min: 2, max: MAX_CARDS, step: 1, label: 'How many' },
      cardScale: { value: 1, min: 0.5, max: 1.6, step: 0.02, label: 'Size' },
      floatAmount: { value: 1, min: 0, max: 3, step: 0.1, label: 'Float' }
    })
  )

  useControls('Export', {
    'Copy all settings': button(() => copySettings()),
    'Reset all settings': button(() => {
      clearPersistedControls()
      window.location.reload()
    })
  })

  usePersistControls('Shuffle', tuning)
  usePersistControls('Cards', layoutControls)
  // The wheel listener is bound once, so it would otherwise keep reading
  // whatever these were on first render.
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const floatTweensRef = useRef<(gsap.core.Tween | null)[]>([])
  const transitioningRef = useRef(false)
  const pendingIndexRef = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const collageRef = useRef<HTMLDivElement>(null)
  const exitTimerRef = useRef<number | undefined>(undefined)
  // Which way the cluster sweeps — follows the swipe, so a scroll down
  // pushes the cards round clockwise and a scroll up reverses it.
  const spinDirRef = useRef<1 | -1>(1)
  // The wheel listener below is attached once on mount, so `changeProject`
  // would otherwise close over activeIndex as it was at that first render.
  // Keeping a ref in sync lets it always read the current value.
  const activeIndexRef = useRef(0)
  const positionOffsetRef = useRef(0)
  // The settle-after-move layout effect must not fire on first mount, where
  // the intro's bubble-in owns the cards instead.
  const settledOnceRef = useRef(false)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    positionOffsetRef.current = positionOffset
  }, [positionOffset])

  const { cardCount, cardScale, floatAmount } = layoutControls

  const project = workProjects[activeIndex]
  // Asking for more cards than a project actually has would leave it with
  // fewer than its neighbours, and a card that mounts or unmounts partway
  // through a sweep pops in from nothing. Repeat only in that case, so the
  // set stays distinct wherever there is enough to go round.
  const media = padToCount(getProjectMedia(project.id, cardCount), cardCount)
  // Which run of resting spots this project occupies. Advancing it each
  // swipe is what stops a new set landing exactly where the last one sat.
  // Sizes scale about each card's own centre, so growing them spreads the
  // cluster outward rather than shunting it off to one side.
  const activeSlots = media.map((_, i) => {
    const spot = POSITIONS[(i + positionOffset) % POSITIONS.length]
    const size = CARD_SIZES[i % CARD_SIZES.length]
    const width = size.width * cardScale
    const height = size.height * cardScale
    const float = FLOATS[i % FLOATS.length]
    return {
      left: spot.left + (size.width - width) / 2,
      top: spot.top + (size.height - height) / 2,
      width,
      height,
      z: size.z,
      float: { ...float, amplitude: float.amplitude * floatAmount }
    }
  })

  // Whichever project you land on next is already fetched and decoded, so
  // swapping the cards' sources is instant instead of stalling mid-shuffle
  // while the browser goes and gets a video it has never seen.
  const neighbourMedia = [
    ...getProjectMedia(workProjects[(activeIndex - 1 + workProjects.length) % workProjects.length].id, cardCount),
    ...getProjectMedia(workProjects[(activeIndex + 1) % workProjects.length].id, cardCount)
  ]

  const startFloating = () => {
    floatTweensRef.current.forEach((tween) => tween?.kill())
    floatTweensRef.current = activeSlots.map((slot, i) => {
      const el = cardRefs.current[i]
      if (!el) return null
      return gsap.to(el, {
        y: slot.float.amplitude,
        duration: slot.float.duration,
        delay: slot.float.delay,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
    })
  }

  const cardEls = () => cardRefs.current.filter((el): el is HTMLDivElement => Boolean(el))

  // Every saved group as one JSON blob. `navigator.clipboard` only exists
  // in a secure context, which plain http over the tailnet is not — so on a
  // phone this falls back to logging it rather than silently doing nothing.
  const copySettings = () => {
    const json = exportPersistedControls()
    if (!navigator.clipboard) {
      console.log(json)
      return
    }
    navigator.clipboard.writeText(json).catch(() => console.log(json))
  }

  const clearExitingTitle = () => {
    window.clearTimeout(exitTimerRef.current)
    setExitingTitle(null)
  }

  useEffect(() => () => window.clearTimeout(exitTimerRef.current), [])

  // Cards pop in one at a time, then settle into their idle float. Held
  // back until the name and the rest of the page copy have had time to
  // arrive, so the intro reads top-down: text first, then the work.
  // Only ever runs once, on first load.
  const bubbleIn = (onComplete: () => void) => {
    const els = cardEls()
    gsap.set(els, { scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 })
    gsap.to(els, {
      scale: 1,
      opacity: 1,
      duration: 0.72,
      delay: INTRO_CARDS_AT,
      stagger: 0.22,
      ease: 'back.out(1.7)',
      onComplete: () => {
        startFloating()
        onComplete()
      }
    })
  }

  // Each card swings out along a little arc — a nudge sideways, a spin, a
  // dip in scale/opacity — like a hand shuffling cards on a table, not a
  // flat flip in place. Content swaps while they're mid-arc, dimmed and
  // turned, then they swing back along the same curve to land.
  // Slides every card along a bowed path onto the spot its neighbour was
  // using — a hand pushing cards round a circle on a table. Nothing fades
  // and nothing resizes; the media inside is swapped part-way through, so
  // it reads as the contents changing while the cards keep moving.
  const sweep = (onSwap: () => void) => {
    const els = cardEls()
    const spin = spinDirRef.current
    const offset = positionOffsetRef.current
    const { duration, steps, bow: bowAmount, swapAt, press } = tuningRef.current
    const travel = spin * steps
    // Floating keeps running continuously otherwise, and would fight the
    // sweep over the same x/y properties.
    floatTweensRef.current.forEach((tween) => tween?.kill())

    const box = collageRef.current?.getBoundingClientRect()
    const w = box?.width ?? 0
    const h = box?.height ?? 0

    const tl = gsap.timeline({
      onComplete: () => {
        // Hand the new resting spots to React. The layout effect keyed on
        // this zeroes the transforms in the very same paint, so the cards
        // are already sitting exactly where the sweep left them — and it
        // is what releases the lock, so the next swipe cannot begin
        // against transforms that have not been cleared yet.
        setPositionOffset((o) => (((o + travel) % POSITIONS.length) + POSITIONS.length) % POSITIONS.length)
      }
    })

    els.forEach((el, i) => {
      const from = POSITIONS[(i + offset) % POSITIONS.length]
      const to = POSITIONS[(((i + offset + travel) % POSITIONS.length) + POSITIONS.length) % POSITIONS.length]
      const dx = ((to.left - from.left) / 100) * w
      const dy = ((to.top - from.top) / 100) * h
      // Pushed out perpendicular to the direct line, so the card bows into
      // an arc rather than sliding straight across.
      const bowX = -dy * bowAmount * spin
      const bowY = dx * bowAmount * spin
      const proxy = { t: 0 }

      tl.to(
        proxy,
        {
          t: 1,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            const bow = Math.sin(Math.PI * proxy.t)
            // Position only — the cards stay square to the page the whole
            // way round. They travel a circle, they do not turn on the spot.
            gsap.set(el, {
              x: dx * proxy.t + bowX * bow,
              y: dy * proxy.t + bowY * bow
            })
          }
        },
        0
      )
    })

    // A gentle press-and-release as they travel, so it reads as a hand
    // sliding them round rather than a rigid turntable.
    tl.to(els, { scale: press, duration: duration / 2, ease: 'power2.inOut', yoyo: true, repeat: 1 }, 0)
    // Contents change while the cards are furthest into the sweep.
    tl.call(onSwap, undefined, duration * swapAt)
  }

  // Runs after React has written the new resting spots but before the
  // browser paints, so clearing the sweep's transforms is invisible.
  useLayoutEffect(() => {
    if (!settledOnceRef.current) {
      settledOnceRef.current = true
      return
    }
    const els = cardEls()
    if (!els.length) return
    gsap.set(els, { x: 0, y: 0, scale: 1, rotation: 0 })
    startFloating()
    transitioningRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionOffset])

  // Only the first load animates the cards in; every change after that is
  // handled by the sweep, which never unmounts or re-enters them.
  useEffect(() => {
    transitioningRef.current = true
    setTitleMounted(false)
    bubbleIn(() => {
      setTitleMounted(true)
      transitioningRef.current = false
    })
    return () => floatTweensRef.current.forEach((tween) => tween?.kill())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeProject = (delta: 1 | -1) => {
    if (transitioningRef.current) return
    transitioningRef.current = true
    pendingIndexRef.current = (activeIndexRef.current + delta + workProjects.length) % workProjects.length
    spinDirRef.current = delta

    // The outgoing word is handed off to its own element and starts leaving
    // straight away; the incoming one arrives partway through the sweep, so
    // for a moment both are on screen travelling the same way.
    setExitingTitle(workProjects[activeIndexRef.current].title.toUpperCase())
    // The exit's own completion callback is the fast path, but it is lost
    // whenever BlurText's effect re-runs mid-flight and kills the tween —
    // which would strand the old word on screen permanently. This is the
    // backstop that guarantees it goes away either way.
    window.clearTimeout(exitTimerRef.current)
    exitTimerRef.current = window.setTimeout(clearExitingTitle, TITLE_EXIT_MAX_MS)
    // Scroll down sends the old word up and brings the new one from below;
    // scroll up reverses both.
    setTitleDirection(delta === 1 ? 'top' : 'bottom')

    // Only the contents change here — the resting spots advance at the end
    // of the sweep, where the cards have actually arrived at them.
    sweep(() => setActiveIndex(pendingIndexRef.current))
  }

  // Wheel already fires on any scroll anywhere on the page (listener is on
  // `window`, not scoped to the collage).
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Scrolling within the tuning panel is its own business — this
      // listener is on `window` and preventDefaults, so without the guard
      // the panel could not be scrolled at all.
      if ((e.target as HTMLElement)?.closest?.('.home-tuner')) return
      // Low, so a slow trackpad scroll starts the sweep straight away.
      if (Math.abs(e.deltaY) < 3) return
      e.preventDefault()
      changeProject(e.deltaY > 0 ? 1 : -1)
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openProject = () => {
    // No project detail view yet — wire this up once one exists.
    console.log(`open project: ${project.id}`)
  }

  // Bound to the whole page so a swipe anywhere changes the project, not
  // just over the collage. A tap that never really moved still counts as a
  // tap-to-open.
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  // Fires as the finger travels rather than on release, so easing into a
  // drag starts the cards and the title moving with it instead of leaving
  // the page still until you let go.
  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current
    if (!start || transitioningRef.current) return
    const dx = e.touches[0].clientX - start.x
    const dy = e.touches[0].clientY - start.y
    if (Math.abs(dx) > Math.abs(dy)) return
    if (Math.abs(dy) < TOUCH_TRIGGER_PX) return
    // Consumed — the release should not read as a tap.
    touchStart.current = null
    changeProject(dy < 0 ? 1 : -1)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) >= TOUCH_TRIGGER_PX) return
    if ((e.target as HTMLElement)?.closest('.home-collage')) openProject()
  }

  return (
    <div
      className="home"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Kept out of the swipe handlers' way — without stopping propagation
          here, dragging a slider would read as a swipe and change project
          instead of moving the slider. */}
      {showTuner ? (
        <div
          className="home-tuner"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Leva fill flat titleBar={false} />
        </div>
      ) : null}
      <header className="home-header">
        <div className="home-identity">
          <BlurText text="Creative Developer" className="home-eyebrow" {...reveal(0.15)} />
          <BlurText text="TARLOK SINGH" className="home-name" {...reveal(0)} />
        </div>

        <nav className="home-nav">
          <a href="#top" className="is-active">
            <BlurText text="Home" {...reveal(0.25)} />
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <BlurText text="Contact" {...reveal(0.33)} />
          </a>
        </nav>
      </header>

      <div
        className="home-collage"
        ref={collageRef}
        onClick={openProject}
        role="button"
        tabIndex={0}
        aria-label={`Open ${project.title}`}
      >
        {activeSlots.map((slot, i) => {
          const item = media[i]
          return (
            <div
              key={i}
              className="home-card"
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
                zIndex: slot.z
              }}
            >
              {item?.type === 'video' ? (
                <video src={item.src} autoPlay muted loop playsInline preload="auto" />
              ) : item ? (
                <img src={item.src} alt="" />
              ) : null}
            </div>
          )
        })}

        {/* The word on its way out, still on screen while the next one is
            already arriving underneath it. Never rendered when it matches
            the current title — that would just be the same word stacked on
            itself, which is indistinguishable from a stuck element. */}
        {exitingTitle && exitingTitle !== project.title.toUpperCase() ? (
          <BlurText
            key={`exiting-${exitingTitle}`}
            text={exitingTitle}
            className="home-project-title"
            {...titleReveal(titleDirection)}
            show={false}
            onExitComplete={clearExitingTitle}
          />
        ) : null}

        {titleMounted ? (
          <BlurText
            key={project.id}
            text={project.title.toUpperCase()}
            className="home-project-title"
            // Enters from the side opposite the exit, so both words travel
            // the same way and it reads as one continuous hand-off.
            {...titleReveal(titleDirection === 'top' ? 'bottom' : 'top')}
          />
        ) : null}
      </div>

      <footer className="home-footer">
        <div className="home-footer-block">
          <BlurText text="Passion" className="home-footer-label" {...reveal(0.41)} />
          <BlurText text="Building beautiful products" className="home-footer-value" {...reveal(0.49)} />
        </div>
        <div className="home-footer-block">
          <BlurText text="Focus" className="home-footer-label" {...reveal(0.57)} />
          <BlurText
            text="Product Design / Engineering / 3D Design / Cinematography / Editing / Music Production / Motion Design / 3D Printing"
            className="home-footer-value"
            {...reveal(0.65)}
          />
        </div>
      </footer>

      {/* Warms the browser cache for the projects on either side. Never
          shown — it exists only so the next swap has nothing to fetch. */}
      <div className="home-preload" aria-hidden="true">
        {neighbourMedia.map((item) =>
          item.type === 'video' ? (
            <video key={item.src} src={item.src} muted playsInline preload="auto" />
          ) : (
            <img key={item.src} src={item.src} alt="" />
          )
        )}
      </div>
    </div>
  )
}
