import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'

export default function Motorcycle3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group position={[0, -0.15, 0]}>
      {/* wheels */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, -0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.32, 0.09, 16, 32]} />
          <meshStandardMaterial {...clayProps('#303338')} />
        </mesh>
      ))}
      {/* body */}
      <RoundedBox args={[0.95, 0.28, 0.32]} radius={0.08} position={[0, 0.08, 0]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* seat */}
      <RoundedBox args={[0.4, 0.12, 0.28]} radius={0.05} position={[0.05, 0.24, 0]}>
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </RoundedBox>
      {/* handlebar stem */}
      <mesh position={[-0.42, 0.28, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 12]} />
        <meshStandardMaterial {...clayProps('#7d818a')} />
      </mesh>
      <RoundedBox args={[0.32, 0.05, 0.05]} radius={0.02} position={[-0.55, 0.42, 0]}>
        <meshStandardMaterial {...clayProps('#7d818a')} />
      </RoundedBox>
    </group>
  )
}
