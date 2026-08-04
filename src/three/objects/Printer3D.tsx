import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'

export default function Printer3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group>
      {/* base */}
      <RoundedBox args={[1.5, 0.18, 1.2]} radius={0.06} position={[0, -0.5, 0]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* vertical rods */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.1, -0.45]}>
          <cylinderGeometry args={[0.035, 0.035, 1.3, 16]} />
          <meshStandardMaterial {...clayProps('#7d818a')} />
        </mesh>
      ))}
      {/* gantry bar */}
      <RoundedBox args={[1.3, 0.08, 0.1]} radius={0.03} position={[0, 0.25, -0.45]}>
        <meshStandardMaterial {...clayProps('#7d818a')} />
      </RoundedBox>
      {/* print head */}
      <RoundedBox args={[0.18, 0.16, 0.16]} radius={0.03} position={[0.15, 0.25, -0.3]}>
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </RoundedBox>
      {/* print bed */}
      <RoundedBox args={[0.9, 0.05, 0.8]} radius={0.02} position={[0, -0.38, 0]}>
        <meshStandardMaterial {...clayProps('#404349')} />
      </RoundedBox>
      {/* half-printed part */}
      <mesh position={[0.05, -0.2, 0.05]} rotation={[0, 0.3, 0]}>
        <coneGeometry args={[0.14, 0.32, 4]} />
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </mesh>
    </group>
  )
}
