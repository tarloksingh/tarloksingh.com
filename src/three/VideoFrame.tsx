import { useEffect } from 'react'
import { Center, useVideoTexture } from '@react-three/drei'
import { RoundedBoxLOD as RoundedBox } from './detail'
import type { VideoTexture } from 'three'

const FRAME_PROPS = { color: '#f1f2f4', roughness: 0.35, metalness: 0.08 }

const HEIGHT = 1.05
// Stitchfam's footage is native 444×532 — matching that ratio here means the
// frame opening never crops or letterboxes it.
const WIDTH = HEIGHT * (444 / 532)
const FRAME_DEPTH = 0.05
/* How far the picture stands proud of the shell. Enough to clear it and no
   more: the two are coplanar otherwise and z-fighting is a picture that
   flickers as the subject drifts. */
const LIFT = 0.004

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
 * A picture frame standing in for Stitchfam's hero footage — no modelled asset
 * exists, so the "product" is the frame itself: a shell, and the loop across
 * the whole face of it.
 *
 * **End to end, and the same size as the frame.** It used to be a photo in a
 * mount: a 0.06 shell border and a 0.04 mat inside that, so the picture was
 * about eight tenths of the box with two rings of white and near-black around
 * it. Two things were wrong with that. The obvious one is that the thing being
 * shown is a *film*, and a film in a picture mount is a still that happens to
 * move. The other is arithmetic: both borders are subtracted from the width
 * and the height by the same absolute amount, so the opening is never the
 * shape of the frame — 444 × 532 footage was landing in a 0.72:0.83 hole and
 * being squashed to fit it, which is the crop the aspect constant above exists
 * to prevent. The picture is the face of the frame now, corner to corner, and
 * the shell is what you see edge-on.
 */
export default function VideoFrame({ videoUrl, scale = 1 }: VideoFrameProps) {
  return (
    <Center>
      <group scale={scale}>
        <RoundedBox args={[WIDTH, HEIGHT, FRAME_DEPTH]} radius={0.015}>
          <meshStandardMaterial {...FRAME_PROPS} />
        </RoundedBox>
        <group position={[0, 0, FRAME_DEPTH / 2 + LIFT]}>
          <Screen videoUrl={videoUrl} width={WIDTH} height={HEIGHT} />
        </group>
      </group>
    </Center>
  )
}
