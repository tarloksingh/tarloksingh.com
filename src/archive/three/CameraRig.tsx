import { useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'

export default function CameraRig({
  progressRef,
  spacing
}: {
  progressRef: MutableRefObject<number>
  spacing: number
}) {
  const { camera, pointer } = useThree()
  const lookTarget = useRef(new Vector3())

  useFrame(() => {
    const targetX = progressRef.current * spacing
    camera.position.x = MathUtils.lerp(camera.position.x, targetX + pointer.x * 0.4, 0.06)
    camera.position.y = MathUtils.lerp(camera.position.y, 1.3 - pointer.y * 0.2, 0.06)
    lookTarget.current.set(targetX, -0.5, 0)
    camera.lookAt(lookTarget.current)
  })

  return null
}
