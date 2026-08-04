import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'

export default function TutorBot3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group>
      {/* body */}
      <RoundedBox args={[0.5, 0.55, 0.35]} radius={0.12} position={[0, -0.28, 0]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* head */}
      <mesh position={[0, 0.2, 0]} scale={[1, 0.9, 0.95]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </mesh>
      {/* face plate */}
      <RoundedBox args={[0.4, 0.24, 0.04]} radius={0.06} position={[0, 0.18, 0.33]}>
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </RoundedBox>
      {/* antennae */}
      {[-0.16, 0.16].map((x) => (
        <group key={x} position={[x, 0.6, 0]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
            <meshStandardMaterial {...clayProps('#7d818a')} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial {...accentProps(accent, hovered)} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
