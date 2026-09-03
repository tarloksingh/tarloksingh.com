import { resetAllTuning } from './tuningStore'
import { button, useControls, useCreateStore } from 'leva'
import { useEffect, useRef } from 'react'
import { copyText } from './clipboard'

/* ---- the phone's knobs ----

   The subject's panel and the label editor are both open on a narrow screen
   now — see `labelTuning.ts` and the note in `MechPins.tsx` — but the wide
   layout's lighting rigs still are not: at three hundred and ninety points a
   Leva panel is most of the window, and a folder of ten light positions is
   not what anyone reaches for on a phone. What is left is the handful of
   adjustments the narrow layout actually needs by eye — how big the subject
   and the pictures sit in a stage that is no longer a 16:9 island in the
   middle of a wide frame.

   Keyed by project id, the same way `MODEL_RIGS` is: a phone stage is a
   different shape for every subject, and a wide flat enclosure and a tall
   head do not fill it at one number. A project with no entry runs at
   `NARROW_FALLBACK`. The panel shows whichever project is on screen and
   reseeds when the readout swings to another.

   Same arrangement as `modelTuning.ts` otherwise: a constant that is the
   shipped value, a localStorage scratchpad so a session survives a reload,
   and a copy button that hands back source to paste over the constant.
   Nothing set here reaches a visitor until it is pasted.

   Nothing here touches `MODEL_DEFAULTS`. Each number is applied on the way
   *into* the component that reads it, on this layout only — `model`
   multiplies the subject's `fill`, `media` scales the housing in CSS. The
   desktop layout never reads either. */

export interface NarrowTuning {
  /** Multiplies the subject's `fill` — how much of the stage's height it
   *  fills — on narrow layouts only. The zoom, in other words. */
  model: number
  /** Nudges the subject left / right in the narrow stage, in frame heights,
   *  scaled with the zoom so it reads as a camera pan. */
  offsetX: number
  /** Nudges the subject up / down, same units. Added to whatever `liftY` the
   *  subject's own rig already carries. */
  offsetY: number
  /** Scales the picture and its housing inside the narrow stage. */
  media: number
  /** Degrees of extra yaw, narrow only, added on top of the subject's own
   *  `turn`. A phone frames one face of a thing where a desktop was tuned to
   *  frame another. */
  spin: number
  /** Degrees of extra pitch, narrow only, added on top of the subject's own
   *  `tilt`. */
  tilt: number
  /** Multiplies the subject's `focalLength`, narrow only. The camera backs
   *  off to hold `fill`, so this changes the perspective — how wide or long
   *  the lens reads — without changing how big the subject sits. */
  lens: number
}

/** What a project scales to when it has no entry of its own. */
export const NARROW_FALLBACK: NarrowTuning = {
  model: 1.5,
  offsetX: 0,
  offsetY: 0,
  media: 1,
  spin: 0,
  tilt: 0,
  lens: 1
}

/** Per-project overrides, pasted back from the panel's copy button. */
export const NARROW_TUNING: Record<string, Partial<NarrowTuning>> = {
  'mr-takahashi': { model: 1.2, media: 1 }
}

const STORE_KEY = 'v3.narrow.tuning.v2'

const saved = ((): Record<string, Partial<NarrowTuning>> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Partial<NarrowTuning>>) : {}
  } catch {
    return {}
  }
})()

const keys = Object.keys(NARROW_FALLBACK) as Array<keyof NarrowTuning>

/** Every project that has ever been tuned, defaults filled in — the shipped
 *  override first, then whatever was last saved. */
const tunings: Record<string, NarrowTuning> = Object.fromEntries(
  [...new Set([...Object.keys(NARROW_TUNING), ...Object.keys(saved)])].map((id) => [
    id,
    { ...NARROW_FALLBACK, ...NARROW_TUNING[id], ...saved[id] }
  ])
)

/** The scale a project's narrow subject and pictures run at. */
export const narrowFor = (id: string): NarrowTuning =>
  tunings[id] ?? { ...NARROW_FALLBACK, ...NARROW_TUNING[id] }

const tidy = (value: number) => String(Number(value.toFixed(3)))

const asSource = () =>
  `export const NARROW_TUNING: Record<string, Partial<NarrowTuning>> = {\n${Object.entries(tunings)
    .map(([id, t]) => `  '${id}': { ${keys.map((k) => `${k}: ${tidy(t[k])}`).join(', ')} }`)
    .join(',\n')}\n}`

/** Its own store, and therefore its own panel — the same arrangement
 *  `labelTuning.ts` uses, and for the same reason: this is not a folder under
 *  the subject's lighting, it is the only numeric panel the phone gets. */
export function useNarrowTuning(projectId: string) {
  const store = useCreateStore()

  /* The schema is read once, so it has to open on the project that is on
     screen — the effect below only catches the next one. */
  const seed = tunings[projectId] ?? NARROW_FALLBACK

  const [values, setValues] = useControls(
    () => ({
      model: { value: seed.model, min: 0.4, max: 3.5, step: 0.05, label: 'Zoom' },
      offsetX: { value: seed.offsetX, min: -1.5, max: 1.5, step: 0.02, label: 'Pan X' },
      offsetY: { value: seed.offsetY, min: -1.5, max: 1.5, step: 0.02, label: 'Pan Y' },
      media: { value: seed.media, min: 0.4, max: 1.6, step: 0.01, label: 'Pictures' },
      spin: { value: seed.spin, min: -180, max: 180, step: 1, label: 'Rotate Y' },
      tilt: { value: seed.tilt, min: -90, max: 90, step: 1, label: 'Rotate X' },
      lens: { value: seed.lens, min: 0.3, max: 3, step: 0.01, label: 'Lens' },
      'Copy for source': button(() => {
        const text = asSource()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[narrow] paste over NARROW_TUNING in src/v3/narrowTuning.ts:\n\n${text}`)
      }),
      Reset: button(() => {
        resetAllTuning()
      })
    }),
    { store }
  ) as unknown as [NarrowTuning, (next: Partial<NarrowTuning>) => void]

  /* Reseed when the readout swings to another project. Without this, opening a
     second project shows the first one's numbers and writes them over its
     record the moment anything is dragged. */
  useEffect(() => {
    const next = tunings[projectId] ?? NARROW_FALLBACK
    setValues({
      model: next.model,
      offsetX: next.offsetX,
      offsetY: next.offsetY,
      media: next.media,
      spin: next.spin,
      tilt: next.tilt,
      lens: next.lens
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  /* Which project the panel's current `values` belong to. `setValues` above
     does not land until a render later, so on the commit where `projectId`
     changes this still holds the previous project's numbers — the same guard
     `modelTuning.ts` carries, and for the same reason. */
  const wroteFor = useRef(projectId)

  const serialised = JSON.stringify(values)
  useEffect(() => {
    if (wroteFor.current !== projectId) {
      wroteFor.current = projectId
      return
    }
    tunings[projectId] = { ...NARROW_FALLBACK, ...tunings[projectId], ...(values as NarrowTuning) }
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(tunings))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised, projectId])

  return { store, values: { ...NARROW_FALLBACK, ...tunings[projectId], ...values } }
}
