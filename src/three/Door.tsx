import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Group, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { gsap } from 'gsap'

const DOOR_URL = '/models/medieval-door.glb'
const DEG = Math.PI / 180

interface DoorNodes {
  puerta1?: Object3D
  puerta2?: Object3D
}

export default function Door({
  knockSignal,
  restDeg,
  knockDeg,
  hingeFraction,
  onFit,
  onKnock
}: {
  knockSignal: number
  restDeg: number
  knockDeg: number
  hingeFraction: number
  onFit: (height: number) => void
  onKnock: () => void
}) {
  const { scene, nodes } = useGLTF(DOOR_URL) as unknown as { scene: Group; nodes: DoorNodes }
  const groundedRef = useRef(false)
  const pivotRef = useRef<Group | null>(null)
  const hingeBoundsRef = useRef({ min: 0, max: 0 })
  const leaf = nodes.puerta2
  const otherLeaf = nodes.puerta1

  useEffect(() => {
    if (groundedRef.current) return
    groundedRef.current = true

    // puerta1's mesh is a true mirror of puerta2's, but the source file poses it
    // wide open (its own translation + rotation) as a hero shot default. Its
    // closed position is simply the empty's identity transform, matching puerta2.
    if (otherLeaf) {
      otherLeaf.position.set(0, 0, 0)
      otherLeaf.rotation.set(0, 0, 0)
    }

    // leaf's own origin sits at the inner seam edge, not necessarily where the
    // hinge should read visually. Wrap it in a pivot group so the hinge point
    // can be tuned live (see hingeFraction: 0 = inner seam, 1 = outer jamb).
    if (leaf && leaf.parent) {
      const leafBox = new Box3().setFromObject(leaf)
      hingeBoundsRef.current = { min: leafBox.min.z, max: leafBox.max.z }
      const pivot = new Group()
      leaf.parent.add(pivot)
      pivot.add(leaf)
      pivotRef.current = pivot
    }

    const box = new Box3().setFromObject(scene)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)

    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y -= box.min.y

    onFit(size.y)
  }, [scene, nodes, leaf, otherLeaf, onFit])

  useEffect(() => {
    if (!pivotRef.current || !leaf) return
    const { min, max } = hingeBoundsRef.current
    const hingeZ = min + (max - min) * hingeFraction
    pivotRef.current.position.z = hingeZ
    leaf.position.z = -hingeZ
  }, [hingeFraction, leaf])

  useEffect(() => {
    if (pivotRef.current) pivotRef.current.rotation.y = restDeg * DEG
  }, [restDeg])

  useEffect(() => {
    if (!pivotRef.current || knockSignal === 0) return
    gsap.to(pivotRef.current.rotation, {
      y: (restDeg + knockDeg) * DEG,
      duration: 0.8,
      ease: 'power2.out'
    })
  }, [knockSignal])

  return (
    <primitive
      object={scene}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onKnock()
      }}
    />
  )
}

useGLTF.preload(DOOR_URL)
