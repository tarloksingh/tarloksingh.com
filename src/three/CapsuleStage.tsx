import { Suspense, forwardRef, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Center, Float, useAnimations, useGLTF, useTexture } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, Color, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import PosStation from './PosStation'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera } from 'three'
import type { MutableRefObject } from 'react'

export const MODEL_URL = '/models/capsule-c1.glb'

/**
 * The export is Draco-compressed, so a decoder is required. Pointing at our
 * own copy rather than letting drei fall back to Google's CDN keeps the page
 * free of third-party requests — the files come from three's own bundle,
 * copied into public/draco.
 */
const DRACO_PATH = '/draco/'

/**
 * World units the model's longest edge is normalised to before framing.
 * Chosen so the product sits inside the ring rather than swallowing it — at
 * the default lens and distance this puts it around half the ring's width.
 */
export const TARGET_SIZE = 1.1

/**
 * Lens focal length in mm to three's vertical field of view, against a 35mm
 * full-frame back (24mm tall). Quoting the lens is how the look actually gets
 * described — "50mm, not a wide angle" — and a raw fov number hides the fact
 * that the default 35° was somewhere around a 24mm lens.
 */
export function fovForFocalLength(mm: number) {
  return (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI
}

interface EntranceProps {
  children: React.ReactNode
  /** World units below its resting place that the product starts from. */
  from: number
  /** Degrees of turn it unwinds through on the way in. */
  turn: number
  delay: number
  duration: number
}

/**
 * Rises the product into place from below the frame while the copy is still
 * revealing.
 *
 * It wraps Float rather than sitting inside it, so the drift is already
 * running as the product arrives and the two never fight over position.y —
 * the entrance moves the parent, Float moves the child.
 *
 * Position only, deliberately: scaling it up would read as the product
 * approaching the camera, and the page holds a fixed lens on a fixed subject.
 */
function Entrance({ children, from, turn, delay, duration }: EntranceProps) {
  const ref = useRef<Group>(null)
  const startedAt = useRef(0)
  const settled = useRef(false)

  useEffect(() => {
    startedAt.current = performance.now()
    settled.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (ref.current) {
      ref.current.position.y = settled.current ? 0 : from
      ref.current.rotation.y = settled.current ? 0 : (turn * Math.PI) / 180
    }
  }, [from, turn, delay, duration])

  // Progress is read from the wall clock rather than summed frame deltas.
  // The two only agree while frames are arriving steadily, and the first
  // second of this page is exactly when they are not — decoding the model
  // can starve the loop outright. Summing deltas there strands the product
  // below the frame and it never climbs back; against the clock, whatever
  // frame lands next is already in the right place.
  useFrame(() => {
    const group = ref.current
    if (!group || settled.current) return

    const seconds = (performance.now() - startedAt.current) / 1000
    const t = Math.min(1, Math.max(0, (seconds - delay) / duration))
    // power3.out, to match the easing the copy reveals on.
    const remaining = Math.pow(1 - t, 3)
    group.position.y = from * remaining
    // Unwinding a turn as it arrives is what stops the entrance reading as a
    // slide: the product is already rotating when it lands, and hands that
    // motion straight over to the idle float.
    group.rotation.y = ((turn * Math.PI) / 180) * remaining
    if (t >= 1) {
      group.position.y = 0
      group.rotation.y = 0
      settled.current = true
    }
  })

  return <group ref={ref}>{children}</group>
}

interface SpinProps {
  children: React.ReactNode
  rpm: number
  /** Extra rpm read live each frame — how scroll drives the spin without a
   *  React re-render on every tick. */
  spinRef?: MutableRefObject<number>
}

function Spin({ children, rpm, spinRef }: SpinProps) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    const total = rpm + (spinRef?.current ?? 0)
    ref.current.rotation.y += (total / 60) * Math.PI * 2 * delta
  })
  return <group ref={ref}>{children}</group>
}

interface CameraRigProps {
  focalLength: number
  exposure: number
  /** Degrees around the model, 0 being straight on. */
  azimuth: number
  /** Degrees above the model's centre line. */
  elevation: number
  distance: number
}

/**
 * Places the camera on a sphere around the model and keeps it aimed at the
 * centre.
 *
 * The aiming is the important part. A camera is only given a position, and it
 * still points down its own -Z — so lifting it to look "down" on the product
 * without re-aiming just slides the product to the bottom of frame, where
 * turning it reads as an off-centre wobble rather than a spin in place.
 */
function CameraRig({ focalLength, exposure, azimuth, elevation, distance }: CameraRigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    camera.updateProjectionMatrix()
  }, [camera, focalLength])

  useEffect(() => {
    const a = (azimuth * Math.PI) / 180
    const e = (elevation * Math.PI) / 180
    camera.position.set(
      distance * Math.cos(e) * Math.sin(a),
      distance * Math.sin(e),
      distance * Math.cos(e) * Math.cos(a)
    )
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, azimuth, elevation, distance])

  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}

