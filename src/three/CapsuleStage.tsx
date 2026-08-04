import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, ContactShadows, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Group, Mesh, MeshStandardMaterial } from 'three'

/** Drop the Blender export here and the placeholder steps aside on its own. */
export const MODEL_URL = '/models/capsule-c1.glb'

/**
 * The export is Draco-compressed (9.9MB of raw geometry down to 488KB), so a
 * decoder is required. Pointing at our own copy rather than letting drei fall
 * back to Google's CDN keeps the page free of third-party requests — the
 * files come from three's own bundle, copied into public/draco.
 */
const DRACO_PATH = '/draco/'

/** World units the model's longest edge is normalised to before framing. */
const TARGET_SIZE = 2.4

function Spin({ children, rpm = 3 }: { children: React.ReactNode; rpm?: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += (rpm / 60) * Math.PI * 2 * delta
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Most of the case is pure black (baseColorFactor [0,0,0]) at roughness 0.
 * A black gloss surface has no diffuse colour to show — everything you read
 * as its shape is reflection, so without an environment it renders as a flat
 * silhouette no amount of extra lights can rescue.
 *
 * RoomEnvironment builds that environment procedurally inside three, so the
 * page still makes no third-party request for an HDRI.
 */
function StudioEnvironment() {
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

  return null
}

function LoadedModel({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url, DRACO_PATH)

  // Framing is derived from the model rather than hard-coded, because a
  // Blender export lands at whatever scale the scene happened to use — this
  // one arrives with per-node scales around 0.04.
  const fitted = useMemo(() => {
    const root = scene.clone(true)

    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true

      // A material that reaches glTF without a pbrMetallicRoughness block
      // takes the spec default — white, but fully metallic AND fully rough,
      // which has no diffuse colour and no sharp reflection and so resolves
      // to near black. Blender renders the same material as a light grey
      // dielectric, so that is what gets restored here.
      //
      // Materials exported with real values fall through untouched: the test
      // is the exact 1.0/1.0/white triple only the glTF default produces.
      const mat = mesh.material as MeshStandardMaterial
      if (mat && mat.isMeshStandardMaterial) {
        const isGltfDefault =
          mat.metalness === 1 && mat.roughness === 1 && mat.color?.getHex() === 0xffffff
        if (isGltfDefault) {
          const fixed = mat.clone()
          fixed.metalness = 0
          fixed.roughness = 0.35
          fixed.color.setHex(0xcccccc)
          mesh.material = fixed
        }
      }
    })

    // Normalise to a known size so the framing holds whatever scale the next
    // export arrives at.
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const longest = Math.max(size.x, size.y, size.z) || 1
    return { root, fit: TARGET_SIZE / longest }
  }, [scene])

  // Center normalises the origin, so the model turns about itself however the
  // pivot was left in Blender.
  return (
    <Center>
      <primitive object={fitted.root} scale={fitted.fit * scale} />
    </Center>
  )
}

/** Stand-in with roughly the proportions of the real part. */
function PlaceholderCapsule() {
  return (
    <Center>
      <mesh castShadow>
        <capsuleGeometry args={[0.62, 1.05, 12, 32]} />
        <meshStandardMaterial color="#d8d8d4" metalness={0.35} roughness={0.28} />
      </mesh>
    </Center>
  )
}

interface CapsuleStageProps {
  /** Tune once the real export is in — Blender units rarely land at 1:1. */
  scale?: number
  rpm?: number
}

export default function CapsuleStage({ scale = 1, rpm = 3 }: CapsuleStageProps) {
  const [hasModel, setHasModel] = useState(false)

  // A HEAD request keeps a missing file from throwing inside Suspense, which
  // would take the whole page down rather than just the model.
  //
  // `r.ok` alone is not enough: the dev server answers unknown paths with the
  // SPA fallback, so a missing .glb comes back 200 with an HTML body and the
  // placeholder never shows. The content type is what actually distinguishes
  // a real export from index.html.
  useEffect(() => {
    let live = true
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((r) => {
        const type = r.headers.get('content-type') ?? ''
        if (live && r.ok && !type.includes('text/html')) setHasModel(true)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="ch-model">
      <Canvas
        dpr={[1, 2]}
        shadows
        // Blender previews through a view transform (Filmic/AgX); rendering
        // raw here is what makes the highlights blow out and the mid-tones go
        // flat compared to the viewport. ACES is the closest match three has.
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: SRGBColorSpace
        }}
        // The export is a wide, flat device (2 x 0.675 x 2 units), so the
        // camera sits up and looks down onto it rather than side-on, which
        // would show little more than an edge.
        camera={{ position: [0, 1.5, 4.4], fov: 35 }}
        style={{ background: 'transparent' }}
      >
        {/* Blender's lights do not survive a glTF export. The environment
            above does most of the work on a gloss-black object; these just
            shape it — a key from front-left and a rim to pick the silhouette
            off the grey gradient. */}
        <StudioEnvironment />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
        <directionalLight position={[-4, 1, -2]} intensity={0.4} color="#cdd6e0" />
        <directionalLight position={[0, -2, -4]} intensity={0.6} color="#ffffff" />

        <Suspense fallback={<PlaceholderCapsule />}>
          <Spin rpm={rpm}>
            {hasModel ? <LoadedModel url={MODEL_URL} scale={scale} /> : <PlaceholderCapsule />}
          </Spin>
        </Suspense>

        <ContactShadows position={[0, -0.42, 0]} opacity={0.3} scale={5} blur={2.4} far={2} />
      </Canvas>
      {!hasModel && <span className="ch-model-note">PLACEHOLDER — awaiting capsule-c1.glb</span>}
    </div>
  )
}
