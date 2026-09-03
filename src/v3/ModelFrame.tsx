import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'

/* A GLB on the stage, in place of a picture of one. Lazily imported by
   `Frame` so three.js only loads for a project that actually has a model. */

/** The Draco decoder, served from `public/draco/`.
 *
 *  Not optional and not cosmetic. `useGLTF(src)` with no path leaves drei's
 *  default in place, which is
 *  `https://www.gstatic.com/draco/versioned/decoders/1.5.5/` — so opening a
 *  project whose GLB is Draco-compressed (Capsule C1 and Wyte Card are)
 *  fetched a wrapper and a WASM binary from Google's CDN before the subject
 *  could be decoded. Verified off the built page: two off-origin requests,
 *  gone once this is passed. This site makes no third-party requests — the
 *  environment map is built inside three for the same reason — and a model
 *  that cannot draw until a round trip to another origin finishes is the
 *  slowest thing on a project screen on a phone.
 *
 *  Declared locally, as it is in `MechSlots`, `MechRider`, `MechCast` and
 *  `CapsuleStage`: one string beside the call that needs it, rather than a
 *  module for a constant. */
const DRACO_PATH = '/draco/'

function Model({ src }: { src: string }) {
  const { scene } = useGLTF(src, DRACO_PATH)
  return <primitive object={scene} />
}

export default function ModelFrame({ src }: { src: string }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 35 }} gl={{ antialias: true }}>
      <color attach="background" args={['#0b0b0b']} />
      <Suspense fallback={null}>
        {/* `Stage` lights and frames whatever it is handed, so a model drops
            in without per-model camera and light tuning. */}
        <Stage intensity={0.6} environment="city" adjustCamera={1.1}>
          <Model src={src} />
        </Stage>
      </Suspense>
      <OrbitControls makeDefault enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  )
}
