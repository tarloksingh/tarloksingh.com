import { useEffect, useRef } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'

/* Reveal-on-scroll for the case studies.

   One shared IntersectionObserver rather than one per element: a long case
   study has upwards of a hundred of these, and a hundred observers is a
   hundred separate callbacks the browser has to service. The observer only
   ever flips an attribute — the actual motion is the CSS transition on
   `[data-reveal]` in `base.css`.

   Elements unobserve themselves once shown. Nothing here re-hides on the way
   back up: a reader scrolling up to re-read a paragraph should find it
   there, not watch it animate again. */

type Entry = { el: Element; delay: number }

let observer: IntersectionObserver | null = null
const pending = new Map<Element, Entry>()

function ensureObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        el.dataset.shown = 'true'
        observer!.unobserve(el)
        const record = pending.get(el)
        pending.delete(el)
        // Drop the compositor hint once it has arrived and will never move
        // again — after its own delay plus the transition length.
        window.setTimeout(() => {
          el.dataset.settled = 'true'
        }, (record?.delay ?? 0) * 1000 + 1400)
      }
    },
    // Fires a little before the element's top edge reaches the fold, so the
    // motion has begun by the time it is properly in view rather than
    // starting the instant it appears.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
  )
  return observer
}

interface RevealProps {
  children: ReactNode
  /** Seconds after entering view before this one starts — for cascades. */
  delay?: number
  /** Pixels it travels up from. 0 makes it a pure fade. */
  from?: number
  as?: ElementType
  className?: string
  style?: CSSProperties
}

export default function Reveal({
  children,
  delay = 0,
  from = 26,
  as: Tag = 'div',
  className,
  style
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Already on screen at mount (above the fold): show it without waiting
    // for the observer's first async callback, which is a frame or more away
    // and long enough to paint the page half-empty.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) {
      el.dataset.shown = 'true'
      window.setTimeout(() => {
        el.dataset.settled = 'true'
      }, delay * 1000 + 1400)
      return
    }
    pending.set(el, { el, delay })
    const io = ensureObserver()
    io.observe(el)
    return () => {
      pending.delete(el)
      io.unobserve(el)
    }
  }, [delay])

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={
        {
          '--reveal-delay': `${delay}s`,
          '--reveal-from': `${from}px`,
          ...style
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  )
}
