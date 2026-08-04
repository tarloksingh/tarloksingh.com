import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'

export default function Camera3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group>
      {/* body */}
      <RoundedBox args={[1.1, 0.68, 0.6]} radius={0.09} position={[0, 0, 0]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* viewfinder bump */}
      <RoundedBox args={[0.35, 0.2, 0.4]} radius={0.05} position={[-0.15, 0.42, -0.02]}>
        <meshStandardMaterial {...clayProps('#404349')} />
      </RoundedBox>
      {/* lens barrel */}
      <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 0.4, 32]} />
        <meshStandardMaterial {...clayProps('#303338')} />
      </mesh>
      {/* lens glass ring */}
      <mesh position={[0, 0, 0.63]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.03, 16, 32]} />
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </mesh>
      {/* dials */}
      {[-0.35, 0].map((x, i) => (
        <mesh key={i} position={[x, 0.36, -0.1]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 20]} />
          <meshStandardMaterial {...clayProps('#7d818a')} />
        </mesh>
      ))}
    </group>
  )
}
