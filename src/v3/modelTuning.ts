import { button, folder, useControls } from 'leva'
import { useEffect } from 'react'

/* ---- the subject's tuning panel ----

   Same arrangement as the wall's (`wallTuning.ts`) and the gallery's: Leva in
   development only, a scratchpad in localStorage so a session survives a
   reload, and a copy button that hands back the whole `MODEL_DEFAULTS` object
   to paste into this file. Nothing set here reaches a visitor until it is
   pasted — that is the point of the copy button.

   Lighting starts where v2's gallery left it, because that is where this face
   was lit. Exposure and the light intensities are one setting: the tenth-stop
   exposure is why the numbers look enormous, and moving either alone throws
   the face out. */

export interface ModelTuning {
  /** Millimetres on a 35mm back. The camera backs off to hold the framing. */
  focalLength: number
  /** How much of the frame's height the subject fills. */
  fill: number
  /** Degrees the subject leans toward the pointer, across the whole frame. */
  lean: number
  floatSpeed: number
  floatRange: number
  floatRotation: number

  exposure: number
  envIntensity: number
  keyIntensity: number
  keyX: number
  keyY: number
  keyZ: number
  fillIntensity: number
  fillX: number
  fillY: number
  fillZ: number

  envMapIntensity: number
  roughnessBoost: number
  metalnessScale: number
}

export const MODEL_DEFAULTS: ModelTuning = {
  focalLength: 85,
  fill: 0.52,
  lean: 9,
  floatSpeed: 1.15,
  floatRange: 0.035,
  floatRotation: 0.18,

  exposure: 0.1,
  envIntensity: 3.4,
  keyIntensity: 30,
  keyX: -3.78,
  keyY: 0.2,
  keyZ: 9,
  fillIntensity: 12.3,
  fillX: 2.1,
  fillY: -0.2,
  fillZ: -1,

  envMapIntensity: 0.6,
  roughnessBoost: 0.2,
  metalnessScale: 0.5
}

const STORE_KEY = 'v3.model.tuning.v1'

const stored = (): Partial<ModelTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Partial<ModelTuning>) : {}
  } catch {
    return {}
  }
}

const start: ModelTuning = { ...MODEL_DEFAULTS, ...(typeof window === 'undefined' ? {} : stored()) }

/** Current values, kept fresh by the hook. The copy button reads this rather
 *  than closing over state that would be a render behind. */
const live: ModelTuning = { ...start }

const keys = Object.keys(MODEL_DEFAULTS) as Array<keyof ModelTuning>

const asSource = (values: ModelTuning) =>
  `export const MODEL_DEFAULTS: ModelTuning = {\n${keys.map((key) => `  ${key}: ${values[key]}`).join(',\n')}\n}`

export function useModelTuning(): ModelTuning {
  const values = useControls({
    'Copy for source': button(() => {
      const text = asSource(live)
      void navigator.clipboard?.writeText(text)
      const n = keys.filter((key) => live[key] !== MODEL_DEFAULTS[key]).length
      // eslint-disable-next-line no-console
      console.log(
        `[model] ${n} value${n === 1 ? '' : 's'} differ from source. Paste over MODEL_DEFAULTS in src/v3/modelTuning.ts:\n\n${text}`
      )
    }),
    Reset: button(() => {
      window.localStorage.removeItem(STORE_KEY)
      window.location.reload()
    }),

    Lens: folder(
      {
        focalLength: { value: start.focalLength, min: 18, max: 200, step: 1, label: 'mm' },
        fill: { value: start.fill, min: 0.2, max: 0.95, step: 0.01, label: 'Fills' },
        lean: { value: start.lean, min: 0, max: 40, step: 0.5 }
      },
      { collapsed: false }
    ),

    Drift: folder(
      {
        floatSpeed: { value: start.floatSpeed, min: 0, max: 4, step: 0.05, label: 'Speed' },
        floatRange: { value: start.floatRange, min: 0, max: 0.3, step: 0.005, label: 'Range' },
        floatRotation: { value: start.floatRotation, min: 0, max: 1.5, step: 0.02, label: 'Turn' }
      },
      { collapsed: true }
    ),

    Lighting: folder(
      {
        exposure: { value: start.exposure, min: 0.01, max: 2, step: 0.01 },
        envIntensity: { value: start.envIntensity, min: 0, max: 12, step: 0.1, label: 'Env' },
        keyIntensity: { value: start.keyIntensity, min: 0, max: 80, step: 0.5, label: 'Key' },
        keyX: { value: start.keyX, min: -12, max: 12, step: 0.01 },
        keyY: { value: start.keyY, min: -12, max: 12, step: 0.01 },
        keyZ: { value: start.keyZ, min: -12, max: 12, step: 0.01 },
        fillIntensity: { value: start.fillIntensity, min: 0, max: 80, step: 0.5, label: 'Fill' },
        fillX: { value: start.fillX, min: -12, max: 12, step: 0.01 },
        fillY: { value: start.fillY, min: -12, max: 12, step: 0.01 },
        fillZ: { value: start.fillZ, min: -12, max: 12, step: 0.01 }
      },
      { collapsed: false }
    ),

    Material: folder(
      {
        envMapIntensity: { value: start.envMapIntensity, min: 0, max: 4, step: 0.05, label: 'Env ×' },
        roughnessBoost: { value: start.roughnessBoost, min: -1, max: 1, step: 0.01, label: 'Rough +' },
        metalnessScale: { value: start.metalnessScale, min: 0, max: 2, step: 0.05, label: 'Metal ×' }
      },
      { collapsed: true }
    )
  }) as unknown as ModelTuning

  /* Keyed on the serialised values rather than the object: Leva hands back a
     fresh object on renders where nothing moved, and writing localStorage on
     every one of those is a write per frame while a slider is dragged. */
  const serialised = JSON.stringify(values)
  useEffect(() => {
    Object.assign(live, values)
    try {
      window.localStorage.setItem(STORE_KEY, serialised)
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  return values
}
