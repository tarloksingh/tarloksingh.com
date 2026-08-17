import { useEffect } from 'react'
import { Center, RoundedBox, useVideoTexture } from '@react-three/drei'
import type { VideoTexture } from 'three'

const FRAME_PROPS = { color: '#f1f2f4', roughness: 0.35, metalness: 0.08 }
const MAT_PROPS = { color: '#141518', roughness: 0.6, metalness: 0.05 }

const HEIGHT = 1.05
// Stitchfam's footage is native 444×532 — matching that ratio here means the
// frame opening never crops or letterboxes it.
const WIDTH = HEIGHT * (444 / 532)
const FRAME_DEPTH = 0.05
const FRAME_BORDER = 0.06
const MAT_BORDER = 0.04

function Screen({ videoUrl, width, height }: { videoUrl: string; width: number; height: number }) {
  const texture = useVideoTexture(videoUrl) as VideoTexture

  // Same leak risk as the POS station's monitor: the hook plays the video
  // but never tears it down, and this component remounts every time the
  // carousel comes back around to Stitchfam.
  useEffect(() => {
    return () => {
      const video = texture.image as HTMLVideoElement
      video.pause()
      texture.dispose()
    }
  }, [texture])

  return (
    <mesh position={[0, 0, 0.001]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export interface VideoFrameProps {
  videoUrl: string
  scale?: number
}

/**
 * A picture frame standing in for Stitchfam's hero footage — no modelled
 * asset exists, so the "product" is the frame itself: outer shell, a mat
 * border, then the looping video inset like a photo.
 */
export default function VideoFrame({ videoUrl, scale = 1 }: VideoFrameProps) {
  const matWidth = WIDTH - FRAME_BORDER * 2
  const matHeight = HEIGHT - FRAME_BORDER * 2
  const screenWidth = matWidth - MAT_BORDER * 2
  const screenHeight = matHeight - MAT_BORDER * 2

  return (
    <Center>
      <group scale={scale}>
        <RoundedBox args={[WIDTH, HEIGHT, FRAME_DEPTH]} radius={0.015}>
          <meshStandardMaterial {...FRAME_PROPS} />
        </RoundedBox>
        <RoundedBox args={[matWidth, matHeight, 0.02]} radius={0.008} position={[0, 0, FRAME_DEPTH / 2 + 0.005]}>
          <meshStandardMaterial {...MAT_PROPS} />
        </RoundedBox>
        <group position={[0, 0, FRAME_DEPTH / 2 + 0.016]}>
          <Screen videoUrl={videoUrl} width={screenWidth} height={screenHeight} />
        </group>
      </group>
    </Center>
  )
}
