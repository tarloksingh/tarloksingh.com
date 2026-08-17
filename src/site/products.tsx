import { Center } from '@react-three/drei'
import type { ReactNode } from 'react'
import BlockBuilder from '../three/BlockBuilder'
import DiscHolder from '../three/DiscHolder'
import Phone3D from '../three/Phone3D'
import VideoFrame from '../three/VideoFrame'
import WyteCard from '../three/WyteCard'
import PosStation from '../three/PosStation'
import Printer3D from '../three/objects/Printer3D'
import VisaKiosk3D from '../three/objects/VisaKiosk3D'
import { LoadedModel, SpriteFlipbook } from '../three/CapsuleStage'
import { resolveVideo } from '../data/media'

/* What piece stands for each project in the gallery.

   Four of the twelve have a real modelled asset; the rest are hand-built from
   primitives, because the alternative — showing every project as the same
   borrowed capsule — says nothing about any of them. A project with no entry
   here still gets its case; the case is simply empty, which is a truthful
   thing for a museum to do.

   ---- what changed when the room became one room ----

   Every product used to have its own canvas and could therefore ask for its
   own exposure, environment strength and camera. One shared scene has one of
   each, so two of those three had to go somewhere:

   - **`lift`** replaces `exposure` × `envIntensity`. It is the piece's own
     `envMapIntensity`, which is the one brightness control that belongs to a
     material rather than to the renderer. Each value below is the old pair's
     product measured against the glTF baseline the room is now lit at, so
     these are the same numbers rewritten, not new guesses.
   - **`turn`** replaces `azimuth`. The camera can no longer orbit per project
     — it would orbit the whole gallery, and a room where every case is seen
     from a different angle is not a room. What the azimuth was actually
     choosing was *which face of the piece you meet*, so it turns the piece
     inside its case instead. `elevation` had nowhere to go and is gone; the
     room is seen from eye height, like a room.

   `scale` and the float values are untouched — they were always the piece's
   own, and `Gallery3D` scales the whole lot into a case with `PIECE_FIT`. */

const url = (projectId: string, filename: string) => resolveVideo(projectId, filename)?.src

/** The room's own lighting, in the units the old per-project settings used:
 *  exposure × environment. Every `lift` below is that product ÷ this. */
const ROOM_LIGHT = 0.1 * 4

const lift = (exposure: number, env: number) => (exposure * env) / ROOM_LIGHT

/**
 * Fish Man is a hand-animated PNG sequence exported from Unity at 12fps, not
 * a glTF, so it flips through on a billboard rather than loading a model.
 */
const FISH_MAN_FRAMES = Array.from(
  { length: 14 },
  (_, i) => `/sprites/fish-man-idle/Fish_Man_Idle_${String(i).padStart(5, '0')}.png`
)

/**
 * The clay objects were authored for a timeline ring roughly 1.5 units across;
 * pieces here are normalised to ~1.1. Wrapping rather than editing them keeps
 * those files usable by the archived timeline exactly as they are.
 */
const clay = (node: ReactNode, fit: number) => (scale: number) => (
  <Center>
    <group scale={fit * scale}>{node}</group>
  </Center>
)

export interface ProductSpec {
  /** The piece itself, built at the scale the gallery hands it. */
  node: (scale: number) => ReactNode
  /** Longest edge, as a multiple of the ~1.1-unit norm. */
  scale?: number
  /** See the note above — the piece's own `envMapIntensity`. */
  lift?: number
  /** Degrees the piece is turned inside its case. */
  turn?: number
  /** Nudges the piece off the dead centre of its slot, in fractions of the
   *  window — `offsetX` across the screen, `offsetY` up it. Screen-space, not
   *  world-space: the camera orbits, and a piece placed on a world axis would
   *  swing away from wherever it was set as you scroll.
   *
   *  These exist because "centred in its slot" and "sitting right" are not
   *  the same thing once the pieces are different shapes — a tall kiosk and a
   *  flat card centred by their bounding boxes do not read as level with each
   *  other. Tune them live in the gallery's Leva panel (Objects → the
   *  project), then paste the numbers here to keep them. */
  offsetX?: number
  offsetY?: number
  floatIntensity?: number
  floatRotation?: number
  floatSpeed?: number
}

