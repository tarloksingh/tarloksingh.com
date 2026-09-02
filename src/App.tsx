import { lazy, Suspense } from 'react'

// Everything the site is lives under `src/site/`. `src/archive/` holds the
// previous versions, unmounted but intact — see its README.
//
// `src/v3/` is the next version, being built alongside rather than on top:
// `/` is still the working site, `/v3` is the new one. When v3 takes over,
// the two lines below swap and `src/site/` moves to the archive.
//
// **Both** are lazy, and that is the point. `Site` was a static import, so a
// visitor landing on `/v3` downloaded and parsed the whole of v2 — inside the
// entry chunk, before the router had decided it was not going to render any of
// it. The two versions are strangers; neither should be able to slow the other
// down. What is left in the entry chunk is React and these twenty lines.
const V3 = lazy(() => import('./v3/V3'))
const Site = lazy(() => import('./site/Site'))

export default function App() {
  if (window.location.pathname.startsWith('/v3')) {
    return (
      <Suspense fallback={null}>
        <V3 />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={null}>
      <Site />
    </Suspense>
  )
}
