import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'

gsap.registerPlugin(GSAPSplitText)

/** A line that draws itself in a character at a time — the tagline and the
 *  fold titles. The same idea as `Typed`, but for text that never needs to
 *  be retyped, so it runs once per `run` instead of on an interval.

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

    if (document.fonts.status === 'loaded') reveal()
    else document.fonts.ready.then(reveal)

    return () => {
      cancelled = true
      tween?.kill()
      split?.revert()
    }
  }, [text, run, delay])

  return <span ref={ref} className={className} />
}
