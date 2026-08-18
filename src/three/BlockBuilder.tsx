import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { MathUtils } from 'three'
import type { Group } from 'three'

// A LEGO-style kids' game reads better in candy colours than the site's
// usual white/black product language — this is the one product that's
// actually about the colours.
const COLORS = ['#e8483c', '#3d7de0', '#f2b632', '#3fae5c', '#a259d9', '#f27830']
const BLOCK_COUNT = COLORS.length
const BLOCK_SIZE = 0.2
const BLOCK_HEIGHT = BLOCK_SIZE
const RING_RADIUS = 0.5
// One-way travel time; the full stack-then-unstack loop is twice this.
const CYCLE_SECONDS = 3.4

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

interface BlockProps {
  index: number
  color: string
}

function Block({ index, color }: BlockProps) {
  const ref = useRef<Group>(null)

  // Waiting position: spread around a flat ring at the tower's vertical
  // midpoint, so blocks travel up or down into place rather than only up.
  const start = useMemo(() => {
    const angle = (index / BLOCK_COUNT) * Math.PI * 2
    return [Math.sin(angle) * RING_RADIUS, 0, Math.cos(angle) * RING_RADIUS] as [number, number, number]
  }, [index])

  // Stacked position: a small tower centred on the origin, with a slight
  // per-block jitter so it reads as hand-placed rather than machined.
  const target = useMemo(() => {
    const towerBase = -(BLOCK_COUNT * BLOCK_HEIGHT) / 2
    const jitterX = Math.sin(index * 12.9) * 0.025
    const jitterZ = Math.cos(index * 7.3) * 0.025
    return [jitterX, towerBase + BLOCK_HEIGHT * index + BLOCK_HEIGHT / 2, jitterZ] as [number, number, number]
  }, [index])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const period = CYCLE_SECONDS * 2
    const phase = (clock.getElapsedTime() % period) / CYCLE_SECONDS // 0..2
    const wave = phase <= 1 ? phase : 2 - phase // triangle: 0 → 1 → 0

    // Each block owns a slice of the 0..1 window, staggered by index, so
    // they fly in — and, on the way back, fly out — one at a time instead
    // of all moving together.
    const windowStart = index / BLOCK_COUNT
    const windowEnd = (index + 1) / BLOCK_COUNT
    const local = MathUtils.clamp((wave - windowStart) / (windowEnd - windowStart), 0, 1)
    const eased = easeInOutCubic(local)

    ref.current.position.set(
      MathUtils.lerp(start[0], target[0], eased),
      MathUtils.lerp(start[1], target[1], eased),
      MathUtils.lerp(start[2], target[2], eased)
    )
  })

  return (
    <group ref={ref} position={start}>
      <mesh>
        <boxGeometry args={[BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
        <Edges color="#ffffff" />
      </mesh>
    </group>
  )
}

export interface BlockBuilderProps {
  scale?: number
}

/**
 * Blocks fly in from a ring and stack into a tower, then reverse — a
 * continuous ping-pong loop, not a glTF or a one-shot animation. Positions
 * are authored so the shape stays balanced around the origin through the
 * whole cycle; wrapping this in `<Center>` would only be correct for
 * whichever pose was on screen when its one-time bounding-box measurement
 * ran.
 */
export default function BlockBuilder({ scale = 1 }: BlockBuilderProps) {
  return (
    <group scale={scale}>
      {COLORS.map((color, i) => (
        <Block key={i} index={i} color={color} />
      ))}
    </group>
  )
}
