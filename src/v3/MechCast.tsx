import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Float, Resize, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { useThree as useThreeState } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import VideoFrame from '../three/VideoFrame'
import { SpriteFlipbook } from '../three/CapsuleStage'
import { CAST, FISH_MAN_FRAMES, type Hero } from './heroes'
import { aim } from './subject'
import { FaceScene } from './MechModel'
import { MODEL_DEFAULTS, type ModelTuning } from './modelTuning'
import { CAST_STUDIO, lightFor, slotFor, type CastLight, type CastSlot, type CastStudio } from './castTuning'
import type { DirectionalLight, Group, Material, Mesh, PerspectiveCamera } from 'three'

/* The home screen's cast: every subject on one stage, at once, arranged.

   **This used to be five stages.** `HeroStage` — what this file grew out of —
   drew one subject at a time and the home screen mounted five copies of it
   side by side, plus Mr. Takahashi's own context over the top: six WebGL
   contexts, six environment maps, six cameras, each one centring its occupant
   in a box of its own. That is why the line-up never looked composed. Nothing
   anywhere described the group, because there was no group — there were six
   separate photographs hung in a row, and the only number any of them had
   for "where does this sit" was a lift and a turn inside its own cell.

   So: one context, one camera, and every subject placed in its world by a
   slot on a panel — three axes, a scale, two rotations. See `castTuning.ts`.
   Arranging the home page is now a thing that can be done by dragging, which
   was the whole complaint.

   **Mr. Takahashi is still not in here**, and for the reason he never was: he
   is the one subject on this site with a lighting rig built around him
   (`modelTuning.ts`, and v2's gallery before it), and lighting him a second
   way here would be a second face. `Mech.tsx` lays `MechModel` over this
   canvas as its own layer and places it from the same slot — see the note on
   `CastSlot` for which two of its six numbers reach him.

   Everything is mounted at full opacity. The old roster dimmed whichever
   subjects were not selected, which made a cast of five read as one subject
   and four rejected candidates. */

const fovForFocalLength = (mm: number) => (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI

const distanceFor = (focalLength: number, fill: number) =>
  1 / fill / (2 * Math.tan((fovForFocalLength(focalLength) * Math.PI) / 360))

/** The room, generated inside three rather than fetched so the page still
 *  makes no third-party request for an HDRI.
 *
 *  Its scene-level intensity is pinned at 1 and is not on the panel. It used
 *  to be a slider, which made it the one light on this stage nobody could
 *  aim: a bright studio box lifting every subject at once, exactly the
 *  "generic lighting effect in the way". How hard any given subject picks the
 *  room up is `env` on its own `CastLight`, and setting that to 0 removes the
 *  room from that subject entirely.
 *
 *  Static. It used to breathe with the pointer — rising off hover — but that
 *  is a renderer-level number, one tone map for the whole canvas, so
 *  spotlighting a subject that way spotlit all five at once. The pointer's
 *  answer is each subject's own lights now — `dim` on `CastStudio`, applied
 *  in `Placed` — and this stays put. */
function Studio({ exposure }: { exposure: number }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = target.texture
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  useEffect(() => {
    scene.environmentIntensity = 1
  }, [scene])

  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}

/** Moved rather than remounted: a `camera` prop is read once, so dragging the
 *  lens would otherwise do nothing until a reload.
 *
 *  Unlike the single-subject stage this replaces, `fill` here is the studio's
 *  alone — it sets how much of the frame one world unit is worth, and every
 *  subject's own size is its slot's `scale`. Folding a subject's size into the
 *  camera distance is exactly what stopped the old roster from being able to
 *  describe a group: moving one subject's size moved the lens, and therefore
 *  everything else. */
function Lens({
  focalLength,
  fill,
  dolly,
  camY,
  tilt
}: {
  focalLength: number
  fill: number
  dolly: number
  camY: number
  tilt: number
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)

  /* `fill` is a fraction of the frame's *height*, so a stage that is wider
     than it is tall shows more world sideways and one that is taller shows
     less. Capped against the frame's own aspect so a cast spread across the
     x axis is not run off the sides of a narrow window. */
  const aspect = size.width / Math.max(1, size.height)
  const held = Math.min(fill, aspect * 0.92)

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    const z = distanceFor(focalLength, held) + dolly
    camera.position.set(0, camY, z)
    /* Set outright rather than via `lookAt`, so tilt is a number that can be
       dragged rather than a point that has to be worked backwards from. */
    camera.rotation.set(MathUtils.degToRad(tilt), 0, 0)
    /* Wrapped tight around the cast rather than 5% to 800% of the camera
       distance. Depth buffer precision is spent almost entirely near the near
       plane, so a near of `z * 0.05` on a subject sitting at `z` leaves
       almost no resolution where the subject actually is — which is what the
       flickering on Capsule C1's shell was: two coincident faces of a moulded
       part swapping which one is in front, frame to frame. The cast lives
       within a couple of units of the origin, and `CAST_DEPTH` is the room
       hover gives it.
 
       Floored, because a near plane at or below zero is not a projection. */
    camera.near = Math.max(0.05, z - CAST_DEPTH)
    camera.far = z + CAST_DEPTH
    camera.updateProjectionMatrix()
  }, [camera, focalLength, held, dolly, camY, tilt])

  return null
}

