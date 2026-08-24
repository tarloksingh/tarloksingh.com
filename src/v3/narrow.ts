import { useSyncExternalStore } from 'react'

/* ---- narrow viewports ----

   One breakpoint for the whole of v3, in one place, because two screens now
   need it and a second copy of a media query is a second copy that can drift.

   700px covers phones in portrait (most are 360–430) and small tablets
   without also firing on a narrow *desktop* window, which the letterboxing
   already handles down to a real minimum.

   A store rather than a plain CSS breakpoint because behaviour branches on
   it too, not just layout: the project screen's tile rail changes which axis
   it scrolls, its title is capped against the width it has, and both screens
   hide their Leva panels — Leva's own minimum is most of a 390-point window,
   and two of them stacked cover the subject the panels are for. */

export const NARROW_QUERY = '(max-width: 700px)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(NARROW_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

const snapshot = () => window.matchMedia(NARROW_QUERY).matches

export const useNarrow = () => useSyncExternalStore(subscribe, snapshot, snapshot)
