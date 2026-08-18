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
// How far below its resting spot each block starts — it rises straight up
// into the stack rather than flying in sideways.
const DROP_DISTANCE = 0.9
// One-way travel time; the full stack-then-unstack loop is twice this. Kept
// short so the whole thing reads as quick, snappy taps rather than a drift.
const CYCLE_SECONDS = 1.5

// Overshoots past 1 before settling back — the "pop" that makes a landing
// read as a plop rather than a stop.
function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

interface BlockProps {
  index: number
  color: string
}

function Block({ index, color }: BlockProps) {
  const ref = useRef<Group>(null)

  // Stacked position: a column centred on the origin, bottom block first.
  const targetY = useMemo(() => {
    const towerBase = -(BLOCK_COUNT * BLOCK_HEIGHT) / 2
    return towerBase + BLOCK_HEIGHT * index + BLOCK_HEIGHT / 2
  }, [index])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const period = CYCLE_SECONDS * 2
    const phase = (clock.getElapsedTime() % period) / CYCLE_SECONDS // 0..2
    const wave = phase <= 1 ? phase : 2 - phase // triangle: 0 → 1 → 0

    // Each block owns a slice of the 0..1 window, staggered by index, so
    // they rise and land — and, on the way back, lift off and drop away —
    // one at a time, bottom-up, instead of all moving together.
    const windowStart = index / BLOCK_COUNT
    const windowEnd = (index + 1) / BLOCK_COUNT
    const local = MathUtils.clamp((wave - windowStart) / (windowEnd - windowStart), 0, 1)
    const eased = easeOutBack(local)

    ref.current.position.y = MathUtils.lerp(targetY - DROP_DISTANCE, targetY, eased)

    // The same overshoot that makes the landing pop also squashes the block
    // flat for an instant, like it actually took the impact.
    const overshoot = MathUtils.clamp(eased - 1, 0, 1)
    ref.current.scale.set(1 + overshoot * 0.3, 1 - overshoot * 0.5, 1 + overshoot * 0.3)
  })

  return (
    <group ref={ref} position={[0, targetY - DROP_DISTANCE, 0]}>
      <mesh>
        <boxGeometry args={[BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
        <Edges color="#ffffff" toneMapped={false} lineWidth={3} />
      </mesh>
    </group>
  )
}

export interface BlockBuilderProps {
  scale?: number
}

/**
 * Blocks rise from below and plop onto the stack bottom-up, then reverse — a
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
