import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import type { Era } from '../../data/eras'

export default function EraHeading({ era }: { era: Era }) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(
        '.era-heading-years',
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.5 }
      ).fromTo(
        '.era-heading-label',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.7 },
        '-=0.3'
      )
    },
    { scope, dependencies: [era.id] }
  )

  return (
    <div className="era-heading" ref={scope} key={era.id}>
      <div className="era-heading-years">{era.years}</div>
      <div className="era-heading-label">{era.label}</div>
    </div>
  )
}
