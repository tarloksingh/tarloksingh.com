import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react'
import './DriftWall.css'

/* DriftWall, from React Bits (reactbits.dev), ported to TypeScript and taught
   to carry video as well as stills.

   The drift, the pointer parallax and the per-column easing are the original
   component's — only the tile contents and the click behaviour are ours. A
   tile rests on its poster and plays its clip while hovered: the wall holds
   ~200 tiles once the columns are duplicated for the loop, and that many
   simultaneous <video> elements is more decoder than any browser will give.
   `play="always"` overrides it if you want to try anyway. */

export interface DriftItem {
  /** The still. For a clip this is the poster pulled at build time. */
  image: string
  /** The 400px silent proxy, when this tile is a clip. */
  video?: string
  title?: string
  /** Passed back by `onSelect` — what the tile stands for. */
  id?: string
}

interface Props {
  items: DriftItem[]
  columns?: number
  tileWidth?: number
  tileHeight?: number
  gap?: number
  radius?: number
  tilt?: number
  turn?: number
  roll?: number
  perspective?: number
  depth?: number
  speed?: number
  direction?: 'up' | 'down'
  variance?: number
  parallax?: number
  pauseOnHover?: boolean
  /** The original stops the column under the pointer even when
   *  `pauseOnHover` is off. Set false to let it keep drifting. */
  holdHoveredColumn?: boolean
  lift?: number
  fade?: number
  dim?: number
  grayscale?: boolean
  overlayColor?: string
  play?: 'hover' | 'always'
  onSelect?: (item: DriftItem) => void
  className?: string
  style?: CSSProperties
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const columnFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1
  return 1 + variance * pseudo
}

/** One tile. A component rather than a render function because a clip needs
 *  its own element to start and stop. */
function Tile({
  item,
  id,
  colIndex,
  active,
  play,
  onActivate,
  onRelease,
  onSelect
}: {
  item: DriftItem
  id: string
  colIndex: number
  active: boolean
  play: 'hover' | 'always'
  onActivate: (id: string, col: number) => void
  onRelease: () => void
  onSelect?: (item: DriftItem) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const shouldPlay = Boolean(item.video) && (play === 'always' || active)

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (shouldPlay) {
      void el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [shouldPlay])

  const inner: ReactNode = (
    <span className="drift-wall__inner">
      {item.video ? (
        <video
          ref={video}
          src={item.video}
          poster={item.image}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
        />
      ) : (
        <img src={item.image} alt={item.title ?? ''} loading="lazy" decoding="async" draggable={false} />
      )}
      <span className="drift-wall__overlay" aria-hidden="true" />
    </span>
  )

  return (
    <div
      className={`drift-wall__tile${active ? ' is-active' : ''}`}
      data-tile-id={id}
      data-col={colIndex}
      tabIndex={0}
      role="button"
      aria-label={item.title ?? 'tile'}
      onFocus={() => onActivate(id, colIndex)}
      onBlur={onRelease}
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(item)
        }
      }}
    >
      {inner}
    </div>
  )
}