/** How far either side of the origin the cast is allowed to sit — the depth
 *  the near and far planes are wrapped around, and the budget hover has to
 *  move a subject in. */
const CAST_DEPTH = 4

/* ---- coming and going ----

   The cast fades in when the page arrives and fades out when a project is
   opened. It used to *scale* — each subject growing from nothing and
   shrinking back — which was chosen to avoid making every material
   transparent, and which read as the line-up being inflated and deflated
   rather than as it arriving and leaving.

   So it is opacity, and the cost of that is real but small: every material on
   a subject is switched to `transparent` while it is on the way in or out,
   and switched back to opaque once it settles, so the sorting problems a
   transparent material brings only exist during the fade and never while you
   are looking at a still stage.

   Staggered on the way in, and not done here at all on the way out. Leaving
   is one CSS opacity on the canvas — see `Placed`'s frame loop. A fade and
   nothing else: the lift a subject used to arrive on read, in reverse, as the
   whole line-up sinking through the floor on the way to a project. */
const IN_STAGGER = 0.09

/** Hover: the one being looked at comes forward, everything else drops back.
 *  Small numbers — this is parallax, not a carousel. */
const FORWARD = 0.55
const BACK = 0.35

/** Leans a subject toward the pointer, from whatever it has been turned to.
 *  The whole cast gets it, so the stage reads as one place with things
 *  standing in it rather than as a row of separate presentations. */
function Lean({
  degrees,
  turn,
  tilt,
  children
}: {
  degrees: number
  turn: number
  tilt: number
  children: React.ReactNode
}) {
  const ref = useRef<Group>(null)
  const to = useRef({ x: 0, y: 0 })
  const at = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      to.current.x = (event.clientX / window.innerWidth) * 2 - 1
      to.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    // And a tap: on a phone a press is the only way anyone says "here".
    window.addEventListener('pointerdown', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [])

  useFrame((_, delta) => {
    const group = ref.current
    if (!group) return
    const k = 1 - Math.pow(0.004, delta)
    at.current.x = MathUtils.lerp(at.current.x, to.current.x, k)
    at.current.y = MathUtils.lerp(at.current.y, to.current.y, k)
    const limit = MathUtils.degToRad(degrees)
    group.rotation.y = MathUtils.degToRad(turn) + at.current.x * limit
    group.rotation.x = MathUtils.degToRad(tilt) - at.current.y * limit * 0.45
  })

  return <group ref={ref}>{children}</group>
}

