import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, Color, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three'

export const MODEL_URL = '/models/capsule-c1.glb'

/**
 * The export is Draco-compressed, so a decoder is required. Pointing at our
 * own copy rather than letting drei fall back to Google's CDN keeps the page
 * free of third-party requests — the files come from three's own bundle,
 * copied into public/draco.
 */
const DRACO_PATH = '/draco/'

/** World units the model's longest edge is normalised to before framing. */
const TARGET_SIZE = 2.4

/**
 * Lens focal length in mm to three's vertical field of view, against a 35mm
 * full-frame back (24mm tall). Quoting the lens is how the look actually gets
 * described — "50mm, not a wide angle" — and a raw fov number hides the fact
 * that the default 35° was somewhere around a 24mm lens.
 */
export function fovForFocalLength(mm: number) {
  return (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI
}

function Spin({ children, rpm }: { children: React.ReactNode; rpm: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += (rpm / 60) * Math.PI * 2 * delta
  })
  return <group ref={ref}>{children}</group>
}

/** Keeps the camera's lens and the renderer's exposure live under the panel. */
function CameraRig({ focalLength, exposure }: { focalLength: number; exposure: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    camera.updateProjectionMatrix()
  }, [camera, focalLength])

  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}

/**
 * The case is gloss white over a black face, and a gloss surface shows
 * reflection rather than diffuse colour — with nothing to reflect it renders
 * as a flat silhouette that no amount of extra lights fixes. RoomEnvironment
 * builds that environment procedurally inside three, so the page still makes
 * no request for an HDRI.
 */
function StudioEnvironment({ intensity }: { intensity: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

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

  return null
}

interface LoadedModelProps {
  url: string
  scale: number
  /** Colour for materials that arrived without a pbrMetallicRoughness block. */
  fallbackColor: string
}

function LoadedModel({ url, scale, fallbackColor }: LoadedModelProps) {
  const { scene } = useGLTF(url, DRACO_PATH)

  // Framing is derived from the model rather than hard-coded, because a
  // Blender export lands at whatever scale its scene happened to use — this
  // one arrives 0.3 units on its longest edge.
  const fitted = useMemo(() => {
    const root = scene.clone(true)

    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return

      // A material that reaches glTF without a pbrMetallicRoughness block
      // takes the spec default — white, but fully metallic AND fully rough,
      // which has no diffuse colour and no sharp reflection and so resolves
      // to near black. Both logos come through this way, which is why they
      // render as bright chrome rather than the black they are in Blender.
      //
      // Materials exported with real values fall through untouched: the test
      // is the exact 1.0/1.0/white triple only the glTF default produces.
      const mat = mesh.material as MeshStandardMaterial
      if (mat?.isMeshStandardMaterial) {
        const isGltfDefault =
          mat.metalness === 1 && mat.roughness === 1 && mat.color?.getHex() === 0xffffff
        if (isGltfDefault) {
          const fixed = mat.clone()
          fixed.metalness = 0
          fixed.roughness = 0.4
          fixed.color = new Color(fallbackColor)
          mesh.material = fixed
        }
      }
    })

    // Normalise to a known size so framing holds whatever scale the next
    // export arrives at.
    const size = new Box3().setFromObject(root).getSize(new Vector3())
    const longest = Math.max(size.x, size.y, size.z) || 1
    return { root, fit: TARGET_SIZE / longest }
  }, [scene, fallbackColor])

  // Center normalises the origin, so the model turns about itself however the
  // pivot was left in Blender.
  return (
    <Center>
      <primitive object={fitted.root} scale={fitted.fit * scale} />
    </Center>
  )
}

export interface CapsuleStageProps {
  focalLength?: number
  modelScale?: number
  rpm?: number
  exposure?: number
  envIntensity?: number
  keyIntensity?: number
  ambientIntensity?: number
  fallbackColor?: string
}

export default function CapsuleStage({
  focalLength = 50,
  modelScale = 1,
  rpm = 3,
  exposure = 1.15,
  envIntensity = 1,
  keyIntensity = 1.6,
  ambientIntensity = 0.35,
  fallbackColor = '#000000'
}: CapsuleStageProps) {
  return (
    <div className="ch-model">
      <Canvas
        dpr={[1, 2]}
        // Blender previews through a view transform (Filmic/AgX); rendering
        // raw is what makes the highlights blow out and the mid-tones go flat
        // compared to the viewport. ACES is the closest match three has.
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace
        }}
        camera={{ position: [0, 1.5, 4.4], fov: fovForFocalLength(focalLength) }}
        style={{ background: 'transparent' }}
      >
        <CameraRig focalLength={focalLength} exposure={exposure} />

        {/* Blender's lights do not survive a glTF export. The environment does
            most of the work on a gloss object; these two only shape it. */}
        <StudioEnvironment intensity={envIntensity} />
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[3, 5, 4]} intensity={keyIntensity} />
        <directionalLight position={[-4, 1, -2]} intensity={keyIntensity * 0.25} color="#cdd6e0" />

        {/* Nothing stands in while the model streams — a placeholder mesh here
            reads as a second, wrong product flashing up before the real one. */}
        <Suspense fallback={null}>
          <Spin rpm={rpm}>
            <LoadedModel url={MODEL_URL} scale={modelScale} fallbackColor={fallbackColor} />
          </Spin>
        </Suspense>
      </Canvas>
    </div>
  )
}
