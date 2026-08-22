import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, useAnimations, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MODEL_DEFAULTS, type ModelTuning } from './modelTuning'
import type { Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three'

/* The subject of the project screen: the model itself, lit and drifting, with
   nothing but black behind it.

   Deliberately not `drei/Stage` (what the index screen's `ModelFrame` uses):
   Stage reframes the camera around whatever it is handed, and here the camera
   has to stay put — the leader lines are drawn at fixed coordinates in the
   same 1920×1080 frame, and they only touch the model if the model does not
   move between projects. So the model is normalised to the camera instead. */

/** World units the model's height is normalised to before framing. */
const TARGET_HEIGHT = 1

/** Lens focal length to three's vertical field of view, against a 35mm back.
 *  Copied rather than imported from `CapsuleStage`, which is three lines of
 *  arithmetic against dragging the whole gallery stage into this chunk. */
const fovForFocalLength = (mm: number) => (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI

/** How far back the camera has to stand to hold `fill` of the frame's height
 *  at this lens. Longer glass, further away — that is the whole trade, and
 *  keeping it as one sum is what lets the panel move the lens without also
 *  having to move the camera by hand. */
const distanceFor = (focalLength: number, fill: number) =>
  TARGET_HEIGHT / fill / (2 * Math.tan((fovForFocalLength(focalLength) * Math.PI) / 360))

/* ---- the face ----

   The v2 export carries no head animation — what it carries is morph targets,
   and v2 drives them from code rather than from clips. Same numbers as
   `AdamFace`, minus the two things that only make sense inside the gallery:
   sadness measured off the scroll, and a Leva panel over all of it.

   Without this the model is a very well lit mannequin. */
const IDLE = ['EmotionSearching', 'EmotionListening']
const BLINK = { gap: [2.5, 9.5], length: 0.28 }
const LOOK = { sensitivity: [0.8, 0.5], max: [0.6, 0.4], speed: 4 }
const THINK = { gap: [4, 12], hold: [1.2, 3.8], intensity: 0.6, fade: 2.5 }

const between = (min: number, max: number) => min + Math.random() * (max - min)

function Model({ src, tuning }: { src: string; tuning: ModelTuning }) {
  const { scene, animations } = useGLTF(src)
  const group = useRef<Group>(null)
  const { actions } = useAnimations(animations, group)

  // Every clip at once. These exports are one clip per part — a face is a
  // mouth and a pair of eyes and a tongue all moving together, not a take you
  // pick between.
  useEffect(() => {
    const list = Object.values(actions)
    list.forEach((action) => action?.reset().play())
    return () => {
      list.forEach((action) => action?.stop())
    }
  }, [actions])

  const fit = useMemo(() => {
    const box = new Box3()
    const morphed: Mesh[] = []
    const surfaces: Array<{ material: MeshStandardMaterial; roughness: number; metalness: number }> = []
    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      // Some exports carry a backdrop plane behind the subject. Against a
      // black page it only ever reads as a grey card, and it throws the
      // framing off by several times the size of the thing being framed.
      if (/^plane/i.test(mesh.name)) {
        mesh.visible = false
        return
      }

      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphed.push(mesh)

      // Cloned with the export's own roughness and metalness kept alongside:
      // the panel adjusts from those bases every frame rather than compounding
      // onto whatever the last drag left behind.
      const material = mesh.material as MeshStandardMaterial
      if (material?.isMeshStandardMaterial) {
        const clone = material.clone()
        mesh.material = clone
        surfaces.push({ material: clone, roughness: clone.roughness, metalness: clone.metalness })
      }

      mesh.updateWorldMatrix(true, false)
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld))
    })

    const size = box.getSize(new Vector3())
    const scale = TARGET_HEIGHT / (size.y || 1)
    return { scale, morphed, surfaces, offset: box.getCenter(new Vector3()).multiplyScalar(-scale) }
  }, [scene])

  const blink = useRef({ at: performance.now() / 1000 + between(BLINK.gap[0], BLINK.gap[1]) })
  const eyes = useRef({ h: 0, v: 0 })
  // `phase` is what makes the gap a real rest rather than a fixed pause: it
  // only leaves 'gap' once the timer is up *and* the outgoing expression has
  // actually faded out, so a slow fade can never be cut off mid-way.
  const think = useRef({
    name: IDLE[0],
    weight: 0,
    target: 0,
    phase: 'gap' as 'gap' | 'hold',
    timer: between(THINK.gap[0], THINK.gap[1])
  })

  const setMorph = (name: string, value: number) => {
    for (const mesh of fit.morphed) {
      const index = mesh.morphTargetDictionary![name]
      if (index !== undefined) mesh.morphTargetInfluences![index] = value
    }
  }

  useFrame(({ pointer }, delta) => {
    for (const surface of fit.surfaces) {
      surface.material.envMapIntensity = tuning.envMapIntensity
      surface.material.roughness = MathUtils.clamp(surface.roughness + tuning.roughnessBoost, 0, 1)
      surface.material.metalness = MathUtils.clamp(surface.metalness * tuning.metalnessScale, 0, 1)
    }

    // Blink, on a loose timer — down and back up across the window, a
    // triangle rather than a snap.
    const now = performance.now() / 1000
    const since = now - blink.current.at
    if (since >= 0 && since < BLINK.length) {
      setMorph('Eyes Closed', 1 - Math.abs(since / BLINK.length - 0.5) * 2)
    } else if (since >= BLINK.length) {
      setMorph('Eyes Closed', 0)
      blink.current.at = now + between(BLINK.gap[0], BLINK.gap[1])
    }

    // The eyes go where you are. Sensitivity decides how eagerly they react;
    // the cap decides how far they are ever allowed to travel, so a cursor
    // flicked into a corner cannot drive them past a natural rotation.
    const k = 1 - Math.exp(-LOOK.speed * delta)
    eyes.current.h = MathUtils.lerp(
      eyes.current.h,
      MathUtils.clamp(pointer.x * LOOK.sensitivity[0], -LOOK.max[0], LOOK.max[0]),
      k
    )
    eyes.current.v = MathUtils.lerp(
      eyes.current.v,
      MathUtils.clamp(pointer.y * LOOK.sensitivity[1], -LOOK.max[1], LOOK.max[1]),
      k
    )
    setMorph('HorizontalLook', eyes.current.h)
    setMorph('VerticalLook', eyes.current.v)

    // An expression that rises and falls on its own, so the face reads as
    // thinking rather than as waiting.
    const state = think.current
    state.timer -= delta
    if (state.phase === 'hold') {
      if (state.timer <= 0) {
        state.target = 0
        state.phase = 'gap'
        state.timer = between(THINK.gap[0], THINK.gap[1])
      }
    } else if (state.timer <= 0 && state.weight < 0.01) {
      const others = IDLE.filter((name) => name !== state.name)
      state.name = others[Math.floor(Math.random() * others.length)] ?? state.name
      state.target = THINK.intensity
      state.phase = 'hold'
      state.timer = between(THINK.hold[0], THINK.hold[1])
    }
    state.weight = MathUtils.lerp(state.weight, state.target, 1 - Math.exp(-THINK.fade * delta))
    for (const name of IDLE) setMorph(name, name === state.name ? state.weight : 0)
  })

  return (
    <group ref={group}>
      <group scale={fit.scale} position={fit.offset}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

/** Leans the whole subject a few degrees toward the pointer. Damped against
 *  the frame clock rather than snapped, so a flick of the mouse is a turn of
 *  the head and not a jump. */
function Lean({ degrees, children }: { degrees: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const limit = MathUtils.degToRad(degrees)

  useFrame(({ pointer }, delta) => {
    const group = ref.current
    if (!group) return
    const k = 1 - Math.pow(0.002, delta)
    group.rotation.y = MathUtils.lerp(group.rotation.y, pointer.x * limit, k)
    group.rotation.x = MathUtils.lerp(group.rotation.x, -pointer.y * limit * 0.55, k)
  })

  return <group ref={ref}>{children}</group>
}

/** Built inside three rather than fetched, so the page still makes no
 *  third-party request for an HDRI. Same reasoning as the gallery's stage,
 *  and the same exposure, because it is the same face. */
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

/** The camera has to be moved rather than remounted: a `camera` prop is only
 *  read on the first render, so dragging the lens slider would otherwise do
 *  nothing until a reload. */
function Lens({ focalLength, fill }: { focalLength: number; fill: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    camera.position.set(0, 0, distanceFor(focalLength, fill))
    camera.near = camera.position.z * 0.2
    camera.far = camera.position.z * 4
    camera.updateProjectionMatrix()
  }, [camera, focalLength, fill])

  return null
}

export default function MechModel({ src, tuning = MODEL_DEFAULTS }: { src: string; tuning?: ModelTuning }) {
  const distance = distanceFor(MODEL_DEFAULTS.focalLength, MODEL_DEFAULTS.fill)

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: fovForFocalLength(MODEL_DEFAULTS.focalLength), position: [0, 0, distance] }}
      gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      style={{ background: 'transparent' }}
    >
      <Lens focalLength={tuning.focalLength} fill={tuning.fill} />
      <Studio intensity={tuning.envIntensity} exposure={tuning.exposure} />
      <directionalLight position={[tuning.keyX, tuning.keyY, tuning.keyZ]} intensity={tuning.keyIntensity} />
      <directionalLight position={[tuning.fillX, tuning.fillY, tuning.fillZ]} intensity={tuning.fillIntensity} />

      <Suspense fallback={null}>
        <Lean degrees={tuning.lean}>
          <Float
            speed={tuning.floatSpeed}
            rotationIntensity={tuning.floatRotation}
            floatIntensity={0.5}
            floatingRange={[-tuning.floatRange, tuning.floatRange]}
          >
            <Model src={src} tuning={tuning} />
          </Float>
        </Lean>
      </Suspense>
    </Canvas>
  )
}
