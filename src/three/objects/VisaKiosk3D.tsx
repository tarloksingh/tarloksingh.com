import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'
import VisaLogo3D from '../VisaLogo3D'

export default function VisaKiosk3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group>
      {/* plinth */}
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.1, 32]} />
        <meshStandardMaterial {...clayProps('#404349')} />
      </mesh>
      {/* stand */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </mesh>
      {/* body */}
      <RoundedBox args={[0.85, 1.15, 0.14]} radius={0.07} position={[0, 0.35, 0]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* screen */}
      <RoundedBox args={[0.66, 0.9, 0.02]} radius={0.03} position={[0, 0.38, 0.08]}>
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </RoundedBox>
      {/* the wordmark keeps its own brand blue rather than the accent
          colour — it's a real logo, not a generic highlight */}
      <group position={[0, 0.38, 0.095]}>
        <VisaLogo3D width={0.46} />
      </group>
    </group>
  )
}
