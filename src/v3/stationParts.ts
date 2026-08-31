import { useSyncExternalStore } from 'react'

/* ---- where Mecha Station's three parts stand ----

   The till is not one object. It is a cash register, a card reader and a
   monitor on a stand, hand-built out of primitives in `PosStation.tsx`, each
   placed by a literal in that file. Placed against each other in a v2 case,
   which is a different composition from a v3 project screen — on the stage
   here they read as overlapping, and the register in particular comes out
   larger than the machine it sits next to.

   So the three placements come off this module instead. Pure numbers and no
   imports beyond React's: `PosStation` lives in `src/three/` and is mounted by
   both sites, and this must not drag leva or a panel into v2's gallery. The
   panel that writes here is `stationTuning.ts`, which is v3's alone.

   A live store rather than a prop, for one reason: `Piece` in `MechProduct`
   memoises the piece's element on the project id, precisely so that dragging a
   slider does not rebuild a component that fetches a video. Threading the
   placement in as a prop would defeat that and remount the monitor's <video>
   on every tick. Same arrangement, and the same reason, as `subject.ts`. */

export interface StationPart {
  /** World units right of where the piece was authored. */
  x: number
  /** World units up. */
  y: number
  /** World units toward camera. */
  z: number
  /** Multiplies the part, and nothing else — the other two hold their size. */
  scale: number
  /** Degrees turned on its own axis. */
  turn: number
}

export interface StationParts {
  register: StationPart
  reader: StationPart
  monitor: StationPart
}

/** Where the three sat when they were literals in `PosStation.tsx`. Seeded
 *  from those exactly, so nothing moved the day this became tunable. */
export const STATION_DEFAULTS: StationParts = {
  register: { x: -0.34, y: -0.42, z: 0, scale: 1, turn: 0 },
  reader: { x: 0.4, y: -0.46, z: 0.1, scale: 1, turn: -28.65 },
  monitor: { x: 0, y: 0.05, z: -0.12, scale: 1, turn: 0 }
}

let current: StationParts = STATION_DEFAULTS
const listeners = new Set<() => void>()

export const setStationParts = (next: StationParts) => {
  current = next
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The placement as it stands right now. `tuned` is false everywhere except
 *  v3, so v2's gallery keeps the numbers it was composed against whatever this
 *  screen's panel is set to. */
export const useStationParts = (tuned: boolean): StationParts =>
  useSyncExternalStore(
    subscribe,
    () => (tuned ? current : STATION_DEFAULTS),
    () => STATION_DEFAULTS
  )
