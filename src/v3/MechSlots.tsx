import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Resize, useGLTF, View } from '@react-three/drei'
import { ACESFilmicToneMapping, PMREMGenerator, type Group, type Texture } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Piece } from './MechProduct'
/* The paths only — the map itself lives in a module that imports nothing, so
   that `bank.ts` can ask which projects have a subject without pulling this
   file, and three.js behind it, into the eager chunk. See `subjects.ts`. */
import { GLBS } from './subjects'
import { useNarrow } from './narrow'

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

   The subject is never quite still: it turns, all the time, at the same rate
   whether or not the pointer is anywhere near its slot. Selection used to
   also nudge the turn toward face-on, which read as the picture "spinning"
   the moment you hovered it and sitting dead still the rest of the time — the
   opposite of what a bank of live subjects should look like. Selected now
   only grows the subject a little; the turn itself never answers `live`.

   Stepped to twelve updates a second rather than the display's own refresh
   rate — the render still runs at whatever the monitor does, but the pose is
   only recomputed on a fixed tick, so it holds between ticks. That is a
   deliberately undersampled motion rather than smooth interpolation: the
   difference between an object turning on a monitor and one turning on a
   panel meter drawn a dozen times a second. */
const STEP_HZ = 12
const STEP = 1 / STEP_HZ

/** Radians a subject turns per second, constant and unrelated to selection —
 *  a full turn every fourteen seconds or so, slow enough to read as a subject
 *  on a turntable rather than a spinner. */
const SPIN_RATE = 0.45

