import { useSyncExternalStore } from 'react'
import { SLOTS } from './bank'

/* ---- which slot home has picked ----

   One number, shared rather than owned, and the reason is structural: the
   rail and the readouts that report on it are no longer in the same component.

   It used to be `useState` inside `MechCluster`, which was fine while the rail
   was one of home's blocks. It is not, because **the rail is mounted from
   `Mech.tsx` now, once, for both screens** — the crossing between home and a
   project used to unmount it and take its WebGL context with it, and one mount
   site is what fixed that (see *one rail, both screens* in the README). `Mech`
   is the component that survives the crossing, so the rail has to be rendered
   from there; the readouts that answer a pick — the head display, the role
   reel, the counts, the field dials — are still the cluster's.

   So this is the seam between them, and it is deliberately the smallest one
   that works: a single number and its release timer, the same live-store
   pattern `subject.ts` and `tourState.ts` already use. Everything derived from
   it — which slot, which roles, which fields — stays where it was, computed
   from `SLOTS` by whoever needs it.

   **`MechBank` subscribes to this itself rather than being handed it.** Home's
   selection follows the pointer across eleven slots, and threading it through
   `Mech` would re-render the whole screen on every crossing of a bay. Only the
   blocks that actually read a pick re-render on one. */

let picked: number | null = null
let release = 0
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const read = () => picked

/** How long the selection survives the pointer leaving the bank. Long enough
 *  that crossing out of the rail and back does not blank the readouts, short
 *  enough that a bank left alone returns to reading out the titles. */
const RELEASE_MS = 2400

export const bankPick = {
  /** Outside a component — the keyboard handler and the release timer. */
  read,
  set(next: number | null) {
    if (next === picked) return
    picked = next
    notify()
  },
  /** The arrow keys, which step the rail the way the tile rail steps a
   *  project. From nothing, forward lands on the first slot and back on the
   *  last. */
  step(by: number) {
    window.clearTimeout(release)
    const was = picked
    bankPick.set(was === null ? (by > 0 ? 0 : SLOTS.length - 1) : (was + by + SLOTS.length) % SLOTS.length)
  },
  /** The pointer is in the bank: whatever release was pending is off. */
  hold() {
    window.clearTimeout(release)
  },
  /** And it has left. Mouse only — a phone has no "leaving", so a tap's
   *  selection is meant to persist. */
  letGo(pointerType: string) {
    if (pointerType !== 'mouse') return
    window.clearTimeout(release)
    release = window.setTimeout(() => bankPick.set(null), RELEASE_MS)
  },
  /** Dropped on the way off home, so coming back does not arrive already
   *  reporting a slot nobody is pointing at. */
  reset() {
    window.clearTimeout(release)
    bankPick.set(null)
  }
}

export const useBankPick = (): number | null => useSyncExternalStore(subscribe, read, read)
