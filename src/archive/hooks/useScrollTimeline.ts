import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function useScrollTimeline(eraCount: number, _spacing: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0) // continuous 0..eraCount-1, read every frame by the camera rig
  const triggerRef = useRef<ScrollTrigger | null>(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current || eraCount < 2) return

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: `+=${(eraCount - 1) * window.innerHeight * 1.4}`,
      pin: true,
      scrub: 0.7,
      onUpdate: (self) => {
        const p = self.progress * (eraCount - 1)
        progressRef.current = p
        setProgress(p)
        setActiveIndex(Math.round(p))
      }
    })
    triggerRef.current = trigger

    return () => trigger.kill()
  }, [eraCount])

  const scrollToEra = (index: number) => {
    const trigger = triggerRef.current
    if (!trigger) return
    const targetProgress = index / (eraCount - 1)
    const scrollY = trigger.start + targetProgress * (trigger.end - trigger.start)
    gsap.to(window, { scrollTo: scrollY, duration: 1.1, ease: 'power2.inOut' })
  }

  return { containerRef, progressRef, activeIndex, progress, scrollToEra }
}
