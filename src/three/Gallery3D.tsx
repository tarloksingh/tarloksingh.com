import { Suspense, useEffect, useRef } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { Leva, button, folder, useControls } from 'leva'
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace } from 'three'
import type { Group, Mesh, MeshStandardMaterial, OrthographicCamera } from 'three'
import { projects } from '../data/projects'
import { hasProduct, specDefaults } from '../site/products'
import { NARROW, NARROW_AT, STAGE_SHIFT, WIDE } from '../site/room'
import type { RoomLayout, RoomTuning } from '../site/room'
import { StudioEnvironment } from './CapsuleStage'
import Vitrine, { VITRINE_TOTAL } from './Vitrine'

export type { RoomLayout, RoomTuning } from '../site/room'

/** Draw the acrylic case and plinth around each piece. Off for now — the
 *  pieces stand in the open at the case's usual spot, just scaled up (see
 *  `PIECE_FIT`) — without deleting `Vitrine`, so flipping this back on
 *  restores the exhibit look exactly as it was. */
const SHOW_CASE = false

/* The room: one row of vitrines, one canvas, one camera.
 *
 * **Everything is in one scene, and that is the whole point.** The home page
 * used to hold a single canvas standing in for whichever project was square
 * on, and it had to fade out the instant the wall turned, because a flat
 * canvas stops matching the perspective of the cell it is standing in for.
 * That fade was the piece disappearing every time you moved — which is
 * exactly what an exhibit must not do. Here the cases *are* the scene: the
 * row slides, the camera does not move, and nothing ever needs to be hidden
 * because nothing is ever standing in for anything.
 *
 * **The camera is orthographic.** Two reasons, and both are load-bearing:
 *
 *  - It is what makes the row read as a row. Under perspective the case three
 *    steps away is seen from its side while the near one is seen head-on, so
 *    a filmstrip of identical cases arrives as a fan. Under an axonometric
 *    they are the same object repeated, which is what a gallery looks like.
 *  - World and screen become one linear scale, so the DOM copy beside each
 *    case and the case itself can be laid out from the same fractions and
 *    stay locked together at any window size. Under perspective they agree at
 *    exactly one aspect ratio.
 *
 * **The unit is one viewport height.** `RoomLens` sets the ortho zoom so the
 * frustum is exactly 1 unit tall, which means every number below is a
 * fraction of the window and there is not a pixel anywhere in the scene.
 */

/** Where the camera stands at a detent. 45 is corner-on: two faces and the
 *  lid, which is how you meet a case in a room. */
const AZIMUTH = 45
/** Degrees above it. Eye height on a case that comes up to your chest — much
 *  more and it becomes a floor plan. */
const ELEVATION = 11
/** How far the camera walks around the room between one project and the next.
 *
 *  **A quarter turn, and it has to be a quarter turn.** The cases are square,
 *  so at 90 degrees every detent shows an identical case — the same silhouette
 *  in the same place, and only what is standing inside it has changed. At any
 *  other angle the furniture changes shape from project to project, which
 *  reads as the room being unstable rather than as you moving through it.
 *
 *  This is a real orbit, and the light does *not* come with it. That is the
 *  whole point: as you scroll, the key sweeps across the case's faces, the
 *  plinth's lit and shadowed sides trade places, and the shadow on the floor
 *  swings. The piece itself is bolted to the world and never turns — every bit
 *  of its apparent rotation is you walking around it.
 *
 *  (An earlier version turned the piece instead and left the camera still. It
 *  is the same picture only if the light turns too, and then the case — being
 *  symmetrical every 90 degrees — renders identically at every step and the
 *  room goes dead.) */
const ORBIT = 90
/** Degrees the piece rests at once you have arrived, as a fraction of the
 *  per-project `turn`. Those values were camera azimuths on the old stage and
 *  ran as wide as 42 degrees; a piece presented in its case wants to be facing
 *  you and just off square, so the choice of which face is kept and the amount
 *  is pulled in. */
