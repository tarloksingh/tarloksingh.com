/* ---- has this machine been switched on yet? ----

   `MechCluster` is home-only, so every trip back to home is a **fresh mount**
   and every beat in `IN` runs again from zero: the dials sweep their whole
   range, the name types itself in, the intro paragraph types all 190 of its
   characters. Which is the wrong thing for a panel to do. A cluster sweeping
   its needles is a machine reporting that it has just been switched on, and
   the second time you see it on the same visit it is not true — the reader
   already watched it come up and is now waiting through it again to get back
   to something they had.

   So the second and later arrivals get the same entrance, compressed: the
   beats at about a third. Not skipped. The blocks still arrive in the same
   order, so the screen still assembles rather than cutting in — it simply does
   it at the speed of something coming back rather than something starting.

   **The two typed lines are the exception, and they spell out every time.**
   They were `speed={0}` here too — placed in a single frame — and coming home
   to a name that was simply *there* read as the effect having failed rather
   than as the machine being warm. The typing is the thing worth coming back
   to. It is also no longer expensive: the wide halos moved off the typed text
   in `MechCluster.css`, which is what made a character a cheap thing to write
   again. See **The halo and the typewriter** in `README.md`.

   **A module-scope flag, and that is the right scope.** It is per page load,
   which is exactly what "this visit" means: a reload is a machine being
   switched off and on again and should look like one. Nothing is stored, so
   there is no scratchpad to go stale (see the note about `localStorage` at the
   top of `PERFORMANCE.md`) and no second source of truth to reset.

   Set at the end of home's first entrance rather than at its start, because
   what it records is "this has been *seen*", and an entrance the reader left
   halfway through — opening a project two beats in — has not been. */

const state = { on: false }

/** Whether home's entrance has run to the end once this page load. */
export const switchedOn = () => state.on

/** Home's entrance has finished. Idempotent; called from `MechCluster`. */
export const switchOn = () => {
  state.on = true
}
