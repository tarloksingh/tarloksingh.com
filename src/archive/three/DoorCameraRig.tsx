import { useRef } from 'react'
import type { RefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'

const DEG = Math.PI / 180

// Ported from solomon-game/game-3d's handheld camera drift (index.html ~L276, ~L3495-3521):
// non-harmonic sine sum -> smooth, non-repeating organic motion instead of a robotic loop.
function hhNoise(t: number, s: number) {
  return (
    (Math.sin(t * 1.0 + s) +
      Math.sin(t * 1.73 + s * 1.7) * 0.6 +
      Math.sin(t * 2.61 + s * 0.4) * 0.4 +
      Math.sin(t * 0.41 + s * 2.3) * 0.8 +
      Math.sin(t * 3.37 + s * 1.1) * 0.25) /
    3.05
  )
}

export interface DoorCameraParams {
  fov: number
  targetHeight: number
  azimuth: number
  elevation: number
  distance: number
  handheld: number
  camRoll: number
  floatSway: number
  floatBob: number
  floatPush: number
  floatSpeed: number
  approachRef?: RefObject<{ value: number }>
}

export default function DoorCameraRig(params: DoorCameraParams) {
  const { camera } = useThree()
  const lastFov = useRef<number | null>(null)

  useFrame((state) => {
    if (lastFov.current !== params.fov) {
      lastFov.current = params.fov
      const perspCamera = camera as PerspectiveCamera
      perspCamera.fov = params.fov
      perspCamera.updateProjectionMatrix()
    }

    const t = state.clock.elapsedTime
    const targetY = params.targetHeight * 0.45
    const az = params.azimuth * DEG
    const el = params.elevation * DEG

    // walking-through-the-door push-in: shrinks the orbit distance toward the
    // threshold as approach goes 0 -> 1, without literally clipping into the mesh
    const approach = params.approachRef?.current?.value ?? 0
    const distance = params.distance * (1 - approach * 0.92)

    const baseX = Math.sin(az) * Math.cos(el) * distance
    const baseZ = Math.cos(az) * Math.cos(el) * distance
    const baseY = targetY + Math.sin(el) * distance

    let cx = baseX
    let cy = baseY
    let cz = baseZ
    let roll = 0

    if (params.handheld > 0) {
      const ft = t * params.floatSpeed
      const g = params.handheld * (0.5 + 0.5 * hhNoise(ft * 0.17, 7.0))
      cx += hhNoise(ft, 0.0) * 0.05 * g * params.floatSway
      cy += hhNoise(ft, 31.0) * 0.035 * g * params.floatBob
      cz += hhNoise(ft, 53.0) * 0.05 * g * params.floatPush
      roll += hhNoise(ft, 71.0) * 0.007 * g
    }

    if (params.camRoll > 0) {
      roll += (Math.sin(t * 0.37) * 0.75 + Math.sin(t * 0.19 + 2.1) * 0.25) * params.camRoll * DEG
    }

    camera.position.set(cx, cy, cz)
    camera.lookAt(0, targetY, 0)
    camera.rotation.z += roll
  })

  return null
}