/** Where the Draco decoder lives. Capsule C1 is Draco-compressed, and
 *  pointing at our own copy rather than letting drei fall back to Google's
 *  CDN keeps the page free of third-party requests — same as
 *  `CapsuleStage.tsx`, which is where that copy came from. Harmless on the
 *  exports that are not compressed. */
const DRACO_PATH = '/draco/'

/** A GLB, centred and normalised to one world unit. Generic: the file is a
 *  prop and nothing here knows what is in it. Normalising is what makes a
 *  slot's `scale` mean the same thing for a motorcycle and a business card. */
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

/* ---- the rider, at speed ----

   This export carries no animation at all — `gltf.animations` is an empty
   array, so there is no run cycle to play and no lean-into-a-corner to
   borrow. What the node graph does carry is three separate wheel nodes and a
   rigged body, and that is enough for the only two things "at max speed"
   actually looks like from outside: the wheels are a blur, and the whole
   machine is buzzing.

   Both are built here rather than imported from the game — that code lives in
   a different app, and this is a dozen lines of it. */
function Rider({ src, rpm, shake }: { src: string; rpm: number; shake: number }) {
  const { scene } = useGLTF(src, DRACO_PATH)
  /* `SkeletonUtils.clone`, not `Object3D.clone`. The rider is a skinned mesh
     under a `CC_Base_*` rig, and a plain clone copies the meshes without
     rebinding them to the copied skeleton — the bones move and the skin does
     not follow, which on screen is a pair of legs hanging in the air a foot
     above the bike. */
  const copy = useMemo(() => cloneSkinned(scene), [scene])
  const body = useRef<Group>(null)

  /* The two wheel meshes, and the axis each one turns about.

     By name, because the export names them — but only the leaves. `wheel` is
     a *group* holding `wheel_wheel_0` and `wheel_wheel_0.001`, and the second
     of those sits 25 local units from the first: turning the group orbits the
     rear wheel around the front one, which on screen is a wheel leaving the
     bike and sailing off the top of the frame.

     The axis is measured rather than assumed. A wheel is a disc, so the axle
     is whichever of its own three dimensions is the shortest — which is true
     of any wheel in any export, and does not depend on knowing that this file
     was authored Z-up and converted. */
  const wheels = useMemo(() => {
    const found: Array<{ node: Mesh; axis: 'x' | 'y' | 'z' }> = []
    const size = new Vector3()
    copy.traverse((node) => {
      const mesh = node as Mesh
      if (!mesh.isMesh || !/^wheel_wheel_/i.test(mesh.name)) return
      mesh.geometry.computeBoundingBox()
      mesh.geometry.boundingBox?.getSize(size)
      const axis = size.x <= size.y && size.x <= size.z ? 'x' : size.y <= size.z ? 'y' : 'z'
      found.push({ node: mesh, axis })
    })
    return found
  }, [copy])

  useFrame((state, delta) => {
    const step = (rpm / 60) * Math.PI * 2 * delta
    for (const wheel of wheels) wheel.node.rotation[wheel.axis] += step
    const group = body.current
    if (!group) return
    /* High frequency and low amplitude — an engine, not a wobble. Two
       incommensurable rates so the shake never settles into a visible
       period. */
    const t = state.clock.elapsedTime
    group.position.x = Math.sin(t * 71) * shake
    group.position.y = Math.sin(t * 53.7) * shake
  })

  return (
    <group ref={body}>
      <Center>
        <Resize>
          <primitive object={copy} />
        </Resize>
      </Center>
    </group>
  )
}

function Subject({ hero, studio }: { hero: Hero; studio: CastStudio }) {
  if (hero.kind === 'gltf' && hero.src) {
    return hero.id === 'rider' ? (
      <Rider src={hero.src} rpm={studio.wheelRpm} shake={studio.shake} />
    ) : (
      <Gltf src={hero.src} />
    )
  }
  if (hero.kind === 'video' && hero.src) {
    return (
      <Center>
        <Resize>
          <VideoFrame videoUrl={hero.src} scale={1} />
        </Resize>
      </Center>
    )
  }
  if (hero.kind === 'sprite') {
    return (
      <Center>
        <Resize>
          <SpriteFlipbook frames={FISH_MAN_FRAMES} fps={12} scale={1} />
        </Resize>
      </Center>
    )
  }
  return null
}

