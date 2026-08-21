import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'

/* A GLB on the stage, in place of a picture of one. Lazily imported by
   `Frame` so three.js only loads for a project that actually has a model. */

function Model({ src }: { src: string }) {
  const { scene } = useGLTF(src)
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
