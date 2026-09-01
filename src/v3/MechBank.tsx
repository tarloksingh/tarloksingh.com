import { useEffect, useRef, useState } from 'react'
import Segment from './Segment'
import { sound } from './sound'
import { SLOTS, type Slot } from './bank'
import MechSlots, { SlotView } from './MechSlots'
import { RiderSlot } from './MechRider'
import './MechCluster.css'

/* ---- the bank ----

   The rail of work: numbered, named, pressable slots, one lit, each holding
   that project's own subject live and turning. See *the bank is the
   navigation* in the README for the argument against the bar graph it
   replaced — the short version is that a column of lit cells is a picture of
   the work rather than a way into it, and on a phone it was not even that.

   **It is its own component because it is on every screen now.** It began
   inside `MechCluster` as one of home's four blocks, and going into a project
   took it off the page — so the one persistent thing about this site, the list
   of what is in it, was the thing that vanished the moment you used it. It is
   mounted from two places now: home puts it in the cluster's right flank, and
   a project screen puts it down the right-hand margin where the media strip
   used to be (which has moved to the foot of the frame). Only ever one of the
   two at a time, which matters more than it looks — `MechSlots` lives in here,
   and that is the *one* WebGL canvas all eleven subjects are scissored into.
   Two banks would be two canvases.

   The stylesheet is still `MechCluster.css`; the bank's own rules were never
   scoped under `.mech-cluster`, so they apply wherever this lands. */

/** How many cells the head display has. Wide enough for the longest project
 *  name — "Red Dead Redemption 2" is twenty-one characters and it is not going
 *  to be abbreviated on the one display whose job is naming it. Fixed: a
 *  readout is a fixed number of lamps, and one that resized itself around each
 *  word would be a text box. */
export const CELLS = 21

/** What the head says with nothing picked. A dark box on arrival reads as
 *  broken; this labels what the box is for. On a project screen it is what the
 *  head says permanently — down there it is a sign on the bank rather than a
 *  readout, because the lit slot is the project you are already on. */
const IDLE = 'projects'

/** The bank's own beats, in milliseconds from the moment the cover lifts.
 *  Home's other blocks count from the same moment — see `IN` in
 *  `MechCluster.tsx`, which these are deliberately in step with. */
export const BANK_IN = {
  head: 540,
  /** The first subject lands in the bank, and how far behind it the next. */
  slot: 620,
  slotStep: 55,
  /** And how fast the bank empties again, from the bottom up. */
  slotBack: 30
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** One slot in the bank.
 *
 *  The subject is live only for the selected slot. Eleven of them turning at
 *  once is work nobody is looking at; selected, the slot comes alive. Which is
 *  also the clearest thing the bank does: the one you are on is the one that
 *  is moving. */
function SlotBox({
  slot,
  n,
  on,
  arrived,
  direct,
  onPick,
  onOpen
}: {
  slot: Slot
  n: number
  on: boolean
  /** Whether the deal has reached this slot — see `dealt` below. */
  arrived: boolean
  /** One press opens, with no select first. See `onClick`. */
  direct: boolean
  onPick: () => void
  onOpen: () => void
}) {
  return (
    <button
      className="mech-slot"
      data-on={on}
      data-bare={!slot.solid}
      aria-label={`${slot.title} — ${slot.tagline}, ${slot.timeline}`}
      aria-pressed={on}
      style={{ ['--i' as string]: n }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onPick()
      }}
      onFocus={onPick}
      onClick={() => {
        sound.select()
        /* On home with a mouse: a press on the slot you are already on opens
           it, a press on any other selects it first — which is one click
           either way, because the pointer selected it on the way in.

           `direct` is the two cases where there is no hover to have done that
           for you. **A phone**, where it used to be two taps on the reasoning
           that a control with no hover has to select before it commits; the
           first tap filled in the rail's head, the field dials and the counts,
           and none of those read the selection on that layout any more, so it
           bought nothing and cost the one thing a tile in a grid of tiles is
           obviously for. And **a project screen**, where the lit slot is the
           project you are on rather than something you chose — nothing on that
           screen is asking to be selected, only opened. */
        if (direct) {
          onPick()
          onOpen()
        } else if (on) onOpen()
        else onPick()
      }}
    >
      {/* The bay. `SlotView` renders the `.mech-slot-shot` element itself and
          scissors the shared canvas to it — see `MechSlots.tsx`, which is also
          where the reason the element cannot be handed in from outside is
          written down. Its children are three.js and never reach the DOM, so
          the empty state is a sibling laid over it rather than a child. */}
      {!slot.solid ? (
        <span className="mech-slot-shot">
          <span className="mech-slot-bare">no signal</span>
        </span>
      ) : slot.id === 'a-game' ? (
        /* Solomon's rider is the one subject that will not share the bank's
           canvas — the dark look needs its own environment-less rig, bloom and
           exposure. See `MechRider.tsx`. */
        <RiderSlot live={on} arrive={arrived} />
      ) : (
        <SlotView id={slot.id} live={on} arrive={arrived} />
      )}

      <span className="mech-slot-bar">
        <span className="mech-slot-name">{slot.title}</span>
        <span className="mech-slot-foot">
          {/* Stencilled on the bay, the way a number on a bank of anything is.
              It sits in the label rather than over the picture because the
              picture is WebGL and the canvas paints above the DOM under it. */}
          <span className="mech-slot-n">
            <Segment text={String(n + 1).padStart(2, '0')} cells={2} settle={false} label={`slot ${n + 1}`} />
          </span>
          <span className="mech-slot-year">{slot.year}</span>
        </span>
      </span>
    </button>
  )
}

