import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Float, Resize, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import VideoFrame from '../three/VideoFrame'
import { SpriteFlipbook } from '../three/CapsuleStage'
import { CAST, FISH_MAN_FRAMES, type Hero } from './heroes'
import { CAST_STUDIO, lightFor, slotFor, type CastLight, type CastSlot, type CastStudio } from './castTuning'
import type { Group, Mesh, PerspectiveCamera } from 'three'

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

/** Built inside three rather than fetched, so the page still makes no
 *  third-party request for an HDRI. */
function Studio({ intensity, exposure }: { intensity: number; exposure: number }) {
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
    scene.environmentIntensity = intensity
  }, [scene, intensity])

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
function Lens({ focalLength, fill }: { focalLength: number; fill: number }) {
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
    const z = distanceFor(focalLength, held)
    camera.position.set(0, 0, z)
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
  }, [camera, focalLength, held])

  return null
}

/** How far either side of the origin the cast is allowed to sit — the depth
 *  the near and far planes are wrapped around, and the budget hover has to
 *  move a subject in. */
const CAST_DEPTH = 4

/* ---- coming and going ----

   Subjects grow in place, one after another, and retract in the opposite
   order when a project is opened — last in, first away, the same shape the
   leaders' two cascades have on the project screen.

   In three rather than in CSS, because there is nothing in the DOM to
   stagger: the whole cast is one canvas. Scale rather than opacity for the
   same reason — fading a mesh means making every material transparent, and a
   transparent material is a different render path with its own sorting
   problems for the sake of a beat nobody sees the inside of. */
const IN_STAGGER = 0.1
const OUT_STAGGER = 0.06
/** How far under its mark a subject starts, in world units. */
const RISE = 0.45

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
  slot,
  light,
  layer,
  index,
  count,
  shown,
  focus,
  onHover,
  children
}: {
  slot: CastSlot
  light: CastLight
  layer: number
  index: number
  count: number
  /** Whether the cast is on the stage at all. False retracts it. */
  shown: boolean
  /** `true` this one, `false` another one, `null` nothing. */
  focus: boolean | null
  onHover: (over: boolean) => void
  children: React.ReactNode
}) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const grow = useRef(0)
  const depth = useRef(0)
  const since = useRef(0)
  const nodes = useRef(-1)

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
      group.traverse((node) => node.layers.set(layer))
    }

    since.current += delta
    // Last in, first away.
    const delay = shown ? index * IN_STAGGER : (count - 1 - index) * OUT_STAGGER
    if (since.current >= delay) {
      const to = shown ? 1 : 0
      grow.current = MathUtils.lerp(grow.current, to, 1 - Math.pow(0.0015, delta))
    }
    const eased = grow.current

    const forward = focus === true ? FORWARD : focus === false ? -BACK : 0
    depth.current = MathUtils.lerp(depth.current, forward, 1 - Math.pow(0.002, delta))

    group.position.set(slot.x, slot.y - (1 - eased) * RISE, slot.z + depth.current)
    body.scale.setScalar(Math.max(0.0001, slot.scale * eased))
    body.visible = eased > 0.005
  })

  return (
    <group
      ref={outer}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHover(true)
      }}
      onPointerOut={() => onHover(false)}
    >
      {/* Outside the scaled group, so a subject at scale 0.5 is not lit from
          half the distance — and so the lights survive the entrance, which
          scales `inner` from nothing. */}
      <directionalLight
        position={[light.keyX, light.keyY, light.keyZ]}
        intensity={light.keyIntensity}
      />
      <directionalLight
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

/** Every layer the cast uses, switched on for the camera — without this a
 *  subject moved off layer 0 stops being rendered at all. */
function SeeEverything() {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.layers.enableAll()
  }, [camera])
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
  /** Which project is being looked at, if any — the hero whose `project`
   *  matches comes forward and the rest drop back. Hovering a subject
   *  directly does the same thing and wins while it lasts. */
  focusHeroId?: string | null
  /** On the stage, or leaving it. False retracts the cast, staggered. */
  shown?: boolean
  /** Off entirely while the page is not looking at the stage. A cast of five
   *  idling behind a project screen is five subjects' worth of frame loop
   *  spent on something nobody can see. */
  live?: boolean
}

export default function MechCast({ studio = CAST_STUDIO, slots, lights, focusHeroId, shown = true, live = true }: Props) {
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
      <Lens focalLength={studio.focalLength} fill={studio.fill} />
      <Studio intensity={studio.envIntensity} exposure={studio.exposure} />

      {CAST.map((hero, index) => {
        // The face is a layer of its own over this canvas — see the note at
        // the top, and `CastSlot` for how his slot is read instead.
        if (hero.kind === 'face') return null
        const slot = slots?.[hero.id] ?? slotFor(hero.id)
        const light = lights?.[hero.id] ?? lightFor(hero.id)
        return (
          <Placed
            key={hero.id}
            slot={slot}
            light={light}
            // Layer 0 is left empty on purpose: anything that misses its
            // assignment is then invisibly unlit rather than lit by whichever
            // subject's rig happens to share the default.
            layer={index + 1}
            index={index}
            count={CAST.length}
            shown={shown}
            focus={focused === null ? null : focused === hero.id}
            onHover={(on) => setOver((was) => (on ? hero.id : was === hero.id ? null : was))}
          >
            {/* Per subject rather than one around the cast: a suspended
                sibling would hold the whole line-up off the screen until the
                slowest file in it had arrived. Each one appears as it
                lands. */}
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
          </Placed>
        )
      })}
    </Canvas>
  )
}