/**
 * The case is gloss white over a black face, and a gloss surface shows
 * reflection rather than diffuse colour — with nothing to reflect it renders
 * as a flat silhouette that no amount of extra lights fixes. RoomEnvironment
 * builds that environment procedurally inside three, so the page still makes
 * no request for an HDRI.
 */
export function StudioEnvironment({ intensity }: { intensity: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = target.texture
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  return null
}

interface LoadedModelProps {
  url: string
  scale: number
  /** Colour for materials that arrived without a pbrMetallicRoughness block. */
  fallbackColor: string
  /** Added to every real material's exported metalness/roughness, then
   *  clamped to [0, 1] — additive rather than a multiplier, because a model
   *  exported fully non-metallic (as this one is) has nothing for a scale to
   *  multiply. All three default to a no-op, so a caller that doesn't pass
   *  them gets exactly the old behaviour. */
  metalnessBoost?: number
  roughnessBoost?: number
  /** Multiplies `envMapIntensity` on top of whatever the room's `lift` prop
   *  already sets — see the note on `lift` in products.tsx. */
  liftBoost?: number
  /** Extra tilt in degrees, on top of the per-project `turn` the row already
   *  applies about Y — these are about X and Z, for posing the piece rather
   *  than spinning it. */
  tiltX?: number
  tiltZ?: number
}

/** Blender staging geometry that is in the export but is not the product. */
const STAGING_NODES = ['Plane']

export function LoadedModel({
  url,
  scale,
  fallbackColor,
  metalnessBoost = 0,
  roughnessBoost = 0,
  liftBoost = 1,
  tiltX = 0,
  tiltZ = 0
}: LoadedModelProps) {
  const { scene, animations } = useGLTF(url, DRACO_PATH)

  // Framing is derived from the model rather than hard-coded, because a
  // Blender export lands at whatever scale its scene happened to use — this
  // one arrives 0.3 units on its longest edge.
  const fitted = useMemo(() => {
    const root = scene.clone(true)

    // Some exports carry a ground/backdrop plane alongside the subject —
    // harmless in Blender's own viewport, but on a stage that fits the
    // camera to the whole model's bounding box it swamps the framing.
    root.children
      .filter((child) => STAGING_NODES.includes(child.name))
      .forEach((child) => root.remove(child))

    // Cloned per material below (not just for the default-trap fix), and
    // each clone's exported roughness/metalness kept alongside — the
    // metalness/roughness boosts further down adjust from these bases every
    // time a slider moves, rather than compounding onto a previous drag, and
    // cloning keeps that mutation off the loader's own cached material,
    // which every other instance of this glTF shares.
    const materials: { material: MeshStandardMaterial; baseRoughness: number; baseMetalness: number }[] = []
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return

      const mat = mesh.material as MeshStandardMaterial
      if (!mat?.isMeshStandardMaterial) return

      // A material that reaches glTF without a pbrMetallicRoughness block
      // takes the spec default — white, but fully metallic AND fully rough,
      // which has no diffuse colour and no sharp reflection and so resolves
      // to near black. Both logos come through this way, which is why they
      // render as bright chrome rather than the black they are in Blender.
      //
      // Materials exported with real values fall through untouched: the test
      // is the exact 1.0/1.0/white triple only the glTF default produces.
      const isGltfDefault = mat.metalness === 1 && mat.roughness === 1 && mat.color?.getHex() === 0xffffff
      const fixed = mat.clone()
      if (isGltfDefault) {
        fixed.metalness = 0
        fixed.roughness = 0.4
        fixed.color = new Color(fallbackColor)
        // The logos are flat decals lying on the case, coplanar with it to
        // within a rounding error, so the depth test cannot separate them
        // and they strobe as the model turns. Biasing them toward the
        // camera settles it without moving anything visibly.
        fixed.polygonOffset = true
        fixed.polygonOffsetFactor = -2
        fixed.polygonOffsetUnits = -2
      }
      mesh.material = fixed
      materials.push({ material: fixed, baseRoughness: fixed.roughness, baseMetalness: fixed.metalness })
    })

    // Normalise to a known size so framing holds whatever scale the next
    // export arrives at.
    const size = new Box3().setFromObject(root).getSize(new Vector3())
    const longest = Math.max(size.x, size.y, size.z) || 1
    return { root, fit: TARGET_SIZE / longest, materials }
  }, [scene, fallbackColor])

  // Every frame rather than an effect keyed on the boost values: the room's
  // `Lift` wrapper (Gallery3D.tsx) writes `envMapIntensity` on every one of
  // its own re-renders with no dependency array, so it can catch meshes that
  // arrive later out of Suspense — and an effect here would only sometimes
  // run after it, silently losing this component's own boosts on whichever
  // commits Lift's happened to land second. Reapplying continuously means
  // whoever wrote last within a frame doesn't matter.
  useFrame(() => {
    for (const { material, baseRoughness, baseMetalness } of fitted.materials) {
      material.roughness = MathUtils.clamp(baseRoughness + roughnessBoost, 0, 1)
      material.metalness = MathUtils.clamp(baseMetalness + metalnessBoost, 0, 1)
      material.envMapIntensity = liftBoost
    }
  })

  // The staging plane was removed above, but the export's clips still carry
  // tracks addressed to it — and the mixer resolves tracks by walking the
  // hierarchy for a matching name, so every one of those now finds nothing
  // and warns. Dropping them is what actually removes the node, rather than
  // only removing the thing you can see.
  const clips = useMemo(
    () =>
      animations
        .map((clip) => {
          const trimmed = clip.clone()
          trimmed.tracks = trimmed.tracks.filter(
            (track) => !STAGING_NODES.some((name) => track.name.startsWith(`${name}.`))
          )
          return trimmed
        })
        .filter((clip) => clip.tracks.length > 0),
    [animations]
  )

  // Node-name based (no skinning here), so the plain clone above is enough —
  // the mixer resolves tracks by walking the clone's hierarchy for matching
  // names, not by referencing the original nodes.
  const group = useRef<Group>(null)
  const { actions } = useAnimations(clips, group)

  useEffect(() => {
    const list = Object.values(actions)
    list.forEach((action) => action?.reset().play())
    return () => {
      list.forEach((action) => action?.stop())
    }
  }, [actions])

  // Center normalises the origin, so the model turns about itself however the
  // pivot was left in Blender.
  return (
    <Center>
      <group
        ref={group}
        rotation={[MathUtils.degToRad(tiltX), 0, MathUtils.degToRad(tiltZ)]}
      >
        <primitive object={fitted.root} scale={fitted.fit * scale} />
      </group>
    </Center>
  )
}