interface Props {
  /** Which slot is lit, by index. On home it is what the pointer or a tap
   *  chose; on a project screen it is the project you are on. */
  picked: number | null
  /** Choosing a slot without opening it. Absent on a project screen, which is
   *  also what makes every press there open directly — see `direct`. */
  onPick?: (n: number) => void
  onOpen: (id: string) => void
  /** The cover being off: nothing is dealt and nothing types until this. */
  up: boolean
  /** True while the screen is held down, either way — the deal runs backwards
   *  on it and every `Segment` takes its own word back off. */
  covered: boolean
  narrow: boolean
  /** What the head reads, and whether it is a readout or a sign. Home hands in
   *  the selected project's title; a project screen leaves it out and gets
   *  `PROJECTS` permanently. */
  title?: string | null
  /** Mouse-only hold/release around the whole bank, so the selection survives
   *  the pointer crossing the gap between two slots. Home only. */
  onHold?: () => void
  onRelease?: (event: React.PointerEvent) => void
  /** Anything that belongs under the bank. Home hands in the field dials; a
   *  project screen hands in nothing, because the dials report on a selection
   *  that only home has. */
  children?: React.ReactNode
}

export default function MechBank({
  picked,
  onPick,
  onOpen,
  up,
  covered,
  narrow,
  title,
  onHold,
  onRelease,
  children
}: Props) {
  const railList = useRef<HTMLDivElement>(null)

  /** How far down the rail the deal has got. The bank fills one slot at a
   *  time from the top — the subjects are WebGL and a slot's CSS entrance
   *  cannot carry them, so the stagger has to be told to the scene as well as
   *  to the box. One timer, not eleven: an index that walks. */
  const [dealt, setDealt] = useState(0)

  useEffect(() => {
    if (reduced()) {
      setDealt(up ? SLOTS.length : 0)
      return
    }

    /* Out, and the deal runs backwards: last in, first out, so the bank
       empties from the bottom of the rail up. Quicker than it filled, because
       the exit has a couple of hundred milliseconds and the entrance had the
       whole screen. */
    if (!up) {
      const back = window.setInterval(() => {
        setDealt((n) => {
          if (n <= 1) window.clearInterval(back)
          return Math.max(0, n - 1)
        })
      }, BANK_IN.slotBack)
      return () => window.clearInterval(back)
    }

    let timer = 0
    const openUp = window.setTimeout(() => {
      setDealt(1)
      timer = window.setInterval(() => {
        setDealt((n) => {
          if (n + 1 >= SLOTS.length) window.clearInterval(timer)
          return n + 1
        })
      }, BANK_IN.slotStep)
    }, BANK_IN.slot)
    return () => {
      window.clearTimeout(openUp)
      window.clearInterval(timer)
    }
  }, [up])

  /* The bank's canvas is `position: fixed` on the wide layout and scissors
     each subject to its slot's own rect — see `MechSlots.tsx`.
     `getBoundingClientRect` does not know the rail scrolls: a slot half
     scrolled out of `.mech-work-rail-list` is clipped by the browser as a
     *button*, but its picture is drawn by a scissor test against a rect that
     never shrank, so it painted straight through the clip and out the top or
     bottom of the rail.

     `--rail-clip-top` / `--rail-clip-bottom` are the fix: the rail-list's own
     distance from the top and bottom of the viewport, written onto itself so
     `.mech-bank-gl` — a descendant in the tree even though it is fixed —
     inherits them and clips its own paint to exactly the band the list
     occupies. Recomputed on scroll and resize, not every frame: the rail's
     position on screen only changes on those two events. */
  useEffect(() => {
    const node = railList.current
    if (!node) return
    let raf = 0
    const measure = () => {
      raf = 0
      const rect = node.getBoundingClientRect()
      node.style.setProperty('--rail-clip-top', `${Math.max(0, rect.top)}px`)
      node.style.setProperty('--rail-clip-bottom', `${Math.max(0, window.innerHeight - rect.bottom)}px`)
    }
    const request = () => {
      if (raf) return
      raf = requestAnimationFrame(measure)
    }
    request()
    node.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    /* Also on any scroll anywhere, captured: on a project screen this rail is
       in the page's own flow rather than the middle of a fixed panel, so the
       band it occupies moves when the page under it does. */
    window.addEventListener('scroll', request, { passive: true, capture: true })
    const ro = new ResizeObserver(request)
    ro.observe(node)
    return () => {
      node.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      window.removeEventListener('scroll', request, { capture: true })
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  /* ---- the lit slot is brought into view ----

     Only where the selection arrived from somewhere other than this rail,
     which is a project screen: open Wyte Card from the index sheet and the
     slot that says so is four rows below the fold of a rail that scrolls, so
     the one thing the bank is reporting is the one thing you cannot see.

     Never on home, where the selection *is* the pointer — scrolling a list
     under the cursor that is choosing from it moves the next row out from
     under the finger before it lands. `onPick` is the flag for that: home
     passes it, a project screen does not.

     `block: 'nearest'` so a slot already on screen does not move, and the
     rail is the only thing that scrolls — `scrollIntoView` walks every
     scrollable ancestor, and on a phone that includes `.mech` itself, which
     would jump the page to the bank the moment a project opened. */
  useEffect(() => {
    if (onPick || picked === null || !up) return
    const list = railList.current
    const slot = list?.children[0]?.children[picked] as HTMLElement | undefined
    if (!list || !slot || list.scrollHeight <= list.clientHeight + 1) return
    list.scrollTo({ top: Math.max(0, slot.offsetTop - (list.clientHeight - slot.offsetHeight) / 2), behavior: 'auto' })
  }, [onPick, picked, up])

  /* A press opens with no select first wherever there is no hover to have
     done the selecting — see `SlotBox`. */
  const direct = narrow || !onPick

  return (
    <aside className="mech-work-rail">
      {/* The project's own title, above the bank rather than in a run across
          the top of the panel.

          It means two things depending on where this is mounted. On home it is
          a **readout**: pressing or crossing a slot changes what it says. On a
          project screen, and on a phone, it is a **sign** — there is nothing
          to select, so it reads `PROJECTS` and labels the grid under it, which
          is why the narrow rules set it left rather than centred. */}
      <div className="mech-work-rail-head">
        {/* Always the warm channel — this is what has been picked, and the
            rail and the scale under it are the two things on the panel that
            report a *pick* rather than a *reading*. It does not drop back to
            green with nothing selected, unlike the rest of the panel's
            readouts: the row it sits above is warm too now (see
            `.mech-slot-name`), and a header that changed colour depending on
            what it named would say the opposite of what the row under it
            says. */}
        <div className="mech-display" data-on={Boolean(title)} data-idle={!title} data-warn>
          <Segment
            text={title ?? IDLE}
            cells={CELLS}
            align={narrow ? 'left' : 'center'}
            arrive
            wait={BANK_IN.head}
            start={up}
            back={covered}
            warn
            label={title ?? 'nothing selected'}
          />
        </div>
      </div>

      {/* Scrolls on its own — eleven rows at a size worth pressing do not all
          fit a real window's height, and a rail is allowed to scroll where a
          row of preset buttons across the bottom was not. `railList` is what
          keeps the bank's canvas clipped to exactly this band as it scrolls —
          see the effect above. */}
      <div className="mech-work-rail-list" ref={railList}>
        <div className="mech-bank" onPointerEnter={onHold} onPointerLeave={onRelease}>
          {SLOTS.map((item, n) => (
            <SlotBox
              key={item.id}
              slot={item}
              n={n}
              on={picked === n}
              arrived={n < dealt}
              direct={direct}
              onPick={() => onPick?.(n)}
              onOpen={() => onOpen(item.id)}
            />
          ))}

          {/* The one canvas every bay above draws into. Mounted inside the
              bank so it stacks with them — on the wide layout it covers the
              whole viewport and paints only in the rectangles the views give
              it; narrow it is sized to the bank and scrolls with it. */}
          <MechSlots />

          {/* The scan lines and the accent that turn eleven full-colour
              renders into the panel's own phosphor. A grid of its own,
              matching the bank cell for cell — see *twelve renders, on one
              panel's supply* for why it cannot be a child of a bay or a flat
              sheet over the whole rail. */}
          <span className="mech-bank-veil" aria-hidden>
            {SLOTS.map((item) => (
              <i key={item.id} />
            ))}
          </span>
        </div>
      </div>

      {children}
    </aside>
  )
}
