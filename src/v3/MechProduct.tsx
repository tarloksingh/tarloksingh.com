import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Float, Resize } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import BlockBuilder from '../three/BlockBuilder'
import Phone17 from '../three/Phone17'
import PosStation from '../three/PosStation'
import VideoFrame from '../three/VideoFrame'
import WyteCard from '../three/WyteCard'
import { SpriteFlipbook } from '../three/CapsuleStage'
import type { Mesh, MeshStandardMaterial } from 'three'
import { drift, gaze } from './subject'
import { useNarrow } from './narrow'
import { PIECE_FALLBACK, PRODUCT_DEFAULTS, type PieceTuning, type ProductTuning } from './productTuning'
import type { ReactNode } from 'react'
import type { Group, PerspectiveCamera } from 'three'

/* The subject of a project screen that has no model: the piece that was
   built for it back in v2.

   Six projects are here — a video-texture terminal, a handset, a picture
   frame, a card, a stacking loop, a flipbook of fish. Most of them already
   existed, already tuned, and reusing them is the whole point of this file:
   the alternative was a photograph of the work where the subject should be,
   or ten new pieces nobody asked for.

   It was eight, and two of the eight were the *same* disc case standing for
   Red Dead Redemption 2 and Grand Theft Auto V. Both are `MODELS` now — a
   revolver and a carbine — so they render through `MechModel` and not through
   this file at all. See `model.ts`.

   **Every clip in here is a texture and not a frame.** They are served from
   `public/videos/`, deliberately, rather than resolved out of `src/assets/`:
   anything in a project's asset folder that its `projects.ts` entry quotes
   becomes a step in the tile rail, and the loop running on a subject's screen
   is part of the subject rather than something to page to.

   **Nothing here is Mr. Takahashi's rig.** `MechModel.tsx` is built for one
   face and shares `MODEL_DEFAULTS` with Capsule C1; feeding a monitor through
   it would mean either forking its lighting per piece or quietly changing
   numbers a model is already lit by. So this is a studio of its own, at its
   own exposure, with its own lens and its own panel — see `productTuning.ts`.
   The two files do not read each other.

   What *is* shared is the arithmetic, because it is generic camera geometry
   rather than anything about a subject: a lens quoted in millimetres, and how
   far back a camera has to stand to hold a given fraction of the frame. */

/** World units a piece's longest edge is normalised to before framing. Every
 *  piece is a different real size and several of them are not real objects at
 *  all, so what the camera is framing has to be decided here rather than
 *  inherited from an export's units. */
const TARGET_HEIGHT = 1

