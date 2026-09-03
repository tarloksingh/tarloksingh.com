import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { MathUtils, type Group } from 'three'
import type { EraObject } from '../data/eras'
import { OBJECT_COMPONENTS } from '../../three/objects'

export default function EraObjectItem({
  data,
  accent,
  selected,
  onSelect
}: {
  data: EraObject
  accent: string
  selected: boolean
  onSelect: (obj: EraObject | null) => void
}) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)
  const Component = OBJECT_COMPONENTS[data.component]

  const lifted = hovered || selected

  useFrame((_, delta) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * 0.12
    }
    if (!groupRef.current) return
    const targetY = data.position[1] + (lifted ? 0.32 : 0)
    const targetScale = lifted ? 1.08 : 1
    groupRef.current.position.y = MathUtils.lerp(groupRef.current.position.y, targetY, 0.14)
    const s = groupRef.current.scale
    s.setScalar(MathUtils.lerp(s.x, targetScale, 0.14))
  })

  if (!Component) return null

  return (
    <group position={[data.position[0], data.position[1], data.position[2]]}>
      <group
        ref={groupRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(selected ? null : data)
        }}
      >
        <group ref={spinRef}>
          <Component accent={accent} hovered={lifted} />
        </group>
      </group>

      <Html position={[0, 0.78, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div className={`object-label ${lifted ? 'is-active' : ''}`}>
          <span className="object-label-tick" />
          <span className="object-label-title">{data.title}</span>
          <span className="object-label-years">{data.years}</span>
        </div>
      </Html>
    </group>
  )
}