const REST_TURN = 0.45
/** Distance out. Orthographic, so this only sets the clipping, not the size. */
const CAM_RADIUS = 10

/**
 * Scales a piece from the world it was tuned in — a stage that normalised
 * every model to ~1.1 units — into a case half a viewport tall.
 *
 * Applied as a wrapping group rather than folded into each product's own
 * scale, so the drift `Float` adds is scaled by it too. Left unscaled, a
 * drift tuned for a 1.7-unit object throws a 0.2-unit one clean through the
 * glass.
 *
 * With the case off (`SHOW_CASE`), nothing constrains a piece's size anymore,
 * so this is bumped up from the case-era 0.105 — and each piece now has its
 * own live size multiplier on top of it, see `OBJECT_SCHEMA` below.
 */
const PIECE_FIT = 0.16

/* ---- the tuning panel ----

   Twelve pieces, all different shapes, standing in one room. "Centred in its
   slot" and "sitting right" stop being the same thing the moment the objects
   stop being the same object: a tall kiosk and a flat card, each centred on
   its own bounding box, do not read as level with each other. So each piece
   gets its own angle, size and position, live, and the numbers are written
   back into products.tsx when they are right.

   Everything below is per *project*, deliberately. An earlier version had one
   set of sliders moving all twelve at once, which can only ever find the
   compromise that suits none of them. */

/** Namespaced Leva keys for one project's controls — flat, because
 *  `useControls` merges every folder's fields into one flat result object,
 *  so two projects both naming a field `turn` would fight over the same
 *  value if the keys were not made unique per project. */
const turnKey = (id: string) => `turn__${id}`
const scaleKey = (id: string) => `scale__${id}`
const xKey = (id: string) => `x__${id}`
const yKey = (id: string) => `y__${id}`

/** Where the panel's numbers survive a reload.
 *
 *  Tuning twelve pieces on four axes each is an afternoon, and losing it to a
 *  stray refresh is what makes a tool stop getting used. This is a scratchpad
 *  and not a source of truth — nothing in it ever reaches a visitor, whose
 *  browser has an empty one and therefore sees exactly what products.tsx
 *  says. `Copy for source` is how a number stops being temporary. */
const STORE_KEY = 'gallery.tuning.v2'

const readStore = (): Record<string, number> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    // Private mode, a full quota, a half-written value from an interrupted
    // save — none of it is worth taking the gallery down for.
    return {}
  }
}

const saved = typeof window === 'undefined' ? {} : readStore()

/** Every control's current value, kept up to date by `Gallery3D`. The copy
 *  button is built with the schema at module scope and has no other way to
 *  see what the panel now says. */
const live: Record<string, number> = { ...saved }

/** One collapsed folder per project — built once at module scope, not per
 *  render, so retyping a value does not fight a schema object that is a new
 *  reference every time.
 *
 *  Each slider starts where products.tsx already has that piece, so the panel
 *  opens showing what is actually on screen rather than a row of zeroes you
 *  have to find your way back from. Turn is shown post-`REST_TURN`, i.e. the
 *  angle you can see; scale is a multiplier on the piece's own. */
const OBJECT_SCHEMA = Object.fromEntries(
  projects.map((project) => {
    const spec = specDefaults(project.id)
    const seed = (key: string, fallback: number) => saved[key] ?? fallback
    const id = project.id
    return [
      project.title,
      folder(
        {
          [turnKey(id)]: {
            value: seed(turnKey(id), Math.round(spec.turn * REST_TURN)),
            min: -180,
            max: 180,
            step: 1,
            label: 'Turn °'
          },
          [scaleKey(id)]: {
            value: seed(scaleKey(id), 1),
            min: 0.4,
            max: 2.5,
            step: 0.02,
            label: 'Scale ×'
          },
          // Both in viewport heights, so a step of X and a step of Y move the
          // piece the same distance on screen — which is the whole point of
          // having two sliders rather than a pair of unrelated numbers.
          [xKey(id)]: {
            value: seed(xKey(id), spec.offsetX),
            min: -0.6,
            max: 0.6,
            step: 0.005,
            label: 'X'
          },
          [yKey(id)]: {
            value: seed(yKey(id), spec.offsetY),
            min: -0.6,
            max: 0.6,
            step: 0.005,
            label: 'Y'
          }
        },
        { collapsed: true }
      )
    ]
  })
)

