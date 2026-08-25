import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { castPins, isPlaced, TAG, tagFor, type CastTag } from './castTags'
import { CAST } from './heroes'
import { findProject } from './model'
import { aim } from './subject'
import type { Space } from './leaders'

/* Placing the tags on the cast.

   The home screen's answer to `MechPins.tsx`, and deliberately the same tool:
   press **P**, drag the dot to where the line should touch the subject and
   the label to where it should read, copy the table out on the panel. What
   differs is what is being pointed at. A picture holds still inside a box
   with edges, so a note is a fraction of that box; a subject is a thing
   standing in a scene, drifting on its float, and the only fixed point it has
   is where the camera is projecting it right now. So a tag is an offset from
   that point, in the same frame coordinates the leaders are drawn in, and the
   handles have to follow the subject rather than sit still — which is why
   there is a frame loop in here at all.

   **Every subject at once, not the one being hovered.** Arranging labels
   across a group means dragging one while watching the other four, the same
   reason the cast panel puts a folder on screen per subject rather than a
   folder for whichever is selected. It also side-steps the thing that makes
   this awkward to build the obvious way: the real tag is on screen only while
   the pointer is over its subject, and the pointer cannot be over a subject
   and dragging a label twenty degrees away from it at the same time.

   Development only. Imported behind `import.meta.env.DEV`, so none of it is
   in the bundle a visitor downloads. */

interface Props {
  space: Space
  onClose: () => void
}

/** One subject's tag, drawn as the leader it will be and with a handle on
 *  each end. The group is moved every frame to wherever the camera has put
 *  the subject; everything inside it is in offsets, which is exactly what is
 *  being edited. */
function Placing({
  heroId,
  space,
  title,
  value,
  tag,
  placed,
  live,
  onGrab
}: {
  heroId: string
  space: Space
  title: string
  value: string
  tag: CastTag
  placed: boolean
  live: boolean
  onGrab: (end: 'at' | 'to') => (event: React.PointerEvent) => void
}) {
  const group = useRef<SVGGElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const spot = aim.spots[heroId]
      if (!spot || !group.current) return
      /* Written straight to the node rather than through React: it changes
         every frame, nothing renders off it, and a state update per subject
         per frame is five re-renders of the whole overlay sixty times a
         second. Same trick `CastTag` uses for the tag itself. */
      group.current.setAttribute('transform', `translate(${spot.x * space.w} ${spot.y * space.h})`)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [heroId, space])

  const dir = tag.to[0] >= tag.at[0] ? 1 : -1
  const end = tag.to[0] + TAG.bar * dir
  const anchor = dir === 1 ? 'start' : 'end'

  return (
    <g ref={group} className="mech-cast-pin" data-live={live} data-loose={!placed}>
      <polyline
        className="mech-leader"
        points={`${end},${tag.to[1]} ${tag.to[0]},${tag.to[1]} ${tag.at[0]},${tag.at[1]}`}
      />
      <circle className="mech-leader-mark" cx={tag.at[0]} cy={tag.at[1]} r={6.5} />
      <circle className="mech-leader-core" cx={tag.at[0]} cy={tag.at[1]} r={1.9} />
      <text className="mech-leader-label" x={tag.to[0]} y={tag.to[1] - 9} textAnchor={anchor}>
        {title}
      </text>
      <text className="mech-leader-value" x={tag.to[0]} y={tag.to[1] + 21} textAnchor={anchor}>
        {value}
      </text>

      {/* The two handles. Drawn over the parts they move and generous enough
          to grab — a five-pixel ring is a lovely mark and a miserable
          target. */}
      <circle
        className="mech-cast-pin-grab"
        cx={tag.at[0]}
        cy={tag.at[1]}
        r={13}
        onPointerDown={onGrab('at')}
      />
      <rect
        className="mech-cast-pin-grab"
        x={dir === 1 ? tag.to[0] - 8 : tag.to[0] - TAG.bar - 8}
        y={tag.to[1] - 26}
        width={TAG.bar + 16}
        height={44}
        onPointerDown={onGrab('to')}
      />
    </g>
  )
}

export default function MechCastPins({ space, onClose }: Props) {
  const drafts = useSyncExternalStore(castPins.subscribe, castPins.snapshot, castPins.snapshot)
  const host = useRef<SVGSVGElement>(null)
  const [live, setLive] = useState<string | null>(null)

  /* A drag pins both ends at once, whichever one was grabbed — the same rule
     the project screen's notes have, and for the same reason: a tag nobody
     has placed is sitting on the fan, and pinning only the end that moved
     would leave the other in a fan it no longer shares. */
  const grab = (heroId: string, tag: CastTag) => (end: 'at' | 'to') => (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = host.current?.getBoundingClientRect()
    const spot = aim.spots[heroId]
    if (!rect || !spot) return

    setLive(heroId)
    const node = event.currentTarget as SVGElement
    node.setPointerCapture(event.pointerId)

    /* Client pixels to frame coordinates, and then out to an offset from
       wherever the subject is *now* — read per move, because the subject is
       still floating while you drag. The overlay is `preserveAspectRatio:
       none` over the stage, so the two axes scale separately. */
    const move = (moved: PointerEvent) => {
      const at = aim.spots[heroId] ?? spot
      const x = ((moved.clientX - rect.left) / rect.width) * space.w - at.x * space.w
      const y = ((moved.clientY - rect.top) / rect.height) * space.h - at.y * space.h
      castPins.set(heroId, { ...tag, [end]: [x, y] as [number, number] })
    }
    const drop = () => {
      node.releasePointerCapture(event.pointerId)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', drop)
      setLive(null)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', drop)
  }

  const placedCount = CAST.filter((hero) => isPlaced(hero.id, drafts)).length

  return (
    <div className="mech-pins mech-cast-pins">
      {/* The stage's own coordinates, the same viewBox the tag itself is drawn
          in — so a handle sits exactly where the thing it moves will. */}
      <svg
        ref={host}
        className="mech-leaders mech-cast-pin-layer"
        viewBox={`0 0 ${space.w} ${space.h}`}
        preserveAspectRatio="none"
      >
        {CAST.map((hero) => {
          const spot = aim.spots[hero.id]
          const tag = tagFor(hero.id, spot?.x ?? 0.5, drafts)
          const project = hero.project ? findProject(hero.project)?.project : null
          return (
            <Placing
              key={hero.id}
              heroId={hero.id}
              space={space}
              title={project?.title ?? hero.title}
              value={project?.tagline?.toLowerCase() ?? hero.role}
              tag={tag}
              placed={isPlaced(hero.id, drafts)}
              live={live === hero.id}
              onGrab={grab(hero.id, tag)}
            />
          )
        })}
      </svg>

      <div className="mech-pins-bar">
        <span className="mech-pins-id">the cast</span>
        <span className="mech-pins-hint">
          {placedCount} of {CAST.length} placed · drag the dot and the label
        </span>
        <span className="mech-pins-hint">copy and revert are on the Tags panel</span>
        <button onClick={onClose}>done · P</button>
      </div>
    </div>
  )
}