const DEFAULTS = {
  scale: 1.55,
  lift: 1,
  turn: 0,
  offsetX: 0,
  offsetY: 0,
  /* Still, like a piece in a case — see `mr-takahashi` below for the one
     exception. */
  floatIntensity: 0,
  /* No idle rotation of any kind — not a turntable, and not `Float`'s own
     rotational wobble.
     A piece that turns on its own is a thing being demonstrated to you. The
     only rotation here comes from the scroll (see `SWEEP` in Gallery3D), so
     turning the object is something *you* do, and at rest it holds the face it
     was set to. */
  floatRotation: 0,
  floatSpeed: 2.3
}

const SPECS: Record<string, ProductSpec> = {
  'capsule-c1': {
    node: (scale) => (
      <LoadedModel url="/models/capsule-c1.glb" scale={scale} fallbackColor="#000000" />
    ),
    turn: 42
  },
  'mr-takahashi': {
    node: (scale) => (
      <LoadedModel url="/models/mr-takahashi.glb" scale={scale} fallbackColor="#000000" />
    ),
    scale: 1.52,
    turn: 24,
    // The one piece that still breathes — see the note on DEFAULTS.
    floatIntensity: 0.85
  },
  'slider-engine': {
    node: (scale) => <SpriteFlipbook frames={FISH_MAN_FRAMES} fps={12} scale={scale} />,
    scale: 1.75,
    // A billboard drawn with `toneMapped={false}` is outside the room's
    // exposure entirely, so there is nothing here for a lift to do.
    turn: 0
  },
  'mecha-station': {
    node: (scale) => <PosStation videoUrl="/videos/mecha-station-hero.mp4" scale={scale} />,
    scale: 1.6,
    lift: lift(0.6, 2.2),
    turn: 32
  },
  openup: {
    node: (scale) => {
      const src = url('openup', 'One.mp4')
      return src ? <Phone3D videoUrl={src} scale={scale} /> : null
    },
    scale: 1.6,
    lift: lift(0.55, 2.4),
    turn: 26
  },
  stitchfam: {
    node: (scale) => {
      const src = url('stitchfam', 'hero.mp4')
      return src ? <VideoFrame videoUrl={src} scale={scale} /> : null
    },
    scale: 1.6,
    lift: lift(0.6, 2.4),
    turn: 28
  },
  'red-dead-redemption-2': {
    node: (scale) => <DiscHolder scale={scale} />,
    scale: 1.6,
    lift: lift(0.5, 2.6),
    turn: 34
  },
  'grand-theft-auto-v': {
    node: (scale) => <DiscHolder scale={scale} />,
    scale: 1.6,
    lift: lift(0.5, 2.6),
    turn: -34
  },
  'wyte-card': {
    node: (scale) => <WyteCard scale={scale} />,
    scale: 1.52,
    lift: lift(0.42, 3),
    turn: 38
  },
  'block-builder': {
    node: (scale) => <BlockBuilder scale={scale} />,
    scale: 1.75,
    lift: lift(0.75, 2),
    turn: 30
  },
  visa: {
    node: clay(<VisaKiosk3D accent="#1434cb" hovered={false} />, 0.62),
    scale: 1.52,
    lift: lift(0.7, 1.8),
    turn: 22
  },
  '3d-printing': {
    node: clay(<Printer3D accent="#9c3524" hovered={false} />, 0.7),
    scale: 1.52,
    lift: lift(0.7, 1.8),
    turn: 28
  }
}

export type Exhibit = ReturnType<typeof exhibitFor>

/** Everything the gallery needs to stand one project in a case. */
export function exhibitFor(projectId: string) {
  const spec = SPECS[projectId]
  if (!spec) return null
  const merged = { ...DEFAULTS, ...spec }
  return {
    node: spec.node(merged.scale),
    // Already baked into `node` above, and passed on anyway: the gallery's
    // tuning panel shows sizes as a multiplier on whatever a piece is set to
    // here, and cannot write a number worth pasting back without knowing what
    // it is multiplying.
    scale: merged.scale,
    turn: merged.turn,
    lift: merged.lift,
    offsetX: merged.offsetX,
    offsetY: merged.offsetY,
    floatIntensity: merged.floatIntensity,
    floatRotation: merged.floatRotation,
    floatSpeed: merged.floatSpeed
  }
}

export const hasProduct = (projectId: string) => projectId in SPECS

/** The tunable numbers for one project, without building its piece.
 *
 *  What the gallery's debug panel seeds its sliders from. It cannot use
 *  `exhibitFor` for that: reading four numbers off it would call `node` for
 *  every project on the site, and `node` is where a glTF gets requested and a
 *  video element gets made. */
export function specDefaults(projectId: string) {
  const { scale, turn, offsetX, offsetY } = { ...DEFAULTS, ...SPECS[projectId] }
  return { scale, turn, offsetX, offsetY }
}