interface SpriteFlipbookProps {
  /** Frame images, in playback order — a flat PNG sequence, not a glTF. */
  frames: string[]
  fps: number
  scale: number
}

/**
 * A 2D PNG sequence living on the same stage as the glTF products, rather
 * than a flat overlay — Billboard keeps its face turned to the camera
 * through Float's drift and Spin's rotation (it cancels out whatever
 * rotation its ancestors carry, not just its own), so it reads as a sprite
 * standing in the 3D space instead of a decal on the lens.
 *
 * The frame is swapped on a ref, not through state, so a 12fps flip isn't
 * twelve React renders a second on top of the render loop already running.
 */
export function SpriteFlipbook({ frames, fps, scale }: SpriteFlipbookProps) {
  const textures = useTexture(frames)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const frameIndex = useRef(0)
  const elapsed = useRef(0)

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace
    })
  }, [textures])

  useFrame((_, delta) => {
    const frameDuration = 1 / fps
    elapsed.current += delta
    if (elapsed.current < frameDuration) return
    elapsed.current %= frameDuration
    frameIndex.current = (frameIndex.current + 1) % textures.length
    if (materialRef.current) {
      materialRef.current.map = textures[frameIndex.current]
      materialRef.current.needsUpdate = true
    }
  })

  // Frames arrive square here; reading it off the first texture rather than
  // hard-coding it is what keeps a future non-square sequence from stretching.
  const first = textures[0].image as { width: number; height: number }
  const aspect = first.width / first.height
  const height = TARGET_SIZE * scale
  const width = height * aspect

  return (
    <Billboard>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={textures[0]}
          transparent
          alphaTest={0.5}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}

export interface CapsuleStageProps {
  /** Remounts the *scene* — and only the scene — when it changes, so each
   *  product gets a fresh entrance.
   *
   *  This must never be applied as a React `key` on the stage itself. Doing
   *  that tears down the `<Canvas>` and builds a new WebGL context for every
   *  project; a browser only keeps around sixteen of those alive and drops
   *  the oldest to make room, so scrolling briskly through the work fills the
   *  quota and the canvases start going black with
   *  `THREE.WebGLRenderer: Context Lost`. One context, swapped contents. */
  sceneKey?: string
  /** Which glTF to show — lets one stage carry different projects. */
  modelUrl?: string
  /** A PNG sequence to flip through instead of a glTF — set alongside
   *  `spriteFps`; when present this replaces `modelUrl` entirely. */
  spriteFrames?: string[]
  /** Playback rate for `spriteFrames`. */
  spriteFps?: number
  /** Footage for the hand-built POS station's monitor instead of a glTF or
   *  sprite — takes priority over both when set. */
  videoUrl?: string
  /** Escape hatch for one-off hand-built products (a game case, a picture
   *  frame, a plain card) that don't fit the glTF/sprite/video shapes above
   *  — called with `modelScale` so the product sizes like every other one.
   *  Takes priority over all three when set. */
  renderProduct?: (scale: number) => ReactNode
  /** Extra rpm read live each frame, on top of `rpm` — how a caller drives
   *  the spin from outside React's render cycle (e.g. scroll velocity). */
  spinRef?: MutableRefObject<number>
  focalLength?: number
  modelScale?: number
  rpm?: number
  exposure?: number
  envIntensity?: number
  keyIntensity?: number
  ambientIntensity?: number
  fallbackColor?: string
  azimuth?: number
  elevation?: number
  distance?: number
  /** How far the product drifts up and down. 0 holds it still. */
  floatIntensity?: number
  /** How much it lolls on its axes as it drifts. */
  floatRotation?: number
  floatSpeed?: number
  /** World units below its resting place the product rises in from. */
  introFrom?: number
  /** Degrees of turn it unwinds through on the way in. */
  introTurn?: number
  introDelay?: number
  introDuration?: number
}

