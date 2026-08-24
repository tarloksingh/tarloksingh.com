import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Float, Resize, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import VideoFrame from '../three/VideoFrame'
import { SpriteFlipbook } from '../three/CapsuleStage'
import { CAST, FISH_MAN_FRAMES, type Hero } from './heroes'
import { CAST_STUDIO, slotFor, type CastSlot, type CastStudio } from './castTuning'
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
    camera.position.set(0, 0, distanceFor(focalLength, held))
    camera.near = camera.position.z * 0.05
    camera.far = camera.position.z * 8
    camera.updateProjectionMatrix()
  }, [camera, focalLength, held])

  return null
}

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

interface Props {
  studio?: CastStudio
  /** Every subject's placement, keyed by hero id. Whatever is missing falls
   *  back to what is in source — so a panel that has not been opened and a
   *  panel that has been reset draw the same stage. */
  slots?: Record<string, CastSlot>
  /** Off entirely while the page is not looking at the stage. A cast of five
   *  idling behind a project screen is five subjects' worth of frame loop
   *  spent on something nobody can see. */
  live?: boolean
}

export default function MechCast({ studio = CAST_STUDIO, slots, live = true }: Props) {
  const distance = distanceFor(CAST_STUDIO.focalLength, CAST_STUDIO.fill)

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={live ? 'always' : 'never'}
      camera={{ fov: fovForFocalLength(CAST_STUDIO.focalLength), position: [0, 0, distance] }}
      gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      style={{ background: 'transparent' }}
    >
      <Lens focalLength={studio.focalLength} fill={studio.fill} />
      <Studio intensity={studio.envIntensity} exposure={studio.exposure} />
      <directionalLight position={[3, 4, 5]} intensity={studio.keyIntensity} />
      <directionalLight position={[-4, 1, -3]} intensity={studio.fillIntensity} />

      {CAST.map((hero) => {
        // The face is a layer of its own over this canvas — see the note at
        // the top, and `CastSlot` for how his slot is read instead.
        if (hero.kind === 'face') return null
        const slot = slots?.[hero.id] ?? slotFor(hero.id)
        return (
          <group key={hero.id} position={[slot.x, slot.y, slot.z]} scale={slot.scale}>
            {/* Per subject rather than one around the cast: a suspended
                sibling would hold the whole line-up off the screen until the
                slowest file in it had arrived. Each one appears as it
                lands. */}
            <Suspense fallback={null}>
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
            </Suspense>
          </group>
        )
      })}
    </Canvas>
  )
}
