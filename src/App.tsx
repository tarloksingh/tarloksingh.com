import { Suspense, lazy } from 'react'
import CapsuleHome from './components/CapsuleHome'

// Two home pages live side by side while the direction is being settled.
// `?v=cards` brings back the shuffling card cluster; anything else gets the
// product-on-a-stage version. Lazy rather than a static import: Home drags
// in matter-js and ogl on top of its own code, and a static import bundles
// that into the one chunk everyone downloads even when they never see it.
const Home = lazy(() => import('./components/Home'))

const variant = new URLSearchParams(window.location.search).get('v')

export default function App() {
  return variant === 'cards' ? (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  ) : (
    <CapsuleHome />
  )
}
