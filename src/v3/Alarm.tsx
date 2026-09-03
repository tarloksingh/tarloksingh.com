import { useEffect, useState } from 'react'
import Tally from './Tally'
import { quarry } from './subject'

/* ---- the warning pair ----

   The one lamp on this page that is about the page rather than about the
   work. There is a bird crossing the readout and a moth on it, both of them
   shootable, on every screen — the gun, the reticle and the creatures are
   all mounted plainly in `Mech.tsx`, not gated on home — so this is too now.
   It used to live inside `MechCluster.tsx` and vanish the moment a project
   opened, which read as the one instrument on the panel that did not
   survive the swap. Global chrome now, next to `MechCursor` / `MechBird` /
   `MechMoth` / `MechLaser` in `Mech.tsx`, `position: fixed` and centred on
   the header's own row (`top: calc(24 * var(--px))`, the same as
   `.mech-head`) rather than tied to wherever home's cluster happens to sit.

   So it is a pair rather than a single lamp, and only one of them is ever
   lit: the red one while there is nothing in the air, the green one the
   moment there is. Two states of one instruction, which is what a shift
   light is.

   It asks `quarry` rather than being told. The gun already walks that set
   several times a frame to find out what a bolt has hit; this is the same
   question one frame at a time, and it means a third creature mounted
   tomorrow lights the lamp with nothing wired up.

   ---- two lamps and a number ----

   It used to be the words. `SHOOT` and `STOP`, each spelled a cell at a time
   into its own eighty-two unit housing, with the count wedged into a third
   housing between them only once something had actually been shot. Three
   problems with that, and they are all the same problem — the row was
   *loud*:

   - Two words in segment glyphs at the top of every screen is the second
     biggest reading on the page, competing with the name on home and with the
     project title everywhere else, and neither of those is what it is for.
   - `SHOOT` and `STOP` are instructions, and the pair does not actually
     instruct: the lit one is reporting whether there is anything up there,
     not telling you to pull the trigger. A word that reads as a command and
     behaves as a status is a word arguing with itself.
   - The count only appeared after the first kill, so the row changed *width*
     the first time you hit something and everything in it shuffled sideways.

   What it is instead is what a real cluster does with a binary: two small
   square lamps, one green, one red, either side of a fixed reading. The
   number is always there and starts at nought — the whole row is now one
   fixed-width block that never reflows — and which of the two lamps is
   burning is the whole of the report. Nothing is spelled out because there
   is nothing to spell: a lit lamp and an unlit one is the oldest readout
   there is.

   Still `aria-hidden`, as the row always was. Nothing here is a control and
   nothing here is content — the birds and the moths are a thing the page
   does, not a thing it is about — and a screen reader working down this page
   should reach the name and the work, not a running commentary on what is
   flying over it. */
export default function Alarm() {
  const [up, setUp] = useState(false)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      let any = false
      for (const creature of quarry.creatures) {
        if (creature.at()) {
          any = true
          break
        }
      }
      // Returning the same value is a bail-out, not a render — which is what
      // makes asking this every frame affordable.
      setUp((was) => (was === any ? was : any))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="mech-alarm" aria-hidden>
      <i className="mech-alarm-key" data-on={up} />
      <Tally inline />
      <i className="mech-alarm-key" data-warn data-on={!up} />
    </div>
  )
}
