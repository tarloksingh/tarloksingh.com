import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Resize, useGLTF, View } from '@react-three/drei'
import { ACESFilmicToneMapping, PMREMGenerator, type Group, type Texture } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Piece, hasPiece } from './MechProduct'

/* ---- the subjects in the bank ----

   Every slot on the home screen holds the project's own subject, live: Mr.
   Takahashi's head, the Capsule C1 enclosure, Solomon's rider, the fish man's
   flipbook, and the eight pieces built out of primitives for the projects
   that have no model. Not a frame grab of one — the thing itself, turning.

   The first pass put a still out of each project's media in the slot, which
   was a picture of a screenshot of the work. The work *is* these objects; they
   were built for this site and every one of them was already being rendered
   somewhere else on it.

   **One canvas for all twelve.** Twelve `<Canvas>` elements is twelve WebGL
   contexts, twelve environment maps and twelve render loops, which is the
   exact mistake `MechCast.tsx` was written to undo — see the note at the top
   of that file. What is different here is that a slot is a box in a CSS grid
   rather than a place in a composition, so the subjects cannot be arranged in
   one world: they have to land where the grid put their boxes.

   drei's `View` does precisely that. One canvas stretched over the whole
   viewport, and each view scissored to the rectangle of its own DOM element —
   which *is* the bay in the slot. Three things fall out of it that are worth
   knowing:

   **`View` renders the element; you do not hand it one.** Outside a Canvas it
   is `HtmlView`, which makes its own `<div>`, passes its own ref down as
   `track`, and tunnels the scene to whichever Canvas is holding `View.Port`.
   A `track` prop given to it there is not a mistake it reports — it is spread
   onto the div as an unknown attribute and silently ignored, and every view
   then scissors to the box drei's own div happened to land in. Which, if you
   rendered them all in a row after the slots, is a row after the slots: every
   subject drawn a couple of hundred pixels below the one it belongs to, with
   nothing in the console. `track` is only honoured by the *inside*-a-Canvas
   variant. So `.mech-slot-shot` is a `<View>`, not a `<span>`.

   Each view portals into a **scene of its own**, so a light inside one reaches
   nothing outside it. `MechCast` needs three.js layers to keep five rigs from
   lighting each other; nothing here does, because there is nothing to
   separate — every subject is alone in its own scene.

   Every view shares **one camera**, the canvas's. `View` sets the aspect from
   its own rect before each pass, and every slot is the same shape, so the
   camera is set once and never fights itself. It also means framing is the
   subject's business: each is normalised to a unit cube by `Resize` and then
   scaled by its own entry below, and the camera simply looks at the origin. */

const DRACO_PATH = '/draco/'

/** Which projects have a GLB rather than a piece built out of primitives.
 *
 *  Solomon's rider is here rather than in `model.ts`'s `MODELS` because it is
 *  not a subject of the case study — the game is a sibling checkout and the
 *  file is copied in. `heroes.ts` had the same three, for the same reason. */
const GLBS: Record<string, string> = {
  'a-game': '/models/akira-rider.glb',
  'mr-takahashi': '/models/adam-face.glb',
  'capsule-c1': '/models/capsule-c1.glb'
}

/** How large a subject sits in its slot, and how it is turned to face out of
 *  it.
 *
 *  Every subject arrives normalised to a unit cube, which is what makes one
 *  number mean the same thing for a motorcycle and a business card — and also
 *  what makes a per-subject number necessary: a head fills a unit cube and a
 *  disc case is mostly flat, so the same scale reads as two very different
 *  sizes on screen. Turned so the readable face of each one is toward the
 *  camera; a disc case seen edge-on is a line. */
const FIT: Record<string, { scale: number; turn: number; tilt: number; lift: number }> = {
  'a-game': { scale: 1.15, turn: -0.6, tilt: 0.06, lift: 0 },
  'mr-takahashi': { scale: 1.05, turn: 0, tilt: 0.02, lift: 0 },
  'capsule-c1': { scale: 1.05, turn: 0.5, tilt: 0.1, lift: 0 },
  'mecha-station': { scale: 1, turn: 0.35, tilt: 0.05, lift: 0 },
  openup: { scale: 1.1, turn: 0.4, tilt: 0.04, lift: 0 },
  stitchfam: { scale: 1.15, turn: 0.18, tilt: 0.02, lift: 0 },
  'red-dead-redemption-2': { scale: 1, turn: 0.42, tilt: 0.06, lift: 0 },
  'grand-theft-auto-v': { scale: 1, turn: -0.42, tilt: 0.06, lift: 0 },
  'wyte-card': { scale: 1.1, turn: 0.5, tilt: 0.22, lift: 0 },
  'block-builder': { scale: 1, turn: 0.4, tilt: 0.1, lift: 0 },
  'slider-engine': { scale: 1.05, turn: 0, tilt: 0, lift: 0 }
}

const FALLBACK = { scale: 1, turn: 0.3, tilt: 0.05, lift: 0 }

/** Whether a project has anything at all to stand in its slot. Visa is the
 *  only one that does not, and its slot says "no signal" rather than being
 *  left out of the bank — see `SlotBox` in MechCluster.tsx. */
export const hasSubject = (id: string) => Boolean(GLBS[id]) || hasPiece(id)

/** A GLB, centred and normalised to one world unit.
 *
 *  `SkeletonUtils.clone`, not `Object3D.clone`: two of these are skinned, and
 *  a plain clone copies the meshes without rebinding them to the copied
 *  skeleton — the bones move and the skin stays behind. `MechCast.tsx` has the
 *  same note and the same reason. */