const round = (n: number, places: number) => Number(n.toFixed(places))

/**
 * The panel's numbers, written out in the shape the source keeps them in.
 *
 * A tuning session is only worth having if it can be made permanent, and
 * transcribing forty-eight sliders by hand is how a session gets lost. Turn
 * and scale are converted back on the way out: the panel shows the angle
 * actually on screen and a multiplier on the piece's own size, while
 * products.tsx stores the pre-`REST_TURN` angle and the size itself.
 */
function tuningSource() {
  const specs = projects
    .filter((project) => hasProduct(project.id))
    .map((project) => {
      const spec = specDefaults(project.id)
      const turn = live[turnKey(project.id)] ?? spec.turn * REST_TURN
      const fields = [
        `scale: ${round(spec.scale * (live[scaleKey(project.id)] ?? 1), 3)}`,
        `turn: ${round(turn / REST_TURN, 1)}`,
        `offsetX: ${round(live[xKey(project.id)] ?? spec.offsetX, 3)}`,
        `offsetY: ${round(live[yKey(project.id)] ?? spec.offsetY, 3)}`
      ]
      return `  '${project.id}': { ${fields.join(', ')} },`
    })

  const spacing = live.spacing ?? 1
  return [
    '// src/site/products.tsx — merge into each SPECS entry',
    ...specs,
    '',
    '// src/site/room.ts',
    `WIDE.stepW    ${round(WIDE.stepW * spacing, 3)}   // was ${WIDE.stepW}`,
    `NARROW.stepW  ${round(NARROW.stepW * spacing, 3)}   // was ${NARROW.stepW}`,
    `STAGE_SHIFT   ${live.shift ?? STAGE_SHIFT}`,
    `NARROW_AT     ${live.narrowAt ?? NARROW_AT}`
  ].join('\n')
}

/** How the room itself is set, as opposed to what is standing in it. All of
 *  it applies to every case at once — spacing and the breakpoint have no
 *  per-project meaning, and a stage shift that differed per project would
 *  make the row wander as you scrolled. */
const LAYOUT_SCHEMA = {
  spacing: {
    value: saved.spacing ?? 1,
    min: 0.5,
    max: 2.2,
    step: 0.02,
    label: 'Case spacing ×'
  },
  shift: {
    value: saved.shift ?? STAGE_SHIFT,
    min: -20,
    max: 20,
    step: 0.5,
    label: 'Stage shift %'
  },
  narrowAt: {
    value: saved.narrowAt ?? NARROW_AT,
    min: 480,
    max: 1400,
    step: 10,
    label: 'Mobile below px'
  },
  'Copy for source': button(() => {
    const source = tuningSource()
    // Logged as well as copied, always: a clipboard write can be refused and
    // there is no useful way to tell the panel about it.
    console.log(source)
    void navigator.clipboard?.writeText(source).catch(() => {})
  })
}

interface Piece {
  id: string
  /** Which slot in the row — the project's index. */
  slot: number
  node: ReactNode
  /** Degrees the piece is turned to face inside its case. */
  turn: number
  /** Multiplies `envMapIntensity` on the piece's own materials. See the note
   *  on `lift` in products.tsx: one exposure now lights the whole room, so a
   *  product that used to carry its own carries a lift instead. */
  lift: number
  /** Where the piece sits relative to the dead centre of its slot, in
   *  viewport heights: `offsetX` across the screen, `offsetY` up it. See the
   *  note on them in products.tsx. */
  offsetX: number
  offsetY: number
  floatIntensity: number
  /** `Float`'s rotational wobble. Zero everywhere — see products.tsx. */
  floatRotation: number
  floatSpeed: number
}

