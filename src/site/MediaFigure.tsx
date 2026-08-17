import { useEffect, useRef, useState } from 'react'
import type { MediaItem } from '../data/media'

/* One piece of media in a case study.

   The poster is always what is on screen. A video element is only created
   once the figure is within a screen of the fold, starts playing only while
   it is actually visible, and is torn down when it leaves — a case study runs
   to a dozen clips and a page that decodes all of them at once will stutter
   on a laptop and drain a phone.

   Clips carrying real audio behave differently: they get controls and wait to
   be asked, because a page that starts talking at you is a page you close. */

interface MediaFigureProps {
  media: MediaItem
  /** Column span in the twelve-column media grid. */
  span: number
  /** Held back for the hero, which is on screen before anything scrolls. */
  eager?: boolean
}

export default function MediaFigure({ media, span, eager = false }: MediaFigureProps) {
  const ref = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(eager)
  const [visible, setVisible] = useState(eager)
  const [ready, setReady] = useState(false)
  const isVideo = media.type === 'video'
  const wantsAsking = isVideo && media.hasSound

  useEffect(() => {
    const el = ref.current
    if (!el || !isVideo) return

    // Two thresholds from one observer: a wide margin decides whether the
    // element should exist at all, and the plain intersection decides whether
    // it should be running.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting)
          if (entry.isIntersecting) setNear(true)
        }
      },
      { rootMargin: '100% 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVideo])

  useEffect(() => {
    const video = videoRef.current
    if (!video || wantsAsking) return
    if (visible) video.play().catch(() => {})
    else video.pause()
  }, [visible, wantsAsking])

  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (!video) return
      video.pause()
      // Dropping the source is what actually frees the decoder; pausing alone
      // leaves the pipeline allocated for the rest of the visit.
      video.removeAttribute('src')
      video.load()
    }
  }, [near])

  const enlarge = () => {
    const node = videoRef.current ?? ref.current?.querySelector('img')
    const target = node as HTMLElement & { webkitRequestFullscreen?: () => void }
    if (target?.requestFullscreen) target.requestFullscreen().catch(() => {})
    else target?.webkitRequestFullscreen?.()
  }

  return (
    <figure
      ref={ref}
      className="pp-figure"
      style={{
        ['--span' as string]: span,
        // From the generated manifest, so the box is the right shape before
        // anything has loaded and the page never reflows underneath a reader.
        aspectRatio: media.aspect
      }}
    >
      <button type="button" className="pp-figure-hit" onClick={enlarge} aria-label={media.label ?? 'Enlarge'}>
        <img
          className="pp-figure-still"
          src={media.poster ?? media.src}
          alt={media.label ?? ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
        />
        {isVideo && near ? (
          <video
            ref={videoRef}
            className="pp-figure-clip"
            src={media.src}
            // A clip with controls is opaque from the moment it mounts, so
            // the still underneath it is never seen — it needs its own
            // poster or the visitor is offered a black rectangle with a
            // play button on it.
            poster={wantsAsking ? media.poster : undefined}
            data-ready={ready && !wantsAsking}
            muted={!wantsAsking}
            loop={!wantsAsking}
            controls={wantsAsking}
            playsInline
            preload="metadata"
            onCanPlay={() => setReady(true)}
            onPlay={() => setReady(true)}
          />
        ) : null}
        {wantsAsking && !ready ? (
          <span className="pp-figure-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
            <span>With sound</span>
          </span>
        ) : null}
      </button>
      {media.label ? <figcaption className="pp-figure-caption">{media.label}</figcaption> : null}
    </figure>
  )
}

/** Column span for a piece of media, from its shape. Portraits sit narrow and
 *  pair up; anything wide takes the room it needs. */
export function spanFor(aspect: number, count: number): number {
  if (count === 1) return 12
  if (aspect < 0.85) return 3
  if (aspect < 1.3) return 4
  if (aspect < 2.1) return 6
  return 12
}

/** Shape class the narrow layout keys off. A phone capture is tall enough
 *  that giving it the full measure makes one clip taller than the screen —
 *  they have to keep pairing up however narrow the window gets. */
export const shapeOf = (aspect: number) => (aspect < 0.85 ? 'is-portrait' : 'is-wide')
