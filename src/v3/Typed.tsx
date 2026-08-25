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
  backSpeed = 26
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

  useEffect(() => {
    if (back) return
    setDone(false)
    at.current = 0
    let timer = 0
    if (out.current) out.current.textContent = ''
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        at.current += 1
        if (out.current) out.current.textContent = text.slice(0, at.current)
        if (at.current >= text.length) {
          window.clearInterval(timer)
          setDone(true)
        }
      }, speed)
    }, delay * 1000)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
  }, [text, run, delay, speed, back])

  useEffect(() => {
    if (!back) return
    setDone(false)
    const timer = window.setInterval(() => {
      at.current = Math.max(0, at.current - 1)
      if (out.current) out.current.textContent = text.slice(0, at.current)
      if (at.current === 0) window.clearInterval(timer)
    }, backSpeed)
    return () => window.clearInterval(timer)
  }, [back, text, backSpeed])

  return (
    <>
      <span ref={out} />
      {caret && <span className="mech-caret" data-done={done} />}
    </>
  )
}