interface Gallery3DProps {
  pieces: Piece[]
  /** Live scroll position — read every frame, never through a render. Slot
   *  `n` is centred when this reads `n`. */
  progressRef: MutableRefObject<number>
  /** Which slot is being looked at. The piece in it rises into its case; the
   *  others sink back out. */
  focus: number
  /** How many projects the row loops through. */
  count: number
  layout: RoomLayout
  /** Hands the tuning panel's room settings back to `Gallery.tsx`, which owns
   *  the room's proportions and applies them to the labels as well. */
  onTune?: (tuning: RoomTuning) => void
}

/** How far below its place a piece rises from, in its own units. */
const RISE = 0.55
/** How much of the arrival the fade takes. The rest of it is pure movement.
 *
 *  Deliberately small: a piece that is still translucent once it has reached
 *  the middle of the frame reads as *not loaded*, not as arriving. Front-load
 *  the opacity and the only thing you actually perceive is the piece rising
 *  into its case, which is the effect. */
const FADE_OVER = 0.3
/** Seconds-ish for the rise. Slower than the fall, so the case you are
 *  arriving at is still filling as the one you left has already emptied —
 *  two pieces at half strength in adjacent cases reads as a fault. */
const RISE_TAU = 0.34
const FALL_TAU = 0.15

/** 1 world unit = the height of the window. Where the camera *stands* is
 *  written every frame in `Row`, because it walks with the scroll. */
function RoomLens() {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)

  useEffect(() => {
    camera.zoom = size.height
    camera.updateProjectionMatrix()
  }, [camera, size.height])

  return null
}

/**
 * The row, slid by the scroll.
 *
 * Each case is placed from its *shortest signed distance* to where you are
 * standing, exactly as the copy panels are — not from its index with the whole
 * row translated underneath. The row is a loop: walking past the last project
 * walks into the first, and under absolute indices that case is eleven steps
 * away rather than one, so it is nowhere near the screen at the moment you
 * are supposed to be arriving at it.
 */
interface RowExtra {
  /** Distance between two slots, in world units. */
  step: number
  /** How far right the whole row stands, in world units — `layout.shiftW`
   *  converted by the same aspect ratio the step is. */
  shift: number
  /** Every per-object control's live value, by namespaced key
   *  (`OBJECT_SCHEMA`), read once per frame rather than through a render. */
  objectControls: Record<string, number>
}