/* ---- one subject's place on the stage ----

   Layers are the whole reason this is a component. A `directionalLight` is
   infinite: it lights every object in the scene, so five subjects sharing one
   scene cannot have five rigs — turning Capsule C1's key up would light
   Solomon with it, which is exactly the complaint. three tests
   `light.layers` against `object.layers` before illuminating, so putting a
   subject and its two lights on a layer of their own makes the rig genuinely
   private. The camera enables every layer, so it still sees all of them.

   The layer has to be re-applied when the subject actually arrives — a GLB
   resolves out of Suspense long after this mounts, and a mesh that missed the
   assignment is on layer 0, which no light is on any more, which is a subject
   rendered black. Cheaper to notice than to subscribe to: the node count only
   changes when something loads. */
function Placed({
  heroId,
  slot,
  light,
  layer,
  index,
  shown,
  focus,
  lift,
  spread,
  dim,
  openable,
  onHover,
  onPick,
  children
}: {
  /** Which subject this is holding — the key its projected position is
   *  published under. See `aim.spots` in `subject.ts`. */
  heroId: string
  slot: CastSlot
  light: CastLight
  layer: number
  index: number
  /** Whether the cast is on the stage at all. False retracts it. */
  shown: boolean
  /** `true` this one, `false` another one, `null` nothing. */
  focus: boolean | null
  /** Added to this subject's own Y, and multiplied into its X — the studio's
   *  handles for moving the whole line-up without re-placing any of it. */
  lift: number
  spread: number
  /** Multiplies this subject's own two lights while `focus` is not `true`.
   *  The hovered subject is always its full, authored brightness — this
   *  never touches it. See `dim` on `CastStudio`. */
  dim: number
  /** Whether pressing it goes anywhere. A subject that opened nothing would
   *  be a tag promising a page that is not there. */
  openable: boolean
  onHover: (over: boolean) => void
  onPick: () => void
  children: React.ReactNode
}) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const key = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const camera = useThreeState((state) => state.camera)
  const at = useMemo(() => new Vector3(), [])
  /** Every material under this subject, with whether it was authored opaque —
   *  so it can be handed back exactly what it had once the fade is over. */
  const coats = useMemo(() => new Map<Material, boolean>(), [])
  const grow = useRef(0)
  const depth = useRef(0)
  const since = useRef(0)
  const nodes = useRef(-1)
  const glow = useRef(dim)

  // Restart the stagger clock whenever the cast is asked to come or go.
  useEffect(() => {
    since.current = 0
  }, [shown])

  useFrame((_, delta) => {
    const group = outer.current
    const body = inner.current
    if (!group || !body) return

    /* Whatever has arrived under here belongs on this subject's layer,
       lights included — they are children of `outer` so they travel with it. */
    let n = 0
    group.traverse(() => n++)
    if (n !== nodes.current) {
      nodes.current = n
      group.traverse((node) => {
        node.layers.set(layer)
        const mesh = node as Mesh
        if (!mesh.isMesh) return
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (material && !coats.has(material)) coats.set(material, !material.transparent)
        }
      })
    }

    since.current += delta
    /* **Arriving only.** Leaving is the canvas's own fade — one CSS opacity on
       `.mech-model-layer`, which is the same fade a project's subject leaves
       on. Fading five subjects out material by material was doing the same
       job twice and doing it worse: a picture already composited cannot sort
       wrong, and five sets of half-transparent materials can. Nothing has to
       be restored afterwards either, because the cast is unmounted at the end
       of the exit and mounts again at `grow` zero when home comes back. */
    if (shown && since.current >= index * IN_STAGGER) {
      grow.current = MathUtils.lerp(grow.current, 1, 1 - Math.pow(0.0015, delta))
    }
    const eased = grow.current

    /* The fade in. Written to every material under the subject, and
       `transparent` switched back off once it is settled — a transparent
       material is sorted differently and it is not worth paying for that on a
       stage that is just sitting there. */
    const solid = eased > 0.995
    for (const [material, opaque] of coats) {
      material.opacity = eased
      material.transparent = solid ? !opaque : true
      /* Depth is written for the whole of the fade, not only its second half.
         Dropping it below half opacity is what put the inside of Mr.
         Takahashi's head in front of his face for the first beat of every
         arrival — with nothing in the depth buffer, the back of a head drawn
         after the front of it is not rejected, and a head is the one subject
         here you can see into. Restored to what the material was authored
         with rather than to `true`, so a piece built transparent stays it. */
      material.depthWrite = opaque
    }

    /* Frozen on the way out. Opening a project means the pointer is sitting on
       an index box, so the subject that box names was being pulled forward at
       the exact moment the stage was asked to leave — a fade with a lunge in
       the middle of it. */
    const forward = !shown
      ? depth.current
      : focus === true
        ? FORWARD
        : focus === false
          ? -BACK
          : 0
    depth.current = MathUtils.lerp(depth.current, forward, 1 - Math.pow(0.002, delta))

    /* The spotlight. Full brightness — exactly what `CastLight` authored — is
       `focus === true` and nothing else; `false` and `null` both mean some
       other subject has the pointer or nothing does, and either way this one
       reads as barely there. Damped the same way `depth` is, so a subject
       waking up under the pointer is a lift, not a switch thrown. */
    const spotlight = focus === true ? 1 : dim
    glow.current = MathUtils.lerp(glow.current, spotlight, 1 - Math.pow(0.001, delta))
    if (key.current) key.current.intensity = light.keyIntensity * glow.current
    if (fill.current) fill.current.intensity = light.fillIntensity * glow.current

    /* No lift. A subject arriving used to rise `RISE` under the fade, which
       on the way *back* out read as the line-up sinking through the floor —
       and Mr. Takahashi, framed largest and lowest, sank furthest. What was
       asked for is a fade, so this is only a fade. */
    group.position.set(slot.x * spread, slot.y + lift, slot.z + depth.current)
    body.scale.setScalar(slot.scale)
    body.visible = eased > 0.004

    /* Where this subject has ended up on screen, for the leader that names it
       and for the editor that places where that leader points. Published to a
       module rather than lifted into state because it changes every frame and
       both things reading it draw themselves in their own loops.

       Every subject, not only the one being pointed at: the tag editor draws
       all five at once. `aim.x`/`aim.y` stay the focused one's, because the
       tag itself only ever has one subject to name. */
    group.getWorldPosition(at)
    at.project(camera)
    const spot = (aim.spots[heroId] ??= { x: 0.5, y: 0.5 })
    spot.x = at.x * 0.5 + 0.5
    spot.y = -at.y * 0.5 + 0.5
    if (focus === true) {
      aim.x = spot.x
      aim.y = spot.y
    }
  })

  return (
    <group
      ref={outer}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHover(true)
      }}
      onPointerOut={() => onHover(false)}
      onClick={(event) => {
        if (!openable) return
        event.stopPropagation()
        onPick()
      }}
    >
      {/* Outside the scaled group, so a subject at scale 0.5 is not lit from
          half the distance — and so the lights survive the entrance, which
          scales `inner` from nothing. The face's own rig is a `FaceScene`
          with no lights of its own baked in — see `MechModel.tsx` — so these
          two are his real rig here, not a stand-in for one; `CAST_LIGHTS.
          takahashi`'s unusually large numbers are what a face actually wants.
          Refs rather than a static `intensity` prop because the spotlight
          below writes it every frame — the JSX value only ever paints the
          very first frame, before that loop has run once. */}
      <directionalLight
        ref={key}
        position={[light.keyX, light.keyY, light.keyZ]}
        intensity={light.keyIntensity}
      />
      <directionalLight
        ref={fill}
        position={[light.fillX, light.fillY, light.fillZ]}
        intensity={light.fillIntensity}
      />
      <group ref={inner}>{children}</group>

    </group>
  )
}

