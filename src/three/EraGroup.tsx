import { ContactShadows, RoundedBox } from '@react-three/drei'
import type { Era, EraObject } from '../data/eras'
import EraObjectItem from './EraObjectItem'

const TABLE_TOP = -0.86
const TABLE_HALF_DEPTH = 1.3
const TABLE_WIDTH = 8
const TABLE_THICKNESS = 0.55

export default function EraGroup({
  era,
  x,
  selectedId,
  onSelect
}: {
  era: Era
  x: number
  selectedId: string | null
  onSelect: (obj: EraObject | null) => void
}) {
  return (
    <group position={[x, 0, 0]}>
      <RoundedBox
        args={[TABLE_WIDTH, TABLE_THICKNESS, TABLE_HALF_DEPTH * 2]}
        radius={0.04}
        position={[0, TABLE_TOP - TABLE_THICKNESS / 2, 0]}
      >
        <meshStandardMaterial color="#3d4046" roughness={0.5} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0, TABLE_TOP, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TABLE_WIDTH - 0.2, TABLE_HALF_DEPTH * 2 - 0.2]} />
        <meshStandardMaterial
          color={era.color}
          emissive={era.color}
          emissiveIntensity={0.2}
          roughness={0.35}
          metalness={0.5}
          transparent
          opacity={0.2}
        />
      </mesh>
      {[TABLE_HALF_DEPTH, -TABLE_HALF_DEPTH].map((z) => (
        <RoundedBox key={z} args={[TABLE_WIDTH + 0.05, 0.02, 0.035]} radius={0.008} position={[0, TABLE_TOP - 0.001, z]}>
          <meshStandardMaterial
            color="#ff4a3d"
            emissive="#ff4a3d"
            emissiveIntensity={2}
            roughness={0.3}
            metalness={0.2}
          />
        </RoundedBox>
      ))}
      {era.objects.map((obj) => (
        <EraObjectItem
          key={obj.id}
          data={obj}
          accent={era.color}
          selected={selectedId === obj.id}
          onSelect={onSelect}
        />
      ))}
      <ContactShadows position={[0, TABLE_TOP + 0.001, 0]} opacity={0.55} scale={TABLE_WIDTH} blur={1.8} far={1.2} />
    </group>
  )
}