function Row({
  pieces,
  progressRef,
  focus,
  count,
  layout,
  step,
  shift,
  objectControls
}: Gallery3DProps & RowExtra) {
  const slots = useRef(new Map<string, Group>())
  const turns = useRef(new Map<string, Group>())
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const progress = progressRef.current

    // ---- where you are standing ----
    // The camera walks around the room as you scroll. Everything below is
    // measured from this one angle, in the same frame, so the room can never
    // be laid out for a viewpoint the camera is not at.
    const azimuth = MathUtils.degToRad(AZIMUTH + progress * ORBIT)
    const elevation = MathUtils.degToRad(ELEVATION)
    const flat = CAM_RADIUS * Math.cos(elevation)
    camera.position.set(
      flat * Math.sin(azimuth),
      CAM_RADIUS * Math.sin(elevation) + layout.caseY,
      flat * Math.cos(azimuth)
    )
    camera.lookAt(0, layout.caseY, 0)

    // The direction that is horizontal *on screen* from here: the camera's own
    // right vector, which for a camera orbiting Y and aimed at the axis is
    // (cos A, 0, −sin A) whatever the elevation. Unit length, and the
    // projection is orthographic, so a case moved `d` along it moves exactly
    // `d` world units across the frame — which is what lets the row and the
    // DOM copy beside it share one step.
    //
    // It has to be recomputed here rather than baked in as a constant: the
    // camera is walking, so the direction that means "to the right" is walking
    // with it. Laid out on a fixed axis the row swings off the screen the
    // moment the orbit starts.
    const rightX = Math.cos(azimuth)
    const rightZ = -Math.sin(azimuth)

    for (const piece of pieces) {
      const group = slots.current.get(piece.id)
      if (!group) continue
      let delta = piece.slot - progress
      delta = delta - Math.round(delta / count) * count

      /* The piece is bolted to the world.

         Written as "where the camera is now, plus the angle this piece should
         rest at, plus how far away from it you are" — which works out to a
         value that does not change as you scroll, because the camera's own
         term cancels the delta's. So it never turns; all of its apparent
         rotation is the orbit. Expressing it this way rather than as a fixed
         world angle is what keeps it right across the wrap at the end of the
         row, where the slot index and the scroll position are a whole lap
         apart. */
      const turn = turns.current.get(piece.id)
      if (turn) {
        const rest = objectControls[turnKey(piece.id)] ?? piece.turn * REST_TURN
        turn.rotation.y = azimuth + MathUtils.degToRad(rest + delta * ORBIT)
      }

      /* Three things move a piece horizontally and they are all one number:
         how far along the row it is, how far right the whole stage is set
         (`shift` — see `shiftW` in room.ts), and its own X nudge. All three
         are distances *across the screen*, so all three are multiplied into
         the camera's right vector together. Vertical needs no such treatment:
         world Y is up on screen at any azimuth. */
      const along = delta * step + shift + (objectControls[xKey(piece.id)] ?? piece.offsetX)
      const up = layout.caseY + (objectControls[yKey(piece.id)] ?? piece.offsetY)
      group.position.set(along * rightX, up, along * rightZ)
    }
  })
  return (
    <group>
      {pieces.map((piece) => (
        <group
          key={piece.id}
          ref={(el) => {
            if (el) slots.current.set(piece.id, el)
            else slots.current.delete(piece.id)
          }}
        >
          <Vitrine height={layout.caseH} showCase={SHOW_CASE}>
            <Lift intensity={piece.lift}>
              <group
                scale={PIECE_FIT * (objectControls[scaleKey(piece.id)] ?? 1)}
                ref={(el) => {
                  if (el) turns.current.set(piece.id, el)
                  else turns.current.delete(piece.id)
                }}
              >
                {/* Outside Float, so the drift is already running as the
                    piece arrives and the two never fight over position.y —
                    the arrival moves the parent, Float moves the child. */}
                <Arrive shown={piece.slot === focus}>
                  <Float
                    speed={piece.floatSpeed}
                    floatIntensity={piece.floatIntensity}
                    rotationIntensity={piece.floatRotation}
                  >
                    <Suspense fallback={null}>{piece.node}</Suspense>
                  </Float>
                </Arrive>
              </group>
            </Lift>
          </Vitrine>
        </group>
      ))}
    </group>
  )
}

/**
 * The piece rises into its case and fades up as you arrive at it, and sinks
 * back out as you leave.
 *
 * Driven by an exponential ease toward 0 or 1 rather than by a clock started
 * on a change. That is what makes it survive being interrupted: scrolling
 * briskly through the work reverses this a dozen times, and a timed tween
 * restarted from zero each time either snaps or plays a full entrance for
 * something that was already halfway there.
 *
 * The fade costs a traversal, so `transparent` — which recompiles the shader
 * — is toggled exactly twice per arrival, at the ends, and never left on:
 * these pieces are single objects with a screen inside a body, and a
 * permanently transparent body sorts its own screen behind it.
 */
