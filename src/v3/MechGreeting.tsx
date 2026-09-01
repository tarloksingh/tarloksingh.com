import { useEffect, useState } from 'react'
import Typed from './Typed'
import { sound } from './sound'

/* ---- the note before the machine starts ----

   There is a bird crossing every screen on this site and a moth sitting on
   it, both of them shootable, with a reticle following the pointer and a gun
   under it. Nothing on the page says so. Somebody who never happens to click
   on empty space never finds out, and somebody who does finds out by
   accident — a laser bolt leaves the cursor on what they thought was a
   portfolio and the reasonable first reading is that something broke.

   So the page says so first, in one line, and then gets out of the way.

   **It is before the boot, not during it.** `Mech.tsx` holds `booting` true
   until this is dismissed — see `greeted` there — so the grid's cells have
   not been dealt, the compass has not spun and the cluster has not come up.
   Running it over the top of the boot would be two entrances at once and the
   note would be competing with the exact thing it is introducing. The page
   behind it is the bare grid, which is all a machine that has not been
   switched on yet should be.

   **And the button is what starts the sound.** A browser will not open an
   AudioContext before a real gesture, so every page with synthesised noise
   has to find one somewhere — usually by waiting for whatever the visitor
   happens to touch first, which means the first thing they touch is silent
   and everything after it is not. This is that gesture, taken honestly: the
   one press that dismisses the note is also the one that wakes the context,
   so the boot chime is the first sound and it plays on time.

   Typed rather than printed, like everything else here. `Typed` writes
   straight to the node rather than through React state, so a hundred and
   twenty characters is a hundred and twenty text writes and no renders — see
   `Typed.tsx`. */

/** The note, in two lines. Split so the second can start after the first has
 *  finished rather than both racing in one paragraph — one line arriving at a
 *  time is the whole difference between a machine talking and a block of text
 *  fading up. */
const LINES = [
  'hey — please feel free to shoot the bugs and animals on my website, thx!',
  'bye...'
]

/** Per character, and quick. Every other typed line on this site is slower
 *  because it is a readout settling; this is somebody talking, and a greeting
 *  that takes four seconds to say twelve words is a greeting nobody waits
 *  for. */
const SPEED = 26

/** When the button turns up: after both lines have had time to finish, plus
 *  a beat. Worked out from the text rather than picked, so editing `LINES`
 *  cannot leave the button arriving over a half-typed sentence. */
const TYPING_MS = LINES.join('').length * SPEED
const BUTTON_MS = TYPING_MS + 400

/** How long the note takes to clear once it is dismissed. The boot starts on
 *  the same beat rather than after it, so the grid is already striking behind
 *  the note as it goes — the two overlap on purpose, which is what keeps the
 *  press from feeling like it bought a pause. */
const OUT_MS = 420

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MechGreeting({ onDone }: { onDone: () => void }) {
  /* Whether the button is up yet, and whether the note is on its way out.
     Two flags rather than one phase: they are independent — a note being
     dismissed does not care how far the typing got, and the button turning up
     is not a state the exit has to pass through. */
  const [ready, setReady] = useState(false)
  const [going, setGoing] = useState(false)

  useEffect(() => {
    if (reduced()) {
      setReady(true)
      return
    }
    const timer = window.setTimeout(() => setReady(true), BUTTON_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const dismiss = () => {
    if (going) return
    setGoing(true)
    /* All of it inside the click handler itself. A context opened from a
       `setTimeout` is not opened from a gesture as far as the browser is
       concerned, and it starts suspended exactly as it would have without
       the press.

       `wake` opens the context; `toggle` is only needed for somebody who
       turned the sound off on a previous visit and is being asked again — it
       plays its own confirmation, so there is no second blip on top of it. */
    sound.wake()
    if (!sound.on) sound.toggle()
    else sound.select()
    window.setTimeout(onDone, reduced() ? 0 : OUT_MS)
  }

  return (
    <div className="mech-greet" data-going={going}>
      <div className="mech-greet-card">
        <p className="mech-greet-line">
          <Typed text={LINES[0]} run="greet-1" speed={SPEED} delay={0.5} caret={false} />
        </p>
        <p className="mech-greet-line">
          <Typed
            text={LINES[1]}
            run="greet-2"
            speed={SPEED}
            delay={0.5 + (LINES[0].length * SPEED) / 1000}
            caret
          />
        </p>

        {/* Always in the tree, so the card does not change height when it
            arrives — a note that grows a button pushes its own text up the
            screen half a second after you have started reading it. */}
        <button className="mech-greet-ok" data-ready={ready} onClick={dismiss} disabled={!ready}>
          okay
        </button>
      </div>
    </div>
  )
}
