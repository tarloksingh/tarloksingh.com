import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'

const SLIDERS = [
  { x: -0.36, h: 0.1 },
  { x: -0.12, h: 0.4 },
  { x: 0.12, h: -0.05 },
  { x: 0.36, h: 0.25 }
]

export default function SliderPanel3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  return (
    <group>
      {/* panel */}
      <RoundedBox args={[1.1, 0.9, 0.12]} radius={0.06} position={[0, 0, -0.1]}>
        <meshStandardMaterial {...clayProps(CLAY_BODY)} />
      </RoundedBox>
      {/* slider tracks + knobs */}
      {SLIDERS.map((s, i) => (
        <group key={i} position={[s.x, 0, 0]}>
          <RoundedBox args={[0.06, 0.7, 0.04]} radius={0.02} position={[0, 0, -0.02]}>
            <meshStandardMaterial {...clayProps('#7d818a')} />
          </RoundedBox>
          <mesh position={[0, s.h, 0.03]}>
            <boxGeometry args={[0.16, 0.09, 0.09]} />
            <meshStandardMaterial {...accentProps(accent, hovered)} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
