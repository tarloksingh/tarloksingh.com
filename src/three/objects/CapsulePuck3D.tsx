import { CLAY_BODY, clayProps, accentProps } from '../Clay'

export default function CapsulePuck3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* the capsule itself */}
      <mesh>
        <capsuleGeometry args={[0.45, 0.1, 8, 32]} />
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </mesh>
      {/* sensor band */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.035, 16, 48]} />
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </mesh>
    </group>
  )
}
