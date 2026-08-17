import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Group, Sprite, SpriteMaterial } from 'three'

function makeSoftCircleTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

const WISP_COUNT = 12

export default function DoorMist({ color = '#c7d0d6', opacity = 0.5 }: { color?: string; opacity?: number }) {
  const texture = useMemo(() => makeSoftCircleTexture(), [])
  const groupRef = useRef<Group>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: WISP_COUNT }, () => ({
        x: (Math.random() - 0.5) * 0.85,
        z: 0.02 + Math.random() * 0.25,
        speed: 0.12 + Math.random() * 0.12,
        offset: Math.random() * 10,
        scale: 0.3 + Math.random() * 0.35
      })),
    []
  )

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const s = seeds[i]
      const sprite = child as Sprite
      const life = ((t * s.speed + s.offset) % 4) / 4
      sprite.position.y = life * 1.4
      sprite.position.x = s.x + Math.sin(t * 0.5 + s.offset) * 0.06
      const mat = sprite.material as SpriteMaterial
      mat.opacity = opacity * Math.sin(life * Math.PI) * 0.6
      const sc = s.scale * (0.6 + life * 0.7)
      sprite.scale.set(sc, sc, 1)
    })
  })

  return (
    <group ref={groupRef} position={[0, 0.02, 0]}>
      {seeds.map((s, i) => (
        <sprite key={i} position={[s.x, 0, s.z]}>
          <spriteMaterial map={texture} color={color} transparent depthWrite={false} blending={AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}
