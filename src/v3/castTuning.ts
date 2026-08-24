import { button, folder, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'
import { CAST } from './heroes'

/* ---- the home cast's tuning panel ----

   Where every subject on the home screen stands, and the studio they all
   stand in.

   This replaces `heroTuning.ts`, which tuned a roster that only ever had one
   subject up at a time: its `HeroPose` had a size, a turn and a vertical
   lift, and no way at all to say *where across the stage* anything sat —
   because nothing needed to. The home screen showed one subject in the middle
   of its own box, five boxes side by side, five separate WebGL contexts each
   framing its own occupant. Which is why the cast never looked composed: each
   one was centred in a cell, and no number anywhere described the group.

   So a slot here is a full placement — three axes, a scale and two
   rotations — read in the shared stage's world units rather than in a cell.
   One panel, one folder per subject, and the whole line-up is a thing you can
   actually arrange.

   Deliberately separate from the project screens' panels. `modelTuning.ts` is
   Mr. Takahashi's own lighting rig, `productTuning.ts` is the pieces' studio,
   and both of those describe a subject alone on a project screen at case
   study size. The home page is a group portrait; the numbers have nothing to
   do with each other, and folding them together would mean moving one screen
   to fix the other. The face is the one subject that appears on both, and
   even there this panel only says where the layer sits — how he is lit stays
   `modelTuning.ts`'s business. See `MechCast.tsx`.

   Same contract as every other panel here: a `_DEFAULTS` constant that is the
   shipped value, a localStorage scratchpad so a session survives a reload,
   and a copy button that hands back source to paste over the constants.
   Nothing set here reaches a visitor until it is pasted. */

export interface CastStudio {
  /** Millimetres on a 35mm back. */
  focalLength: number
  /** How much of the stage's height one world unit fills. Smaller than the
   *  old roster's, and it has to be: that number framed a single subject
   *  alone in a cell, and this one has to leave room for the whole cast
   *  alongside each other. */
  fill: number
  exposure: number
  envIntensity: number
  keyIntensity: number
  fillIntensity: number
  floatSpeed: number
  floatRange: number
  floatRotation: number
  /** Degrees a subject leans toward the pointer, across the whole window. */
  lean: number
  /** Revolutions a minute the rider's wheels turn at full speed. */
  wheelRpm: number
  /** How hard the rider's engine shakes, in world units. */
  shake: number
}

export const CAST_STUDIO: CastStudio = {
  focalLength: 55,
  fill: 0.3,
  exposure: 0.6,
  envIntensity: 2.4,
  keyIntensity: 2.6,
  fillIntensity: 1,
  floatSpeed: 1,
  floatRange: 0.05,
  floatRotation: 0.3,
  lean: 10,
  wheelRpm: 620,
  shake: 0.006
}

/** Where one subject stands.
 *
 *  `x`, `y` and `z` are the shared stage's world units — the same space the
 *  camera is placed in, so `x: 1` is one subject-height to the right and `z`
 *  moves something toward the lens. Everything is measured from the middle of
 *  the stage.
 *
 *  **The face reads two of these differently.** Mr. Takahashi is not in the
 *  cast's canvas at all — he is `MechModel`, his own context with his own
 *  lighting rig, laid over the stage as a second layer, for the same reason
 *  he has always been separate: he is the one subject on this site with a
 *  setup built around him and lighting him a second way would be a second
 *  face. So for `kind: 'face'` the placement is applied to that layer instead
 *  of to a group inside a scene: `x`/`y` become a fraction of the stage box
 *  and `scale` multiplies his own `fill`, which keeps him sharp — scaling the
 *  canvas element itself would just magnify the pixels he was rendered at.
 *  `z`, `turn` and `tilt` do nothing for him; his rig owns his rotation. */
export interface CastSlot {
  x: number
  y: number
  z: number
  scale: number
  /** Degrees about the vertical axis. */
  turn: number
  /** Degrees about the horizontal one. */
  tilt: number
}

export const CAST_SLOT_FALLBACK: CastSlot = { x: 0, y: 0, z: 0, scale: 1, turn: 0, tilt: 0 }

/* Five across, reading left to right, in the room to the right of the side
   column — the readout lives at frame x 101–481 and a subject standing in it
   is a subject standing on the writing, which is what the first arrangement
   here did.

   One world unit is `fill` of the stage's height: at 0.3 that is 324 frame
   coordinates, so the whole cast spans about x -1.1 to +2.3 and clears both
   the readout on the left and the gutter on the right.

   The scales are not all near 1 because `Resize` normalises every subject to
   one unit *on its longest edge*, and the subjects are not the same shape.
   Capsule C1 is a long enclosure: at scale 1 it is a metre of cylinder lying
   across the whole left half of the screen, which is exactly what it did. A
   number here is "how big should this read", not "how big is the file".

   Still only a first arrangement. The panel above is the point — this is the
   set of numbers that puts every subject on screen, at a sane size, with
   nothing overlapping anything, and it is meant to be dragged from. */
export const CAST_SLOTS: Record<string, CastSlot> = {
  capsule: { x: -1.1, y: 0, z: 0, scale: 0.5, turn: -48, tilt: 0 },
  rider: { x: -0.2, y: 0, z: 0, scale: 0.85, turn: -34, tilt: 0 },
  takahashi: { x: 0.72, y: 0, z: 0, scale: 0.36, turn: 0, tilt: 0 },
  stitchfam: { x: 1.55, y: 0, z: 0, scale: 0.7, turn: 24, tilt: 0 },
  fish: { x: 2.3, y: 0, z: 0, scale: 0.8, turn: 0, tilt: 0 }
}

export const slotFor = (id: string): CastSlot => CAST_SLOTS[id] ?? CAST_SLOT_FALLBACK

const STORE_KEY = 'v3.cast.tuning.v1'

interface Stored {
  studio?: Partial<CastStudio>
  slots?: Record<string, CastSlot>
}

const stored = (): Stored => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Stored) : {}
  } catch {
    return {}
  }
}

