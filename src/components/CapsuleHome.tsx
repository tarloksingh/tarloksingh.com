import BlurText from './BlurText'
import ProductRing from './ProductRing'
import CapsuleStage from '../three/CapsuleStage'
import './CapsuleHome.css'

const CONTACT_EMAIL = 'tarloksinghfilms@gmail.com'

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
  return (
    <main className="capsule-home">
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
          <ProductRing label="CAPSULE C1" />
          <CapsuleStage />
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
