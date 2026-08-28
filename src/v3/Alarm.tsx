import { useEffect, useState } from 'react'
import Segment from './Segment'
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
   lit: `STOP` while there is nothing in the air, `SHOOT` the moment there
   is. Two states of one instruction, which is what a shift light is, and
   what makes the row read as an instruction rather than as a label.

   It asks `quarry` rather than being told. The gun already walks that set
   several times a frame to find out what a bolt has hit; this is the same
   question one frame at a time, and it means a third creature mounted
   tomorrow lights the lamp with nothing wired up. */
export default function Alarm({ start }: { start: boolean }) {
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
      {/* `cells` matches each word exactly — `STOP` at `cells={5}` (padded to
          `SHOOT`'s own length) left a trailing blank cell, which is what was
          reading as the word sitting in the upper-left of its box instead of
          centred in it. */}
      {/* Both housings fade up with every lamp dark and the word is spelled
          into them afterwards, a cell at a time — `type` on `Segment`, held
          until the boot's cover lifts by `start`. The scramble every other
          readout arrives on is wrong for these two: it is a display being told
          something *else*, and these two words never change, so there was
          nothing for them to scramble from. A pair of boxes that arrive with
          their instruction already printed is signage; a pair that spell it
          out is an instrument switching on. */}
      <i className="mech-alarm-key" data-on={up}>
        <Segment text="SHOOT" cells={5} type wait={260} start={start} settle={false} label="shoot" />
      </i>
      <Tally inline />
      <i className="mech-alarm-key" data-warn data-on={!up}>
        <Segment text="STOP" cells={4} warn type wait={420} start={start} settle={false} label="stop" />
      </i>
    </div>
  )
}