const saved = typeof window === 'undefined' ? {} : stored()
const start: CastStudio = { ...CAST_STUDIO, ...saved.studio }

const live = {
  studio: { ...start },
  slots: { ...CAST_SLOTS, ...saved.slots }
}

const keys = Object.keys(CAST_STUDIO) as Array<keyof CastStudio>

const tidy = (value: number) => String(Number(value.toFixed(4)))

const asSource = () => {
  const studio = `export const CAST_STUDIO: CastStudio = {\n${keys
    .map((key) => `  ${key}: ${tidy(live.studio[key])}`)
    .join(',\n')}\n}`
  const slots = `export const CAST_SLOTS: Record<string, CastSlot> = {\n${CAST.map((hero) => {
    const slot = live.slots[hero.id] ?? CAST_SLOT_FALLBACK
    const body = (['x', 'y', 'z', 'scale', 'turn', 'tilt'] as const)
      .map((key) => `${key}: ${tidy(slot[key])}`)
      .join(', ')
    return `  ${hero.id}: { ${body} }`
  }).join(',\n')}\n}`
  return `${studio}\n\n${slots}`
}

/** Every subject's placement at once, plus the shared studio.
 *
 *  One folder per subject rather than a folder for "the selected one", which
 *  is what the roster's panel did and what made it useless for composing:
 *  arranging a group means dragging one thing while watching its neighbours,
 *  and a panel that only ever shows you the numbers for whichever subject is
 *  currently picked cannot do that. Every slot is on the panel, all the
 *  time. */
