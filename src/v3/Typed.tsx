import { useEffect, useRef, useState } from 'react'

/** Reveals its text a character at a time — and, when asked, takes it back
 *  the same way.
 *
 *  Every line on this page that animates in is typed. There used to be two
 *  reveals — this one on the title, and a GSAP `SplitText` fade-per-character
 *  on the taglines, the fold titles and the index sheet — which is the sort
 *  of inconsistency nobody can name and everybody feels. Typing is the one
 *  this machine already had a voice for, caret and all, so it is the one that
 *  survived. `SplitReveal.tsx` is gone; it is in git if the other gesture is
 *  ever wanted back.
 *
 *  `speed` is per character. Short labels want to be quick: a six-letter fold
 *  title at the title's own pace is a third of a second spent spelling
 *  "roles". `caret` is off for those too — six blinking carets down a column
 *  is a form, not a readout.
 *
 *  `back` is the way out, and it is the reason the character count lives in a
 *  ref rather than in state: a line asked to leave has to start deleting from
 *  wherever it actually got to, which on a fast exit is the middle of the
 *  word. Fading a typed line out is the one exit that says "this was never
 *  really typed"; backspacing says the machine is still holding the caret.
 *  See the name handing itself to the header in Mech.tsx, which is one line
 *  backspacing and another typing what it gave up. */
export default function Typed({
  text,
  run,
  delay = 0,
  speed = 55,
  caret = true,
  back = false,
  backSpeed = 26,
  start = true
}: {
  text: string
  run: string
  /** Seconds before it starts. */
  delay?: number
  /** Milliseconds a character. */
  speed?: number
  caret?: boolean
  /** Flip to true and it deletes itself, from wherever it had got to. Flip it
   *  back and it types again from nothing. */
  back?: boolean
  /** Milliseconds a character on the way out. Quicker than typing, the way a
   *  held backspace is quicker than a person. */
  backSpeed?: number
  /** False holds the line empty and does not start the clock. `delay` counts
   *  from the moment this comes true, not from mount — which is the whole
   *  point of it: home mounts behind the boot's cover, so a line typed on a
   *  timer started at mount has spelled itself out before anyone can see it.
   *  The intro paragraph got this for free because its `back` follows the
   *  cover; every other typed line needs to be told. */
  start?: boolean
}) {
  const out = useRef<HTMLSpanElement>(null)
  /* How far along it is, shared by both directions. Not state: setting it per
     character re-rendered the whole project screen forty times a second while
     the title typed — the rail, the folds, the leaders and all — which is a
     stutter you can see, on the one beat of the page that is meant to be a
     machine coming up smoothly. The text itself is written straight to the
     node. */
  const at = useRef(0)
  /* The only thing state is used for here is the caret going out at the end. */
  const [done, setDone] = useState(false)

  /* **Both directions run on rAF, and neither runs on a timer.**
     `setInterval` at `speed={9}` — which is what the intro paragraph is
     typed at — is 111 ticks a second against a display that presents 60.
     That is two `textContent` writes on most frames, each one a layout
     invalidation on a paragraph, and about 40% of them discarded unseen
     before anything is painted. It lands in the same 1.2s window as the
     tachometer sweep, twelve dial blocks and the bank's deal, which is the
     window `PERFORMANCE.md` measures the 225ms frame in.

     Driving it off the frame clock instead makes the character count a
     function of elapsed time rather than of tick count, so the line still
     spells itself out at exactly `speed` milliseconds a character and still
     finishes at exactly the same moment — it simply does it in one write a
     frame, and skips the write entirely on a frame where the count has not
     moved. Visually identical; that is the whole point of computing the
     count from the clock rather than incrementing it. */
  useEffect(() => {
    if (back) return
    setDone(false)
    at.current = 0
    if (out.current) out.current.textContent = ''
    if (!start) return
    let frame = 0
    let began = 0
    const step = (now: number) => {
      if (!began) began = now
      const n = Math.min(text.length, Math.floor((now - began) / speed))
      /* Only when it has actually changed. A property or a text node written
         with the value it already had still invalidates style and layout —
         the same trap the deck's meter and the compass were both caught by;
         see *what the page pays for every frame* in the README. */
      if (n !== at.current) {
        at.current = n
        if (out.current) out.current.textContent = text.slice(0, n)
      }
      if (n >= text.length) return setDone(true)
      frame = requestAnimationFrame(step)
    }
    const open = window.setTimeout(() => {
      frame = requestAnimationFrame(step)
    }, delay * 1000)
    return () => {
      window.clearTimeout(open)
      cancelAnimationFrame(frame)
    }
  }, [text, run, delay, speed, back, start])

  /* The way out, on the same clock. It starts from wherever the line actually
     got to — `at.current` on the frame `back` flipped — so the elapsed count
     is subtracted from that rather than from the full length. */
  useEffect(() => {
    if (!back) return
    setDone(false)
    let frame = 0
    let began = 0
    const from = at.current
    const step = (now: number) => {
      if (!began) began = now
      const n = Math.max(0, from - Math.floor((now - began) / backSpeed))
      if (n !== at.current) {
        at.current = n
        if (out.current) out.current.textContent = text.slice(0, n)
      }
      if (n === 0) return
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [back, text, backSpeed])

  return (
    <>
      <span ref={out} />
      {caret && <span className="mech-caret" data-done={done} />}
    </>
  )
}
