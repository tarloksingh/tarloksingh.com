import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

// Sketchfab exports arrive at wildly different scales and origins, so nothing
// here relies on authored units: every model is measured once after load, and
// the resulting numbers drive a wrapper transform.
//
// The measurement must NOT mutate the loaded graph. Re-cloning a model to
// resize it leaves the AnimationMixer bound to the discarded skeleton, and the
// new one just stands there — which is exactly what a size slider used to do.
function measure(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  const centre = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(centre)
  return { size, centre, minY: box.min.y, maxY: box.max.y }
}

interface DancerProps {
  url: string
  position: [number, number, number]
  rotation: number
  height: number
  timeScale: number
}

function Dancer({ url, position, rotation, height, timeScale }: DancerProps) {
  const { scene, animations } = useGLTF(url)

  // Each dancer needs its own copy of the graph — the same GLTF is cached and
  // shared, and a skinned mesh cannot be rendered twice from one instance.
  // Cloned once and never rebuilt, so the mixer keeps its bindings.
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const natural = useMemo(() => measure(cloned), [cloned])

  // Resizing is a wrapper transform, not a rebuild.
  const scale = natural.size.y > 0.0001 ? height / natural.size.y : 1

  const group = useRef<THREE.Group>(null)
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const first = Object.values(actions)[0]
    if (!first) return
    // Offset the start so the crowd isn't locked in perfect unison.
    first.reset().play()
    first.time = Math.random() * (first.getClip().duration || 1)
    return () => {
      first.stop()
    }
  }, [actions])

  useEffect(() => {
    Object.values(actions).forEach((action) => {
      if (action) action.timeScale = timeScale
    })
  }, [actions, timeScale])

  return (
    <group ref={group} position={position} rotation={[0, rotation, 0]}>
      <group
        scale={scale}
        position={[-natural.centre.x * scale, -natural.minY * scale, -natural.centre.z * scale]}
      >
        <primitive object={cloned} />
      </group>
    </group>
  )
}

function Floor({ width }: { width: number }) {
  const { scene, animations } = useGLTF('/models/dance/floor/scene.gltf')
  const group = useRef<THREE.Group>(null)
  const { actions } = useAnimations(animations, group)

  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const natural = useMemo(() => measure(cloned), [cloned])

  const span = Math.max(natural.size.x, natural.size.z)
  const scale = span > 0.0001 ? width / span : 1

  useEffect(() => {
    const first = Object.values(actions)[0]
    first?.reset().play()
  }, [actions])

  return (
    <group ref={group}>
      <group
        scale={scale}
        position={[-natural.centre.x * scale, -natural.maxY * scale, -natural.centre.z * scale]}
      >
        <primitive object={cloned} />
      </group>
    </group>
  )
}

interface CameraRigProps {
  startDistance: number
  endDistance: number
  height: number
  lookHeight: number
  duration: number
  orbitSpeed: number
  floatHeight: number
  floatSpeed: number
  floatSway: number
}

// The camera circles the floor continuously while, for the first `duration`
// seconds, also pulling in from far away on an easing curve. The two clocks are
// kept separate: the dolly clock stops when it arrives, the orbit clock never
// does, so the rotation carries on for as long as the scene is up.
function CameraRig({
  startDistance,
  endDistance,
  height,
  lookHeight,
  duration,
  orbitSpeed,
  floatHeight,
  floatSpeed,
  floatSway
}: CameraRigProps) {
  const { camera } = useThree()
  const orbitTime = useRef(0)
  const dollyTime = useRef(0)

  useEffect(() => {
    dollyTime.current = 0
  }, [startDistance, endDistance, duration])

  useFrame((_, delta) => {
    orbitTime.current += delta
    dollyTime.current = Math.min(dollyTime.current + delta, duration)

    const t = duration > 0 ? dollyTime.current / duration : 1
    // easeOutCubic
    const eased = 1 - Math.pow(1 - t, 3)
    const distance = startDistance + (endDistance - startDistance) * eased

    const angle = orbitTime.current * THREE.MathUtils.degToRad(orbitSpeed)

    // Free-floating drift on top of the orbit: a vertical bob plus a slower
    // in-and-out sway, at different rates so the two never visibly repeat.
    const phase = orbitTime.current * floatSpeed * Math.PI * 2
    const bob = Math.sin(phase) * floatHeight
    const sway = Math.cos(phase * 0.61) * floatSway
    const radius = distance + sway

    camera.position.set(Math.sin(angle) * radius, height + bob, Math.cos(angle) * radius)
    camera.lookAt(0, lookHeight, 0)
  })

  return null
}