const fovForFocalLength = (mm: number) => (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI

const distanceFor = (focalLength: number, fill: number) =>
  TARGET_HEIGHT / fill / (2 * Math.tan((fovForFocalLength(focalLength) * Math.PI) / 360))

/** Where the piece has floated to, in the 1920×1080 frame coordinates the
 *  leaders are drawn in, so the lines pointing at it can ride along.
 *
 *  Same job as `Drift` in MechModel and the same sum — the exchange rate
 *  falls out of the framing, and both stages frame one world unit of height
 *  across `fill` of 1080. Copied rather than shared: importing it would drag
 *  the face's whole module, and its lighting constants with it, into this
 *  chunk. */
function Drift({ fill }: { fill: number }) {
  const ref = useRef<Group>(null)
  const at = useMemo(() => new Vector3(), [])

  useFrame(() => {
    if (!ref.current) return
    ref.current.getWorldPosition(at)
    const perUnit = 1080 * fill
    drift.x = at.x * perUnit
    // Frame coordinates count downward and world units count up.
    drift.y = -at.y * perUnit
  })

  return <group ref={ref} />
}

/** Turns the piece a few degrees toward the pointer, on top of whatever face
 *  it was set to. Not the face's lean — that tips a head; this swings a
 *  product on its stand, which is the gesture a thing in a case makes. */
function Swing({ turn, sway, children }: { turn: number; sway: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const to = useRef({ x: 0, y: 0 })
  const at = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      to.current.x = (event.clientX / window.innerWidth) * 2 - 1
      to.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    // And a tap: on a phone a press is the only way anyone says "here".
    window.addEventListener('pointerdown', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [])

  useFrame((_, delta) => {
    const group = ref.current
    if (!group) return
    /* The bird wins when it is in the air, the same way the face prefers it:
       a thing crossing the room is more interesting than a cursor sitting
       still, and the two subjects should not disagree about that. */
    const target = gaze.bird.active
      ? {
          x: (gaze.bird.x / window.innerWidth) * 2 - 1,
          y: (gaze.bird.y / window.innerHeight) * 2 - 1
        }
      : to.current
    const k = 1 - Math.pow(0.004, delta)
    at.current.x = MathUtils.lerp(at.current.x, target.x, k)
    at.current.y = MathUtils.lerp(at.current.y, target.y, k)
    group.rotation.y = MathUtils.degToRad(turn) + at.current.x * 0.34 * sway
    group.rotation.x = -at.current.y * 0.12 * sway
  })

  return <group ref={ref}>{children}</group>
}

/** Built inside three rather than fetched, so the page still makes no
 *  third-party request for an HDRI. The same room v2's gallery lit these
 *  pieces in — see `ROOM_LIGHT` in products.tsx — at this file's own
 *  exposure rather than the face's. */
function Studio({ intensity, exposure }: { intensity: number; exposure: number }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

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

  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}

/** The camera is moved rather than remounted: a `camera` prop is only read on
 *  the first render, so dragging the lens slider would otherwise do nothing
 *  until a reload. */
function Lens({ focalLength, fill }: { focalLength: number; fill: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)

  /* `fill` is a fraction of the frame's *height*, and a piece is normalised on
     its longest edge — so a wide one asked to fill more of the height than
     the frame is wide runs off the sides. Which is exactly what a phone is:
     the stage there is about as wide as it is tall, and a monitor framed for
     a 16:9 island came out cropped at both ends.

     Capped against the frame's own aspect rather than hidden behind a
     narrow-only number, because it is not about phones — it is true of any
     window shape and any subject. */
  const aspect = size.width / Math.max(1, size.height)
  const held = Math.min(fill, aspect * 0.92)

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    camera.position.set(0, 0, distanceFor(focalLength, held))
    camera.near = camera.position.z * 0.05
    camera.far = camera.position.z * 6
    camera.updateProjectionMatrix()
  }, [camera, focalLength, held])

  return null
}

/** Fish Man is a hand-animated PNG sequence exported from Unity at 12fps
 *  rather than a glTF, so it flips through on a billboard. Same glob as
 *  `products.tsx` builds; fourteen filenames are not worth a shared module. */
const FISH_MAN_FRAMES = Array.from(
  { length: 14 },
  (_, i) => `/sprites/fish-man-idle/Fish_Man_Idle_${String(i).padStart(5, '0')}.png`
)

/* ---- which piece stands for which project ----

   Pointed at the same components `src/site/products.tsx` mounts, rather than
   at `products.tsx` itself, and that is not a preference — it is a cycle.
   `products.tsx` imports `AdamFace`, `CapsuleC1` and `BlockBuilder`; all
   three import `EXTRA_CONTROLS` from `Gallery3D`; and `Gallery3D` calls
   `specDefaults()` from `products.tsx` at module scope. That resolves when
   `Gallery3D` is what starts the chain, which is the only way it was ever
   entered before — but entering from `products.tsx` reaches that top-level
   call while `SPECS` is still in its temporal dead zone, and the module
   throws before it has finished loading.

   The other half of the reason is that there is nothing left to reuse.
   `exhibitFor` hands back a piece already scaled, lit for a case and turned
   for a room; the stage here normalises the bounding box itself (see `Piece`
   below), lights it in its own studio and takes its turn off a panel. What
   was actually wanted from that file is the eight components, and this is
   the shortest way to name them. */