export function useCastTuning() {
  const store = useCreateStore()

  const [values] = useControls(
    () => ({
      'Copy for source': button(() => {
        const text = asSource()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[cast] paste over CAST_STUDIO and CAST_SLOTS in src/v3/castTuning.ts:\n\n${text}`)
      }),
      Reset: button(() => {
        window.localStorage.removeItem(STORE_KEY)
        window.location.reload()
      }),

      ...Object.fromEntries(
        CAST.map((hero) => {
          const seed = live.slots[hero.id] ?? CAST_SLOT_FALLBACK
          return [
            hero.title,
            folder(
              {
                [`${hero.id}.x`]: { value: seed.x, min: -6, max: 6, step: 0.01, label: 'X' },
                [`${hero.id}.y`]: { value: seed.y, min: -4, max: 4, step: 0.01, label: 'Y' },
                [`${hero.id}.z`]: { value: seed.z, min: -6, max: 6, step: 0.01, label: 'Z' },
                [`${hero.id}.scale`]: { value: seed.scale, min: 0.05, max: 4, step: 0.01, label: 'Scale' },
                [`${hero.id}.turn`]: { value: seed.turn, min: -180, max: 180, step: 0.5, label: 'Turn' },
                [`${hero.id}.tilt`]: { value: seed.tilt, min: -90, max: 90, step: 0.5, label: 'Tilt' }
              },
              { collapsed: true }
            )
          ]
        })
      ),

      Lens: folder(
        {
          focalLength: { value: start.focalLength, min: 18, max: 200, step: 1, label: 'mm' },
          fill: { value: start.fill, min: 0.05, max: 0.95, step: 0.01, label: 'Fills' },
          lean: { value: start.lean, min: 0, max: 40, step: 0.5, label: 'Lean' }
        },
        { collapsed: true }
      ),

      Lighting: folder(
        {
          exposure: { value: start.exposure, min: 0.01, max: 2, step: 0.01 },
          envIntensity: { value: start.envIntensity, min: 0, max: 8, step: 0.05, label: 'Env' },
          keyIntensity: { value: start.keyIntensity, min: 0, max: 12, step: 0.05, label: 'Key' },
          fillIntensity: { value: start.fillIntensity, min: 0, max: 12, step: 0.05, label: 'Fill' }
        },
        { collapsed: true }
      ),

      Drift: folder(
        {
          floatSpeed: { value: start.floatSpeed, min: 0, max: 4, step: 0.05, label: 'Speed' },
          floatRange: { value: start.floatRange, min: 0, max: 0.3, step: 0.005, label: 'Range' },
          floatRotation: { value: start.floatRotation, min: 0, max: 1.5, step: 0.02, label: 'Turn' }
        },
        { collapsed: true }
      ),

      /* The rider has no baked animation of any kind — `gltf.animations` on
         that export is an empty array — so "at max speed" has to be built out
         of the two things the node graph does give: separate wheel nodes, and
         a body to shake. */
      Rider: folder(
        {
          wheelRpm: { value: start.wheelRpm, min: 0, max: 2000, step: 10, label: 'Wheels' },
          shake: { value: start.shake, min: 0, max: 0.05, step: 0.001, label: 'Shake' }
        },
        { collapsed: true }
      )
    }),
    { store }
  ) as unknown as [Record<string, number>]

  const serialised = JSON.stringify(values)
  useEffect(() => {
    for (const key of keys) (live.studio[key] as number) = values[key]
    for (const hero of CAST) {
      live.slots[hero.id] = {
        x: values[`${hero.id}.x`],
        y: values[`${hero.id}.y`],
        z: values[`${hero.id}.z`],
        scale: values[`${hero.id}.scale`],
        turn: values[`${hero.id}.turn`],
        tilt: values[`${hero.id}.tilt`]
      }
    }
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ studio: live.studio, slots: live.slots }))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  /* Rebuilt from the flat panel values every render rather than handed back
     as Leva's own object, because the panel's keys are namespaced
     (`rider.turn`) to keep one folder per subject from colliding, and nothing
     downstream should have to know that. */
  const slots: Record<string, CastSlot> = Object.fromEntries(
    CAST.map((hero) => [
      hero.id,
      {
        x: values[`${hero.id}.x`],
        y: values[`${hero.id}.y`],
        z: values[`${hero.id}.z`],
        scale: values[`${hero.id}.scale`],
        turn: values[`${hero.id}.turn`],
        tilt: values[`${hero.id}.tilt`]
      }
    ])
  )

  return { store, studio: values as unknown as CastStudio, slots }
}
