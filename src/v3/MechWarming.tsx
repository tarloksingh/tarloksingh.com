import Segment from './Segment'
import './MechWarming.css'

/* ---- what the machine is waiting for, said out loud ----

   The boot already holds the screen while its own weight arrives — `primed`
   in `Mech.tsx` waits on the fonts, on three's loading manager going quiet and
   on the 3D chunk being fetched and parsed, each with a cap. On a phone over a
   real network that is most of two seconds of **black behind a bare grid**,
   which reads as a site that is broken rather than one that is loading.

   **This adds no time and it is not a second gate.** Nothing here is waited
   for; it is a readout of a wait that was already happening, and it is gone
   the frame `primed` flips. `PERFORMANCE.md` is emphatic about this — a
   loading screen put in front of the existing one would make the site
   strictly slower, which is the opposite of the complaint.

   **And it does not invent a number.** The obvious thing to draw is a
   percentage, and there is no honest one available: `import()` reports no
   progress, and drei's `useProgress` does not exist until the chunk it is
   inside has landed — by which time two of the three gates are already
   through. So what is reported is the truth the gate actually holds: which of
   its three conditions are outstanding, named one at a time, and a bar whose
   position is how many have cleared.

   The bar therefore moves in thirds. That is a real reading taken three times
   rather than a smooth fiction, and the easing between two positions is what
   any needle does on its way between two true values. It is also the right
   idiom for this panel: a cluster on ignition runs its lamps and reports what
   it has checked. */

/** The gates, in the order they clear, with what each one is waiting for.
 *
 *  The words are literal. `TYPE` is `document.fonts.ready` — the readouts are
 *  drawn in Audiowide and Clash Display and a display that reflows into its
 *  own typeface is a display that was switched on too early. `SYSTEM` is the
 *  3D chunk: three, drei and postprocessing, ~386KB to fetch and a couple of
 *  megabytes to parse, synchronously, on the main thread. `ASSETS` is three's
 *  loading manager having gone quiet, which on home is usually nothing at all
 *  and on a project deep link is that project's own model. */
const GATES = ['TYPE', 'SYSTEM', 'ASSETS'] as const

/** What it says once all three are through — held for the length of its own
 *  exit, under the ripple that is by then already running. Naming the last
 *  *gate* there would be a display reporting something it has finished
 *  waiting for. */
const DONE = 'READY'

/** Room for the longest of them, and a fixed width so the word changing never
 *  moves the bar under it. */
const CELLS = 6

export default function MechWarming({
  fonts,
  heavy,
  quiet,
  up
}: {
  fonts: boolean
  heavy: boolean
  quiet: boolean
  /** False once the page is primed: the readout plays its own exit and the
   *  ripple takes the screen. */
  up: boolean
}) {
  const done = [fonts, heavy, quiet].filter(Boolean).length
  /* The first one still outstanding, and `READY` when there is none. A
     readout that blanks before it fades is one that was switched off rather
     than one that finished. */
  const word = done === GATES.length ? DONE : GATES[done]

  return (
    <div className="mech-warming" data-up={up} aria-hidden>
      <span className="mech-warming-word">
        <Segment text={word} cells={CELLS} settle />
      </span>
      <span
        className="mech-warming-bar"
        style={{ ['--fill' as string]: done / GATES.length }}
      />
      <span className="mech-warming-count">
        {done}/{GATES.length}
      </span>
    </div>
  )
}
