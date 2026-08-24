import { button, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'

/* ---- the phone's two knobs ----

   The subject's panel and the label editor are both off on a narrow screen:
   at three hundred and ninety points a Leva panel is most of the window, and
   the thing it is meant to help you look at is behind it. What is left is the
   one adjustment the narrow layout actually needs by eye — how big the
   subject and the pictures sit in a stage that is no longer a 16:9 island in
   the middle of a wide frame — and it gets a panel of its own, two rows tall.

   Same arrangement as `modelTuning.ts` otherwise: a `_DEFAULTS` constant that
   is the shipped value, a localStorage scratchpad so a session survives a
   reload, and a copy button that hands back source to paste over the
   constant. Nothing set here reaches a visitor until it is pasted.

   Neither number touches `MODEL_DEFAULTS`. `model` multiplies the subject's
   `fill` on its way into `MechModel` — the same lens, framed larger — and
   `media` is a scale on the housing, which is CSS. The desktop layout never
   reads either one. */

export interface NarrowTuning {
  /** Multiplies `MODEL_DEFAULTS.fill` — how much of the stage's height the
   *  subject fills — on narrow layouts only. */
  model: number
  /** Scales the picture and its housing inside the narrow stage. */
  media: number
}

export const NARROW_DEFAULTS: NarrowTuning = {
  model: 1.5,
  media: 1
}

const STORE_KEY = 'v3.narrow.tuning.v1'

const stored = (): Partial<NarrowTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Partial<NarrowTuning>) : {}
  } catch {
    return {}
  }
}

const start: NarrowTuning = { ...NARROW_DEFAULTS, ...(typeof window === 'undefined' ? {} : stored()) }

const live: NarrowTuning = { ...start }

const tidy = (value: number) => String(Number(value.toFixed(3)))

const asSource = (values: NarrowTuning) =>
  `export const NARROW_DEFAULTS: NarrowTuning = {\n  model: ${tidy(values.model)},\n  media: ${tidy(values.media)}\n}`

/** Its own store, and therefore its own panel — the same arrangement
 *  `labelTuning.ts` uses, and for the same reason: this is not a folder under
 *  the subject's lighting, it is the only panel the phone gets. */
export function useNarrowTuning() {
  const store = useCreateStore()

  const values = useControls(
    {
      model: { value: start.model, min: 0.4, max: 3.5, step: 0.05, label: 'Subject' },
      media: { value: start.media, min: 0.4, max: 1.6, step: 0.01, label: 'Pictures' },
      'Copy for source': button(() => {
        const text = asSource(live)
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[narrow] paste over NARROW_DEFAULTS in src/v3/narrowTuning.ts:\n\n${text}`)
      })
    },
    { store }
  ) as unknown as NarrowTuning

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

  return { store, values }
}
