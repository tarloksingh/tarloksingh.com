import { useEffect } from 'react'
import { useProgress } from '@react-three/drei'

/* ---- the loader's own report, on the far side of the split ----

   A file of its own, and lazily imported, for one reason: `useProgress` is a
   drei export, and a static `import` of it puts three, drei and everything
   they carry into the chunk that has to arrive before `Mech` can paint at all.
   Twelve lines of subscription were dragging half a megabyte in front of first
   paint, and the `lazy()` around `MechCluster` and `MechModel` bought nothing
   while they did — a dependency already in the eager chunk is not deferred by
   being imported again behind a boundary.

   So this is the module `Mech.tsx` waits on. It is both the report *and* the
   signal that the 3D chunk has landed: importing it is what fetches that
   chunk, and its promise resolving is what tells the boot the heavy weight is
   parsed and the ripple has an idle thread to play on. See *load first, then
   play* in `Mech.tsx`.

   A leaf, and deliberately: drei's `useProgress` re-renders whoever subscribes
   on every progress tick, and the screen is not something to re-render a few
   dozen times while it is trying to boot. Nothing is rendered here — the only
   output is the call upward. */

/** Reports whether three's loading manager has anything in flight. */
export default function Warmth({ onLoading }: { onLoading: (active: boolean) => void }) {
  const active = useProgress((state) => state.active)

  useEffect(() => {
    onLoading(active)
  }, [active, onLoading])

  return null
}
