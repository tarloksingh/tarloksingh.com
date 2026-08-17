import { useEffect } from 'react'
import { Center, RoundedBox, useVideoTexture } from '@react-three/drei'
import type { VideoTexture } from 'three'

const SHELL_PROPS = { color: '#1a1b1e', roughness: 0.35, metalness: 0.22 }

const HEIGHT = 1.1
// iPhone-ish 19.5:9, so a portrait screen capture fills the glass exactly.
const WIDTH = HEIGHT * (9 / 19.5)
const DEPTH = 0.055
const BEZEL = 0.022

function Screen({ videoUrl, width, height }: { videoUrl: string; width: number; height: number }) {
  const texture = useVideoTexture(videoUrl) as VideoTexture

  // Same teardown the other video-bearing products need: the hook starts the
  // element but never stops it, and this component remounts every time the
  // rotunda comes back around to its project.
  useEffect(() => {
    return () => {
      const video = texture.image as HTMLVideoElement
      video.pause()
      texture.dispose()
    }
  }, [texture])

  return (
    <mesh position={[0, 0, DEPTH / 2 + 0.001]}>
      <planeGeometry args={[width, height]} />
      {/* Unlit, so the capture reads at its own brightness rather than
          through the low-exposure product-photo grade the stage is lit for. */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export interface Phone3DProps {
  /** Portrait screen capture to loop on the glass. */
  videoUrl: string
  scale?: number
}

/**
 * A phone, for the projects whose product only ever existed as an app. No
 * modelled asset exists for any of them, so the "product" is the handset and
 * the work is what's on its screen.
 */
export default function Phone3D({ videoUrl, scale = 1 }: Phone3DProps) {
  return (
    <Center>
      <group scale={scale}>
        <RoundedBox args={[WIDTH, HEIGHT, DEPTH]} radius={0.05} smoothness={5}>
          <meshStandardMaterial {...SHELL_PROPS} />
        </RoundedBox>
        <Screen videoUrl={videoUrl} width={WIDTH - BEZEL * 2} height={HEIGHT - BEZEL * 2} />
      </group>
    </Center>
  )
}