/** How hard this subject alone picks up the shared room. `scene.environment`
 *  is one texture for the whole scene and layers do not touch it, so the only
 *  per-subject handle is each material's own `envMapIntensity`. */
function Env({ amount, children }: { amount: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const nodes = useRef(-1)
  const last = useRef(-1)

  useFrame(() => {
    const group = ref.current
    if (!group) return
    let n = 0
    group.traverse(() => n++)
    if (n === nodes.current && amount === last.current) return
    nodes.current = n
    last.current = amount
    group.traverse((node) => {
      const mesh = node as Mesh
      if (!mesh.isMesh) return
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (material && 'envMapIntensity' in material) {
          ;(material as { envMapIntensity: number }).envMapIntensity = amount
        }
      }
    })
  })

  return <group ref={ref}>{children}</group>
}

/** Every layer the cast uses, switched on for the camera *and the raycaster*.
 *
 *  Both, and the second one is the trap. Per-subject lighting works by moving
 *  each subject off layer 0 onto one of its own, and a `Raycaster` tests
 *  `raycaster.layers` against `object.layers` exactly the way a light does —
 *  r3f's has only layer 0 enabled, so the moment the lighting started working
 *  nothing on the stage could be hovered or clicked any more. The two
 *  features look unrelated and are the same line of three.js. */
