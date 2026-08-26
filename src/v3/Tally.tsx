import { useSyncExternalStore } from 'react'
import Segment from './Segment'
import { kills } from './kills'

/** What has been shot, everywhere, ever. Its own component so the number
 *  changing does not re-render whatever it is mounted inside — see `kills.ts`.
 *
 *  Two call sites. On home it sits in the gap between `SHOOT` and `STOP`
 *  (`Alarm` in MechCluster.tsx, `inline`) — the reticle's own count next to
 *  the reticle's own instruction. Everywhere else it is `Mech.tsx`'s own
 *  copy, docked above the header in its usual fixed spot: the count still
 *  follows you off home, it just is not wedged into a warning pair that is
 *  not there any more. Both copies read the same store, so there is never a
 *  moment the two disagree — only ever one of them is mounted at a time.
 *
 *  No "downed" label either way — the count is the whole reading, and
 *  `aria-label` still says what it is for anyone not reading the glyphs.
 *  `settle` is off on `Segment` — this is not a readout changing channel, it
 *  is a number going up by one, and four frames of noise every time you
 *  shoot a bird would be the loudest thing on the page. */
export default function Tally({ inline = false }: { inline?: boolean } = {}) {
  const count = useSyncExternalStore(kills.subscribe, kills.snapshot, kills.snapshot)
  if (count === 0) return null
  return (
    <div className="mech-tally" data-inline={inline} aria-label={`${count} downed`} data-arrive>
      <span className="mech-tally-n">
        <Segment text={String(count).padStart(3, '0')} cells={3} settle={false} label={`${count}`} />
      </span>
    </div>
  )
}
