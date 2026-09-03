import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { folder, useControls } from 'leva'
import { Color, MathUtils } from 'three'
import type { Group } from 'three'
import { EXTRA_CONTROLS } from './Gallery3D'

/** The schema's `value:` fields are seeded from this, and the "Copy for
 *  source" button (Gallery3D.tsx) diffs the live panel against it — one
 *  object rather than the same numbers written out twice. */
const BLOCK_DEFAULTS = {
  brightness: 0.55,
  spread: 1.4,
  speed: 1
}

// A LEGO-style kids' game reads better in candy colours than the site's
// usual white/black product language — this is the one product that's
// actually about the colours.
const COLORS = ['#ff5b4d', '#4d94ff', '#ffcc33', '#4fdb7a', '#c76dff', '#ff9a3d']
const BLOCK_COUNT = COLORS.length
const BLOCK_SIZE = 0.2
const BLOCK_HEIGHT = BLOCK_SIZE
// Waiting layout: scattered on the ground rather than lined up evenly — the
// way a kid actually leaves a handful of blocks lying around. A loose base
// spacing keeps them roughly spread out left to right, and a per-block
// jitter on top of it breaks up any sense of a formula. Both are fractions
// of a block's width, and both scale with the "Spread" slider.
const STEP_X = BLOCK_SIZE * 0.5
const STEP_Z = BLOCK_SIZE * 0.35
const JITTER_X = BLOCK_SIZE * 1.1
const JITTER_Z = BLOCK_SIZE * 0.85

// The cycle is four phases, not a straight there-and-back: build, hold,
// collapse, hold — the pause on each end is what makes the collapse read as
// a *reaction* to a finished tower rather than the same motion in reverse.
// Seconds at 1x speed; the "Speed" slider divides all four together.
const RISE_SECONDS = 1.3
const HOLD_UP_SECONDS = 0.55
// Falling is quicker than building — gravity, not placement.
const FALL_SECONDS = 0.8
const HOLD_DOWN_SECONDS = 0.6

