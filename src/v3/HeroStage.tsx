import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Float, Resize, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import VideoFrame from '../three/VideoFrame'
import { SpriteFlipbook } from '../three/CapsuleStage'
import { FISH_MAN_FRAMES, type Hero } from './heroes'
import { HERO_POSE_FALLBACK, HERO_STUDIO, poseFor, type HeroPose, type HeroStudio } from './heroTuning'
import type { Group, Mesh, PerspectiveCamera } from 'three'

/* The home screen's stage: whichever of the five subjects is currently up,
   large, in the middle of the window.

   **One context, not five.** Every subject except the face is a sibling in
   this single `<Canvas>`, hidden rather than unmounted when it is not the one
   on the stage — the same trade the project screen makes, and for the same
   reason: a WebGL context, a compiled shader set and a generated environment
   map cost most of a hundred milliseconds to build, and paying that on every
   press of the roster is the hitch the project screen already solved once.

   Hidden, but not loaded until it has been asked for. A 4.5MB motorcycle, a
   2.3MB head, a clip and fourteen sprites arriving together on first paint is
   most of a home screen's budget spent on four subjects nobody has looked at
   yet. A subject is mounted the first time it is selected and never unmounted
   after — `seen` in `Home.tsx`.

   **Mr. Takahashi is not in here.** He is `MechModel`, mounted as its own
   layer over this one by `Home.tsx`: the same component, the same rig, the
   same `MODEL_DEFAULTS`. He is the one subject on this site with a lighting
   setup built around him, and lighting him a second way here would be a
   second face. Two contexts, both persistent, one running at a time. */

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
 *  lens would otherwise do nothing until a reload. */
function Lens({ focalLength, fill }: { focalLength: number; fill: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)

  /* `fill` is a fraction of the frame's *height*, and a subject is normalised on
     its longest edge — so a wide one asked to fill more of the height than
     the frame is wide runs off the sides. Which is exactly what a phone is:
     the stage there is about as wide as it is tall, and a monitor framed for
     a 16:9 island came out cropped at both ends.

     Capped against the frame's own aspect rather than hidden behind a
     narrow-only number, because it is not about phones — it is true of any
     window shape and any subject. */
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

/** Leans the subject toward the pointer. The whole roster gets it, so the
 *  stage reads as one place with different things standing in it rather than
 *  as five separate presentations. */
function Lean({ degrees, turn, children }: { degrees: number; turn: number; children: React.ReactNode }) {
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
    group.rotation.x = -at.current.y * limit * 0.45
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
 *  prop and nothing here knows what is in it. */
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

function Subject({ hero, studio }: { hero: Hero; studio: HeroStudio }) {
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
  heroes: Hero[]
  /** Which subject is on the stage. */
  shownId: string
  /** Which have ever been on the stage — see the note at the top about why
   *  this is not simply "all of them". */
  seen: ReadonlySet<string>
  studio?: HeroStudio
  /** The one being tuned right now, if a panel is open. Every other subject
   *  keeps its own pose from `HERO_POSES`. */
  pose?: HeroPose
  /** Off entirely while the page is not looking at the stage — an empty hold
   *  between two subjects still costs a frame loop otherwise. */
  live?: boolean
}

export default function HeroStage({
  heroes,
  shownId,
  seen,
  studio = HERO_STUDIO,
  pose = HERO_POSE_FALLBACK,
  live = true
}: Props) {
  const distance = distanceFor(HERO_STUDIO.focalLength, HERO_STUDIO.fill)

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={live ? 'always' : 'never'}
      camera={{ fov: fovForFocalLength(HERO_STUDIO.focalLength), position: [0, 0, distance] }}
      gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      style={{ background: 'transparent' }}
    >
      <Lens focalLength={studio.focalLength} fill={studio.fill * pose.size} />
      <Studio intensity={studio.envIntensity} exposure={studio.exposure} />
      <directionalLight position={[3, 4, 5]} intensity={studio.keyIntensity} />
      <directionalLight position={[-4, 1, -3]} intensity={studio.fillIntensity} />

      {heroes.map((hero) => {
        if (hero.kind === 'face' || !seen.has(hero.id)) return null
        const on = hero.id === shownId
        // The one on the stage is being tuned; the rest keep what they were
        // set to in source.
        const its = on ? pose : poseFor(hero.id)
        return (
          <group key={hero.id} visible={on}>
            <Suspense fallback={null}>
              <group position={[0, its.liftY / (studio.fill * its.size), 0]}>
                <Float
                  speed={studio.floatSpeed}
                  rotationIntensity={studio.floatRotation}
                  floatIntensity={0.5}
                  floatingRange={[-studio.floatRange, studio.floatRange]}
                >
                  <Lean degrees={studio.lean} turn={its.turn}>
                    <Subject hero={hero} studio={studio} />
                  </Lean>
                </Float>
              </group>
            </Suspense>
          </group>
        )
      })}
    </Canvas>
  )
}
