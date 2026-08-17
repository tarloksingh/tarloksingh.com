import { useEffect } from 'react'
import { Center, RoundedBox, useVideoTexture } from '@react-three/drei'
import type { VideoTexture } from 'three'

// Matches the gloss-white/black look the glTF hero products (Capsule C1,
// Mr. Takahashi) render with under the same studio environment, rather than
// the gunmetal "Clay" material the small timeline-ring icons use — this
// sits on the same stage as those, so it needs to read as one family.
const BODY_PROPS = { color: '#f1f2f4', roughness: 0.35, metalness: 0.08 }
const TRIM_PROPS = { color: '#1b1d21', roughness: 0.5, metalness: 0.15 }
const CHROME_PROPS = { color: '#c7cbd2', roughness: 0.25, metalness: 0.85 }
const KEY_PROPS = { color: '#eceef1', roughness: 0.5, metalness: 0.05 }

function Keypad({ rows, cols, keyWidth, keyHeight, gapX, gapY, z }: {
  rows: number
  cols: number
  keyWidth: number
  keyHeight: number
  gapX: number
  gapY: number
  z: number
}) {
  const count = rows * cols
  const originX = ((cols - 1) * gapX) / 2
  const originY = ((rows - 1) * gapY) / 2
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return (
          <RoundedBox
            key={i}
            args={[keyWidth, keyHeight, 0.012]}
            radius={Math.min(keyWidth, keyHeight) * 0.18}
            position={[col * gapX - originX, originY - row * gapY, z]}
          >
            <meshStandardMaterial {...KEY_PROPS} />
          </RoundedBox>
        )
      })}
    </>
  )
}

function CashRegister() {
  return (
    <group position={[-0.34, -0.42, 0]}>
      {/* body */}
      <RoundedBox args={[0.62, 0.3, 0.42]} radius={0.035} position={[0, 0.15, 0]}>
        <meshStandardMaterial {...BODY_PROPS} />
      </RoundedBox>
      {/* drawer face, sitting flush in the front */}
      <RoundedBox args={[0.56, 0.1, 0.015]} radius={0.01} position={[0, 0.03, 0.21]}>
        <meshStandardMaterial {...TRIM_PROPS} />
      </RoundedBox>
      <RoundedBox args={[0.26, 0.014, 0.01]} radius={0.006} position={[0, 0.03, 0.219]}>
        <meshStandardMaterial {...CHROME_PROPS} />
      </RoundedBox>
      {/* angled keypad deck */}
      <group position={[0, 0.33, -0.03]} rotation={[-0.35, 0, 0]}>
        <RoundedBox args={[0.5, 0.28, 0.03]} radius={0.02}>
          <meshStandardMaterial {...TRIM_PROPS} />
        </RoundedBox>
        <Keypad rows={4} cols={3} keyWidth={0.1} keyHeight={0.05} gapX={0.13} gapY={0.065} z={0.02} />
      </group>
    </group>
  )
}

function CardReader() {
  return (
    <group position={[0.4, -0.46, 0.1]} rotation={[0, -0.5, 0]}>
      {/* base */}
      <RoundedBox args={[0.24, 0.06, 0.34]} radius={0.025} position={[0, 0.03, 0]}>
        <meshStandardMaterial {...BODY_PROPS} />
      </RoundedBox>
      {/* card slot along the side */}
      <RoundedBox args={[0.2, 0.012, 0.018]} radius={0.004} position={[0, 0.062, 0.02]}>
        <meshStandardMaterial color="#0c0d0f" roughness={0.6} metalness={0} />
      </RoundedBox>
      {/* angled face: small display + numeric pad */}
      <group position={[0, 0.1, -0.06]} rotation={[-0.55, 0, 0]}>
        <RoundedBox args={[0.2, 0.24, 0.02]} radius={0.015}>
          <meshStandardMaterial {...TRIM_PROPS} />
        </RoundedBox>
        <mesh position={[0, 0.06, 0.011]}>
          <planeGeometry args={[0.15, 0.08]} />
          <meshStandardMaterial
            color="#3c5c7c"
            emissive="#254258"
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
        <group position={[0, -0.01, 0.011]}>
          <Keypad rows={2} cols={3} keyWidth={0.04} keyHeight={0.025} gapX={0.05} gapY={0.032} z={0} />
        </group>
      </group>
    </group>
  )
}

function Screen({ videoUrl, width, height }: { videoUrl: string; width: number; height: number }) {
  const texture = useVideoTexture(videoUrl) as VideoTexture

  // The hook plays the video but never tears it down — left alone, every
  // carousel cycle through this project leaves another <video> decoding
  // off-screen. The stage remounts this component each time it comes back
  // around, so the leak is real, not theoretical.
  useEffect(() => {
    return () => {
      const video = texture.image as HTMLVideoElement
      video.pause()
      texture.dispose()
    }
  }, [texture])

  return (
    <mesh position={[0, 0, 0.014]}>
      <planeGeometry args={[width, height]} />
      {/* Unlit and untone-mapped so the footage reads at its own brightness
          rather than through the low-exposure "product photo" grade the
          rest of the stage is lit for. */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function Monitor({ videoUrl }: { videoUrl: string }) {
  const screenWidth = 0.62
  const screenHeight = screenWidth * (9 / 16)

  return (
    <group position={[0, 0.05, -0.12]}>
      {/* neck */}
      <mesh position={[0, -0.27, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.42, 16]} />
        <meshStandardMaterial {...CHROME_PROPS} />
      </mesh>
      {/* foot */}
      <RoundedBox args={[0.22, 0.02, 0.16]} radius={0.008} position={[0, -0.48, 0.03]}>
        <meshStandardMaterial {...CHROME_PROPS} />
      </RoundedBox>
      {/* head: bezel tilts back slightly, the way a monitor actually sits */}
      <group rotation={[-0.08, 0, 0]}>
        <RoundedBox args={[screenWidth + 0.035, screenHeight + 0.035, 0.02]} radius={0.012}>
          <meshStandardMaterial {...TRIM_PROPS} />
        </RoundedBox>
        <Screen videoUrl={videoUrl} width={screenWidth} height={screenHeight} />
      </group>
    </group>
  )
}

export interface PosStationProps {
  /** Looping footage for the monitor — the register and reader are modelled
   *  but static, the way they'd sit idle next to whatever's on screen. */
  videoUrl: string
  scale?: number
}

/**
 * Hand-built rather than a glTF import: there's no scanned or modelled
 * asset for this project, so the counter — register, card reader, monitor —
 * is assembled here from primitives in the same material language
 * LoadedModel normalises glTF imports into.
 */
export default function PosStation({ videoUrl, scale = 1 }: PosStationProps) {
  return (
    <Center>
      <group scale={scale}>
        <CashRegister />
        <CardReader />
        <Monitor videoUrl={videoUrl} />
      </group>
    </Center>
  )
}
