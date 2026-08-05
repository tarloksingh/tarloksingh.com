import { useEffect, useRef, useState } from 'react'
import { button, Leva, useControls } from 'leva'
import BlurText from './BlurText'
import ProductRing from './ProductRing'
import CapsuleStage, { MODEL_URL } from '../three/CapsuleStage'
import { workProjects } from '../data/work'
import {
  clearPersistedControls,
  exportPersistedControls,
  restoreSchema,
  usePersistControls
} from '../hooks/persistControls'
import './CapsuleHome.css'

const CONTACT_EMAIL = 'tarloksinghfilms@gmail.com'

// Open the page with `?tune` on the end to get the sliders. Absent without it,
// so they never show up for anyone else.
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const showTuner = params?.has('tune') ?? false
// `?open` skips the banner and starts on the closed ring — cutting it open on
// every reload gets old fast when the thing being tuned is the ring itself.
const startOpen = params?.has('open') ?? false

/* The phone is a different frame rather than a squeeze of the desktop one.
   The ring at its tuned radius measures 1412px across — three and a half
   times a 402px screen — and it cannot simply be scaled down with CSS, since
   that takes the type to 4px with it. So the phone gets its own radius, with
   fewer repeats to keep the glyphs from packing solid around the smaller
   circumference, and its own type size. The design's 314x120 ring block is
   what the radius is set from.

   Everything below is behind this flag. Above 700px the props handed down are
   the tuned objects themselves, unchanged. */
const PHONE_QUERY = '(max-width: 700px)'

// The nudges are zeroed rather than inherited: they place the ring against the
// desktop stage, whose centre is not the phone frame's, and carried over they
// leave the ring orbiting empty space above the product.
const PHONE_RING = { radius: 157, repeats: 8, fontSize: 12, sealFontSize: 12, offsetX: 0, offsetY: 0 }
const PHONE_PRODUCT = { modelScale: 0.52 }
// The banner's geometry never got a phone pass the way the ring and product
// did: a 252px-tall strip meant for a screen wide enough to hold a flat
// stretch of it just piles up into a fan on a 390px frame, since there's no
// room for the sag/wind curve to read as gentle before it hits the edges.
const PHONE_INTRO = { sag: 0, wind: 12, stripHeight: 64, fallAngle: 80 }

// The scroll carousel below cycles through every project, but only Capsule
// C1 has a real glTF yet — the rest borrow its model as a placeholder so the
// navigation itself (speed, crossfade, name change) can be judged before any
// more assets exist. Swap `modelUrl` in per project as real ones are made.
const CAROUSEL_PROJECTS = workProjects.map((project) => ({
  id: project.id,
  title: project.title,
  modelUrl: MODEL_URL
}))

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches
  )
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY)
    const onChange = (event: MediaQueryListEvent) => setIsPhone(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return isPhone
}

const FOCUS = [
  'PRODUCT DESIGN',
  'ENGINEERING',
  '3D DESIGN',
  'CINEMATOGRAPHY',
  'EDITING',
  'MUSIC PRODUCTION',
  'MOTION DESIGN',
  '3D PRINTING'
].join(' / ')

// Same reveal the card version uses (Home.tsx): no blur, so BlurText clips
// its own box and each character climbs into view from under the cut rather
// than fading in place. Kept identical on purpose — both pages should feel
// like they were typeset by the same hand.
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

/**
 * Second pass at the home page: the product itself on a gradient stage with
 * its name turning around it, rather than a cluster of media cards.
 *
 * The card version is untouched in `Home.tsx` — `App.tsx` picks between them.
 */
