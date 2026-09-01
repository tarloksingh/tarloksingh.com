import { useSyncExternalStore } from 'react'
import Segment from './Segment'
import { kills } from './kills'

/** What has been shot, everywhere, ever. Its own component so the number
 *  changing does not re-render whatever it is mounted inside — see `kills.ts`.
 *
 *  One call site left: the middle cell of the warning row (`Alarm`, `inline`)
 *  — the reticle's own count between the reticle's own two lamps. That row is
 *  global chrome now rather than home's, so the count follows you onto a
 *  project screen inside it, and the second copy that used to be docked above
 *  the header for everywhere-but-home went with the reason for it.
 *
 *  **It shows at nought.** It used to return `null` on an empty count, on
 *  the reasoning that a counter saying nothing has happened is a counter
 *  advertising a feature. What that actually did was change the width of the
 *  row the first time you hit something: three cells appeared between the two
 *  lamps and both of them moved outward. A row of instruments that reflows on
 *  first use is worse than a reading of `000`, which is what every gauge on
 *  this panel does before it has anything to report anyway.
 *
 *  No "downed" label — the count is the whole reading. `settle` is off on
 *  `Segment`: this is not a readout changing channel, it is a number going up
 *  by one, and four frames of noise every time you shoot a bird would be the
 *  loudest thing on the page. */
export default function Tally({ inline = false }: { inline?: boolean } = {}) {
  const count = useSyncExternalStore(kills.subscribe, kills.snapshot, kills.snapshot)
  return (
    <div className="mech-tally" data-inline={inline} aria-label={`${count} downed`}>
      <span className="mech-tally-n">
        <Segment text={String(count).padStart(3, '0')} cells={3} settle={false} label={`${count}`} />
      </span>
    </div>
  )
}