export default function DriftWall({
  items,
  columns = 5,
  tileWidth = 200,
  tileHeight = 132,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  holdHoveredColumn = true,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  grayscale = false,
  overlayColor = '#060010',
  play = 'hover',
  onSelect,
  className = '',
  style
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const trackRefs = useRef<Array<HTMLDivElement | null>>([])
  const rafRef = useRef<number | null>(null)

  const offsetsRef = useRef<number[]>([])
  const velocitiesRef = useRef<number[]>([])
  const hoveredColRef = useRef(-1)
  const wallHoveredRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })
  const pointerDampedRef = useRef({ x: 0, y: 0 })
  const lastTsRef = useRef<number | null>(null)

  const [containerHeight, setContainerHeight] = useState(600)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(prefersReducedMotion())
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const columnItems = useMemo(() => {
    const cols: DriftItem[][] = Array.from({ length: columns }, () => [])
    items.forEach((item, i) => cols[i % columns].push(item))
    return cols.map((col) => (col.length ? col : items.slice(0, 1)))
  }, [items, columns])

  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit)
      const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1)
      return { copyHeight, copies }
    })
  }, [columnItems, tileHeight, gap, containerHeight])

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height || 600)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const baseVelocities = useMemo(() => {
    const dirSign = direction === 'up' ? 1 : -1
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1
      return speed * columnFactor(c, variance) * dirSign * altSign
    })
  }, [columnItems, speed, direction, variance])

  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1))
    velocitiesRef.current = columnItems.map(() => 0)
  }, [columnMeta, columnItems])

  const applyPlaneTransform = useCallback(
    (px: number, py: number) => {
      const plane = planeRef.current
      if (!plane) return
      plane.style.transform =
        `translate(-50%, -50%) scale(1.18) ` +
        `rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`
    },
    [tilt, turn, roll, depth]
  )

  useEffect(() => {
    const animate = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000)
      lastTsRef.current = ts

      const maxTilt = parallax * 8
      const targetX = pointerRef.current.x * maxTilt
      const targetY = -pointerRef.current.y * maxTilt
      const damp = 1 - Math.exp(-dt / 0.12)
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y)

      if (!reduced) {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const meta = columnMeta[c]
          if (!meta) continue
          const paused = wallHoveredRef.current && pauseOnHover
          const held = holdHoveredColumn && hoveredColRef.current === c
          const target = baseVelocities[c] * (paused || held ? 0 : 1)

          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28))
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease
          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight
          offsetsRef.current[c] = next

          const el = trackRefs.current[c]
          if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`
        }
      } else {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const el = trackRefs.current[c]
          const meta = columnMeta[c]
          if (el && meta) el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [baseVelocities, columnMeta, pauseOnHover, holdHoveredColumn, parallax, reduced, applyPlaneTransform])

  const activate = useCallback((id: string, index: number) => {
    activeIdRef.current = id
    hoveredColRef.current = index
    setActiveId(id)
  }, [])

  const release = useCallback(() => {
    activeIdRef.current = null
    hoveredColRef.current = -1
    setActiveId(null)
  }, [])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      if (parallax > 0 && !reduced) {
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5
        }
      }
      const hit = document.elementFromPoint(event.clientX, event.clientY)
      const tile = hit instanceof Element ? hit.closest<HTMLElement>('[data-tile-id]') : null
      if (!tile) return
      const id = tile.dataset.tileId
      if (!id || id === activeIdRef.current) return
      activeIdRef.current = id
      hoveredColRef.current = Number(tile.dataset.col)
      setActiveId(id)
    },
    [parallax, reduced]
  )

  const handlePointerLeaveWall = useCallback(() => {
    wallHoveredRef.current = false
    pointerRef.current = { x: 0, y: 0 }
    release()
  }, [release])

  const cssVars = useMemo(
    () =>
      ({
        '--dw-tile-w': `${tileWidth}px`,
        '--dw-tile-h': `${tileHeight}px`,
        '--dw-gap': `${gap}px`,
        '--dw-radius': `${radius}px`,
        '--dw-perspective': `${perspective}px`,
        '--dw-lift': `${lift}px`,
        '--dw-dim': dim,
        '--dw-gray': grayscale ? 1 : 0,
        '--dw-overlay': overlayColor,
        '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`,
        ...style
      }) as CSSProperties,
    [tileWidth, tileHeight, gap, radius, perspective, lift, dim, grayscale, overlayColor, fade, style]
  )

  const rootClass = ['drift-wall', reduced ? 'drift-wall--reduced' : '', className].filter(Boolean).join(' ')

  return (
    <div
      ref={containerRef}
      className={rootClass}
      style={cssVars}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        wallHoveredRef.current = true
      }}
      onPointerLeave={handlePointerLeaveWall}
      role="group"
      aria-label="Drifting wall of work"
    >
      <div ref={planeRef} className="drift-wall__plane">
        {columnItems.map((col, c) => {
          const meta = columnMeta[c]
          const copies = Array.from({ length: meta.copies })
          return (
            <div className="drift-wall__col" key={`col-${c}`}>
              <div
                className="drift-wall__track"
                ref={(el) => {
                  trackRefs.current[c] = el
                }}
              >
                {copies.map((_, copyIndex) =>
                  col.map((item, itemIndex) => {
                    const id = `${c}-${copyIndex}-${itemIndex}`
                    return (
                      <Tile
                        key={id}
                        id={id}
                        item={item}
                        colIndex={c}
                        active={activeId === id}
                        play={play}
                        onActivate={activate}
                        onRelease={release}
                        onSelect={onSelect}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
