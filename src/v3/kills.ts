/* ---- what you have shot ----

   One number, across every screen and across a reload.

   It cannot be React state on a screen. `V3.tsx` swaps `Home`, `Browse` and
   `Mech` as siblings, unmounting whichever you are leaving, so a count kept
   on one of them resets the moment you navigate — which is exactly when it
   matters, since the whole point is that it follows you. So it lives in
   `localStorage`, the same way the deck keeps its volume and its track
   (`STORE_KEY` in `MechDeck.tsx`): a read that tolerates a missing or
   corrupt value, and a write that tolerates a full quota.

   Read through `useSyncExternalStore`, the hook `Mech.tsx` already uses for
   the label-pin store. `snapshot` has to be referentially stable between
   changes or that hook loops forever, which is why the count is cached here
   rather than parsed out of storage on every call. */

const STORE_KEY = 'v3.kills.v1'

const read = (): number => {
  try {
    const raw = Number(window.localStorage.getItem(STORE_KEY))
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
  } catch {
    return 0
  }
}

let count = typeof window === 'undefined' ? 0 : read()
const listeners = new Set<() => void>()

export const kills = {
  /** Something came down. Called from inside a creature's own `quarry.hit`,
   *  which is the only place that knows a shot actually landed. */
  add() {
    count += 1
    try {
      window.localStorage.setItem(STORE_KEY, String(count))
    } catch {
      /* private mode, a full quota — the count is not worth breaking a page */
    }
    for (const listener of listeners) listener()
  },

  snapshot: () => count,

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}
