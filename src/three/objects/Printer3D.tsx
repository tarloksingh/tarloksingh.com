import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { CLAY_BODY, clayProps, accentProps } from '../Clay'
import type { Group, Mesh } from 'three'

// Seconds for one print, base to full height, before it resets and starts
// the next one.
const PRINT_CYCLE = 4
const PART_BASE_Y = -0.36
const PART_HEIGHT = 0.32

export default function Printer3D({ accent, hovered }: { accent: string; hovered: boolean }) {
  const headRef = useRef<Group>(null)
  const partRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % PRINT_CYCLE) / PRINT_CYCLE // 0 → 1 sawtooth

    if (headRef.current) {
      // A handful of passes across the bed per print, drifting forward as
      // it goes, so it reads as tracing a part rather than sliding once.
      headRef.current.position.x = Math.sin(t * Math.PI * 10) * 0.28
      headRef.current.position.z = -0.3 + t * 0.5
    }
    if (partRef.current) {
      // Grows from the bed up as the head passes over it, then resets —
      // additive per layer, not a bounce back down.
      const grown = Math.max(0.05, t)
      partRef.current.scale.y = grown
      partRef.current.position.y = PART_BASE_Y + (PART_HEIGHT * grown) / 2
    }
  })

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
      <group ref={headRef} position={[0, 0.25, -0.3]}>
        <RoundedBox args={[0.18, 0.16, 0.16]} radius={0.03}>
          <meshStandardMaterial {...accentProps(accent, hovered)} />
        </RoundedBox>
      </group>
      {/* print bed */}
      <RoundedBox args={[0.9, 0.05, 0.8]} radius={0.02} position={[0, -0.38, 0]}>
        <meshStandardMaterial {...clayProps('#404349')} />
      </RoundedBox>
      {/* part, growing layer by layer */}
      <mesh ref={partRef} position={[0.05, PART_BASE_Y, 0.05]} rotation={[0, 0.3, 0]}>
        <coneGeometry args={[0.14, PART_HEIGHT, 4]} />
        <meshStandardMaterial {...accentProps(accent, hovered)} />
      </mesh>
    </group>
  )
}
