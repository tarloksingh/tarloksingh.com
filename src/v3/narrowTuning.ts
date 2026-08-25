import { button, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'

/* ---- the phone's knobs ----

   The subject's panel and the label editor are both off on a narrow screen:
   at three hundred and ninety points a Leva panel is most of the window, and
   the thing it is meant to help you look at is behind it. What is left is the
   handful of adjustments the narrow layout actually needs by eye — how big
   the subject and the pictures sit in a stage that is no longer a 16:9 island
   in the middle of a wide frame, and where the home line-up stands in it —
   and they get a panel of their own, short enough to work under.

   Same arrangement as `modelTuning.ts` otherwise: a `_DEFAULTS` constant that
   is the shipped value, a localStorage scratchpad so a session survives a
   reload, and a copy button that hands back source to paste over the
   constant. Nothing set here reaches a visitor until it is pasted.

   Nothing here touches `MODEL_DEFAULTS` or `CAST_STUDIO`. Each number is
   applied on the way *into* the component that reads it, on this layout only
   — `model` multiplies the subject's `fill`, `media` scales the housing in
   CSS, and the two cast numbers adjust the line-up as it is handed to
   `MechCast`. The desktop layout never reads any of them, and the panels
   those constants belong to still describe the wide composition alone.

   The two cast knobs are the ones home needed once the row of project names
   came off the bottom of the screen. The line-up *is* the index now, so all
   five of them have to be on a phone screen and reachable by thumb — and a
   composition laid out across a 16:9 frame puts the two on the ends past both
   edges of a portrait window, because `fill` is a fraction of the stage's
   height and a tall stage shows less world sideways, not more. Narrowing the
   spread is the fix that keeps every subject the size it was authored;
   pulling the camera back instead would have fitted them by making all five
   smaller, which on the smallest screen is the wrong trade. */

export interface NarrowTuning {
  /** Multiplies `MODEL_DEFAULTS.fill` — how much of the stage's height the
   *  subject fills — on narrow layouts only. */
  model: number
  /** Scales the picture and its housing inside the narrow stage. */
  media: number
  /** Multiplies `CAST_STUDIO.spread`, which is what pulls the home line-up in
   *  from the sides of a portrait window. 1 is the wide composition exactly. */
  castSpread: number
  /** Added to `CAST_STUDIO.lift`. The line-up is authored sitting high in a
   *  16:9 frame with the readout's own columns either side of it; in a tall
   *  stage with nothing beside it, that leaves the objects along the top edge
   *  and half a screen of nothing under them. */
  castLift: number
}

export const NARROW_DEFAULTS: NarrowTuning = {
  model: 1.5,
  media: 1,
  castSpread: 0.68,
  castLift: -0.5
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
  `export const NARROW_DEFAULTS: NarrowTuning = {\n${(Object.keys(NARROW_DEFAULTS) as Array<keyof NarrowTuning>)
    .map((k) => `  ${k}: ${tidy(values[k])}`)
    .join(',\n')}\n}`

/** Its own store, and therefore its own panel — the same arrangement
 *  `labelTuning.ts` uses, and for the same reason: this is not a folder under
 *  the subject's lighting, it is the only panel the phone gets. */
export function useNarrowTuning() {
  const store = useCreateStore()

  const values = useControls(
    {
      model: { value: start.model, min: 0.4, max: 3.5, step: 0.05, label: 'Subject' },
      media: { value: start.media, min: 0.4, max: 1.6, step: 0.01, label: 'Pictures' },
      castSpread: { value: start.castSpread, min: 0.2, max: 1.2, step: 0.01, label: 'Cast spread' },
      castLift: { value: start.castLift, min: -1.5, max: 1, step: 0.01, label: 'Cast lift' },
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