function Drift({
  fit,
  live,
  show,
  children
}: {
  fit: (typeof FIT)[string]
  live: boolean
  /** Whether the deal has reached this slot, going either way. It is a target
   *  rather than a mount, so the subject grows into the bay on the way in and
   *  shrinks back out of it on the way out — the scene stays mounted for the
   *  length of the exit, because a thing that vanishes when its flag flips has
   *  no exit, it has a cut. */
  show: boolean
  children: React.ReactNode
}) {
  const group = useRef<Group>(null)
  /* Scale starts at nothing, not at `fit.scale`. The bank deals its subjects
     in one after another down the rail (see `dealt` in MechCluster.tsx) and a
     subject that is simply *there* the frame its slot is mounted arrives with
     a hard cut, because a WebGL view has no opacity for the slot's own CSS
     entrance to carry it on. It grows into the bay instead, on the same eased
     chase the selection uses — one mechanism, two jobs. */
  const at = useRef({ spin: 0, scale: 0 })
  const nextTick = useRef(0)

  useFrame((state) => {
    const node = group.current
    if (!node) return
    const t = state.clock.elapsedTime
    if (t < nextTick.current) return
    // However late this frame landed past the tick, the next one is still a
    // fixed `STEP` later — so the rate holds even if a frame is dropped,
    // rather than drifting slower than 12Hz.
    nextTick.current += STEP

    // Framerate-independent easing, evaluated once a tick rather than once a
    // frame — the same shape at 12Hz as it was at 60.
    const k = 1 - Math.pow(0.001, STEP)

    // The turn accumulates at a fixed rate, always — selection only grows
    // the subject and brings it forward a little.
    at.current.spin += SPIN_RATE * STEP
    at.current.scale += ((show ? (live ? fit.scale * 1.12 : fit.scale) : 0) - at.current.scale) * k

    node.rotation.y = fit.turn + at.current.spin + Math.sin(t * 0.42 + fit.turn * 4) * 0.06
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
function Slot({ id, live, show }: { id: string; live: boolean; show: boolean }) {
  const fit = FIT[id] ?? FALLBACK
  const glb = GLBS[id]

  return (
    <>
      <Room />
      <ambientLight intensity={live ? 0.55 : 0.46} />
      <directionalLight position={[2.4, 3, 4]} intensity={live ? 2.6 : 1.9} />
      <directionalLight position={[-3, -0.6, 1.6]} intensity={live ? 1.1 : 0.75} color="#9fd8ff" />

      <Suspense fallback={null}>
        <Drift fit={fit} live={live} show={show}>
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
/** `arrive` is this slot's turn in the deal, and it goes both ways — the bank
 *  fills from the top of the rail down and empties from the bottom up.
 *
 *  The bay itself is drawn either way: it is the `<View>`'s own element and the
 *  slot's CSS entrance owns it. What waits is the scene inside. Before this
 *  slot's turn there is nothing in the view at all — a `<View>` with no
 *  children scissors to its rect and draws nothing — so twelve GLBs and twelve
 *  pieces are not all being cloned, lit and rendered on the frame home arrives.
 *
 *  **Once mounted it stays mounted.** Unmounting on the way out would be a cut,
 *  and the rail's own fade cannot cover it: the bank's canvas is a fixed
 *  element scissored to the bays, so CSS opacity on the rail reaches the boxes
 *  and never the pictures in them. The exit has to be something the *scene*
 *  does, which is `show` — the subject shrinks back out of its bay the way it
 *  grew into it. */
export function SlotView({ id, live, arrive }: { id: string; live: boolean; arrive: boolean }) {
  const [mounted, setMounted] = useState(arrive)
  const box = useRef<HTMLElement>(null)
  const near = useNear(box, useNarrow())

  useEffect(() => {
    if (arrive) setMounted(true)
  }, [arrive])

  return (
    <View ref={box} className="mech-slot-shot" index={1} visible={near}>
      {mounted && <Slot id={id} live={live} show={arrive} />}
    </View>
  )
}

/** Whether this bay is anywhere near the window — narrow only, and it is
 *  culling rather than an effect.
 *
 *  `View` has an offscreen test of its own and it is the right one *when the
 *  canvas is the viewport*: a bay whose rect falls outside the canvas's own
 *  box is skipped. On the narrow layout the canvas is the bank instead (see
 *  `.mech-bank-gl` in MechCluster.css and the note below), and the bank is
 *  six rows tall — so nothing is ever outside it and all twelve subjects
 *  render every frame, including the eight nobody can see. This puts the test
 *  back, against the window, where it belongs.
 *
 *  A whole bay's height of margin either side, so a subject is already drawn
 *  by the time its box is on screen. `View` clears the region once when this
 *  goes false and stops rendering it; the scene stays mounted, so coming back
 *  is a render and not a rebuild. */
const useNear = (box: RefObject<HTMLElement | null>, narrow: boolean) => {
  const [near, setNear] = useState(true)

  useEffect(() => {
    if (!narrow) {
      setNear(true)
      return
    }
    const node = box.current
    if (!node) return
    const watch = new IntersectionObserver((entries) => setNear(entries[entries.length - 1].isIntersecting), {
      rootMargin: '100% 0px'
    })
    watch.observe(node)
    return () => watch.disconnect()
  }, [box, narrow])

  return near
}

/* ---- scrolling the bank on a phone ----

   Twelve live subjects, one canvas, and every bay's scissor box is worked out
   from two rectangles: the tracked `<View>` element's, read fresh once a
   frame inside `useFrame`, and the *canvas's own*, which r3f measures and
   drei subtracts. Both are viewport-relative. So the scissor is a
   **difference between two viewport positions**, and everything about how
   this behaves follows from where those two numbers come from.

   On the wide layout the canvas is the viewport — `position: fixed`, inset 0
   — so its own rect is a constant, nothing on the page scrolls, and the
   arithmetic is exact by construction.

   On a phone the page scrolls under the bank, and that broke it twice over.

   **First: a fixed canvas cannot be scrolled.** A touch scroll on iOS runs on
   the compositor thread. The boxes move at the display's own rate however
   busy the main thread is, while the rect this canvas reads is only as fresh
   as the last `requestAnimationFrame` the main thread got to — and during a
   fling, WebKit *throttles* the main thread's rAF callbacks in favour of
   keeping the compositor smooth. The pictures lag their own borders, and no
   amount of cutting this canvas's per-frame cost closes the gap, because the
   bottleneck is how often the main thread runs at all rather than how long it
   takes once it does. Two attempts went past before the shape of that was
   clear: `dpr` and antialiasing came down first (still down, below, and worth
   keeping); then the canvas was hidden outright the moment a scroll started
   and faded back once the page settled, which traded a picture that swims for
   a picture that is not there, and reads exactly as badly as it sounds.

   **The fix is that the canvas scrolls too.** Narrow, `.mech-bank-gl` is
   `position: absolute` over `.mech-bank` rather than fixed over the window,
   so it is in the same scrolling flow as the bays it paints into. Now the
   compositor moves the drawn pixels and the borders together, for free,
   between main-thread frames — the main thread can be throttled to nothing
   and the subjects stay glued to their boxes, because the *relative*
   geometry never changed.

   **Which leaves one thing to fix: `canvasSize` has to be as fresh as the
   bay's rect.** They are subtracted from each other, so they only cancel if
   they were read in the same moment. r3f measures its container through
   `react-use-measure` with `scroll: true` and a 50ms debounce — right for a
   canvas that only moves when the layout does, and useless for one that moves
   with every scroll event, because a debounce that keeps being retriggered
   never fires at all during a continuous fling. So `Track` below re-reads the
   canvas's rect at the top of every frame, before any view has drawn.

   It writes **into** `state.size` rather than through `set()`, and that is
   deliberate: drei's `Container` reads `canvasSize.top` off the same object
   at frame time, so a mutation is picked up with no store update, no
   re-render of twelve views, and no chance of a render loop — which is a real
   risk for anything setting state once a frame. What it costs is that r3f
   itself does not learn the canvas moved; nothing in r3f cares, because
   `setSize` keys off width and height and neither of those changed. */
function Track({ on }: { on: boolean }) {
  const get = useThree((state) => state.get)

  /* Priority 0. It has to run before the views (which are all `index={1}`),
     and a zero does not count toward r3f's manual-render flag — only a
     priority above zero switches off the automatic render, and switching that
     back on here would clear the canvas out from under every view. */
  useFrame(() => {
    if (!on) return
    const state = get()
    const box = state.gl.domElement.getBoundingClientRect()
    const size = state.size as { top: number; left: number }
    if (size.top !== box.top) size.top = box.top
    if (size.left !== box.left) size.left = box.left
  }, 0)

  return null
}

/** @param up The cover being off — the same flag the bank's own deal runs on.
 *  See `frameloop` below, which is the whole reason this is a prop. */
export default function MechSlots({ up }: { up: boolean }) {
  const narrow = useNarrow()

  return (
    <Canvas
      className="mech-bank-gl"
      /* **Nothing is rendered until the bank is up.** This canvas covers the
         viewport and draws eleven views into it, and it used to do that from
         the frame it mounted — which is the middle of the boot, when the bank
         is at `opacity: 0` behind the cover and not one of those views is on
         screen. So the most expensive loop on the page ran flat out for a
         second and a half to produce nothing, in exact competition with the
         one sequence here whose whole job is to be smooth.

         On a phone it was worse than that, because `Track` below is inside
         this loop and reads `getBoundingClientRect()` off the canvas every
         frame — a forced layout flush, per frame, against a document that at
         that moment is carrying five hundred animating ripple cells. That is
         the boot's frame drop on a handset, and it was being paid for a bank
         nobody could see.

         There is no race with the bank appearing: the rail's own entrance is
         a 700ms fade starting 380ms after this flips, and the slots do not
         begin dealing until 620ms, so the first rendered frame lands long
         before anything is transparent enough to show it missing. */
      frameloop={up ? 'always' : 'never'}
      /* Down on a phone, and it stays down. This is not what fixed the
         scrolling — see above — but twelve subjects on a handset is still
         twelve subjects, and a bank of hundred-and-fifty-unit bays behind a
         scan-line veil is not where anyone is counting samples. */
      dpr={narrow ? 1 : [1, 1.75]}
      gl={{ antialias: !narrow, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.1], fov: 34 }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1
      }}
    >
      <Environment />
      <Track on={narrow} />
      <View.Port />
    </Canvas>
  )
}