function Gltf({ src }: { src: string }) {
  const { scene } = useGLTF(src, DRACO_PATH)
  const copy = useMemo(() => cloneSkinned(scene), [scene])
  return (
    <Center>
      <Resize>
        <primitive object={copy} />
      </Resize>
    </Center>
  )
}

/* ---- the drift ----

   The subject is never quite still, and it leans toward you when its slot is
   the one selected. Both are the same two lines: a slow bob on two
   incommensurable rates so the loop never settles into a period you can see,
   and a turn that eases between a resting angle and a face-on one.

   `live` is the whole interaction the bank has past lighting up. A row of
   twelve objects all turning at once is a screensaver; one of them turning to
   look at you while the other eleven idle is a selection. */
function Drift({
  fit,
  live,
  children
}: {
  fit: (typeof FIT)[string]
  live: boolean
  children: React.ReactNode
}) {
  const group = useRef<Group>(null)
  const at = useRef({ turn: fit.turn, lift: 0, scale: fit.scale })

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return
    const t = state.clock.elapsedTime
    // Framerate-independent easing: the same approach at 30fps as at 120.
    const k = 1 - Math.pow(0.001, delta)

    // Selected, it squares up to the camera and comes forward a little.
    at.current.turn += ((live ? fit.turn * 0.25 : fit.turn) - at.current.turn) * k
    at.current.scale += ((live ? fit.scale * 1.12 : fit.scale) - at.current.scale) * k

    node.rotation.y = at.current.turn + Math.sin(t * 0.42 + fit.turn * 4) * (live ? 0.16 : 0.06)
    node.rotation.x = fit.tilt + Math.sin(t * 0.31 + fit.turn * 7) * 0.02
    node.position.y = fit.lift + Math.sin(t * 0.53 + fit.turn * 9) * 0.022
    node.scale.setScalar(at.current.scale)
  })

  return <group ref={group}>{children}</group>
}

/** The room, generated inside three rather than fetched, so the page still
 *  makes no third-party request for an HDRI.
 *
 *  Built once, at the canvas, and shared by every view. Each view portals into
 *  a scene of its own and `scene.environment` is a property of a scene, so the
 *  texture is one object and the assignment is per-scene. Building eleven of
 *  these would be eleven PMREM passes on the frame home mounts.
 *
 *  Held on a module rather than passed as a prop, and picked up from a frame
 *  rather than an effect: the views and the canvas are siblings in the tree,
 *  so there is no order in which one can hand the other anything, and the
 *  texture is built inside the canvas after both have mounted. One comparison
 *  a frame until it is there, then never again. */
const ROOM: { texture: Texture | null } = { texture: null }

function Room() {
  const scene = useThree((state) => state.scene)
  const set = useRef(false)
  useFrame(() => {
    if (set.current || !ROOM.texture) return
    scene.environment = ROOM.texture
    set.current = true
  })
  useEffect(
    () => () => {
      scene.environment = null
    },
    [scene]
  )
  return null
}

/** One slot's contents: its own lights, its own subject, its own scene.
 *
 *  The rig is the same for all twelve on purpose. `MechCast` gives every
 *  subject a rig of its own because it is a group portrait and the objects sit
 *  in one another's light; here each is alone in a box a hundred and forty
 *  units wide, and twelve rigs to tune would be twelve panels nobody would
 *  open. A key, a fill and the room, and the subjects that were authored dark
 *  come up on `env`. */
function Slot({ id, live }: { id: string; live: boolean }) {
  const fit = FIT[id] ?? FALLBACK
  const glb = GLBS[id]

  return (
    <>
      <Room />
      <ambientLight intensity={live ? 0.55 : 0.35} />
      <directionalLight position={[2.4, 3, 4]} intensity={live ? 2.6 : 1.5} />
      <directionalLight position={[-3, -0.6, 1.6]} intensity={live ? 1.1 : 0.6} color="#9fd8ff" />

      <Suspense fallback={null}>
        <Drift fit={fit} live={live}>
          {glb ? <Gltf src={glb} /> : <Piece project={id} />}
        </Drift>
      </Suspense>
    </>
  )
}

/** Built once, at the canvas. */
function Environment() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    ROOM.texture = target.texture
    return () => {
      ROOM.texture = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl])
  return null
}

/** A bay, and the subject drawn into it.
 *
 *  This *is* the bay — `View` renders the `<div class="mech-slot-shot">` and
 *  scissors the canvas to whatever rectangle the grid gives it. Its children
 *  are three.js and go to the canvas through drei's tunnel; nothing of them
 *  reaches the DOM. See the note at the top of this file for why the element
 *  cannot be handed in from outside.
 *
 *  `index` is the frame priority every view shares. It has to be above zero:
 *  r3f skips its own automatic render as soon as anything subscribes to the
 *  frame at a priority, and an automatic render here would clear the canvas
 *  after the views had drawn into it. */
export function SlotView({ id, live }: { id: string; live: boolean }) {
  return (
    <View className="mech-slot-shot" index={1}>
      <Slot id={id} live={live} />
    </View>
  )
}

/** The one canvas the whole bank draws into. Rendered once, anywhere — the
 *  views find it through the tunnel rather than through the tree. */
export default function MechSlots() {
  return (
    <Canvas
      className="mech-bank-gl"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.1], fov: 34 }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1
      }}
    >
      <Environment />
      <View.Port />
    </Canvas>
  )
}