// Overshoots past 1 before easing back — a light landing pop on the way up.
function easeOutBack(t: number) {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// Starts slow and accelerates — how something actually falls under gravity,
// in contrast to the rise's springy pop.
function easeInQuad(t: number) {
  return t * t
}

// Deterministic "random" in [-1, 1] — the scatter has to look the same on
// every reload and every collapse, not reroll itself.
function jitter(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

interface BlockProps {
  index: number
  color: string
  floorY: number
  brightness: number
  spread: number
  speed: number
}

function Block({ index, color, floorY, brightness, spread, speed }: BlockProps) {
  const ref = useRef<Group>(null)

  // Waiting position: scattered on the ground, in plain view — not hidden
  // below the floor, not spaced into a tidy row. Every block sits on the
  // same floor line; only X and Z are randomised.
  const start = useMemo(() => {
    const offset = index - (BLOCK_COUNT - 1) / 2
    const x = offset * STEP_X + jitter(index * 2.1 + 11) * JITTER_X
    const z = offset * STEP_Z + jitter(index * 3.7 + 5) * JITTER_Z
    return [x * spread, floorY, z * spread] as [number, number, number]
  }, [index, floorY, spread])

  // Stacked position: a column centred on the origin, bottom block first —
  // exactly one block's height apart, so landed blocks sit flush with no
  // overlap and no gap.
  const target = useMemo(() => {
    const towerBase = -(BLOCK_COUNT * BLOCK_HEIGHT) / 2
    return [0, towerBase + BLOCK_HEIGHT * index + BLOCK_HEIGHT / 2, 0] as [number, number, number]
  }, [index])

  // Dimmer at low settings than a straight emissive add would allow — this
  // scales the block's actual colour, so "brightness" all the way down
  // means genuinely dark, not just less glow on top of a bright base.
  const litColor = useMemo(() => new Color(color).multiplyScalar(brightness), [color, brightness])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const rise = RISE_SECONDS / speed
    const holdUp = HOLD_UP_SECONDS / speed
    const fall = FALL_SECONDS / speed
    const holdDown = HOLD_DOWN_SECONDS / speed
    const total = rise + holdUp + fall + holdDown
    const t = clock.getElapsedTime() % total

    let x: number, y: number, z: number

    if (t < rise) {
      // Building, bottom-up: each block owns a slice of the rise, staggered
      // by index, so they lift off the ground and land one at a time.
      const windowStart = (index / BLOCK_COUNT) * rise
      const windowEnd = ((index + 1) / BLOCK_COUNT) * rise
      const local = MathUtils.clamp((t - windowStart) / (windowEnd - windowStart), 0, 1)
      const eased = easeOutBack(local)
      x = MathUtils.lerp(start[0], target[0], eased)
      y = MathUtils.lerp(start[1], target[1], eased)
      z = MathUtils.lerp(start[2], target[2], eased)
    } else if (t < rise + holdUp) {
      // Standing there, finished — the beat that sells the tower as built.
      ;[x, y, z] = target
    } else if (t < rise + holdUp + fall) {
      // Collapsing, top-down: the last block placed is the first to go,
      // like a real stack toppling from the top.
      const tf = t - rise - holdUp
      const fallIndex = BLOCK_COUNT - 1 - index
      const windowStart = (fallIndex / BLOCK_COUNT) * fall
      const windowEnd = ((fallIndex + 1) / BLOCK_COUNT) * fall
      const local = MathUtils.clamp((tf - windowStart) / (windowEnd - windowStart), 0, 1)
      const eased = easeInQuad(local)
      x = MathUtils.lerp(target[0], start[0], eased)
      y = MathUtils.lerp(target[1], start[1], eased)
      z = MathUtils.lerp(target[2], start[2], eased)
    } else {
      // Down, scattered, resting — the beat before it picks back up.
      ;[x, y, z] = start
    }

    ref.current.position.set(x, y, z)
  })

  return (
    <group ref={ref} position={start}>
      <mesh>
        <boxGeometry args={[BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE]} />
        <meshStandardMaterial
          color={litColor}
          roughness={0.25}
          metalness={0}
          emissive={litColor}
          emissiveIntensity={0.4}
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
 * Blocks rest scattered on the ground, lift off and build into a tower
 * bottom-up, hold, collapse top-down like a real stack toppling, hold again,
 * then repeat — a continuous loop, not a glTF or a one-shot animation.
 * Positions are authored so the shape stays balanced around the origin
 * through the whole cycle; wrapping this in `<Center>` would only be
 * correct for whichever pose was on screen when its one-time bounding-box
 * measurement ran.
 */
export default function BlockBuilder({ scale = 1 }: BlockBuilderProps) {
  // Dev-only sliders, folded into the same "Objects > Block Builder" panel
  // Gallery3D already builds for this piece's turn/scale/x/y (see
  // `OBJECT_SCHEMA` there) — same folder path, same default Leva store, so
  // they land in the section that already has this piece's other tools
  // instead of opening a second one with the same name.
  const { brightness, spread, speed } = useControls('Objects', {
    'Block Builder': folder(
      {
        brightness: {
          value: BLOCK_DEFAULTS.brightness,
          min: 0.1,
          max: 1.5,
          step: 0.05,
          label: 'Brightness'
        },
        spread: { value: BLOCK_DEFAULTS.spread, min: 0.3, max: 3, step: 0.05, label: 'Spread' },
        speed: { value: BLOCK_DEFAULTS.speed, min: 0.3, max: 3, step: 0.1, label: 'Speed ×' }
      },
      { collapsed: true }
    )
  }) as unknown as { brightness: number; spread: number; speed: number }

  // Registers this folder's live values into the panel-wide registry the
  // single "Copy for source" button (Gallery3D.tsx) reads from — the same way
  // CapsuleC1 and AdamFace do. Without this the three sliders above moved the
  // piece on screen and then reported nothing when the panel was copied, so
  // an afternoon of tuning them left no trace in the copied text and looked,
  // from the outside, exactly like the button ignoring what you had changed.
  useEffect(() => {
    Object.assign(EXTRA_CONTROLS, {
      'Block Builder › Brightness': { value: brightness, defaultValue: BLOCK_DEFAULTS.brightness },
      'Block Builder › Spread': { value: spread, defaultValue: BLOCK_DEFAULTS.spread },
      'Block Builder › Speed ×': { value: speed, defaultValue: BLOCK_DEFAULTS.speed }
    })
  }, [brightness, spread, speed])

  // The ground the cascade rests on: level with the bottom of the finished
  // tower, so the stack reads as rising up off the same floor the blocks
  // were lying on rather than a different plane.
  const floorY = -(BLOCK_COUNT * BLOCK_HEIGHT) / 2 + BLOCK_HEIGHT / 2

  // The volume the whole build→hold→collapse→hold cycle travels through,
  // centred on the origin. drei's <Center>/<Resize> measure their subtree
  // once, at mount, and without a constant to lock onto they catch the flat
  // ground scatter — so <Center> pins that pose's low centre to the origin
  // and the tower, rising to +0.6, climbs straight out of frame. This is why
  // the piece showed nothing on the project stage. An invisible-but-drawn box
  // (Box3.setFromObject skips `visible={false}`) gives them a stable measure.
  const spanX = ((BLOCK_COUNT - 1) / 2) * STEP_X + JITTER_X
  const spanZ = ((BLOCK_COUNT - 1) / 2) * STEP_Z + JITTER_Z
  const bounds: [number, number, number] = [
    2 * (spanX * spread + BLOCK_SIZE / 2),
    BLOCK_COUNT * BLOCK_HEIGHT,
    2 * (spanZ * spread + BLOCK_SIZE / 2)
  ]

  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={bounds} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {COLORS.map((color, i) => (
        <Block
          key={i}
          index={i}
          color={color}
          floorY={floorY}
          brightness={brightness}
          spread={spread}
          speed={speed}
        />
      ))}
    </group>
  )
}
