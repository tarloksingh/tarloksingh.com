import ProductRing from './ProductRing'
import CapsuleStage from '../three/CapsuleStage'
import './CapsuleHome.css'

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
          <span className="ch-label">ARTIST</span>
          <h1 className="ch-name">
            TARLOK
            <br />
            SINGH
          </h1>
        </div>

        <div className="ch-meta">
          <div className="ch-meta-block">
            <span className="ch-label ch-label-muted">PASSION</span>
            <span className="ch-passion">&ldquo;BUILDING BEAUTIFUL PRODUCTS&rdquo;</span>
          </div>
          <div className="ch-meta-block">
            <span className="ch-label ch-label-muted">FOCUS</span>
            <span className="ch-focus">{FOCUS}</span>
          </div>
        </div>
      </aside>

      <section className="ch-content">
        <nav className="ch-menu">
          <a href="#home">HOME</a>
          <a className="is-dim" href="mailto:tarloksinghfilms@gmail.com">
            CONTACT
          </a>
        </nav>

        <div className="ch-stage">
          <ProductRing label="CAPSULE C1" />
          <CapsuleStage />
        </div>

        <span className="ch-credit">WEBSITE DESIGNED &amp; ENGINEERED BY TARLOK SINGH</span>
      </section>
    </main>
  )
}
