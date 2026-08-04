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
      gap: { value: 4, min: 1, max: 14, step: 1, label: 'Gap (spaces)' },
      repeats: { value: 6, min: 1, max: 14, step: 1, label: 'How many' },
      fontSize: { value: 26, min: 8, max: 72, step: 1, label: 'Text size' },
      radius: { value: 300, min: 80, max: 700, step: 5, label: 'Ring size' },
      period: { value: 24, min: -90, max: 90, step: 1, label: 'Spin (s/turn)' },
      tiltX: { value: -12, min: -80, max: 80, step: 1, label: 'Tip' },
      tiltZ: { value: -15, min: -80, max: 80, step: 1, label: 'Roll' },
      offsetX: { value: 0, min: -400, max: 400, step: 1, label: 'Nudge X' },
      offsetY: { value: 0, min: -400, max: 400, step: 1, label: 'Nudge Y' },
      maxBlur: { value: 3.5, min: 0, max: 14, step: 0.1, label: 'Depth blur' }
    })
  )

  const product = useControls(
    'Product',
    restoreSchema('Product', {
      focalLength: { value: 50, min: 14, max: 200, step: 1, label: 'Lens (mm)' },
      modelScale: { value: 1, min: 0.2, max: 3, step: 0.02, label: 'Size' },
      rpm: { value: 3, min: -30, max: 30, step: 0.5, label: 'Spin (rpm)' },
      exposure: { value: 1.15, min: 0.1, max: 3, step: 0.05, label: 'Exposure' },
      envIntensity: { value: 1, min: 0, max: 4, step: 0.05, label: 'Environment' },
      keyIntensity: { value: 1.6, min: 0, max: 8, step: 0.1, label: 'Key light' },
      ambientIntensity: { value: 0.35, min: 0, max: 3, step: 0.05, label: 'Ambient' },
      // Both logos reach glTF without a material block and would otherwise
      // take the spec default, which renders as bright chrome.
      fallbackColor: { value: '#000000', label: 'Untyped material' }
    })
  )

  useControls('Export', {
    'Copy all settings': button(() => {
      const json = exportPersistedControls(['Ring', 'Product'])
      navigator.clipboard?.writeText(json).catch(() => console.log(json))
    }),
    'Reset all settings': button(() => {
      clearPersistedControls()
      window.location.reload()
    })
  })

  usePersistControls('Ring', ring)
  usePersistControls('Product', product)

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
          <ProductRing {...ring} />
          <CapsuleStage {...product} />
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
