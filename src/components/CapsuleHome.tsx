import { button, Leva, useControls } from 'leva'
import BlurText from './BlurText'
import ProductRing from './ProductRing'
import CapsuleStage from '../three/CapsuleStage'
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
const showTuner =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tune')

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
  const ring = useControls(
    'Ring',
    restoreSchema('Ring', {
      label: { value: 'CAPSULE C1', label: 'Text' },
      separator: { value: '', label: 'Separator' },
      gap: { value: 2, min: 1, max: 24, step: 1, label: 'Gap (spaces)' },
      repeats: { value: 21, min: 1, max: 48, step: 1, label: 'How many' },
      fontSize: { value: 19, min: 6, max: 96, step: 1, label: 'Text size' },
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
      focalLength: { value: 103, min: 14, max: 300, step: 1, label: 'Lens (mm)' },
      modelScale: { value: 1.1, min: 0.2, max: 4, step: 0.02, label: 'Size' },
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
      ambientIntensity: { value: 0, min: 0, max: 3, step: 0.05, label: 'Ambient' },
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
      delay: { value: 0.5, min: 0, max: 4, step: 0.05, label: 'Delay' },
      duration: { value: 2.4, min: 0.2, max: 6, step: 0.05, label: 'Time' },
      productRise: { value: -1.5, min: -8, max: 0, step: 0.05, label: 'Product from' },
      ringRise: { value: 730, min: 0, max: 2000, step: 10, label: 'Ring from' }
    })
  )

  useControls('Export', {
    'Copy all settings': button(() => {
      const json = exportPersistedControls(['Ring', 'Product', 'Intro'])
      navigator.clipboard?.writeText(json).catch(() => console.log(json))
    }),
    'Reset all settings': button(() => {
      clearPersistedControls()
      window.location.reload()
    })
  })

  usePersistControls('Ring', ring)
  usePersistControls('Product', product)
  usePersistControls('Intro', intro)

  return (
    <main className="capsule-home">
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
          <BlurText text="ARTIST" className="ch-label" {...reveal(0.15)} />
          {/* The visible name is built from BlurText, which renders <p> — not
              valid inside <h1> — so the heading is carried separately for
              document structure and hidden from view. */}
          <h1 className="ch-sr-only">Tarlok Singh</h1>
          {/* Two blocks rather than one with a line break, so each line is
              clipped by its own box and rises out of its own cut. */}
          <div className="ch-name" aria-hidden="true">
            <BlurText text="TARLOK" {...reveal(0)} />
            <BlurText text="SINGH" {...reveal(0.08)} />
          </div>
        </div>

        <div className="ch-meta">
          <div className="ch-meta-block">
            <BlurText text="PASSION" className="ch-label ch-label-muted" {...reveal(0.45)} />
            {/* Literal curly quotes — BlurText splits raw text into spans,
                so an HTML entity would render as its own characters. */}
            <BlurText
              text={'“BUILDING BEAUTIFUL PRODUCTS”'}
              className="ch-passion"
              {...reveal(0.52)}
            />
          </div>
          <div className="ch-meta-block">
            <BlurText text="FOCUS" className="ch-label ch-label-muted" {...reveal(0.62)} />
            <BlurText text={FOCUS} className="ch-focus" {...reveal(0.7)} />
          </div>
        </div>
      </aside>

      <section className="ch-content">
        <nav className="ch-menu">
          <a href="#home">
            <BlurText text="HOME" {...reveal(0.25)} />
          </a>
          <a className="is-dim" href={`mailto:${CONTACT_EMAIL}`}>
            <BlurText text="CONTACT" {...reveal(0.33)} />
          </a>
        </nav>

        <div className="ch-stage">
          <ProductRing
            {...ring}
            introFrom={intro.ringRise}
            introDelay={intro.delay}
            introDuration={intro.duration}
          />
          <CapsuleStage
            {...product}
            introFrom={intro.productRise}
            introDelay={intro.delay}
            introDuration={intro.duration}
          />
        </div>

        <BlurText
          text="WEBSITE DESIGNED & ENGINEERED BY TARLOK SINGH"
          className="ch-credit"
          {...reveal(0.85)}
        />
      </section>
    </main>
  )
}