const CapsuleStage = forwardRef<HTMLDivElement, CapsuleStageProps>(function CapsuleStage({
  sceneKey,
  modelUrl = MODEL_URL,
  spriteFrames,
  spriteFps = 12,
  videoUrl,
  renderProduct,
  spinRef,
  focalLength = 103,
  modelScale = 1.1,
  rpm = 0,
  exposure = 0.1,
  envIntensity = 4,
  keyIntensity = 4.4,
  ambientIntensity = 0,
  fallbackColor = '#000000',
  azimuth = 53,
  elevation = 27,
  distance = 9,
  floatIntensity = 0.9,
  floatRotation = 0.8,
  floatSpeed = 2.5,
  introFrom = -1.5,
  introTurn = 150,
  introDelay = 0.35,
  introDuration = 2.6
}: CapsuleStageProps, ref) {
  return (
    <div className="ch-model" ref={ref}>
      <Canvas
        // The canvas now spans the whole stage rather than a 400px box, so
        // capping the pixel ratio keeps the pixel count from roughly
        // quadrupling on a retina screen.
        dpr={[1, 1.5]}
        // Blender previews through a view transform (Filmic/AgX); rendering
        // raw is what makes the highlights blow out and the mid-tones go flat
        // compared to the viewport. ACES is the closest match three has.
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace
        }}
        // near/far are pulled tight around the subject on purpose. The depth
        // buffer's precision is spread across that range, and the default
        // 0.1–1000 leaves so little of it near the model that the logo decals
        // and the case they sit on land in the same depth bucket and flicker.
        // Position is owned by CameraRig; this is only the starting frame.
        camera={{ fov: fovForFocalLength(focalLength), near: 1, far: 60 }}
        style={{ background: 'transparent' }}
      >
        <CameraRig
          focalLength={focalLength}
          exposure={exposure}
          azimuth={azimuth}
          elevation={elevation}
          distance={distance}
        />

        {/* Blender's lights do not survive a glTF export. The environment does
            most of the work on a gloss object; these two only shape it. */}
        <StudioEnvironment intensity={envIntensity} />
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[3, 5, 4]} intensity={keyIntensity} />
        <directionalLight position={[-4, 1, -2]} intensity={keyIntensity * 0.25} color="#cdd6e0" />

        {/* Nothing stands in while the model streams — a placeholder mesh here
            reads as a second, wrong product flashing up before the real one.

            The key is here rather than on the stage: it swaps the contents of
            the scene without touching the canvas or its context. Everything
            outside it — camera, environment, lights — takes its per-project
            values through props and effects, so none of it needs remounting. */}
        <Suspense key={sceneKey} fallback={null}>
          {/* Float sits outside Spin so the drift is added on top of the
              turn rather than being turned with it — the two are meant to be
              usable independently, either one at 0. */}
          <Entrance
            from={introFrom}
            turn={introTurn}
            delay={introDelay}
            duration={introDuration}
          >
            <Float
              speed={floatSpeed}
              floatIntensity={floatIntensity}
              rotationIntensity={floatRotation}
            >
              <Spin rpm={rpm} spinRef={spinRef}>
                {renderProduct ? (
                  renderProduct(modelScale)
                ) : spriteFrames && spriteFrames.length > 0 ? (
                  <SpriteFlipbook frames={spriteFrames} fps={spriteFps} scale={modelScale} />
                ) : videoUrl ? (
                  <PosStation videoUrl={videoUrl} scale={modelScale} />
                ) : (
                  <LoadedModel url={modelUrl} scale={modelScale} fallbackColor={fallbackColor} />
                )}
              </Spin>
            </Float>
          </Entrance>
        </Suspense>
      </Canvas>
    </div>
  )
})

export default CapsuleStage
