import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useControls, button } from 'leva'
import { gsap } from 'gsap'
import Door from './Door'
import DoorCameraRig from './DoorCameraRig'
import DoorMist from './DoorMist'

const FIST_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text x="2" y="30" font-size="30">✊</text></svg>`
const FIST_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(FIST_CURSOR_SVG)}") 20 20, pointer`

export default function DoorScene({ onKnock, walkThroughSignal }: { onKnock: () => void; walkThroughSignal: number }) {
  const [knockSignal, setKnockSignal] = useState(0)
  const [doorHeight, setDoorHeight] = useState(6)
  const approachRef = useRef({ value: 0 })

  useEffect(() => {
    if (walkThroughSignal === 0) return
    gsap.to(approachRef.current, { value: 1, duration: 1.3, ease: 'power2.in' })
  }, [walkThroughSignal])

  const { fov, azimuth, elevation, distanceMult } = useControls('Camera', {
    fov: { value: 32, min: 18, max: 60, step: 1 },
    azimuth: { value: 35, min: -90, max: 90, step: 1, label: 'Azimuth °' },
    elevation: { value: 12, min: -10, max: 60, step: 1, label: 'Elevation °' },
    distanceMult: { value: 1.6, min: 0.7, max: 5, step: 0.05, label: 'Distance' }
  })

  const { handheld, camRoll, floatSway, floatBob, floatPush, floatSpeed } = useControls('Handheld', {
    handheld: { value: 4, min: 0, max: 15, step: 0.5 },
    camRoll: { value: 1.5, min: 0, max: 6, step: 0.1, label: 'Dutch roll °' },
    floatSway: { value: 1, min: 0, max: 4, step: 0.1, label: 'Sway L/R' },
    floatBob: { value: 1, min: 0, max: 4, step: 0.1, label: 'Bob U/D' },
    floatPush: { value: 1, min: 0, max: 4, step: 0.1, label: 'Push In/Out' },
    floatSpeed: { value: 1, min: 0.1, max: 4, step: 0.1 }
  })

  const { restDeg, knockDeg, hingeFraction } = useControls('Door', {
    restDeg: { value: 0, min: -10, max: 40, step: 0.5, label: 'Rest angle °' },
    knockDeg: { value: 8, min: 0, max: 40, step: 0.5, label: 'Knock crack °' },
    hingeFraction: { value: 0, min: 0, max: 1, step: 0.05, label: 'Hinge (0=inner,1=outer)' }
  })

  const { bgColor, fogColor, fogDensity, mistOpacity } = useControls('Background & Fog', {
    bgColor: '#c7d0d6',
    fogColor: '#c7d0d6',
    fogDensity: { value: 0.05, min: 0, max: 0.6, step: 0.01 },
    mistOpacity: { value: 0.5, min: 0, max: 1, step: 0.05, label: 'Door mist' }
  })

  const { ambient, keyIntensity, keyColor, fillIntensity, rimIntensity } = useControls('Lighting', {
    ambient: { value: 0.65, min: 0, max: 2, step: 0.05 },
    keyIntensity: { value: 1.9, min: 0, max: 5, step: 0.1 },
    keyColor: '#fff1e0',
    fillIntensity: { value: 0.5, min: 0, max: 3, step: 0.1 },
    rimIntensity: { value: 0.7, min: 0, max: 3, step: 0.1 }
  })

  useControls('Actions', {
    'Save settings JSON': button(() => {
      const settings = {
        camera: { fov, azimuth, elevation, distanceMult },
        handheld: { handheld, camRoll, floatSway, floatBob, floatPush, floatSpeed },
        door: { restDeg, knockDeg, hingeFraction },
        backgroundFog: { bgColor, fogColor, fogDensity, mistOpacity },
        lighting: { ambient, keyIntensity, keyColor, fillIntensity, rimIntensity }
      }
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'door-scene-settings.json'
      a.click()
      URL.revokeObjectURL(url)
    })
  })

  const handleKnock = () => {
    setKnockSignal((n) => n + 1)
    onKnock()
  }

  return (
    <div className="door-scene" style={{ cursor: FIST_CURSOR }}>
      <Canvas camera={{ fov }} dpr={[1, 2]}>
        <color attach="background" args={[bgColor]} />
        <fogExp2 attach="fog" args={[fogColor, fogDensity]} />
        <ambientLight intensity={ambient} color="#fff4ea" />
        <directionalLight position={[3, 5, 4]} intensity={keyIntensity} color={keyColor} />
        <directionalLight position={[-4, 2, -3]} intensity={fillIntensity} color="#cfe0ff" />
        <directionalLight position={[-2, 4, -5]} intensity={rimIntensity} color="#ffffff" />
        <Suspense fallback={null}>
          <Door
            knockSignal={knockSignal}
            restDeg={restDeg}
            knockDeg={knockDeg}
            hingeFraction={hingeFraction}
            onFit={setDoorHeight}
            onKnock={handleKnock}
          />
        </Suspense>
        <DoorMist color={fogColor} opacity={mistOpacity} />
        <DoorCameraRig
          fov={fov}
          targetHeight={doorHeight}
          azimuth={azimuth}
          elevation={elevation}
          distance={doorHeight * distanceMult}
          handheld={handheld}
          camRoll={camRoll}
          floatSway={floatSway}
          floatBob={floatBob}
          floatPush={floatPush}
          floatSpeed={floatSpeed}
          approachRef={approachRef}
        />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={8} blur={1.8} far={2} />
      </Canvas>
    </div>
  )
}
