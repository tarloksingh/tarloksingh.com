import { Center } from '@react-three/drei'
import type { MutableRefObject, ReactNode } from 'react'
import AdamFace from '../three/AdamFace'
import BlockBuilder from '../three/BlockBuilder'
import CapsuleC1 from '../three/CapsuleC1'
import DiscHolder from '../three/DiscHolder'
import Phone3D from '../three/Phone3D'
import VideoFrame from '../three/VideoFrame'
import WyteCard from '../three/WyteCard'
import PosStation from '../three/PosStation'
import Printer3D from '../three/objects/Printer3D'
import VisaKiosk3D from '../three/objects/VisaKiosk3D'
import { SpriteFlipbook } from '../three/CapsuleStage'
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

/** What a piece can read to know where the visitor is standing — see
 *  `progressRef` in Gallery3D. Only Adam's case uses it so far. */
export interface NodeContext {
  progressRef: MutableRefObject<number>
  slot: number
  count: number
}

export interface ProductSpec {
  /** The piece itself, built at the scale the gallery hands it. `ctx` is
   *  only handed to pieces that ask for it. */
  node: (scale: number, ctx: NodeContext) => ReactNode
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
  /** Overrides for the label-stacked-under-the-case layout — same four
   *  numbers, read instead of the ones above when the room is narrow. Any
   *  field left out falls back to this spec's own desktop value, not to
   *  `DEFAULTS`: a piece angled for its case on a laptop is a reasonable
   *  starting pose for the phone case too, and this is what the gallery's
   *  tuning panel seeds its Mobile sliders from before anyone's touched
   *  them. Tune live (Objects → the project → Mobile), then paste back here
   *  the same way the desktop numbers are. */
  narrow?: {
    scale?: number
    turn?: number
    offsetX?: number
    offsetY?: number
  }
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
    node: (scale) => <CapsuleC1 scale={scale} />,
    scale: 2.213,
    turn: -311.1,
    offsetX: 0.15,
    offsetY: -0.145,
    narrow: { turn: 42.2, offsetX: 0, offsetY: 0 }
  },
  'mr-takahashi': {
    node: (scale, ctx) => (
      <AdamFace scale={scale} progressRef={ctx.progressRef} slot={ctx.slot} count={ctx.count} />
    ),
    scale: 3.417,
    turn: -26.7,
    offsetX: 0.11,
    offsetY: -0.08,
    // The one piece that still breathes — see the note on DEFAULTS.
    floatIntensity: 0.85,
    narrow: { turn: 24.4, offsetX: 0, offsetY: 0 }
  },
  'slider-engine': {
    node: (scale) => <SpriteFlipbook frames={FISH_MAN_FRAMES} fps={12} scale={scale} />,
    scale: 3.629,
    // A billboard drawn with `toneMapped={false}` is outside the room's
    // exposure entirely, so there is nothing here for a lift to do.
    turn: 4.4,
    offsetX: 0.105,
    offsetY: -0.09,
    narrow: { turn: 0, offsetX: 0, offsetY: 0 }
  },
  'mecha-station': {
    node: (scale) => <PosStation videoUrl="/videos/mecha-station-hero.mp4" scale={scale} />,
    scale: 5.069,
    lift: lift(0.6, 2.2),
    turn: -20,
    offsetX: 0.145,
    offsetY: -0.07,
    narrow: { turn: 31.1, offsetX: 0, offsetY: 0 }
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
    scale: 2.25,
    lift: lift(0.42, 3),
    turn: 38,
    offsetX: 0,
    offsetY: 0,
    narrow: { offsetX: 0, offsetY: 0 }
  },
  'block-builder': {
    node: (scale) => <BlockBuilder scale={scale} />,
    scale: 1.355,
    lift: lift(0.75, 2),
    turn: 131.1,
    offsetX: 0.27,
    offsetY: -0.1,
    narrow: { turn: 31.1, offsetX: 0, offsetY: 0 }
  },
  visa: {
    node: clay(<VisaKiosk3D accent="#1434cb" hovered={false} />, 0.62),
    scale: 2.219,
    lift: lift(0.7, 1.8),
    turn: 22.2,
    offsetX: 0,
    offsetY: 0,
    narrow: { turn: 22.2, offsetX: 0, offsetY: 0 }
  },
  '3d-printing': {
    node: clay(<Printer3D accent="#9c3524" hovered={false} />, 0.7),
    scale: 1.52,
    lift: lift(0.7, 1.8),
    turn: 28
  }
}

export type Exhibit = ReturnType<typeof exhibitFor>

/** Everything the gallery needs to stand one project in a case.
 *
 *  The narrow (mobile) pose travels alongside the desktop one rather than
 *  replacing it — `node` is expensive to rebuild (a glTF request, a video
 *  element) and must not be called twice just because the window crossed
 *  the breakpoint, so both poses are computed once here and `Row` in
 *  Gallery3D picks between the plain fields and the `narrow*` ones every
 *  frame instead. */
export function exhibitFor(projectId: string, ctx: NodeContext) {
  const spec = SPECS[projectId]
  if (!spec) return null
  const merged = { ...DEFAULTS, ...spec }
  const narrow = { ...merged, ...spec.narrow }
  return {
    node: spec.node(merged.scale, ctx),
    // Already baked into `node` above, and passed on anyway: the gallery's
    // tuning panel shows sizes as a multiplier on whatever a piece is set to
    // here, and cannot write a number worth pasting back without knowing what
    // it is multiplying.
    scale: merged.scale,
    turn: merged.turn,
    lift: merged.lift,
    offsetX: merged.offsetX,
    offsetY: merged.offsetY,
    narrowScale: narrow.scale,
    narrowTurn: narrow.turn,
    narrowOffsetX: narrow.offsetX,
    narrowOffsetY: narrow.offsetY,
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
  const spec = SPECS[projectId]
  const { scale, turn, offsetX, offsetY } = { ...DEFAULTS, ...spec }
  const narrow = { ...DEFAULTS, ...spec, ...spec?.narrow }
  return {
    scale,
    turn,
    offsetX,
    offsetY,
    narrowScale: narrow.scale,
    narrowTurn: narrow.turn,
    narrowOffsetX: narrow.offsetX,
    narrowOffsetY: narrow.offsetY
  }
}
