import { useSyncExternalStore } from 'react'

/* ---- has this visitor been shown around ----

   Two guided runs — one on home, one the first time a project opens — and each
   is shown once per browser and then never again unasked. The flags live in
   `localStorage` next to `v3.kills.v1` and the deck's own keys; a read that
   tolerates a missing or walled-off store, a write that tolerates a full one.

   `replay` is a tiny counter, not persisted: pressing the "?" key bumps it,
   which is the signal `Mech.tsx` watches to start a run again regardless of
   the flags. */

export type Flow = 'home' | 'project'

const KEY: Record<Flow, string> = {
  home: 'v3.tour.home.v1',
  project: 'v3.tour.project.v1'
}

export const tourSeen = (flow: Flow): boolean => {
  try {
    return window.localStorage.getItem(KEY[flow]) === 'done'
  } catch {
    return false
  }
}

export const markTourSeen = (flow: Flow) => {
  try {
    window.localStorage.setItem(KEY[flow], 'done')
  } catch {
    /* private mode — losing the flag just means the run may show once more */
  }
}

let replay = 0
const want: { flow: Flow | null } = { flow: null }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

/** Fired by the "?" key. Clears the flag for the run that fits the screen
 *  you are on so `Mech.tsx` starts it again. */
export const replayTour = (flow: Flow) => {
  try {
    window.localStorage.removeItem(KEY[flow])
  } catch {
    /* nothing stored to clear */
  }
  replay += 1
  want.flow = flow
  notify()
}

/** What the "?" key last asked to replay, if anything — consumed by `Mech.tsx`
 *  once it has acted on it. */
export const takeReplay = (): Flow | null => {
  const flow = want.flow
  want.flow = null
  return flow
}

export const useReplaySignal = (): number =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => replay,
    () => replay
  )