function SeeEverything() {
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)
  useEffect(() => {
    camera.layers.enableAll()
    raycaster.layers.enableAll()
  }, [camera, raycaster])
  return null
}

interface Props {
  studio?: CastStudio
  /** Every subject's placement, keyed by hero id. Whatever is missing falls
   *  back to what is in source — so a panel that has not been opened and a
   *  panel that has been reset draw the same stage. */
  slots?: Record<string, CastSlot>
  /** Every subject's own rig, keyed the same way. */
  lights?: Record<string, CastLight>
  /** Mr. Takahashi's rig — his eyes, his blink, his materials. Seeded from
   *  `MODEL_DEFAULTS`, which is how he is lit on his own project screen. */
  faceTuning?: ModelTuning
  /** Which project is being looked at, if any — the hero whose `project`
   *  matches comes forward and the rest drop back. Hovering a subject
   *  directly does the same thing and wins while it lasts. */
  focusHeroId?: string | null
  /** On the stage, or leaving it. False retracts the cast, staggered. */
  shown?: boolean
  /** Told whenever the pointer takes or leaves a subject, so the readout in
   *  the side column can follow the stage as well as the index. */
  onHoverHero?: (heroId: string | null) => void
  /** Pressing a subject opens its project. The stage is the other half of the
   *  index — pointing at a box lights its subject, so pressing the subject
   *  has to be the same gesture arriving from the other end. */
  onPick?: (projectId: string) => void
  /** Off entirely while the page is not looking at the stage. A cast of five
   *  idling behind a project screen is five subjects' worth of frame loop
   *  spent on something nobody can see. */
  live?: boolean
}

