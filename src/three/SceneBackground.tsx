import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color } from 'three'

export default function SceneBackground({
  progressRef,
  colors
}: {
  progressRef: MutableRefObject<number>
  colors: string[]
}) {
  const { scene } = useThree()
  const palette = useMemo(() => colors.map((c) => new Color(c)), [colors])
  const current = useRef(new Color(colors[0]))

  useFrame(() => {
    const p = progressRef.current
    const i = Math.min(Math.floor(p), palette.length - 1)
    const f = p - i
    const a = palette[i]
    const b = palette[Math.min(i + 1, palette.length - 1)]
    current.current.copy(a).lerp(b, f)
    scene.background = current.current
  })

  return null
}
