import { button, folder, useControls } from 'leva'
import { copyText } from './clipboard'
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

  /** How eagerly the eyes react, and how far they are ever allowed to go —
   *  a twitchy cursor at the edge of the screen should not be able to roll
   *  them past a rotation a face could actually make. */
  lookH: number
  lookV: number
  lookMaxH: number
  lookMaxV: number
  /** Where the eyes sit when they are looking at nothing.
   *
   *  Not zero. `HorizontalLook` and `VerticalLook` are single morphs that
   *  translate the whole eye mesh from one extreme of its travel to the
   *  other — the glTF accessors give both a min equal to their max, so each
   *  is one rigid slide, and the horizontal covers 65% of the eye's own
   *  width. Influence 0 is not a centred gaze, it is hard left; the middle of
   *  the sweep is. Which also means the eyes can only ever move ±0.5 from
   *  here, so the caps above are small numbers now. */
  lookCenterH: number
  lookCenterV: number
  lookSpeed: number
  /** Which way round each axis runs. On the panel rather than in the source
   *  because the morph's own sign convention is not written down anywhere and
   *  is faster to settle by looking at it. */
  lookFlipH: boolean
  lookFlipV: boolean
  /** Follow the bird over the pointer while it is in the air. */
  watchBird: boolean
  /** Seconds the head takes to come off the pointer and onto the bird. The
   *  turn itself is damped downstream, but damping only ever softens the end
   *  of a move — without a ramp on the target the first frame of it is a
   *  whip round. This is the number that makes him notice the bird rather
   *  than acquire it. */
  watchCatch: number
  blinkMin: number
  blinkMax: number
}

export const MODEL_DEFAULTS: ModelTuning = {
  focalLength: 200,
  fill: 0.56,
  lean: 11,
  floatSpeed: 0.9,
  floatRange: 0.14,
  floatRotation: 1.5,

  exposure: 0.05,
  envIntensity: 3.1,
  keyIntensity: 28.5,
  keyX: 12,
  keyY: 0.22,
  keyZ: 12,
  fillIntensity: 71.3,
  fillX: -0.32,
  fillY: 0.08,
  fillZ: -0.66,

  envMapIntensity: 0,
  roughnessBoost: -0.93,
  metalnessScale: 0,

  lookH: 0.8,
  lookV: 0.5,
  lookMaxH: 0.3,
  lookMaxV: 0.22,
  lookCenterH: 0.5,
  lookCenterV: 0.5,
  lookSpeed: 4,
  lookFlipH: false,
  lookFlipV: false,
  watchBird: true,
  watchCatch: 1.8,
  blinkMin: 2.5,
  blinkMax: 9.5
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

/** Long float tails are what a slider's step arithmetic leaves behind, not a
 *  value anyone chose; pasted back into source they are just noise. */
const tidy = (value: number | boolean) => (typeof value === 'number' ? String(Number(value.toFixed(4))) : String(value))

const asSource = (values: ModelTuning) =>
  `export const MODEL_DEFAULTS: ModelTuning = {\n${keys.map((key) => `  ${key}: ${tidy(values[key])}`).join(',\n')}\n}`

export function useModelTuning(): ModelTuning {
  const values = useControls({
    'Copy for source': button(() => {
      const text = asSource(live)
      // Not `navigator.clipboard` directly: it does not exist on a plain
      // http origin, which is what the tailnet dev server is. See
      // `clipboard.ts` — the console line below is the real fallback.
      void copyText(text)
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
      { collapsed: true }
    ),

    Eyes: folder(
      {
        lookH: { value: start.lookH, min: 0, max: 2, step: 0.05, label: 'Sens H' },
        lookV: { value: start.lookV, min: 0, max: 2, step: 0.05, label: 'Sens V' },
        lookMaxH: { value: start.lookMaxH, min: 0.02, max: 0.5, step: 0.01, label: 'Max H' },
        lookMaxV: { value: start.lookMaxV, min: 0.02, max: 0.5, step: 0.01, label: 'Max V' },
        lookCenterH: { value: start.lookCenterH, min: 0, max: 1, step: 0.01, label: 'Centre H' },
        lookCenterV: { value: start.lookCenterV, min: 0, max: 1, step: 0.01, label: 'Centre V' },
        lookSpeed: { value: start.lookSpeed, min: 0.5, max: 14, step: 0.1, label: 'Follow' },
        lookFlipH: { value: start.lookFlipH, label: 'Flip H' },
        lookFlipV: { value: start.lookFlipV, label: 'Flip V' },
        watchBird: { value: start.watchBird, label: 'Watch bird' },
        watchCatch: { value: start.watchCatch, min: 0, max: 6, step: 0.05, label: 'Catch (s)' },
        blinkMin: { value: start.blinkMin, min: 0.5, max: 12, step: 0.1, label: 'Blink min' },
        blinkMax: { value: start.blinkMax, min: 1, max: 24, step: 0.1, label: 'Blink max' }
      },
      { collapsed: true }
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
