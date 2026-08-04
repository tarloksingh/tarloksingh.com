import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

// Ported from ReactBits' BlurText (reactbits.dev/text-animations/blur-text),
// re-implemented on GSAP instead of framer-motion to match this project's stack.
interface BlurTextProps {
  text?: string
  delay?: number
  className?: string
  animateBy?: 'words' | 'chars'
  direction?: 'top' | 'bottom'
  threshold?: number
  rootMargin?: string
  stepDuration?: number
  ease?: string
  /** false plays the reveal in reverse: stagger out and blur away. */
  show?: boolean
  /** false keeps segments fully opaque — only blur and position animate in. */
  fade?: boolean
  /** false drops the blur filter entirely — matches reactbits' SplitText
   *  (plain fade + rise, single stage) instead of the blurred reveal. */
  blur?: boolean
  /** Pixels the segment travels from (direction) into its resting position. */
  distance?: number
  /** Seconds before this block's reveal starts — lets multiple BlurText
   *  instances on a page cascade in one after another. */
  startDelay?: number
  onAnimationComplete?: () => void
  onExitComplete?: () => void
}

// Newlines in `text` are hard line breaks — the heading keeps its designed
// line breaks at every viewport instead of re-wrapping on width.
export default function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.35,
  ease = 'power2.out',
  show = true,
  fade = true,
  blur = true,
  distance = 50,
  startDelay = 0,
  onAnimationComplete,
  onExitComplete
}: BlurTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [inView, setInView] = useState(false)

  const lines = text.split('\n')

  // Everything below waits on IntersectionObserver, whose callback is
  // async — a whole frame or more after mount. That gap is long enough to
  // paint a stationary copy of the word: an entering one sits at full
  // opacity before it is hidden, and an exiting one just stalls there
  // instead of leaving. Resolving both before the browser's first paint is
  // what stops two words being on screen looking doubled.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    if (show) {
      const spans = node.querySelectorAll<HTMLSpanElement>('[data-blur-segment]')
      if (spans.length) {
        const fromY = direction === 'top' ? -distance : distance
        gsap.set(spans, {
          y: fromY,
          ...(fade ? { opacity: 0 } : {}),
          ...(blur ? { filter: 'blur(10px)' } : {})
        })
      }
    }

    // Already on screen? Then skip the observer entirely and let the
    // animation start on this same commit.
    const rect = node.getBoundingClientRect()
    if (rect.bottom >= 0 && rect.top <= window.innerHeight) setInView(true)
    // Only ever needed for the very first paint of this instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(node)
        }
      },
      { threshold, rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  useEffect(() => {
    if (!inView || !ref.current) return
    // Read straight from the DOM so the stagger order follows document order
    // across every line, and no stale refs survive a text change.
    const spans = Array.from(ref.current.querySelectorAll<HTMLSpanElement>('[data-blur-segment]'))
    if (!spans.length) return

    const fromY = direction === 'top' ? -distance : distance
    const midY = direction === 'top' ? distance * 0.1 : -distance * 0.1

    // `delay` is a per-character gap, so a long paragraph (Focus's ~100
    // chars) would otherwise take 8+ seconds just to start its last
    // character — long enough to read as broken rather than mid-reveal.
    // Capping the total spread keeps every block's reveal roughly the same
    // length regardless of how much text it has.
    const maxTotalStaggerMs = 1400
    const effectiveDelay = spans.length > 1 ? Math.min(delay, maxTotalStaggerMs / (spans.length - 1)) : delay

    let tween: gsap.core.Tween

    if (!blur) {
      // Matches reactbits' SplitText: one stage, fade + rise, no blur.
      if (show) {
        gsap.set(spans, { y: fromY, opacity: fade ? 0 : 1 })
      }
      tween = gsap.to(spans, {
        y: show ? 0 : fromY,
        opacity: fade ? (show ? 1 : 0) : 1,
        duration: stepDuration,
        stagger: effectiveDelay / 1000,
        delay: startDelay,
        ease,
        onComplete: show ? onAnimationComplete : onExitComplete
      })
    } else {
      const opacityIn = fade ? { opacity: 0 } : {}
      const opacityMid = fade ? { opacity: 0.5 } : {}
      const opacityFull = fade ? { opacity: 1 } : {}

      if (show) {
        gsap.set(spans, { filter: 'blur(10px)', y: fromY, ...opacityIn })
      }

      tween = gsap.to(spans, {
        keyframes: show
          ? [
              { filter: 'blur(5px)', y: midY, duration: stepDuration, ...opacityMid },
              { filter: 'blur(0px)', y: 0, duration: stepDuration, ...opacityFull }
            ]
          : [
              { filter: 'blur(5px)', y: midY, duration: stepDuration, ...opacityMid },
              { filter: 'blur(10px)', y: fromY, duration: stepDuration, ...opacityIn }
            ],
        stagger: effectiveDelay / 1000,
        delay: startDelay,
        ease,
        onComplete: show ? onAnimationComplete : onExitComplete
      })
    }

    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, show, fade, blur, distance, delay, startDelay, stepDuration, ease, direction, text, animateBy])

  return (
    <p
      ref={ref}
      className={className}
      style={{
        // Without blur, the reveal is a rise-out-of-its-container: clipping
        // the block hides the segment's travel distance until it climbs
        // back above this box's own edge, like it's emerging from the floor.
        overflow: blur ? 'visible' : 'hidden'
      }}
    >
      {lines.map((line, lineIndex) => {
        const words = line.split(' ')
        return (
          <span key={lineIndex} style={{ display: 'block' }}>
            {words.map((word, wordIndex) => (
              // Each word is its own unbreakable inline-block, so long text
              // wraps normally at word boundaries instead of overflowing —
              // the per-char stagger targets live inside it.
              <Fragment key={wordIndex}>
                <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {animateBy === 'words' ? (
                    <span data-blur-segment="" style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}>
                      {word}
                    </span>
                  ) : (
                    Array.from(word).map((char, charIndex) => (
                      <span
                        key={charIndex}
                        data-blur-segment=""
                        style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
                      >
                        {char}
                      </span>
                    ))
                  )}
                </span>
                {wordIndex < words.length - 1 ? ' ' : ''}
              </Fragment>
            ))}
          </span>
        )
      })}
    </p>
  )
}
