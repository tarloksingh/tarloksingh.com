import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Note } from './notes'
import Segment from './Segment'
import './MechFacts.css'

/* ---- the readout, on a phone ----

   The same notes the wide layout fans around the picture, in a deck under it.
   One card at a time, swiped.

   It is a deck and not a smaller fan because of a sum, written out at the top
   of `leaders.ts`: a card's box is in frame units and its type is on `--type`,
   which has a rem floor and stops shrinking with the window — so a sentence
   set to be readable on a phone needs about seventy per cent of the screen's
   width, and three of those cannot be arranged around a subject that is using
   the same screen. Everything that looked like a placement bug down there —
   cards clipped mid-word, cards printed over each other, a card sitting on the
   thing it was pointing at — was that one sum, and no set of narrow pins can
   pay it off.

   So the picture keeps the marks (`Marks` in Mech.tsx) and the sentences move
   into a scroller of their own. The two halves are joined by an index rather
   than by a line: tapping a mark brings its card up, swiping to a card lights
   its mark. The number in the corner of the card is the same number set beside
   the mark, which is what makes that link readable while your thumb is over
   half the picture.

   Three parts and no more: the word, the count, the card. There were pips
   under it for a while — a bar per note, the current one long — and they were a
   third readout of a position two other things on screen were already
   reporting, in a row small enough that pressing one on glass was a coin
   toss. The next card's shoulder is the affordance; the count is the
   readout. */

interface Props {
  notes: Note[]
  /** Which card is up. Held by `Mech` because the marks on the picture are
   *  lit off the same number. */
  index: number
  onIndex: (index: number) => void
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Where a card sits in the scroller, as a scroll offset. The run is
 *  `position: relative`, so a card's `offsetLeft` is measured from it — and
 *  taking the first card's off every one of them drops the run's own padding
 *  out of the sum, which is what makes the first card's home position zero. */
const offsetOf = (run: HTMLElement, card: HTMLElement) =>
  card.offsetLeft - (run.children[0] as HTMLElement).offsetLeft

/** Which card the scroller has settled on: the one nearest its home position.
 *  Measured rather than divided — the cards are a percentage wide with a gap
 *  between them, so there is no single step to divide by. */
const nearest = (run: HTMLElement) => {
  const cards = Array.from(run.children) as HTMLElement[]
  let best = 0
  let near = Infinity
  cards.forEach((card, i) => {
    const away = Math.abs(offsetOf(run, card) - run.scrollLeft)
    if (away < near) {
      near = away
      best = i
    }
  })
  return best
}

/* ---- fitting a card to its own lines ----

   A card is `max-content` capped at a share of the screen, so a sentence longer
   than that cap wraps — and the box then stays the full width it was *allowed*
   while the last line ends wherever it ends. The gap left on the right is the
   thing: a card holding one sentence should be the size of that sentence, not
   the size of the room it was offered.

   No CSS keyword does this. `fit-content` and `max-content` shrink-wrap to the
   unwrapped width or fall back to the available width; neither is "the widest
   line the wrapping actually produced". So the lines are measured and the width
   is written back — the same trick `fitCards` plays on the wide layout's
   leaders, and simpler here because this card is ordinary HTML and its pixels
   are real ones rather than units inside a `viewBox`.

   Two things have to be right. The width is cleared before measuring, or each
   pass measures the last pass's answer and the card walks itself narrower. And
   Clash Display is `font-display: swap`, so a card measured before it arrives
   is a card fitted to Helvetica's metrics and clipping its own last word a
   moment later — hence the second pass off `fonts.ready`. */
const fitAll = (run: HTMLElement | null) => {
  if (!run) return
  const range = document.createRange()
  for (const card of Array.from(run.children) as HTMLElement[]) {
    const line = card.querySelector('p')
    if (!line) continue
    card.style.width = ''
    range.selectNodeContents(line)
    const lines = Array.from(range.getClientRects())
    // One line is already hugging its text — that is what `max-content` is for,
    // and there is nothing to take off it.
    if (lines.length < 2) continue
    // Everything of the card that is not the sentence: both paddings, both
    // borders, the number and the gap after it.
    const chrome = card.offsetWidth - line.offsetWidth
    // A pixel of slack: the widest line measured back to exactly its own width
    // is a line one sub-pixel rounding away from wrapping again.
    card.style.width = `${Math.ceil(Math.max(...lines.map((rect) => rect.width))) + 1 + chrome}px`
  }
}

export default function MechFacts({ notes, index, onIndex }: Props) {
  const run = useRef<HTMLDivElement>(null)
  /* Set while the scroller is being driven from the outside — a tapped mark or
     a tapped pip — and read by the scroll handler, which would otherwise report
     every card the smooth scroll passes over on the way and fight the animation
     it is watching. */
  const driven = useRef(0)

  /* The card that is up follows the index whoever set it. Nothing happens when
     the scroller is already there, which is the common case: this effect also
     runs on the index the scroller itself just reported. */
  useEffect(() => {
    const el = run.current
    const card = el?.children[index] as HTMLElement | undefined
    if (!el || !card) return
    if (nearest(el) === index) return
    window.clearTimeout(driven.current)
    driven.current = window.setTimeout(() => {
      driven.current = 0
    }, 600)
    el.scrollTo({ left: offsetOf(el, card), behavior: 'smooth' })
  }, [index])

  useEffect(() => () => window.clearTimeout(driven.current), [])

  /* Measured, then fitted — see `fitAll`. Again on a resize, which is also what
     browser zoom and a phone's own text-size control fire: the type moves, the
     sentence re-wraps, and a width measured for the old size is a card with a
     word hanging out of it. */
  useLayoutEffect(() => {
    const fit = () => fitAll(run.current)
    fit()
    let live = true
    document.fonts?.ready.then(() => {
      if (live) fit()
    })
    window.addEventListener('resize', fit)
    return () => {
      live = false
      window.removeEventListener('resize', fit)
    }
  }, [notes])

  const settled = () => {
    const el = run.current
    if (!el || driven.current) return
    const at = nearest(el)
    if (at !== index) onIndex(at)
  }

  return (
    <section className="mech-facts" data-arrive aria-label="Notes on this picture">
      <div className="mech-facts-head">
        <span className="mech-facts-key">facts</span>
        {/* A display and not type, like every other count on this site.
            `settle` off: it is re-set on every swipe, and a readout that
            scrambles each time your thumb moves is a slot machine. */}
        <span className="mech-facts-count">
          <Segment text={`${pad(index + 1)}/${pad(notes.length)}`} cells={5} settle={false} />
        </span>
      </div>

      {/* `onScroll` rather than `scrollend`, which Safari only learned in 17.4
          and which is the browser this whole component is for. Reading a
          settled index on every scroll frame is a handful of `offsetLeft`s
          against children that have not moved. */}
      {/* One note is not a deck: with nothing to swipe to, the shoulder left
          for the next card is a card that has been cut off for no reason. */}
      <div className="mech-facts-run" data-one={notes.length === 1} ref={run} onScroll={settled}>
        {notes.map((note, i) => (
          <article className="mech-facts-card" key={`${i}-${note.label}`} data-on={i === index}>
            <span className="mech-facts-no" aria-hidden>
              {pad(i + 1)}
            </span>
            <p>{note.value}</p>
          </article>
        ))}
      </div>

    </section>
  )
}
