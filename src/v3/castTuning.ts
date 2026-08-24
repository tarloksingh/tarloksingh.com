import { button, folder, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'
import { CAST } from './heroes'

/* ---- the home cast's tuning panel ----

   Where every subject on the home screen stands, how each one is lit, where
   the camera is, and the ground they stand over.

   This replaced `heroTuning.ts`, which tuned a roster that only ever had one
   subject up at a time: its pose had a size, a turn and a lift, and no way to
   say *where across the stage* anything sat, because nothing needed one. Five
   separate contexts, each centring its occupant in a cell. Which is why the
   cast never looked composed — nothing anywhere described the group.

   Deliberately separate from the project screens' panels. `modelTuning.ts` is
   Mr. Takahashi's own rig and `productTuning.ts` is the pieces' studio; both
   describe a subject alone at case-study size. The home page is a group
   portrait. See `MechCast.tsx`, and `MechPanel.tsx` for how the panels are
   presented.

   **No dots in any key here.** Leva reads `.` in a key as a folder separator,
   so `wave.on` silently produced a folder called `wave` nested inside the
   Wave folder, and a subject titled "Mr. Takahashi" became a folder `Mr`
   containing `Takahashi`. Two levels of phantom nesting is what made the
   panel overlap itself. Everything namespaced here uses `__`, and folder
   labels are stripped of dots on the way in. */

const SEP = '__'

/** A subject's key on the panel, without the character Leva would read as a
 *  folder separator. */
const key = (id: string, field: string) => `${id}${SEP}${field}`

/** A folder label Leva will not split. */
const label = (title: string) => title.replace(/\./g, '')

export interface CastStudio {
  /** Millimetres on a 35mm back. */
  focalLength: number
  /** How much of the stage's height one world unit fills. */
  fill: number
  /** Renderer-level, so it cannot be per-subject: there is one tone map for
   *  the canvas. Every other lighting number on this panel belongs to one
   *  subject. */
  exposure: number

  /* ---- the camera ----

     So a composition can be adjusted without re-placing every subject one at
     a time, which is what "I need to move everything up" used to mean. */

  /** Pushes the camera back (positive) or in (negative), on top of whatever
   *  `fill` works out to. */
  dolly: number
  /** How high the camera sits. */
  camY: number
  /** Degrees the camera pitches. Negative looks down. */
  tilt: number
  /** Added to every subject's own `y`. The one to reach for to move the whole
   *  cast up or down. */
  lift: number
  /** Multiplies every subject's own `x`, so the line-up can be opened out or
   *  drawn in without touching any of them. */
  spread: number

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
  focalLength: 78,
  fill: 0.34,
  exposure: 1,
  dolly: 0,
  camY: 0,
  tilt: 0,
  lift: 0,
  spread: 1,
  floatSpeed: 4,
  floatRange: 0,
  floatRotation: 0,
  lean: 10,
  wheelRpm: 620,
  shake: 0.006
}

/** Where one subject stands.
 *
 *  `x`, `y` and `z` are the shared stage's world units — the same space the
 *  camera is in, so `x: 1` is one subject-height to the right and `z` moves
 *  something toward the lens. Measured from the middle of the stage, then
 *  offset by the studio's `lift` and `spread`.
 *
 *  **The face reads two of these differently.** Mr. Takahashi is not in the
 *  cast's canvas — he is `MechModel`, his own context with his own rig, laid
 *  over the stage as a second layer, because he is the one subject on this
 *  site with a lighting setup built around him. So for `kind: 'face'` the
 *  placement is applied to that layer: `x`/`y` become a fraction of the stage
 *  box and `scale` multiplies his own `fill`, which keeps him sharp — scaling
 *  the canvas element would magnify the pixels he was drawn at. `z`, `turn`
 *  and `tilt` do nothing for him; his rig owns those. */
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

export const CAST_SLOTS: Record<string, CastSlot> = {
  takahashi: { x: -0.1, y: 0.08, z: 0, scale: 0.65, turn: -180, tilt: 0 },
  capsule: { x: 0.53, y: 0.42, z: -1.73, scale: 0.64, turn: -53.5, tilt: 25.5 },
  rider: { x: -0.62, y: -0.27, z: -1.06, scale: 0.81, turn: 130.5, tilt: 27 },
  stitchfam: { x: -0.53, y: 0.38, z: -0.86, scale: 0.43, turn: 0, tilt: 0 },
  fish: { x: 0.46, y: -0.1, z: -1.95, scale: 0.63, turn: -180, tilt: -90 }
}

export const slotFor = (id: string): CastSlot => CAST_SLOTS[id] ?? CAST_SLOT_FALLBACK

/** One subject's own lighting.
 *
 *  Genuinely its own: each subject and the two lights aimed at it go on a
 *  three.js layer of their own, and a light only illuminates what shares a
 *  layer with it. So Capsule C1's key cannot spill onto Solomon.
 *
 *  **There is no global light and no global environment left.** The scene's
 *  environment used to be turned up as one number for the whole cast, which
 *  is the "generic lighting effect in the way" — a bright studio box lighting
 *  everything at once, the one thing on this stage nobody could aim. The room
 *  is still generated (PBR needs something to reflect) but its scene-level
 *  intensity is pinned at 1, and `env` here is the only thing that decides
 *  how hard *this* subject picks it up. Set it to 0 and the subject is lit by
 *  its own two lights and nothing else. */
export interface CastLight {
  keyIntensity: number
  keyX: number
  keyY: number
  keyZ: number
  fillIntensity: number
  fillX: number
  fillY: number
  fillZ: number
  /** This subject's `envMapIntensity`. 0 removes the room from it entirely. */
  env: number
}

export const CAST_LIGHT_FALLBACK: CastLight = {
  keyIntensity: 2.6,
  keyX: 3,
  keyY: 4,
  keyZ: 5,
  fillIntensity: 1,
  fillX: -4,
  fillY: 1,
  fillZ: -3,
  env: 1
}

export const CAST_LIGHTS: Record<string, CastLight> = {
  takahashi: { keyIntensity: 2.6, keyX: 3, keyY: 4, keyZ: 5, fillIntensity: 1, fillX: -4, fillY: 1, fillZ: -3, env: 1 },
  capsule: { keyIntensity: 2.4, keyX: -3.6, keyY: -2.5, keyZ: 5.5, fillIntensity: 1.4, fillX: -6.5, fillY: -3.6, fillZ: -10, env: 0.35 },
  rider: { keyIntensity: 2.2, keyX: -10, keyY: -10, keyZ: -10, fillIntensity: 1.1, fillX: -4, fillY: -10, fillZ: -3, env: 1 },
  stitchfam: { keyIntensity: 2.2, keyX: 1, keyY: 3, keyZ: 6, fillIntensity: 1.6, fillX: -3, fillY: 1, fillZ: 2, env: 0.8 },
  fish: { keyIntensity: 2.4, keyX: 2, keyY: 3, keyZ: 5, fillIntensity: 1.5, fillX: -3, fillY: 2, fillZ: -1, env: 0.9 }
}

export const lightFor = (id: string): CastLight => CAST_LIGHTS[id] ?? CAST_LIGHT_FALLBACK

/** The ground the cast stands over — see `MechWave.tsx`. Its own full-window
 *  canvas rather than part of the cast's, because `.mech-frame` is a 16:9
 *  column and a horizon cut off at the letterbox is not a horizon. */
export interface CastWave {
  on: boolean
  /** How high the crests run, in world units. */
  amp: number
  /** How tight the pattern is — bigger is more, smaller waves. */
  scale: number
  speed: number
  /** How far below the cast the surface sits. */
  y: number
  /** How far back its centre is pushed, which is what gives it a horizon. */
  depth: number
  /** Grid cells across the whole field. */
  cells: number
  /** The distance the far edge has dissolved by, so it reaches no edge. */
  fade: number
  /** How solid the lines are. */
  opacity: number
  /** Straight multiplier on the colour. Past 1 it blows the crests out, which
   *  over black is exactly the look. */
  gain: number
  /** How much hotter crests and intersections run than troughs. */
  glow: number
  /** Degrees of hue fanned across the width of the field. 0 leaves the three
   *  colours below exactly as set. */
  hue: number
  /** Degrees a second the whole hue drifts. */
  hueSpeed: number
  /** Troughs, mid-height, crests. Three rather than two because a two-stop
   *  ramp makes every middle height a muddy blend of the ends. */
  low: string
  mid: string
  high: string
  /** World units square, and vertices per side. Cost, not look — neither is
   *  on the panel, because changing either rebuilds the buffer. */
  size: number
  segments: number
}

export const CAST_WAVE: CastWave = {
  on: true,
  amp: 0.68,
  scale: 0.14,
  speed: 0.15,
  y: -2.45,
  depth: 45,
  cells: 167,
  fade: 120,
  opacity: 3,
  gain: 0.18,
  glow: 5,
  hue: 162,
  hueSpeed: -39.5,
  low: '#8d77b4',
  mid: '#684596',
  high: '#c07cff',
  size: 90,
  segments: 200
}

const STORE_KEY = 'v3.cast.tuning.v2'

interface Stored {
  studio?: Partial<CastStudio>
  slots?: Record<string, CastSlot>
  lights?: Record<string, CastLight>
  wave?: Partial<CastWave>
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
const startStudio: CastStudio = { ...CAST_STUDIO, ...saved.studio }
const startWave: CastWave = { ...CAST_WAVE, ...saved.wave }

const live = {
  studio: { ...startStudio },
  slots: { ...CAST_SLOTS, ...saved.slots },
  lights: { ...CAST_LIGHTS, ...saved.lights },
  wave: { ...startWave }
}

const STUDIO_KEYS = Object.keys(CAST_STUDIO) as Array<keyof CastStudio>
const SLOT_KEYS = ['x', 'y', 'z', 'scale', 'turn', 'tilt'] as const
const LIGHT_KEYS = Object.keys(CAST_LIGHT_FALLBACK) as Array<keyof CastLight>
const WAVE_NUMBERS = [
  'amp', 'scale', 'speed', 'y', 'depth', 'cells', 'fade',
  'opacity', 'gain', 'glow', 'hue', 'hueSpeed'
] as const

const tidy = (value: number) => String(Number(value.toFixed(4)))

const asSource = () => {
  const studio = `export const CAST_STUDIO: CastStudio = {\n${STUDIO_KEYS
    .map((k) => `  ${k}: ${tidy(live.studio[k])}`)
    .join(',\n')}\n}`

  const slots = `export const CAST_SLOTS: Record<string, CastSlot> = {\n${CAST.map((hero) => {
    const slot = live.slots[hero.id] ?? CAST_SLOT_FALLBACK
    return `  ${hero.id}: { ${SLOT_KEYS.map((k) => `${k}: ${tidy(slot[k])}`).join(', ')} }`
  }).join(',\n')}\n}`

  const lights = `export const CAST_LIGHTS: Record<string, CastLight> = {\n${CAST.map((hero) => {
    const lit = live.lights[hero.id] ?? CAST_LIGHT_FALLBACK
    return `  ${hero.id}: { ${LIGHT_KEYS.map((k) => `${k}: ${tidy(lit[k])}`).join(', ')} }`
  }).join(',\n')}\n}`

  const wave = `export const CAST_WAVE: CastWave = {\n${[
    `  on: ${live.wave.on}`,
    ...WAVE_NUMBERS.map((k) => `  ${k}: ${tidy(live.wave[k])}`),
    `  low: '${live.wave.low}'`,
    `  mid: '${live.wave.mid}'`,
    `  high: '${live.wave.high}'`,
    `  size: ${tidy(live.wave.size)}`,
    `  segments: ${tidy(live.wave.segments)}`
  ].join(',\n')}\n}`

  return `${studio}\n\n${slots}\n\n${lights}\n\n${wave}`
}

type Flat = Record<string, number | string | boolean>

/** Every subject's placement and rig, the camera, and the ground — one store,
 *  which `MechPanel` shows as tabs.
 *
 *  One folder per subject rather than a folder for "the selected one", which
 *  is what the roster's panel did and what made it useless for composing:
 *  arranging a group means dragging one thing while watching its neighbours. */
export function useCastTuning() {
  const store = useCreateStore()

  const [values] = useControls(
    () => ({
      'Copy for source': button(() => {
        const text = asSource()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[cast] paste over the four constants in src/v3/castTuning.ts:\n\n${text}`)
      }),
      Reset: button(() => {
        window.localStorage.removeItem(STORE_KEY)
        window.location.reload()
      }),

      /* Everything at once, so a composition can be moved without re-placing
         every subject in it. */
      Stage: folder(
        {
          lift: { value: startStudio.lift, min: -4, max: 4, step: 0.01, label: 'Lift all' },
          spread: { value: startStudio.spread, min: 0.1, max: 3, step: 0.01, label: 'Spread' },
          dolly: { value: startStudio.dolly, min: -10, max: 20, step: 0.05, label: 'Dolly' },
          camY: { value: startStudio.camY, min: -6, max: 6, step: 0.01, label: 'Cam height' },
          tilt: { value: startStudio.tilt, min: -60, max: 60, step: 0.1, label: 'Cam tilt' },
          focalLength: { value: startStudio.focalLength, min: 18, max: 200, step: 1, label: 'mm' },
          fill: { value: startStudio.fill, min: 0.05, max: 0.95, step: 0.01, label: 'Fills' },
          /* The one light left that is not a subject's own — there is a single
             tone map for the canvas and it cannot be split. */
          exposure: { value: startStudio.exposure, min: 0.01, max: 4, step: 0.01, label: 'Exposure' },
          lean: { value: startStudio.lean, min: 0, max: 40, step: 0.5, label: 'Lean' }
        },
        { collapsed: false }
      ),

      ...Object.fromEntries(
        CAST.map((hero) => {
          const seed = live.slots[hero.id] ?? CAST_SLOT_FALLBACK
          const lit = live.lights[hero.id] ?? CAST_LIGHT_FALLBACK
          return [
            label(hero.title),
            folder(
              {
                [key(hero.id, 'x')]: { value: seed.x, min: -6, max: 6, step: 0.01, label: 'X' },
                [key(hero.id, 'y')]: { value: seed.y, min: -4, max: 4, step: 0.01, label: 'Y' },
                [key(hero.id, 'z')]: { value: seed.z, min: -6, max: 6, step: 0.01, label: 'Z' },
                [key(hero.id, 'scale')]: { value: seed.scale, min: 0.05, max: 4, step: 0.01, label: 'Scale' },
                [key(hero.id, 'turn')]: { value: seed.turn, min: -180, max: 180, step: 0.5, label: 'Turn' },
                [key(hero.id, 'tilt')]: { value: seed.tilt, min: -180, max: 180, step: 0.5, label: 'Tilt' },

                /* This subject's own rig, on its own layer — nothing here
                   reaches any other subject. The face is the exception: his
                   lighting is his own tab, since it is his own context. */
                Light: folder(
                  {
                    [key(hero.id, 'keyIntensity')]: { value: lit.keyIntensity, min: 0, max: 12, step: 0.05, label: 'Key' },
                    [key(hero.id, 'keyX')]: { value: lit.keyX, min: -10, max: 10, step: 0.1, label: 'Key X' },
                    [key(hero.id, 'keyY')]: { value: lit.keyY, min: -10, max: 10, step: 0.1, label: 'Key Y' },
                    [key(hero.id, 'keyZ')]: { value: lit.keyZ, min: -10, max: 10, step: 0.1, label: 'Key Z' },
                    [key(hero.id, 'fillIntensity')]: { value: lit.fillIntensity, min: 0, max: 12, step: 0.05, label: 'Fill' },
                    [key(hero.id, 'fillX')]: { value: lit.fillX, min: -10, max: 10, step: 0.1, label: 'Fill X' },
                    [key(hero.id, 'fillY')]: { value: lit.fillY, min: -10, max: 10, step: 0.1, label: 'Fill Y' },
                    [key(hero.id, 'fillZ')]: { value: lit.fillZ, min: -10, max: 10, step: 0.1, label: 'Fill Z' },
                    [key(hero.id, 'env')]: { value: lit.env, min: 0, max: 4, step: 0.02, label: 'Room' }
                  },
                  { collapsed: true }
                )
              },
              { collapsed: true }
            )
          ]
        })
      ),

      Drift: folder(
        {
          floatSpeed: { value: startStudio.floatSpeed, min: 0, max: 4, step: 0.05, label: 'Speed' },
          floatRange: { value: startStudio.floatRange, min: 0, max: 0.3, step: 0.005, label: 'Range' },
          floatRotation: { value: startStudio.floatRotation, min: 0, max: 1.5, step: 0.02, label: 'Turn' }
        },
        { collapsed: true }
      ),

      /* The rider has no baked animation of any kind — `gltf.animations` on
         that export is an empty array — so "at max speed" has to be built out
         of the two things the node graph does give: separate wheel nodes, and
         a body to shake. */
      Rider: folder(
        {
          wheelRpm: { value: startStudio.wheelRpm, min: 0, max: 2000, step: 10, label: 'Wheels' },
          shake: { value: startStudio.shake, min: 0, max: 0.05, step: 0.001, label: 'Shake' }
        },
        { collapsed: true }
      )
    }),
    { store }
  ) as unknown as [Flat]

  const flat = values as Flat
  const serialised = JSON.stringify(flat)

  useEffect(() => {
    for (const k of STUDIO_KEYS) (live.studio[k] as number) = flat[k] as number
    for (const hero of CAST) {
      live.slots[hero.id] = Object.fromEntries(
        SLOT_KEYS.map((k) => [k, flat[key(hero.id, k)]])
      ) as unknown as CastSlot
      live.lights[hero.id] = Object.fromEntries(
        LIGHT_KEYS.map((k) => [k, flat[key(hero.id, k)]])
      ) as unknown as CastLight
    }
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ studio: live.studio, slots: live.slots, lights: live.lights, wave: live.wave })
      )
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  /* Rebuilt from the flat panel values rather than handed back as Leva's own
     object, because the keys are namespaced to keep one folder per subject
     from colliding, and nothing downstream should have to know that. */
  const slots: Record<string, CastSlot> = Object.fromEntries(
    CAST.map((hero) => [
      hero.id,
      Object.fromEntries(SLOT_KEYS.map((k) => [k, flat[key(hero.id, k)]])) as unknown as CastSlot
    ])
  )

  const lights: Record<string, CastLight> = Object.fromEntries(
    CAST.map((hero) => [
      hero.id,
      Object.fromEntries(LIGHT_KEYS.map((k) => [k, flat[key(hero.id, k)]])) as unknown as CastLight
    ])
  )

  return { store, studio: flat as unknown as CastStudio, slots, lights }
}

/* ---- the wave's panel ----

   Its own store, so it is its own tab. It has nothing to do with where a
   subject stands and does not want to be scrolled past to reach one. */
export function useWaveTuning() {
  const store = useCreateStore()

  const [values] = useControls(
    () => ({
      'Copy for source': button(() => {
        const text = asSource()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[cast] paste over the four constants in src/v3/castTuning.ts:\n\n${text}`)
      }),
      on: { value: startWave.on, label: 'On' },
      amp: { value: startWave.amp, min: 0, max: 4, step: 0.01, label: 'Height' },
      scale: { value: startWave.scale, min: 0.02, max: 2, step: 0.01, label: 'Tightness' },
      speed: { value: startWave.speed, min: 0, max: 3, step: 0.01, label: 'Speed' },
      y: { value: startWave.y, min: -8, max: 2, step: 0.05, label: 'Drop' },
      depth: { value: startWave.depth, min: 0, max: 60, step: 0.5, label: 'Push back' },
      cells: { value: startWave.cells, min: 8, max: 240, step: 1, label: 'Cells' },
      fade: { value: startWave.fade, min: 8, max: 160, step: 1, label: 'Reach' },
      opacity: { value: startWave.opacity, min: 0, max: 3, step: 0.01, label: 'Lines' },
      gain: { value: startWave.gain, min: 0, max: 6, step: 0.01, label: 'Bright' },
      glow: { value: startWave.glow, min: 0, max: 5, step: 0.01, label: 'Glow' },
      hue: { value: startWave.hue, min: 0, max: 360, step: 1, label: 'Hue spread' },
      hueSpeed: { value: startWave.hueSpeed, min: -90, max: 90, step: 0.5, label: 'Hue drift' },
      low: { value: startWave.low, label: 'Trough' },
      mid: { value: startWave.mid, label: 'Middle' },
      high: { value: startWave.high, label: 'Crest' }
    }),
    { store }
  ) as unknown as [Flat]

  const flat = values as Flat
  const serialised = JSON.stringify(flat)

  useEffect(() => {
    live.wave = { ...live.wave, ...(flat as unknown as Partial<CastWave>) }
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ studio: live.studio, slots: live.slots, lights: live.lights, wave: live.wave })
      )
    } catch {
      /* private mode, a full quota */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  return { store, wave: { ...CAST_WAVE, ...(flat as unknown as Partial<CastWave>) } as CastWave }
}
