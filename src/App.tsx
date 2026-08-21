import { lazy, Suspense } from 'react'
import Site from './site/Site'

// Everything the site is lives under `src/site/`. `src/archive/` holds the
// previous versions, unmounted but intact — see its README.
//
// `src/v3/` is the next version, being built alongside rather than on top:
// `/` is still the working site, `/v3` is the new one. When v3 takes over,
// the two lines below swap and `src/site/` moves to the archive. Lazy so the
// one you are not looking at costs nothing.
const V3 = lazy(() => import('./v3/V3'))

export default function App() {
  if (window.location.pathname.startsWith('/v3')) {
    return (
      <Suspense fallback={null}>
        <V3 />
      </Suspense>
    )
  }
  return <Site />
}