const PIECES: Record<string, () => ReactNode> = {
  /* `tuned` puts its three parts — register, reader, monitor — where the
     **Station** tab has them rather than where v2's case wanted them. See
     `stationParts.ts`. */
  'mecha-station': () => <PosStation videoUrl="/videos/mecha-station-hero.mp4" scale={1} tuned />,
  /* A modelled handset rather than `Phone3D`'s rounded box, with the app
     running on its glass — see `Phone17.tsx`, which is also where the reason
     the clip must not be aspect-corrected is written down. The clip is served
     from `public/videos/` and not resolved out of `src/assets/`: it is a
     texture on a subject, not a frame in this project's media, and putting it
     in the assets folder would list it in the tile rail as a thing to step
     to. Same reason `mecha-station` reads its monitor loop from there. */
  openup: () => <Phone17 videoUrl="/videos/plus-one-screen.mp4" scale={1} />,
  /* `/videos/stitchfam-hero.mp4`, not `src/assets/stitchfam/hero.mp4`. Two
     different files with the same name: the asset is a 1280×720 landscape cut
     and the public one is the 444×532 portrait loop — which is the ratio
     `VideoFrame` is built around and says so in a comment three lines from the
     constant. It was being handed the landscape one, so the frame the project
     screen showed was a picture squashed into a hole of the wrong shape.
     `heroes.ts` already pointed at the right file. */
  stitchfam: () => <VideoFrame videoUrl="/videos/stitchfam-hero.mp4" scale={1} />,
  'wyte-card': () => <WyteCard scale={1} />,
  'block-builder': () => <BlockBuilder scale={1} />,
  'slider-engine': () => <SpriteFlipbook frames={FISH_MAN_FRAMES} fps={12} scale={1} />
}

/** Whether a project has a piece built for it at all. Read by the home
 *  screen's bank, which puts every project's own subject in its slot. */
export const hasPiece = (project: string) => project in PIECES

/** Held still across a re-render. Building one of these is where a glTF gets
 *  requested and a video element gets made, and rebuilding it on every tick
 *  of a Leva slider is a fetch per frame.
 *
 *  Exported because the home screen's bank draws the same eight pieces at
 *  slot size — see `MechSlots.tsx`. It is the piece, centred and normalised to
 *  one world unit, and nothing else: no studio, no camera, no surface tuning.
 *  Whatever mounts it lights it. */
export function Piece({ project }: { project: string }) {
  const node = useMemo(() => PIECES[project]?.() ?? null, [project])
  if (!node) return null

  /* Centred and normalised rather than placed. Every piece was built at
     whatever size suited the thing it is — a phone in phone units, a monitor
     in monitor units — and the gallery they came from fitted them into a case
     for exactly this reason. `size` on the panel is how a card gets to read
     as a card again afterwards. */
  return (
    <Center>
      <Resize>{node}</Resize>
    </Center>
  )
}

/** How metal and how glossy the piece's surfaces are.
 *
 *  Relative, and that is the whole design: a piece is built out of several
 *  materials on purpose — a disc case is a clear sleeve over a printed
 *  insert, a kiosk is a screen in a moulded shell — and writing one roughness
 *  across all of them flattens the thing into a single plastic. So each
 *  material is moved *from where it already was* and keeps its distance from
 *  its neighbours.
 *
 *  Added rather than multiplied: most of these pieces are authored at
 *  `metalness: 0`, and no multiplier can lift a zero, so a scaling Metal
 *  slider would have run its whole range without anything ever turning
 *  metal.
 *
 *  The originals are kept, because the tuning has to be re-applied *from* them
 *  every time: boosting an already-boosted roughness every frame walks it to
 *  1 in about a second.
 *
 *  Re-walked when the node count changes, which is when a piece has finished
 *  building itself — several of them assemble out of primitives over a frame
 *  or two rather than arriving whole. */
