import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode
} from 'react'
import { gsap } from 'gsap'
import './TextType.css'

/* ---- TextType ----

   React Bits' `TextType`, ported from the JavaScript variant to TypeScript.
   The behaviour is the original's, prop for prop; what changed is types, and
   two notes below about how it sits in this codebase.

   **It is not `Typed.tsx`, and both are staying.** `Typed` writes straight to
   a DOM node rather than through state — a hundred and twenty characters is a
   hundred and twenty text writes and no renders — which is what makes it safe
   to run on the name, the wordmark and the profile paragraph while a WebGL
   context is compiling shaders on the same beat. It types a line once, and it
   can take that line back off (`back`), which is how the name hands itself to
   the corner on a transit. What it cannot do is cycle: it has no notion of a
   *set* of lines, or of deleting one to make room for the next.

   This does exactly that, and pays for it with a render per character. That
   is the right trade in the one place it is used — the greeting card, which
   is a modal over a page that has not booted yet, so there is nothing else
   competing for the main thread and nothing behind it to drop frames. Do not
   reach for it on the readout itself; `Typed` is there for that.

   **The cursor blinks on a GSAP tween, not a CSS keyframe**, which is the
   original's choice and worth keeping: `cursorBlinkDuration` is a prop, and a
   number handed to a keyframe means either a hard-coded duration or a custom
   property per instance. GSAP is already a dependency here. */

interface Props {
  /** One line, or a set of them cycled with a delete between each. */
  text: string | string[]
  as?: ElementType
  typingSpeed?: number
  /** Milliseconds before the first character. */
  initialDelay?: number
  /** How long a finished line holds before it is taken back off. */
  pauseDuration?: number
  deletingSpeed?: number
  loop?: boolean
  className?: string
  showCursor?: boolean
  hideCursorWhileTyping?: boolean
  cursorCharacter?: string | ReactNode
  cursorClassName?: string
  cursorBlinkDuration?: number
  /** One colour per line, cycled with them. */
  textColors?: string[]
  /** A range to pick each character's delay from, rather than one speed — the
   *  difference between a machine printing and somebody typing. */
  variableSpeed?: { min: number; max: number }
  onSentenceComplete?: (sentence: string, index: number) => void
  /** Hold until the element is in the viewport. */
  startOnVisible?: boolean
  reverseMode?: boolean
}

export default function TextType({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...rest
}: Props) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(!startOnVisible)
  const cursorRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLElement>(null)

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text])

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed
    const { min, max } = variableSpeed
    return Math.random() * (max - min) + min
  }, [variableSpeed, typingSpeed])

  const getCurrentTextColor = () => {
    if (textColors.length === 0) return 'inherit'
    return textColors[currentTextIndex % textColors.length]
  }

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsVisible(true)
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [startOnVisible])

  useEffect(() => {
    if (!showCursor || !cursorRef.current) return
    gsap.set(cursorRef.current, { opacity: 1 })
    const tween = gsap.to(cursorRef.current, {
      opacity: 0,
      duration: cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    })
    // The original leaves this running. Killing it on unmount matters here:
    // the greeting card is unmounted the moment it is dismissed, and a tween
    // on a detached node is a tween GSAP keeps ticking forever.
    return () => {
      tween.kill()
    }
  }, [showCursor, cursorBlinkDuration])

  useEffect(() => {
    if (!isVisible) return

    let timeout: number | undefined
    const currentText = textArray[currentTextIndex]
    const processedText = reverseMode ? currentText.split('').reverse().join('') : currentText

    const executeTypingAnimation = () => {
      if (isDeleting) {
        if (displayedText === '') {
          setIsDeleting(false)
          if (currentTextIndex === textArray.length - 1 && !loop) return

          if (onSentenceComplete) onSentenceComplete(textArray[currentTextIndex], currentTextIndex)

          setCurrentTextIndex((prev) => (prev + 1) % textArray.length)
          setCurrentCharIndex(0)
          timeout = window.setTimeout(() => {}, pauseDuration)
        } else {
          timeout = window.setTimeout(() => {
            setDisplayedText((prev) => prev.slice(0, -1))
          }, deletingSpeed)
        }
      } else if (currentCharIndex < processedText.length) {
        timeout = window.setTimeout(
          () => {
            setDisplayedText((prev) => prev + processedText[currentCharIndex])
            setCurrentCharIndex((prev) => prev + 1)
          },
          variableSpeed ? getRandomSpeed() : typingSpeed
        )
      } else if (textArray.length >= 1) {
        if (!loop && currentTextIndex === textArray.length - 1) return
        timeout = window.setTimeout(() => setIsDeleting(true), pauseDuration)
      }
    }

    if (currentCharIndex === 0 && !isDeleting && displayedText === '') {
      timeout = window.setTimeout(executeTypingAnimation, initialDelay)
    } else {
      executeTypingAnimation()
    }

    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    onSentenceComplete
  ])

  const shouldHideCursor =
    hideCursorWhileTyping && (currentCharIndex < textArray[currentTextIndex].length || isDeleting)

  return createElement(
    Component,
    { ref: containerRef, className: `text-type ${className}`, ...rest },
    <span className="text-type__content" style={{ color: getCurrentTextColor() || 'inherit' }}>
      {displayedText}
    </span>,
    showCursor && (
      <span
        ref={cursorRef}
        className={`text-type__cursor ${cursorClassName} ${shouldHideCursor ? 'text-type__cursor--hidden' : ''}`}
      >
        {cursorCharacter}
      </span>
    )
  )
}