export default function CapsuleHome() {
  // The page arrives sealed by the ring's own flat line. Everything else
  // mounts on the cut, so the copy reveal and the product's entrance start
  // from that moment rather than having run behind it.
  const [opened, setOpened] = useState(startOpen)
  // The banner is allowed to cross the whole screen; the closed ring is not.
  // Held until the wrap has finished rather than flipped at the cut, or the
  // falling ends would be clipped at the column edge mid-flight.
  const [settled, setSettled] = useState(startOpen)

  const ring = useControls(
    'Ring',
    restoreSchema('Ring', {
      label: { value: 'CAPSULE C1', label: 'Text' },
      // What the line reads before it is cut. It curls into `label` after.
      sealLabel: { value: 'TARLOK SINGH', label: 'Seal text' },
      separator: { value: '', label: 'Separator' },
      gap: { value: 2, min: 1, max: 24, step: 1, label: 'Gap (spaces)' },
      repeats: { value: 21, min: 1, max: 48, step: 1, label: 'How many' },
      fontSize: { value: 19, min: 6, max: 240, step: 1, label: 'Text size' },
      // Size while it is still a banner; blends to Text size as it wraps.
      sealFontSize: { value: 19, min: 6, max: 240, step: 1, label: 'Banner text size' },
      radius: { value: 695, min: 80, max: 1600, step: 5, label: 'Ring size' },
      period: { value: -126, min: -300, max: 300, step: 1, label: 'Spin (s/turn)' },
      tiltX: { value: -5, min: -80, max: 80, step: 1, label: 'Tip' },
      tiltZ: { value: 18, min: -80, max: 80, step: 1, label: 'Roll' },
      offsetX: { value: -16, min: -800, max: 800, step: 1, label: 'Nudge X' },
      offsetY: { value: -68, min: -800, max: 800, step: 1, label: 'Nudge Y' },
      // Viewing distance. Low values magnify the near arc hard; high values
      // flatten the ring toward a plain ellipse of evenly-sized type.
      perspective: { value: 2100, min: 800, max: 6000, step: 25, label: 'Depth' }
    })
  )

  const product = useControls(
    'Product',
    restoreSchema('Product', {
      focalLength: { value: 82, min: 14, max: 300, step: 1, label: 'Lens (mm)' },
      modelScale: { value: 1.04, min: 0.2, max: 4, step: 0.02, label: 'Size' },
      distance: { value: 9, min: 2, max: 40, step: 0.1, label: 'Camera back' },
      elevation: { value: 27, min: -80, max: 85, step: 1, label: 'Camera height' },
      azimuth: { value: 53, min: -180, max: 180, step: 1, label: 'Camera around' },
      rpm: { value: 0, min: -30, max: 30, step: 0.5, label: 'Spin (rpm)' },
      // Drift, usable instead of the spin — set one to 0 and drive the other.
      floatIntensity: { value: 0.9, min: 0, max: 6, step: 0.05, label: 'Float rise' },
      floatRotation: { value: 0.8, min: 0, max: 3, step: 0.05, label: 'Float loll' },
      floatSpeed: { value: 2.5, min: 0, max: 8, step: 0.1, label: 'Float speed' },
      exposure: { value: 0.1, min: 0.1, max: 3, step: 0.05, label: 'Exposure' },
      envIntensity: { value: 4, min: 0, max: 8, step: 0.05, label: 'Environment' },
      keyIntensity: { value: 4.4, min: 0, max: 12, step: 0.1, label: 'Key light' },
      ambientIntensity: { value: 0.15, min: 0, max: 3, step: 0.05, label: 'Ambient' },
      // Both logos reach glTF without a material block and would otherwise
      // take the spec default, which renders as bright chrome.
      fallbackColor: { value: '#000000', label: 'Untyped material' }
    })
  )

  // Shared so the ring and the product rise together. The two distances are
  // in different units — the product moves in world units through a camera,
  // the ring in screen pixels — but they run off one clock and one easing.
  const intro = useControls(
    'Intro',
    restoreSchema('Intro', {
      cutTime: { value: 0.7, min: 0.15, max: 3, step: 0.05, label: 'Cut time' },
      delay: { value: 0.3, min: 0, max: 4, step: 0.05, label: 'Delay' },
      duration: { value: 2.8, min: 0.2, max: 8, step: 0.05, label: 'Time' },
      // The label starts as one straight run of type and curls into the ring.
      ringSpacing: { value: 19, min: 2, max: 140, step: 1, label: 'Line spacing' },
      ringWind: { value: 620, min: -2160, max: 2160, step: 5, label: 'Ring unwind' },
      // How the banner hangs, and how far its cut ends drop.
      sag: { value: 0, min: 0, max: 900, step: 1, label: 'Banner sag' },
      wind: { value: 23, min: 0, max: 300, step: 0.5, label: 'Wind' },
      windSpeed: { value: 7.75, min: 0, max: 12, step: 0.05, label: 'Wind speed' },
      stripHeight: { value: 252, min: 0, max: 600, step: 1, label: 'Strip height' },
      stripInk: { value: '#141414', label: 'Strip ink' },
      fallAngle: { value: 80, min: 0, max: 180, step: 1, label: 'Cut drop' },
      productRise: { value: -6.8, min: -20, max: 0, step: 0.05, label: 'Product from' },
      productTurn: { value: -345, min: -720, max: 720, step: 5, label: 'Product turn' }
    })
  )

  // Scroll (or a finger, or a trackpad swipe) drives the project carousel.
  // These four are what turn raw input into speed and pacing — how far a
  // swipe has to travel before the next project takes over, how fast the
  // spin can get, how directly velocity maps to it, and how long the spin
  // takes to catch up to a new speed rather than snapping to it.
  const carousel = useControls(
    'Carousel',
    restoreSchema('Carousel', {
      progressPerPx: { value: 900, min: 200, max: 3000, step: 10, label: 'Scroll per project (px)' },
      maxRpm: { value: 45, min: 5, max: 120, step: 1, label: 'Max spin (rpm)' },
      velocityToRpm: { value: 4.5, min: 0.5, max: 20, step: 0.1, label: 'Speed sensitivity' },
      spinSmoothing: { value: 0.15, min: 0.02, max: 0.6, step: 0.01, label: 'Spin smoothing (s)' }
    })
  )

  useControls('Export', {
    'Copy all settings': button(() => {
      const json = exportPersistedControls(['Ring', 'Product', 'Intro', 'Carousel'])
      navigator.clipboard?.writeText(json).catch(() => console.log(json))
    }),
    'Reset all settings': button(() => {
      clearPersistedControls()
      window.location.reload()
    })
  })

  useEffect(() => {
    if (!opened || settled) return
    const id = window.setTimeout(
      () => setSettled(true),
      (intro.delay + intro.duration) * 1000
    )
    return () => window.clearTimeout(id)
  }, [opened, settled, intro.delay, intro.duration])

  usePersistControls('Ring', ring)
  usePersistControls('Product', product)
  usePersistControls('Intro', intro)
  usePersistControls('Carousel', carousel)

  const isPhone = useIsPhone()
  // On desktop these are the tuned objects themselves — same reference, same
  // values — so the wider layout runs exactly the code it ran before.
  const ringProps = isPhone ? { ...ring, ...PHONE_RING } : ring
  const productProps = isPhone ? { ...product, ...PHONE_PRODUCT } : product
  // The banner's letter spacing has to come down with its type, or the seal
  // reads as gapped-out capitals on the phone.
  const introSpacing = isPhone ? 12 : intro.ringSpacing

  // ---- project carousel: scroll/drag cycles through the work, speeding the
  // ring and product up as it goes. ----
  //
  // `progress` is the one continuous number everything else derives from:
  // each full unit is one project, the fractional part is how far into the
  // crossfade to the next one you are. It is a ref rather than state because
  // it moves every wheel tick and, during a fling, every frame — routing
  // that through React would mean a render per pixel scrolled. State only
  // gets touched at the two moments that actually need to re-render: which
  // project is current, and whether the carousel has been touched yet at
  // all (so the "next" stage isn't mounted, and racking up an entrance
  // animation no one will see, before anyone has scrolled).
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselStarted, setCarouselStarted] = useState(false)
  const progressRef = useRef(0)
  const lastProgressRef = useRef(0)
  const lastTickRef = useRef(0)
  const lastIndexRef = useRef(0)
  // Shared by both stages so they spin at the same rate through a crossfade
  // rather than reading as two independently-wound products.
  const spinRpmRef = useRef(0)
  const ringSpinDegRef = useRef(0)
  const currentStageRef = useRef<HTMLDivElement>(null)
  const nextStageRef = useRef<HTMLDivElement>(null)
  // Leva values read live inside the animation loop below, which only
  // depends on `opened` — without this, dragging a slider mid-scroll would
  // have no effect until the next time the effect happened to re-run.
  const carouselRef = useRef(carousel)
  carouselRef.current = carousel

  useEffect(() => {
    if (!opened) return
    const count = CAROUSEL_PROJECTS.length

    const bump = (deltaY: number) => {
      progressRef.current += deltaY / carouselRef.current.progressPerPx
      setCarouselStarted(true)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      bump(e.deltaY)
    }

    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return
      const y = e.touches[0]?.clientY ?? touchY
      bump(touchY - y)
      touchY = y
      e.preventDefault()
    }
    const onTouchEnd = () => {
      touchY = null
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    lastTickRef.current = performance.now()

    let raf = 0
    const tick = () => {
      const now = performance.now()
      const dt = Math.max(0, (now - lastTickRef.current) / 1000)
      lastTickRef.current = now

      const { maxRpm, velocityToRpm, spinSmoothing } = carouselRef.current
      const progress = progressRef.current
      const rawVelocity = dt > 0 ? (progress - lastProgressRef.current) / dt : 0
      lastProgressRef.current = progress

      // Eased toward the target rather than snapped to it, so the spin
      // winds up and coasts down instead of following the finger exactly —
      // a raw velocity reads as jittery long before it reads as fast.
      const targetRpm = Math.min(maxRpm, Math.abs(rawVelocity) * velocityToRpm)
      const ease = 1 - Math.exp(-dt / Math.max(0.001, spinSmoothing))
      spinRpmRef.current += (targetRpm - spinRpmRef.current) * ease
      ringSpinDegRef.current += (spinRpmRef.current / 60) * 360 * dt

      const wrapped = ((progress % count) + count) % count
      const index = Math.floor(wrapped)
      const frac = wrapped - index

      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index
        setCarouselIndex(index)
      }

      if (currentStageRef.current) currentStageRef.current.style.opacity = (1 - frac).toFixed(3)
      if (nextStageRef.current) nextStageRef.current.style.opacity = frac.toFixed(3)

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [opened])

  const nextCarouselIndex = (carouselIndex + 1) % CAROUSEL_PROJECTS.length

  return (
    <main className={`capsule-home${opened ? ' is-open' : ''}${settled ? ' is-settled' : ''}`}>
      {/* Leva raises its own floating panel as soon as any useControls call
          runs, so the un-tuned page needs an explicit hidden one rather than
          simply not rendering ours. */}
      {showTuner ? (
        <div className="ch-tuner">
          <Leva fill flat titleBar={false} />
        </div>
      ) : (
        <Leva hidden />
      )}
      <aside className="ch-title-area">
        <div className="ch-title">
          {opened ? <BlurText text="ARTIST" className="ch-label" {...reveal(0.15)} /> : null}
          {/* The visible name is built from BlurText, which renders <p> — not
              valid inside <h1> — so the heading is carried separately for
              document structure and hidden from view. */}
          <h1 className="ch-sr-only">Tarlok Singh</h1>
          {/* Two blocks rather than one with a line break, so each line is
              clipped by its own box and rises out of its own cut. */}
          <div className="ch-name" aria-hidden="true">
            {opened ? <BlurText text="TARLOK" {...reveal(0)} /> : null}
            {opened ? <BlurText text="SINGH" {...reveal(0.08)} /> : null}
          </div>
        </div>

        <div className="ch-meta">
          <div className="ch-meta-block">
            {/* Literal curly quotes — BlurText splits raw text into spans,
                so an HTML entity would render as its own characters. */}
            {opened ? (
              <>
                <BlurText text="PASSION" className="ch-label ch-label-muted" {...reveal(0.45)} />
                <BlurText
                  text={'“BUILDING BEAUTIFUL PRODUCTS”'}
                  className="ch-passion"
                  {...reveal(0.52)}
                />
              </>
            ) : null}
          </div>
          <div className="ch-meta-block">
            {opened ? (
              <>
                <BlurText text="FOCUS" className="ch-label ch-label-muted" {...reveal(0.62)} />
                <BlurText text={FOCUS} className="ch-focus" {...reveal(0.7)} />
              </>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="ch-content">
        <nav className="ch-menu">
          <a href="#home">{opened ? <BlurText text="HOME" {...reveal(0.25)} /> : null}</a>
          <a className="is-dim" href={`mailto:${CONTACT_EMAIL}`}>
            {opened ? <BlurText text="CONTACT" {...reveal(0.33)} /> : null}
          </a>
        </nav>

        <div className="ch-stage">
          {/* Always mounted: before the cut it *is* the seal, a flat line of
              type reading the name. Cutting it swaps the text and curls the
              same line into the ring. */}
          <ProductRing
            {...ringProps}
            label={CAROUSEL_PROJECTS[carouselIndex].title.toUpperCase()}
            extraSpinRef={ringSpinDegRef}
            introSpacing={introSpacing}
            introWind={intro.ringWind}
            sag={isPhone ? PHONE_INTRO.sag : intro.sag}
            stripHeight={isPhone ? PHONE_INTRO.stripHeight : intro.stripHeight}
            stripInk={intro.stripInk}
            wind={isPhone ? PHONE_INTRO.wind : intro.wind}
            windSpeed={intro.windSpeed}
            fallAngle={isPhone ? PHONE_INTRO.fallAngle : intro.fallAngle}
            introDelay={intro.delay}
            introDuration={intro.duration}
            cutDuration={intro.cutTime}
            startOpen={startOpen}
            onCut={() => setOpened(true)}
          />
          {opened ? (
            <CapsuleStage
              ref={currentStageRef}
              modelUrl={CAROUSEL_PROJECTS[carouselIndex].modelUrl}
              spinRef={spinRpmRef}
              {...productProps}
              introFrom={intro.productRise}
              introTurn={intro.productTurn}
              introDelay={intro.delay}
              introDuration={intro.duration}
            />
          ) : null}
          {/* Mounted only once scrolling starts, so its entrance — the same
              rise-from-below every product uses on arrival — is still
              playing when the crossfade reveals it, rather than having
              long since settled off-screen at opacity 0. Keyed on the
              project so each new "next" gets a fresh rise rather than
              reusing the last one's, now-finished, animation state. */}
          {opened && carouselStarted ? (
            <CapsuleStage
              key={CAROUSEL_PROJECTS[nextCarouselIndex].id}
              ref={nextStageRef}
              modelUrl={CAROUSEL_PROJECTS[nextCarouselIndex].modelUrl}
              spinRef={spinRpmRef}
              {...productProps}
              introFrom={intro.productRise}
              introTurn={intro.productTurn}
              introDelay={0}
              introDuration={1}
            />
          ) : null}
        </div>

        {opened ? (
          <BlurText
            text="WEBSITE DESIGNED & ENGINEERED BY TARLOK SINGH"
            className="ch-credit"
            {...reveal(0.85)}
          />
        ) : null}
      </section>
    </main>
  )
}
