import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'

gsap.registerPlugin(GSAPSplitText)

/** A line that draws itself in a character at a time — the tagline, the fold
 *  titles, every row of the menu. The same idea as `Typed`, but for text that
 *  never needs to be retyped, so it runs once per `run` instead of on an
 *  interval.
 *
 *  **It waits until it can be seen.** On the wide layout everything this is
 *  used on is on screen at once and this changes nothing. On a phone the page
 *  scrolls, and a cascade that fired at mount is a cascade that finished
 *  three screens before you got there — which is the whole difference between
 *  a page that draws itself as you go and a page where everything was simply
 *  already there. One observer per line is fine at this count; the alternative
 *  is a shared registry for a dozen elements.
 *
 *  The text is written to the node imperatively rather than passed as a
 *  React child: GSAP's `SplitText` replaces that text with a run of `<span>`s
 *  per character, and a child React also renders would fight it for
 *  ownership of the same node the moment `text` changed — the same reason
 *  `Typed` writes to a ref instead of state. */
export default function SplitReveal({
  text,
  run,
  className,
  delay = 0
}: {
  text: string
  run: string
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let split: GSAPSplitText | null = null
    let tween: gsap.core.Tween | null = null
    let cancelled = false

    const reveal = () => {
      if (cancelled || !el) return
      el.textContent = text
      el.setAttribute('aria-label', text)
      split = new GSAPSplitText(el, { type: 'chars', charsClass: 'split-char' })
      split.chars.forEach((char) => char.setAttribute('aria-hidden', 'true'))
      tween = gsap.fromTo(
        split.chars,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.022, delay }
      )
    }

    /* Held at nothing until it runs, so a line waiting below the fold is not
       sitting there fully drawn and then re-drawing itself when you arrive. */
    el.textContent = text
    el.style.opacity = '0'

    const start = () => {
      el.style.opacity = ''
      if (document.fonts.status === 'loaded') reveal()
      else document.fonts.ready.then(reveal)
    }

    let watch: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'undefined') {
      start()
    } else {
      watch = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          watch?.disconnect()
          watch = null
          start()
        },
        // A little before the top edge reaches the fold, so the line has
        // begun by the time it is properly in view.
        { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
      )
      watch.observe(el)
    }

    return () => {
      cancelled = true
      watch?.disconnect()
      tween?.kill()
      split?.revert()
      if (el) el.style.opacity = ''
    }
  }, [text, run, delay])

  return <span ref={ref} className={className} />
}
