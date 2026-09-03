import { lazy, Suspense } from 'react'

/* The site is `src/v3/`, and it is the only thing in the build.

   It used to be two: `/` was v2 (`src/site/`) and `/v3` was this, built
   alongside rather than on top, with a note here saying that when v3 took over
   the two lines would swap. This is that swap. v3 answers every route now and
   `src/site/` is not imported from anywhere, so nothing of it — and nothing of
   `src/archive/`, the versions before it — reaches a visitor. Rollup emits no
   chunk for a module no entry can reach; the previous arrangement still shipped
   a 139 KB `Site` chunk that nobody at `/` would ever fetch.

   **The source stays where it is.** `src/site/` and `src/archive/` are intact
   on disk and still build if they are imported again — see the README in the
   archive. Two small modules are genuinely shared and still imported by v3:
   `src/site/frames.ts` (the bird's three SVG paths) and, through
   `src/three/`, the pieces v2 built for the gallery. Those come in as the
   modules they are, not as v2.

   Still lazy, and still for the same reason it always was: what is left in the
   entry chunk is React and these few lines. Everything else — three.js, drei,
   the panels, every screen — arrives behind this boundary. */
const V3 = lazy(() => import('./v3/V3'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <V3 />
    </Suspense>
  )
}