function Arrive({ shown, children }: { shown: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null)
  // Starts settled when it mounts already in focus — arriving at the work
  // should not replay an entrance for the project you were already on.
  const t = useRef(shown ? 1 : 0)
  const fading = useRef<boolean | null>(null)

  useFrame((_, delta) => {
    const group = ref.current
    if (!group) return
    const dt = Math.min(0.05, delta)
    const target = shown ? 1 : 0
    t.current += (target - t.current) * (1 - Math.exp(-dt / (shown ? RISE_TAU : FALL_TAU)))
    if (Math.abs(target - t.current) < 0.002) t.current = target

    group.position.y = -RISE * (1 - t.current)

    // Opaque well before the rise has finished — see FADE_OVER.
    const alpha = t.current >= 1 ? 1 : Math.min(1, t.current / FADE_OVER)
    const nowFading = alpha < 0.999
    if (nowFading !== fading.current) {
      fading.current = nowFading
      group.traverse((o) => {
        const material = (o as Mesh).material as MeshStandardMaterial | undefined
        if (!material) return
        if (material.userData.opaque === undefined) material.userData.opaque = !material.transparent
        material.transparent = nowFading || !material.userData.opaque
        material.needsUpdate = true
      })
    }
    if (!nowFading) return
    group.traverse((o) => {
      const material = (o as Mesh).material as MeshStandardMaterial | undefined
      if (material) material.opacity = alpha
    })
  })

  return <group ref={ref}>{children}</group>
}

/**
 * Dresses a piece for the room: its brightness, and its shadow.
 *
 * The room has one exposure and one environment, because it is one scene —
 * and the products were tuned back when each had its own canvas and could ask
 * for whatever exposure suited it. `envMapIntensity` is the one brightness
 * control that is per *material*, so it is what carries that tuning now.
 *
 * `castShadow` has to be set the same way. It is a property of the *mesh*, and
 * these pieces come from a dozen places — a glTF loader, a sprite billboard,
 * eight hand-built components — none of which know they are going to be stood
 * on a plinth. Setting it here is what puts every one of them on the cap
 * below it without editing all twelve.
 *
 * Re-run on every commit rather than once: a glTF streams in after this
 * subtree first mounts, and anything applied before the meshes exist is
 * applied to nothing.
 */
function Lift({ intensity, children }: { intensity: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useEffect(() => {
    ref.current?.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      const mat = mesh.material as MeshStandardMaterial
      if (mat?.isMeshStandardMaterial) mat.envMapIntensity = intensity
    })
  })
  return <group ref={ref}>{children}</group>
}