function Sheen({ piece, children }: { piece: PieceTuning; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const nodes = useRef(-1)
  const seen = useMemo(() => new Map<MeshStandardMaterial, { roughness: number; metalness: number }>(), [])
  const last = useRef('')

  useFrame(() => {
    const group = ref.current
    if (!group) return
    let n = 0
    group.traverse(() => n++)
    const stamp = `${piece.gloss}|${piece.metal}|${piece.reflects}`
    if (n === nodes.current && stamp === last.current) return
    nodes.current = n
    last.current = stamp

    group.traverse((node) => {
      const mesh = node as Mesh
      if (!mesh.isMesh) return
      for (const raw of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const material = raw as MeshStandardMaterial
        if (!material || !('roughness' in material)) continue
        let origin = seen.get(material)
        if (!origin) {
          origin = { roughness: material.roughness, metalness: material.metalness }
          seen.set(material, origin)
        }
        // Off roughness, so Gloss up is shinier.
        material.roughness = MathUtils.clamp(origin.roughness - piece.gloss, 0, 1)
        material.metalness = MathUtils.clamp(origin.metalness + piece.metal, 0, 1)
        material.envMapIntensity = piece.reflects
        material.needsUpdate = true
      }
    })
  })

  return <group ref={ref}>{children}</group>
}

export default function MechProduct({
  project,
  tuning = PRODUCT_DEFAULTS,
  piece = PIECE_FALLBACK,
  live = true
}: {
  project: string
  tuning?: ProductTuning
  piece?: PieceTuning
  live?: boolean
}) {
  const fill = piece.fill * piece.size
  const distance = distanceFor(piece.focalLength, fill)
  const narrow = useNarrow()

  return (
    <Canvas
      /* **A phone does not get the desktop's sample count.** This is the one
         full-window canvas on the screen, and at `devicePixelRatio` 2 with
         multisampling on a handset it is several times the pixel work of
         anything else the page does — paid every frame, behind a subject that
         is drifting a few degrees. `MechSlots` already makes exactly this
         trade for the bank (`dpr={narrow ? 1 : [1, 1.75]}`, no antialias); the
         stage was the piece that never had it. 1.5 rather than 1 because
         unlike a bay this is the thing being looked at. */
      dpr={narrow ? [1, 1.5] : [1, 2]}
      /* Stopped rather than unmounted while a still is on the stage — the
         same trade `MechModel` makes, and for the same reason: tearing down a
         WebGL context, a compiled shader set and a generated environment map
         costs most of a hundred milliseconds to build again. */
      frameloop={live ? 'always' : 'never'}
      camera={{ fov: fovForFocalLength(piece.focalLength), position: [0, 0, distance] }}
      gl={{ alpha: true, antialias: !narrow, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      style={{ background: 'transparent' }}
    >
      {/* All of this is the *piece's*, not the studio's. One exposure and two
          fixed lamps used to serve all eight, which meant a matte card, a
          glossy kiosk and a video-texture monitor were lit identically and at
          most one of them was right.

          Per-piece is cheap here in a way it was not on the home stage: a
          project screen shows one piece at a time in a canvas of its own, so
          exposure and the scene's environment — one-per-canvas, and the two
          things the cast genuinely had to share — are free to differ. No
          layers, nothing to keep apart. */}
      <Lens focalLength={piece.focalLength} fill={fill} />
      <Studio intensity={piece.envIntensity} exposure={piece.exposure} />
      <directionalLight position={[piece.keyX, piece.keyY, piece.keyZ]} intensity={piece.keyIntensity} />
      <directionalLight position={[piece.fillX, piece.fillY, piece.fillZ]} intensity={piece.fillIntensity} />

      <Suspense fallback={null}>
        <group position={[piece.liftX / fill, piece.liftY / fill, 0]}>
          <Float
            speed={tuning.floatSpeed}
            rotationIntensity={tuning.floatRotation}
            floatIntensity={0.5}
            floatingRange={[-tuning.floatRange, tuning.floatRange]}
          >
            <Drift fill={fill} />
            <Sheen piece={piece}>
              <Swing turn={piece.turn} sway={piece.sway}>
                <Piece project={project} />
              </Swing>
            </Sheen>
          </Float>
        </group>
      </Suspense>
    </Canvas>
  )
}
