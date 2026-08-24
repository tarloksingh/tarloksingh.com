import { button, folder, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'
import { HEROES } from './heroes'

/* ---- the hero stage's tuning panel ----

   The home screen's five subjects, and the studio they stand in. Same
   arrangement as every other panel here: a `_DEFAULTS` constant that is the
   shipped value, a localStorage scratchpad so a session survives a reload,
   and a copy button that hands back source to paste over the constant.
   Nothing set here reaches a visitor until it is pasted.

   The face is the exception and is not on this panel at all. Mr. Takahashi is
   rendered by `MechModel` — the same component, the same rig, the same
   `MODEL_DEFAULTS` — because he is the one subject on this site that already
   has a lighting setup built around him, and a second one would be a second
   face. So the home screen mounts that component as its own layer rather than
   putting the head through this studio, and `modelTuning.ts` stays the only
   place his numbers live. */

export interface HeroStudio {
  /** Millimetres on a 35mm back. */
  focalLength: number
  /** How much of the stage's height a subject fills before its own `size`. */
  fill: number
  exposure: number
  envIntensity: number
  keyIntensity: number
  fillIntensity: number
  floatSpeed: number
  floatRange: number
  floatRotation: number
  /** Degrees a subject leans toward the pointer across the whole window. */
  lean: number
  /** Revolutions a minute the rider's wheels turn at full speed. */
  wheelRpm: number
  /** How hard the engine shakes, in world units. */
  shake: number
}

export const HERO_STUDIO: HeroStudio = {
  focalLength: 55,
  fill: 0.68,
  exposure: 0.6,
  envIntensity: 2.4,
  keyIntensity: 2.6,
  fillIntensity: 1,
  floatSpeed: 1,
  floatRange: 0.05,
  floatRotation: 0.3,
  lean: 14,
  wheelRpm: 620,
  shake: 0.006
}

/** One subject's own framing on the stage. */
export interface HeroPose {
  size: number
  turn: number
  liftY: number
}

export const HERO_POSE_FALLBACK: HeroPose = { size: 1, turn: 0, liftY: 0 }

export const HERO_POSES: Record<string, HeroPose> = {
  takahashi: { size: 1, turn: 0, liftY: 0 },
  capsule: { size: 1.2, turn: -48, liftY: 0 },
  rider: { size: 1.15, turn: -34, liftY: 0 },
  stitchfam: { size: 0.86, turn: 24, liftY: 0 },
  fish: { size: 0.92, turn: 0, liftY: 0 }
}

export const poseFor = (id: string): HeroPose => HERO_POSES[id] ?? HERO_POSE_FALLBACK

const STORE_KEY = 'v3.hero.tuning.v1'

interface Stored {
  studio?: Partial<HeroStudio>
  poses?: Record<string, HeroPose>
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
const start: HeroStudio = { ...HERO_STUDIO, ...saved.studio }

const live = { studio: { ...start }, poses: { ...HERO_POSES, ...saved.poses }, id: HEROES[0].id }

const keys = Object.keys(HERO_STUDIO) as Array<keyof HeroStudio>

const tidy = (value: number) => String(Number(value.toFixed(4)))

const asSource = () => {
  const studio = `export const HERO_STUDIO: HeroStudio = {\n${keys
    .map((key) => `  ${key}: ${tidy(live.studio[key])}`)
    .join(',\n')}\n}`
  const poses = `export const HERO_POSES: Record<string, HeroPose> = {\n${Object.entries(live.poses)
    .map(([id, pose]) => `  ${id}: { size: ${tidy(pose.size)}, turn: ${tidy(pose.turn)}, liftY: ${tidy(pose.liftY)} }`)
    .join(',\n')}\n}`
  return `${studio}\n\n${poses}`
}

/** The panel, its store, and what it is currently set to. The per-subject
 *  folder is reseeded when the roster moves rather than rebuilt — Leva reads
 *  a schema once, so a folder built for the capsule would still be showing
 *  the capsule's numbers after the stage swung to the rider. */
export function useHeroTuning(heroId: string) {
  const store = useCreateStore()
  const seed = live.poses[heroId] ?? HERO_POSE_FALLBACK

  const [values, set] = useControls(
    () => ({
      'Copy for source': button(() => {
        const text = asSource()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[heroes] paste over HERO_STUDIO and HERO_POSES in src/v3/heroTuning.ts:\n\n${text}`)
      }),
      Reset: button(() => {
        window.localStorage.removeItem(STORE_KEY)
        window.location.reload()
      }),

      'This subject': folder(
        {
          size: { value: seed.size, min: 0.2, max: 2.5, step: 0.01, label: 'Size' },
          turn: { value: seed.turn, min: -180, max: 180, step: 0.1, label: 'Turn' },
          liftY: { value: seed.liftY, min: -0.5, max: 0.5, step: 0.005, label: 'Lift' }
        },
        { collapsed: false }
      ),

      Lens: folder(
        {
          focalLength: { value: start.focalLength, min: 18, max: 200, step: 1, label: 'mm' },
          fill: { value: start.fill, min: 0.2, max: 0.95, step: 0.01, label: 'Fills' },
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
  ) as unknown as [HeroStudio & HeroPose, (values: Partial<HeroPose>) => void]

  useEffect(() => {
    live.id = heroId
    set(live.poses[heroId] ?? HERO_POSE_FALLBACK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId])

  const serialised = JSON.stringify(values)
  useEffect(() => {
    for (const key of keys) (live.studio[key] as number) = values[key]
    live.poses[live.id] = { size: values.size, turn: values.turn, liftY: values.liftY }
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ studio: live.studio, poses: live.poses }))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  return { store, studio: values as HeroStudio, pose: values as HeroPose }
}