export default function Gallery3D(props: Gallery3DProps) {
  const { onTune } = props
  // One folder per project (see `OBJECT_SCHEMA`) — angle, size and position,
  // each piece on its own.
  const objectControls = useControls('Objects', OBJECT_SCHEMA) as unknown as Record<string, number>
  const { spacing, shift, narrowAt } = useControls('Layout', LAYOUT_SCHEMA) as unknown as RoomTuning

  useEffect(() => {
    Object.assign(live, objectControls, { spacing, shift, narrowAt })
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(live))
    } catch {
      // See readStore: an unavailable store means the panel does not persist,
      // which is not a reason for the gallery to stop working.
    }
  }, [objectControls, spacing, shift, narrowAt])

  // Up to Gallery.tsx, which owns the room's proportions and has to move the
  // wall labels by the same amounts.
  useEffect(() => {
    onTune?.({ spacing, shift, narrowAt })
  }, [onTune, spacing, shift, narrowAt])

  return (
    <>
      {/* Development only. Everything it sets has a permanent home in
          products.tsx and room.ts, and a visitor arriving at a portfolio
          behind a debug panel is not the impression to make. */}
      <Leva collapsed hidden={!import.meta.env.DEV} titleBar={{ title: 'Exhibit tuning' }} />
      <Canvas
        className="gl-canvas"
        orthographic
        shadows
        dpr={[1, 1.5]}
        // Everything is within a unit of the origin and the camera is ten units
        // out, so the depth range is pulled tight around the row — the same
        // reason the perspective stage did it: flat decals on these products sit
        // coplanar with the surfaces under them and strobe otherwise.
        camera={{ position: [0, 0, 10], zoom: 1, near: 1, far: 40 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace
        }}
        style={{ background: 'transparent' }}
      >
        <RoomLens />
        <Exposure value={0.1} />

        {/* Blender's lights do not survive a glTF export, so the environment
          does most of the work on a gloss object — but an environment alone
          casts nothing, and a room with no shadow in it is a page with
          objects printed on it. The key is a real gallery light: high, in
          front, slightly to the right, and the only caster.

          Its shadow camera is pulled tight around the row. The default one
          spans a hundred units and this whole room is about two units tall, so
          left at the default the entire scene falls inside a couple of texels
          and every shadow arrives as a grey smear. */}
        <StudioEnvironment intensity={4} />
        <ambientLight intensity={0.85} />
        <directionalLight
          castShadow
          /* High, like a gallery downlight — and fixed, while the camera walks.
           The elevation is doing real work at that combination: at 90 degrees
           of orbit per project the key ends up behind the case every other
           detent, and only a light this close to overhead keeps the faces
           turned toward you lit at every step. It is also what the reference
           photograph has, and why the shadow there is short and tucked under
           the plinth rather than thrown across the floor.

           Nearly overhead is also what makes a *fixed* key survive an orbit at
           all. A vertical face takes the key at cos(incidence), so at eighty
           degrees of elevation it is picking up a sixth of the beam whichever
           way it is turned, and the difference between a face toward the light
           and one away from it is small next to what the environment is
           already giving it. Drop the light toward the horizon and the same
           orbit swings the plinth from white to mid-grey every other project.
           The plinth's *top* still takes the beam square-on, which is where
           the contrast belongs — and is what the reference photograph
           does. */
          position={[0.72, 6.5, 0.9]}
          intensity={5.6}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={12}
          shadow-camera-left={-2.4}
          shadow-camera-right={2.4}
          shadow-camera-top={2.4}
          shadow-camera-bottom={-2.4}
          shadow-bias={-0.0008}
          shadow-normalBias={0.012}
        />
        {/* Fill, from the other side and cool, so the turned-away faces of the
          plinths are not dead. No shadow: a second caster gives every object
          two shadows, which reads as a rendering error rather than as light. */}
        <directionalLight position={[-3.2, 2.2, -2.6]} intensity={1.7} color="#cdd6e0" />

        {/* Exactly under the plinths, from the vitrine's own proportions — a
          floor guessed at with a magic number is a floor the cases hover
          above, which is precisely what a shadow starting half a pedestal
          away from its object looks like. */}
        <Floor y={props.layout.caseY - (props.layout.caseH * VITRINE_TOTAL) / 2} />
        <RowWithStep {...props} objectControls={objectControls} />
      </Canvas>
    </>
  )
}

/**
 * The step and the stage shift in world units. Both arrive as viewport
 * *widths*, and one world unit is one viewport *height*, so the aspect ratio
 * is what converts between them.
 *
 * Derived from the canvas size rather than read off `viewport`, which is a
 * value the store caches and recomputes on its own resize and camera events.
 * `RoomLens` sets the zoom by mutating the camera in an effect, which is not
 * one of them — so `viewport.width` is still reporting the pixel-scale
 * frustum from before the zoom was applied, five hundred times too wide. The
 * only symptom is that every case but the one dead centre is parked several
 * hundred world units off-screen, which looks exactly like a scene that
 * failed to mount.
 */
function RowWithStep(props: Gallery3DProps & Omit<RowExtra, 'step' | 'shift'>) {
  const size = useThree((s) => s.size)
  const aspect = size.width / size.height
  const { stepW, shiftW } = props.layout
  return <Row {...props} step={stepW * aspect} shift={shiftW * aspect} />
}

/**
 * The ground the row stands on: nothing but the shadow it receives.
 *
 * `shadowMaterial` draws only what is shadowed and is fully transparent
 * everywhere else, so the page's own paper shows through and there is no grey
 * plane sitting under the parchment. It is what turns three floating boxes
 * into three plinths standing on a floor.
 */
function Floor({ y }: { y: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <shadowMaterial transparent opacity={0.24} color="#14120e" />
    </mesh>
  )
}

function Exposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = value
  }, [gl, value])
  return null
}
