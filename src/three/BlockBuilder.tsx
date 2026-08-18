import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { useControls } from 'leva'
import { MathUtils } from 'three'
import type { Group } from 'three'

// A LEGO-style kids' game reads better in candy colours than the site's
// usual white/black product language — this is the one product that's
// actually about the colours. Bright and saturated, not the muted tones the
// vitrine's low exposure would otherwise flatten them to.
const COLORS = ['#ff5b4d', '#4d94ff', '#ffcc33', '#4fdb7a', '#c76dff', '#ff9a3d']
const BLOCK_COUNT = COLORS.length
const BLOCK_SIZE = 0.2
const BLOCK_HEIGHT = BLOCK_SIZE
// Waiting layout: a diagonal cascade with each block overlapping the last,
// the way a kid actually leaves a handful of blocks lying around — not an
// evenly spaced row floating with gaps between them.
const OVERLAP_X = BLOCK_SIZE * 0.55
const OVERLAP_Z = BLOCK_SIZE * 0.45
// One-way travel time; the full stack-then-unstack loop is twice this. Kept
// short so the whole thing reads as quick, snappy taps rather than a drift.
const CYCLE_SECONDS = 1.5

// Overshoots past 1 before easing back — a light landing pop, not a hard stop.
function easeOutBack(t: number) {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

interface BlockProps {
  index: number
  color: string
  floorY: number
  brightness: number
}

function Block({ index, color, floorY, brightness }: BlockProps) {
  const ref = useRef<Group>(null)

  // Waiting position: laid out on the ground in an overlapping diagonal
  // cascade, in plain view — not hidden below the floor, not spaced into a
  // tidy row.
  const start = useMemo(() => {
    const offset = index - (BLOCK_COUNT - 1) / 2
    return [offset * OVERLAP_X, floorY, offset * OVERLAP_Z] as [number, number, number]
  }, [index, floorY])

  // Stacked position: a column centred on the origin, bottom block first —
  // exactly one block's height apart, so landed blocks sit flush with no
  // overlap and no gap.
  const target = useMemo(() => {
    const towerBase = -(BLOCK_COUNT * BLOCK_HEIGHT) / 2
    return [0, towerBase + BLOCK_HEIGHT * index + BLOCK_HEIGHT / 2, 0] as [number, number, number]
  }, [index])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const period = CYCLE_SECONDS * 2
    const phase = (clock.getElapsedTime() % period) / CYCLE_SECONDS // 0..2
    const wave = phase <= 1 ? phase : 2 - phase // triangle: 0 → 1 → 0

    // Each block owns a slice of the 0..1 window, staggered by index, so
    // they lift off the ground and land — and, on the way back, lift off the
    // stack and settle back down — one at a time, bottom-up, instead of all
    // moving together. Because the windows never overlap in time, no two
    // blocks are ever converging on the same space at once.
    const windowStart = index / BLOCK_COUNT
    const windowEnd = (index + 1) / BLOCK_COUNT
    const local = MathUtils.clamp((wave - windowStart) / (windowEnd - windowStart), 0, 1)
    const eased = easeOutBack(local)

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
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0}
          emissive={color}
          emissiveIntensity={brightness}
          toneMapped={false}
        />
        <Edges color="#ffffff" toneMapped={false} lineWidth={3} />
      </mesh>
    </group>
  )
}

export interface BlockBuilderProps {
  scale?: number
}

/**
 * Blocks rest on the ground in an overlapping cascade, then lift off and
 * stack cleanly into a tower bottom-up, then reverse — a continuous
 * ping-pong loop, not a glTF or a one-shot animation. Positions are authored
 * so the shape stays balanced around the origin through the whole cycle;
 * wrapping this in `<Center>` would only be correct for whichever pose was
 * on screen when its one-time bounding-box measurement ran.
 */
export default function BlockBuilder({ scale = 1 }: BlockBuilderProps) {
  // Dev-only slider (see Gallery3D's tuning panel) — the vitrine's exposure
  // makes "how bright" a judgement call worth making live rather than
  // guessing at a hex value.
  const { brightness } = useControls('Block Builder', {
    brightness: { value: 0.35, min: 0, max: 1.5, step: 0.05, label: 'Brightness' }
  })

  // The ground the cascade rests on: level with the bottom of the finished
  // tower, so the stack reads as rising up off the same floor the blocks
  // were lying on rather than a different plane.
  const floorY = -(BLOCK_COUNT * BLOCK_HEIGHT) / 2 + BLOCK_HEIGHT / 2

  return (
    <group scale={scale}>
      {COLORS.map((color, i) => (
        <Block key={i} index={i} color={color} floorY={floorY} brightness={brightness} />
      ))}
    </group>
  )
}
