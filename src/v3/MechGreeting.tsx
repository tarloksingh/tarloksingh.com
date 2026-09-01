import { useEffect, useState } from 'react'
import TextType from './TextType'
import { sound } from './sound'

/* ---- the note before the machine starts ----

   There is a bird crossing every screen on this site and a moth sitting on
   it, both shootable, with a reticle following the pointer and a gun under
   it. Nothing on the page said so. Somebody who never happens to click empty
   space never finds out, and somebody who does finds out by accident — a
   laser bolt leaves the cursor on what they took for a portfolio, and the
   reasonable first reading is that something broke.

   So the page says it once, in one line, and then gets out of the way.

   **It is before the boot, not during it.** `Mech.tsx` holds `booting` true
   until this is dismissed — see `greeted` there — so the grid's cells have
   not been dealt, the compass has not spun and the cluster has not come up.
   Running it over the top of the boot would be two entrances at once, with
   the note competing with the exact thing it is introducing.

   **And the button is where the sound starts.** A browser will not open an
   `AudioContext` before a real gesture, so every page with synthesised noise
   has to find one somewhere — usually by waiting for whatever the visitor
   happens to touch first, which means the first thing they touch is silent
   and everything after it is not. This is that gesture, taken honestly. */

/** The note. Two lines, and they are a *reel* rather than a paragraph now:
 *  the first types itself out, holds, is taken back off a character at a time,
 *  and the sign-off types into the space it left. See `TextType.tsx` — this is
 *  the one place on the site using it rather than `Typed`. */
const LINES = [
  'hey — please feel free to shoot the bugs and animals on my website, thx!',
  'bye...'
]

const TYPING = { min: 18, max: 46 }
const DELETING = 12
const PAUSE = 1500
const START = 500

/** When the button turns up: after the reel has finished the last line, plus
 *  a beat. Worked out from the text rather than picked — editing `LINES`
 *  cannot leave the button arriving over a half-typed sentence — and off
 *  `TYPING.max`, because a variable speed makes the real duration a range and
 *  the button turning up early is the only failure that matters. */
const BUTTON_MS =
  START +
  LINES[0].length * TYPING.max +
  PAUSE +
  LINES[0].length * DELETING +
  LINES[1].length * TYPING.max +
  400

/** How long the note takes to clear once it is dismissed. The boot starts on
 *  the same beat rather than after it, so the grid is already striking behind
 *  the note as it goes — the two overlap on purpose, which is what keeps the
 *  press from feeling like it bought a pause. */
const OUT_MS = 420

/* ---- how often it shows ----

   Once, and then not again for a while. It used to come up on every load,
   which is right for the one visitor who has never seen it and wrong for
   everybody else — including me, reloading it forty times an afternoon.

   A timestamp rather than a flag, and this is the whole of the rule: show it
   if there is nothing stored, or if what is stored is older than `AGAIN`. So
   a first visit gets the note, a reload five minutes later does not, and
   coming back tomorrow does — by which point the reticle *is* worth
   explaining again, because nobody remembers a modal from yesterday.

   `localStorage` and not `sessionStorage`: a session ends when the tab does,
   which would put the note back up for anyone who keeps one window open all
   day and none of it in front of anybody who closed the tab and came back in
   a minute. Wrapped, because private mode throws on read as well as write —
   and the fallback is to show it, since a visitor who sees it twice is a much
   smaller failure than one who never learns the page can be shot at. */
const SEEN_KEY = 'v3.greeted.v1'
const AGAIN = 10 * 60 * 1000

export const shouldGreet = () => {
  try {
    const at = Number(window.localStorage.getItem(SEEN_KEY))
    return !at || Date.now() - at > AGAIN
  } catch {
    return true
  }
}

const markGreeted = () => {
  try {
    window.localStorage.setItem(SEEN_KEY, String(Date.now()))
  } catch {
    /* private mode, a full quota — the note simply shows again */
  }
}

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
    markGreeted()
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
        {/* One line at a time, cycled — see `LINES`. `loop` is off, so the
            reel stops on the sign-off rather than starting the greeting over
            behind the button that is by then asking to be pressed. */}
        <TextType
          as="p"
          className="mech-greet-line"
          text={LINES}
          typingSpeed={TYPING.max}
          variableSpeed={TYPING}
          deletingSpeed={DELETING}
          initialDelay={START}
          pauseDuration={PAUSE}
          loop={false}
          cursorCharacter="▎"
          cursorBlinkDuration={0.4}
        />

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