export interface DanceFloorSettings {
  floorWidth: number
  dancerHeight: number
  ringRadius: number
  danceSpeed: number
  startDistance: number
  endDistance: number
  cameraHeight: number
  lookHeight: number
  dollyDuration: number
  orbitSpeed: number
  floatHeight: number
  floatSpeed: number
  floatSway: number
  ambient: number
  /** Per-model multiplier on `dancerHeight`, keyed by slug. */
  dancerScales: Record<string, number>
  /** Per-model visibility, keyed by slug. */
  dancerEnabled: Record<string, boolean>
}

// Slug is the key used by the per-dancer size controls.
export const DANCERS = [
  { slug: 'crowd', label: 'Crowd', url: '/models/dance/crowd/scene.gltf' },
  { slug: 'cow', label: 'Cow', url: '/models/dance/cow/scene.gltf' },
  { slug: 'silly', label: 'Silly', url: '/models/dance/silly/scene.gltf' },
  { slug: 'lowpoly', label: 'Lowpoly', url: '/models/dance/lowpoly/scene.gltf' },
  { slug: 'patapim', label: 'Patapim', url: '/models/dance/patapim/scene.gltf' },
  { slug: 'salsa', label: 'Salsa', url: '/models/dance/salsa/scene.gltf' },
  { slug: 'hulk', label: 'Hulk', url: '/models/dance/hulk/scene.gltf' }
] as const

export default function DanceFloorScene(settings: DanceFloorSettings) {
  const {
    floorWidth,
    dancerHeight,
    ringRadius,
    danceSpeed,
    startDistance,
    endDistance,
    cameraHeight,
    lookHeight,
    dollyDuration,
    orbitSpeed,
    floatHeight,
    floatSpeed,
    floatSway,
    ambient,
    dancerScales,
    dancerEnabled
  } = settings

  // Spread the dancers evenly around a ring, each turned to face the middle.
  const placements = useMemo(
    () =>
      DANCERS.map((dancer, index) => {
        const angle = (index / DANCERS.length) * Math.PI * 2
        return {
          ...dancer,
          position: [Math.sin(angle) * ringRadius, 0, Math.cos(angle) * ringRadius] as [number, number, number],
          rotation: angle + Math.PI
        }
      }),
    [ringRadius]
  )

  return (
    <Canvas camera={{ fov: 45, near: 0.1, far: 500, position: [0, cameraHeight, startDistance] }} dpr={[1, 2]}>
      <color attach="background" args={['#05050b']} />
      <fog attach="fog" args={['#05050b', endDistance * 1.5, startDistance * 1.4]} />

      <ambientLight intensity={ambient} />
      <pointLight position={[0, dancerHeight * 3, 0]} intensity={30} color="#ff4fd8" distance={40} />
      <pointLight position={[ringRadius, dancerHeight * 2, ringRadius]} intensity={20} color="#4fd8ff" distance={40} />
      <pointLight position={[-ringRadius, dancerHeight * 2, -ringRadius]} intensity={20} color="#ffe14f" distance={40} />

      <CameraRig
        startDistance={startDistance}
        endDistance={endDistance}
        height={cameraHeight}
        lookHeight={lookHeight}
        duration={dollyDuration}
        orbitSpeed={orbitSpeed}
        floatHeight={floatHeight}
        floatSpeed={floatSpeed}
        floatSway={floatSway}
      />

      <Suspense fallback={null}>
        <Floor width={floorWidth} />
        {placements
          .filter((placement) => dancerEnabled[placement.slug] !== false)
          .map((placement) => (
          <Dancer
            key={placement.slug}
            url={placement.url}
            position={placement.position}
            rotation={placement.rotation}
            height={dancerHeight * (dancerScales[placement.slug] ?? 1)}
            timeScale={danceSpeed}
          />
        ))}
      </Suspense>
    </Canvas>
  )
}
