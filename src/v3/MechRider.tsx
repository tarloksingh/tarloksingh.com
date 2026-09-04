import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, HueSaturation, Vignette } from '@react-three/postprocessing'
import {
  ACESFilmicToneMapping,
  Box3,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial
} from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { projects } from '../data/projects'

/* ---- Solomon's rider, the dark version ----

   Every other subject in the bank shares one canvas and one studio rig (see
   `MechSlots.tsx`). This one does not. The rider was authored for the game as
   a black-leather / black-metal look that only reads under a specific dim,
   *environment-less* rig with ACES tone mapping and bloom on the red
   taillight — drop it in the shared `RoomEnvironment` turntable and it goes
   flat grey. Bloom and exposure are whole-canvas settings, so the real look
   needs a canvas of its own: one extra WebGL context, spent on the one
   subject on the page that is a game.

   Spec and line numbers: `~/Documents/GitHub/solomon-game/PORTFOLIO-RIDER-HANDOFF.md`.
   The GLB ships with its original light-grey baked textures; the dark look is
   four material lines per mesh, applied here after load. */

const SRC = '/models/akira-rider.glb'
const DRACO_PATH = '/draco/'

/** Radians the rig rocks either side of its three-quarter-rear bias. A rock,
 *  not a turntable — the taillight has to stay in frame for the bloom to have
 *  anything to do. */
const YAW_BIAS = -0.3
const YAW_SWING = 0.22

/** The dark look, applied by traversing the loaded scene.
 *
 *  Tint the baked map, never replace the material — `.color` multiplies the
 *  bake, so every seam and crease survives; a fresh `MeshStandardMaterial`
 *  throws it away and the jacket turns to plastic. The metalness/roughness
 *  maps are nulled *on purpose*: this asset's metallic map is almost pure
 *  black and `material.metalness` multiplies it, so with the map in place the
 *  0.8 below multiplies to ~0 and does nothing. The normal map stays. */
function darken(root: Group) {
  root.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as MeshStandardMaterial
    if (!mat || !('color' in mat)) return
    const isRider = /Akira_Guy/i.test(mesh.name)
    mat.metalnessMap = null
    mat.roughnessMap = null
    if (isRider) {
      mat.color.setRGB(0.05, 0.05, 0.055)
      mat.roughness = 0.4
      mat.metalness = 0.15
    } else {
      // bike body panels (node_0*) and everything else metal on the machine
      mat.color.setRGB(0.03, 0.03, 0.035)
      mat.roughness = 0.25
      mat.metalness = 0.8
    }
    mat.needsUpdate = true
  })
}

/** The rig: GLB normalised by *height* to 2.9 units (not to a unit cube — the
 *  light distances below are written in units where the rider is 2.9 tall),
 *  sat on the ground, centred in x/z, then shifted so its middle is the
 *  origin the canvas camera already looks at. */
function Rider({
  live,
  show,
  place = [0.35, -1.2, 0]
}: {
  live: boolean
  show: boolean
  /** Where the rig sits — the slot and the project stage frame it differently. */
  place?: [number, number, number]
}) {
  const { scene } = useGLTF(SRC, DRACO_PATH)
  const copy = useMemo(() => {
    const c = cloneSkinned(scene) as Group
    const box = new Box3().setFromObject(c)
    const size = box.getSize(new Vector3())
    c.scale.setScalar(2.9 / (size.y || 1))
    const box2 = new Box3().setFromObject(c)
    const center = box2.getCenter(new Vector3())
    c.position.set(-center.x, -box2.min.y, -center.z)
    darken(c)
    return c
  }, [scene])

  const rig = useRef<Group>(null)
  const at = useRef({ scale: 0 })

  useFrame((state, delta) => {
    const node = rig.current
    if (!node) return
    const t = state.clock.elapsedTime
    const k = 1 - Math.pow(0.4, delta)
    at.current.scale += ((show ? (live ? 1.08 : 1) : 0) - at.current.scale) * k
    node.scale.setScalar(at.current.scale)
    node.rotation.y = YAW_BIAS + Math.sin(t * 0.3) * YAW_SWING
    node.position.set(place[0], place[1] + Math.sin(t * 0.5) * 0.02, place[2])
  })

  return (
    <group ref={rig}>
      <primitive object={copy} />

      {/* The taillight — the one colour in a black-and-white frame. An unlit
          box plus the additive halo plus bloom is what makes it *glow*; on its
          own it is a dull salmon rectangle. Coords measured off the export:
          a wide thin slot at y 1.80, rear face near z 2.10. */}
      <mesh position={[-0.03, 1.86, 2.0]} scale={[0.34, 0.07, 1]}>
        <boxGeometry args={[1, 1, 0.09]} />
        <meshBasicMaterial color="#ff2a12" toneMapped={false} />
      </mesh>
      <pointLight color="#ff2020" intensity={1.6} distance={4} decay={2} position={[-0.03, 1.86, 2.25]} />

      {/* The rig — five neutral-grey lights, no environment map anywhere. The
          near-black wet read on the bike is the *absence* of an environment:
          metalness 0.8 with nothing to reflect leaves only the specular from
          these four. */}
      <ambientLight color="#606060" intensity={0.7} />
      <directionalLight color="#b2b2b2" intensity={0.62} position={[-6, 20, 8]} />
      <pointLight color="#9a9a9a" intensity={8} distance={14} decay={2} position={[-3, 7, 12]} />
      {/* a second grey rim from the camera side so the specular edges read at
          slot size — the game frames this much larger */}
      <pointLight color="#8f8f8f" intensity={5} distance={16} decay={2} position={[5, 3, 9]} />
    </group>
  )
}

