import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Float, useGLTF } from '@react-three/drei'
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

/**
 * World units the model's longest edge is normalised to before framing.
 * Chosen so the product sits inside the ring rather than swallowing it — at
 * the default lens and distance this puts it around half the ring's width.
 */
const TARGET_SIZE = 1.1

/**
 * Lens focal length in mm to three's vertical field of view, against a 35mm
 * full-frame back (24mm tall). Quoting the lens is how the look actually gets
 * described — "50mm, not a wide angle" — and a raw fov number hides the fact
 * that the default 35° was somewhere around a 24mm lens.
 */
export function fovForFocalLength(mm: number) {
  return (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI
}

interface EntranceProps {
  children: React.ReactNode
  /** World units below its resting place that the product starts from. */
  from: number
  delay: number
  duration: number
}

/**
 * Rises the product into place from below the frame while the copy is still
 * revealing.
 *
 * It wraps Float rather than sitting inside it, so the drift is already
 * running as the product arrives and the two never fight over position.y —
 * the entrance moves the parent, Float moves the child.
 *
 * Position only, deliberately: scaling it up would read as the product
 * approaching the camera, and the page holds a fixed lens on a fixed subject.
 */
function Entrance({ children, from, delay, duration }: EntranceProps) {
  const ref = useRef<Group>(null)
  const startedAt = useRef(0)
  const settled = useRef(false)

  useEffect(() => {
    startedAt.current = performance.now()
    settled.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (ref.current) ref.current.position.y = settled.current ? 0 : from
  }, [from, delay, duration])

  // Progress is read from the wall clock rather than summed frame deltas.
  // The two only agree while frames are arriving steadily, and the first
  // second of this page is exactly when they are not — decoding the model
  // can starve the loop outright. Summing deltas there strands the product
  // below the frame and it never climbs back; against the clock, whatever
  // frame lands next is already in the right place.
  useFrame(() => {
    const group = ref.current
    if (!group || settled.current) return

    const seconds = (performance.now() - startedAt.current) / 1000
    const t = Math.min(1, Math.max(0, (seconds - delay) / duration))
    // power3.out, to match the easing the copy reveals on.
    group.position.y = from * Math.pow(1 - t, 3)
    if (t >= 1) {
      group.position.y = 0
      settled.current = true
    }
  })

  return <group ref={ref}>{children}</group>
}

function Spin({ children, rpm }: { children: React.ReactNode; rpm: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += (rpm / 60) * Math.PI * 2 * delta
  })
  return <group ref={ref}>{children}</group>
}

interface CameraRigProps {
  focalLength: number
  exposure: number
  /** Degrees around the model, 0 being straight on. */
  azimuth: number
  /** Degrees above the model's centre line. */
  elevation: number
  distance: number
}

/**
 * Places the camera on a sphere around the model and keeps it aimed at the
 * centre.
 *
 * The aiming is the important part. A camera is only given a position, and it
 * still points down its own -Z — so lifting it to look "down" on the product
 * without re-aiming just slides the product to the bottom of frame, where
 * turning it reads as an off-centre wobble rather than a spin in place.
 */
function CameraRig({ focalLength, exposure, azimuth, elevation, distance }: CameraRigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    camera.updateProjectionMatrix()
  }, [camera, focalLength])

  useEffect(() => {
    const a = (azimuth * Math.PI) / 180
    const e = (elevation * Math.PI) / 180
    camera.position.set(
      distance * Math.cos(e) * Math.sin(a),
      distance * Math.sin(e),
      distance * Math.cos(e) * Math.cos(a)
    )
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, azimuth, elevation, distance])

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
          // The logos are flat decals lying on the case, coplanar with it to
          // within a rounding error, so the depth test cannot separate them
          // and they strobe as the model turns. Biasing them toward the
          // camera settles it without moving anything visibly.
          fixed.polygonOffset = true
          fixed.polygonOffsetFactor = -2
          fixed.polygonOffsetUnits = -2
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
  azimuth?: number
  elevation?: number
  distance?: number
  /** How far the product drifts up and down. 0 holds it still. */
  floatIntensity?: number
  /** How much it lolls on its axes as it drifts. */
  floatRotation?: number
  floatSpeed?: number
  /** World units below its resting place the product rises in from. */
  introFrom?: number
  introDelay?: number
  introDuration?: number
}

export default function CapsuleStage({
  focalLength = 103,
  modelScale = 1.1,
  rpm = 0,
  exposure = 0.1,
  envIntensity = 4,
  keyIntensity = 4.4,
  ambientIntensity = 0,
  fallbackColor = '#000000',
  azimuth = 53,
  elevation = 27,
  distance = 9,
  floatIntensity = 0.9,
  floatRotation = 0.8,
  floatSpeed = 2.5,
  introFrom = -4,
  introDelay = 0.5,
  introDuration = 2.4
}: CapsuleStageProps) {
  return (
    <div className="ch-model">
      <Canvas
        // The canvas now spans the whole stage rather than a 400px box, so
        // capping the pixel ratio keeps the pixel count from roughly
        // quadrupling on a retina screen.
        dpr={[1, 1.5]}
        // Blender previews through a view transform (Filmic/AgX); rendering
        // raw is what makes the highlights blow out and the mid-tones go flat
        // compared to the viewport. ACES is the closest match three has.
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace
        }}
        // near/far are pulled tight around the subject on purpose. The depth
        // buffer's precision is spread across that range, and the default
        // 0.1–1000 leaves so little of it near the model that the logo decals
        // and the case they sit on land in the same depth bucket and flicker.
        // Position is owned by CameraRig; this is only the starting frame.
        camera={{ fov: fovForFocalLength(focalLength), near: 1, far: 60 }}
        style={{ background: 'transparent' }}
      >
        <CameraRig
          focalLength={focalLength}
          exposure={exposure}
          azimuth={azimuth}
          elevation={elevation}
          distance={distance}
        />

        {/* Blender's lights do not survive a glTF export. The environment does
            most of the work on a gloss object; these two only shape it. */}
        <StudioEnvironment intensity={envIntensity} />
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[3, 5, 4]} intensity={keyIntensity} />
        <directionalLight position={[-4, 1, -2]} intensity={keyIntensity * 0.25} color="#cdd6e0" />

        {/* Nothing stands in while the model streams — a placeholder mesh here
            reads as a second, wrong product flashing up before the real one. */}
        <Suspense fallback={null}>
          {/* Float sits outside Spin so the drift is added on top of the
              turn rather than being turned with it — the two are meant to be
              usable independently, either one at 0. */}
          <Entrance from={introFrom} delay={introDelay} duration={introDuration}>
            <Float
              speed={floatSpeed}
              floatIntensity={floatIntensity}
              rotationIntensity={floatRotation}
            >
              <Spin rpm={rpm}>
                <LoadedModel url={MODEL_URL} scale={modelScale} fallbackColor={fallbackColor} />
              </Spin>
            </Float>
          </Entrance>
        </Suspense>
      </Canvas>
    </div>
  )
}
