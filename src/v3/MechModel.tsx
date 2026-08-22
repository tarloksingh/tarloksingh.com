import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, useAnimations, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Group, Mesh } from 'three'

/* The subject of the project screen: the model itself, lit and drifting, with
   nothing but black behind it.

   Deliberately not `drei/Stage` (what the index screen's `ModelFrame` uses):
   Stage reframes the camera around whatever it is handed, and here the camera
   has to stay put — the leader lines are drawn at fixed coordinates in the
   same 1920×1080 frame, and they only touch the model if the model does not
   move between projects. So the model is normalised to the camera instead. */

/** World units the model's height is normalised to before framing. With the
 *  lens below this puts the subject at a little over half the frame height,
 *  which is where the Figma has it. */
const TARGET_HEIGHT = 1

/** Degrees of turn the model leans through as the pointer crosses the frame.
 *  Enough that it reads as a thing in a room rather than a picture; small
 *  enough that the leader lines still land where they were drawn. */
const LEAN = 9

function Model({ src }: { src: string }) {
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
    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      // The exports carry a backdrop plane behind the subject. Against a black
      // page it only ever reads as a grey card, and it throws the framing off
      // by several times the size of the thing being framed.
      if (/^plane/i.test(mesh.name)) {
        mesh.visible = false
        return
      }
      mesh.updateWorldMatrix(true, false)
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld))
    })

    const size = box.getSize(new Vector3())
    const scale = TARGET_HEIGHT / (size.y || 1)
    return { scale, offset: box.getCenter(new Vector3()).multiplyScalar(-scale) }
  }, [scene])

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
function Lean({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const limit = MathUtils.degToRad(LEAN)

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
 *  third-party request for an HDRI. Same reasoning as the gallery's stage. */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  return null
}

export default function MechModel({ src }: { src: string }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, 3.6], near: 0.5, far: 20 }}
      gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      style={{ background: 'transparent' }}
    >
      <StudioEnvironment />
      <directionalLight position={[2.4, 3.2, 4]} intensity={1.6} />
      <directionalLight position={[-3, 0.6, 1.5]} intensity={0.35} />

      <Suspense fallback={null}>
        <Lean>
          <Float speed={1.15} rotationIntensity={0.18} floatIntensity={0.5} floatingRange={[-0.035, 0.035]}>
            <Model src={src} />
          </Float>
        </Lean>
      </Suspense>
    </Canvas>
  )
}
