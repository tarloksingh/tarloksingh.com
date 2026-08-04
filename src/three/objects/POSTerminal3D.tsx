import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'

export default function POSTerminal3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group>
      {/* base */}
      <RoundedBox args={[0.9, 0.7, 0.6]} radius={0.08} position={[0, -0.1, 0]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* angled screen */}
      <group position={[0, 0.35, -0.05]} rotation={[-0.45, 0, 0]}>
        <RoundedBox args={[0.75, 0.55, 0.04]} radius={0.03}>
          <meshStandardMaterial {...accentProps(accent, hovered)} />
        </RoundedBox>
      </group>
      {/* card slot */}
      <RoundedBox args={[0.5, 0.04, 0.06]} radius={0.01} position={[0, 0.15, 0.31]}>
        <meshStandardMaterial {...clayProps('#303338')} />
      </RoundedBox>
      {/* floating card */}
      <RoundedBox args={[0.42, 0.26, 0.02]} radius={0.03} position={[0.55, -0.05, 0.35]} rotation={[0.1, -0.4, 0.15]}>
        <meshStandardMaterial {...clayProps('#404349')} />
      </RoundedBox>
    </group>
  )
}