export default function MechCast({
  studio = CAST_STUDIO,
  slots,
  lights,
  focusHeroId,
  shown = true,
  live = true,
  faceTuning = MODEL_DEFAULTS,
  onHoverHero,
  onPick
}: Props) {
  /* Built from the studio actually in force, not from the shipped constant.
     A `camera` prop is read once at mount and `Lens` corrects it in an
     effect — which is a frame later, and that frame is painted. With the
     constant here, the first frame of the home screen was drawn through the
     project screen's lens: everything at the wrong distance, for one frame,
     which is what the flash on the way back to home was. */
  const distance = distanceFor(studio.focalLength, studio.fill)

  /** A subject the pointer is actually over. Beats whatever the index says,
   *  for as long as it lasts — the pointer is the more specific answer. */
  const [over, setOver] = useState<string | null>(null)
  const focused = over ?? focusHeroId ?? null

  const take = (heroId: string, on: boolean) => {
    setOver((was) => {
      const next = on ? heroId : was === heroId ? null : was
      if (next !== was) onHoverHero?.(next)
      return next
    })
  }

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={live ? 'always' : 'never'}
      camera={{ fov: fovForFocalLength(studio.focalLength), position: [0, 0, distance] }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        // Also frame one: `Studio` sets this in an effect, and the default of
        // 1 against an exposure of 0.6 is the "white" half of that flash.
        toneMappingExposure: studio.exposure,
        outputColorSpace: SRGBColorSpace
      }}
      style={{ background: 'transparent' }}
    >
      <SeeEverything />
      <Lens
        focalLength={studio.focalLength}
        fill={studio.fill}
        dolly={studio.dolly}
        camY={studio.camY}
        tilt={studio.tilt}
      />
      <Studio exposure={studio.exposure} />

      {CAST.map((hero, index) => {
        const slot = slots?.[hero.id] ?? slotFor(hero.id)
        const light = lights?.[hero.id] ?? lightFor(hero.id)
        return (
          <Placed
            key={hero.id}
            heroId={hero.id}
            slot={slot}
            light={light}
            // Layer 0 is left empty on purpose: anything that misses its
            // assignment is then invisibly unlit rather than lit by whichever
            // subject's rig happens to share the default.
            layer={index + 1}
            index={index}
            shown={shown}
            focus={focused === null ? null : focused === hero.id}
            lift={studio.lift}
            spread={studio.spread}
            dim={studio.dim}
            openable={Boolean(hero.project)}
            onHover={(on) => take(hero.id, on)}
            onPick={() => hero.project && onPick?.(hero.project)}
          >
            {hero.kind === 'face' && hero.src ? (
              /* His own rig, standing in the cast's scene rather than in a
                 canvas of its own over it — see `FaceScene` in MechModel.tsx.
                 Not wrapped in this file's `Float` or `Lean`: he has both
                 already, and his lean follows his gaze rather than the raw
                 pointer, which is most of what makes him read as a character
                 rather than as a prop. `Env` is skipped for the same reason —
                 his `Model` writes `envMapIntensity` itself, from the tuning
                 handed to it.

                 The float itself is the cast's, not his own page's: his
                 `floatSpeed`/`floatRange`/`floatRotation` in `modelTuning.ts`
                 are tuned for filling his own screen alone, which on the
                 stage read as barely moving next to the other four. Everyone
                 in the cast bobs by the same studio numbers; only his rig,
                 lean and gaze stay his. */
              <group
                rotation={[MathUtils.degToRad(slot.tilt), MathUtils.degToRad(slot.turn), 0]}
              >
                <FaceScene
                  src={hero.src}
                  tuning={{
                    ...faceTuning,
                    envMapIntensity: light.env,
                    floatSpeed: studio.floatSpeed,
                    floatRange: studio.floatRange,
                    floatRotation: studio.floatRotation
                  }}
                  driftFill={studio.fill}
                />
              </group>
            ) : (
              /* Per subject rather than one around the cast: a suspended
                 sibling would hold the whole line-up off the screen until the
                 slowest file in it had arrived. Each one appears as it
                 lands. */
              <Suspense fallback={null}>
                <Env amount={light.env}>
                  <Float
                    speed={studio.floatSpeed}
                    rotationIntensity={studio.floatRotation}
                    floatIntensity={0.5}
                    floatingRange={[-studio.floatRange, studio.floatRange]}
                  >
                    <Lean degrees={studio.lean} turn={slot.turn} tilt={slot.tilt}>
                      <Subject hero={hero} studio={studio} />
                    </Lean>
                  </Float>
                </Env>
              </Suspense>
            )}
          </Placed>
        )
      })}
    </Canvas>
  )
}
