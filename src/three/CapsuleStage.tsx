import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, ContactShadows, useGLTF } from '@react-three/drei'
import type { Group } from 'three'

/** Drop the Blender export here and the placeholder steps aside on its own. */
export const MODEL_URL = '/models/capsule-c1.glb'

function Spin({ children, rpm = 3 }: { children: React.ReactNode; rpm?: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += (rpm / 60) * Math.PI * 2 * delta
  })
  return <group ref={ref}>{children}</group>
}

function LoadedModel({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url)
  // Center normalises the origin, so the model turns about itself however the
  // pivot was left in Blender.
  return (
    <Center>
      <primitive object={scene} scale={scale} />
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
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.6, 5.4], fov: 35 }}
        style={{ background: 'transparent' }}
      >
        {/* Blender's lights do not survive a glTF export, so the product is
            lit here instead: a key from front-left, a cool fill opposite, and
            a rim to pick the silhouette off the grey gradient. */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={2.1} castShadow />
        <directionalLight position={[-4, 1, -2]} intensity={0.5} color="#cdd6e0" />
        <directionalLight position={[0, -2, -4]} intensity={0.7} color="#ffffff" />

        <Suspense fallback={<PlaceholderCapsule />}>
          <Spin rpm={rpm}>
            {hasModel ? <LoadedModel url={MODEL_URL} scale={scale} /> : <PlaceholderCapsule />}
          </Spin>
        </Suspense>

        <ContactShadows position={[0, -1.35, 0]} opacity={0.28} scale={7} blur={2.6} far={3} />
      </Canvas>
      {!hasModel && <span className="ch-model-note">PLACEHOLDER — awaiting capsule-c1.glb</span>}
    </div>
  )
}