/** The bay for slot `a-game`. A plain element `SlotBox` styles exactly as it
 *  styles a `<SlotView>`, with this subject's own `<Canvas>` laid into it. */
export function RiderSlot({ live, arrive }: { live: boolean; arrive: boolean }) {
  const [mounted, setMounted] = useState(arrive)
  useEffect(() => {
    if (arrive) setMounted(true)
  }, [arrive])

  return (
    <span className="mech-slot-shot">
      {mounted && (
        <Canvas
          className="mech-rider-gl"
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [2.7, 1.05, 6.3], fov: 30 }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
          }}
        >
          <Suspense fallback={null}>
            <Rider live={live} show={arrive} />
          </Suspense>
          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.35} luminanceSmoothing={0.3} radius={0.6} mipmapBlur />
            <HueSaturation saturation={0.26} />
            <Vignette darkness={0.32} eskil={false} />
          </EffectComposer>
        </Canvas>
      )}
    </span>
  )
}

/** The rider as a project screen's stage subject.
 *
 *  Same scene as the bank slot, framed for room: the Solomon project has no
 *  case study yet, so instead of the "no material" card it gets the subject
 *  itself, large. This canvas is the whole point of the handoff's §5 — a
 *  three-quarter rear view with the taillight blooming, which the 65px bay
 *  could only hint at. Its own context; mounted only on `/v3/p/a-game`.
 *
 *  Camera and grade are eyeballed and belong on a panel eventually, same as
 *  the slot's. Bloom runs at the game's own baked numbers here (threshold 0,
 *  strength ~0.5) because there is finally the resolution to carry them. */
export function RiderStage({ live = true }: { live?: boolean }) {
  return (
    <Canvas
      className="mech-rider-gl"
      dpr={[1, 2]}
      frameloop={live ? 'always' : 'never'}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace
      }}
      camera={{ position: [5.0, 3.3, 13.5], fov: 24 }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05
        gl.setClearAlpha(0)
      }}
    >
      <Suspense fallback={null}>
        <Rider live show place={[0, -1.35, 0]} />
      </Suspense>
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.35} luminanceSmoothing={0.3} radius={0.7} mipmapBlur />
        <HueSaturation saturation={0.26} />
        <Vignette darkness={0.45} eskil={false} />
      </EffectComposer>
    </Canvas>
  )
}

/* **Only if anything can actually draw it.** This is module scope, and
   `MechBank.tsx` imports `RiderSlot` statically, so this line runs on every
   page that mounts the bank — which is every page. Solomon is `locked: true`
   in `projects.ts` today, and both of the places that would render the rider
   check that same fact before mounting: the bay falls back to `no signal`
   (`slot.solid` is `hasSubject(id) && !locked`) and the project screen shows
   the lock card instead of the stage (`riderStage` in `Mech.tsx`). So the
   preload was fetching a 4.4 MB model — 1.1 MB now that it is Draco — on
   every load of home, for a subject nothing on the site could put on screen.

   Reading the flag rather than deleting the line is what makes it
   self-correcting: unlock Solomon and the preload comes back with the
   rendering, because it is keyed on the same data both call sites are. */
if (!projects.find((p) => p.id === 'a-game')?.locked) useGLTF.preload(SRC, DRACO_PATH)
