import { useEffect, useRef, useState } from 'react'

/** Reveals its text a character at a time.
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
 *  is a form, not a readout. */
export default function Typed({
  text,
  run,
  delay = 0,
  speed = 55,
  caret = true
}: {
  text: string
  run: string
  /** Seconds before it starts. */
  delay?: number
  /** Milliseconds a character. */
  speed?: number
  caret?: boolean
}) {
  const out = useRef<HTMLSpanElement>(null)
  /* The only thing state is used for here is the caret going out at the end.
     Setting it per character re-rendered the whole project screen forty times
     a second while the title typed — the rail, the folds, the leaders and all
     — which is a stutter you can see, on the one beat of the page that is
     meant to be a machine coming up smoothly. The text itself is written
     straight to the node. */
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDone(false)
    let at = 0
    let timer = 0
    if (out.current) out.current.textContent = ''
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        at += 1
        if (out.current) out.current.textContent = text.slice(0, at)
        if (at >= text.length) {
          window.clearInterval(timer)
          setDone(true)
        }
      }, speed)
    }, delay * 1000)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
  }, [text, run, delay, speed])

  return (
    <>
      <span ref={out} />
      {caret && <span className="mech-caret" data-done={done} />}
    </>
  )
}
