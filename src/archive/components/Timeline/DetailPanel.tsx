import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import type { EraObject } from '../../data/eras'
import mechaStationHero from '../../../assets/mecha-station/hero.mp4'
import capsuleHero from '../../../assets/capsule-c1/hero.mp4'
import sliderEngineHero from '../../../assets/slider-engine/hero.mp4'
import mrTakahashiHero from '../../../assets/mr-takahashi/hero.mp4'

const MEDIA_MAP: Record<string, string> = {
  'mecha-station/hero.mp4': mechaStationHero,
  'capsule-c1/hero.mp4': capsuleHero,
  'slider-engine/hero.mp4': sliderEngineHero,
  'mr-takahashi/hero.mp4': mrTakahashiHero
}

function resolveMedia(src: string): string | undefined {
  return MEDIA_MAP[src]
}

export default function DetailPanel({ object, onClose }: { object: EraObject | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [displayObject, setDisplayObject] = useState<EraObject | null>(null)

  useEffect(() => {
    if (object) setDisplayObject(object)
  }, [object])

  useGSAP(
    () => {
      if (!panelRef.current) return
      if (object) {
        gsap.fromTo(
          panelRef.current,
          { autoAlpha: 0, x: 24 },
          { autoAlpha: 1, x: 0, duration: 0.45, ease: 'power3.out' }
        )
      } else {
        gsap.to(panelRef.current, { autoAlpha: 0, x: 24, duration: 0.3, ease: 'power2.in' })
      }
    },
    { dependencies: [object?.id ?? null] }
  )

  const mediaSrc = displayObject?.media ? resolveMedia(displayObject.media.src) : undefined

  return (
    <div className="detail-panel" ref={panelRef}>
      <div className="detail-panel-frame">
        <span className="corner corner-tl" />
        <span className="corner corner-tr" />
        <span className="corner corner-bl" />
        <span className="corner corner-br" />

        <button className="detail-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {mediaSrc && displayObject?.media?.type === 'video' && (
          <video className="detail-panel-media" src={mediaSrc} autoPlay muted loop playsInline />
        )}
        {mediaSrc && displayObject?.media?.type === 'image' && (
          <img className="detail-panel-media" src={mediaSrc} alt={displayObject.title} />
        )}

        <div className="detail-panel-body">
          <div className="detail-panel-years">{displayObject?.years}</div>
          <h3 className="detail-panel-title">{displayObject?.title}</h3>
          <p className="detail-panel-text">{displayObject?.text}</p>
          {displayObject?.workId && <div className="detail-panel-link">View case study →</div>}
        </div>
      </div>
    </div>
  )
}
