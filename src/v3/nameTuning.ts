import { button, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'

/* ---- the name behind the cast ----

   Home used to carry the name in the side column, small, next to whichever
   project the pointer happened to be over — and swapped it out for that
   project's title on hover, which is what made the front page read as
   "whatever you're pointing at" rather than as a person's front door. It
   moved out here instead: large, centred, behind the line-up rather than
   beside it, and it no longer reacts to the pointer at all. See `.mech-lede`
   in Mech.tsx for what it replaced, and `.mech-hero-name` in Mech.css for
   the layer itself.

   Sized off the frame's own width, the same average-advance heuristic
   `.mech-title` fits a project's name against its column with — see
   `--hero-name-len` where it's set. `size` here is a scale on top of that
   fit, for when the width-fitted number still wants nudging by eye; nothing
   else on this panel touches how big it draws, only where and how much it
   shows through. */

export interface NameTuning {
  /** Scales the width-fitted size. 1 is exactly the frame's width, one line. */
  size: number
  /** Frame units off vertical centre. Negative moves it up. */
  y: number
  /** How much the block stands out from behind the cast. */
  opacity: number
  /** Frame units between "designer" and the name under it. */
  kickerGap: number
  /** The kicker's own size, in type units. */
  kickerSize: number
}

export const NAME_DEFAULTS: NameTuning = {
  size: 1,
  y: 0,
  opacity: 1,
  kickerGap: 18,
  kickerSize: 20
}

const STORE_KEY = 'v3.name.tuning.v1'

const stored = (): Partial<NameTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Partial<NameTuning>) : {}
  } catch {
    return {}
  }
}

const start: NameTuning = { ...NAME_DEFAULTS, ...(typeof window === 'undefined' ? {} : stored()) }

const live: NameTuning = { ...start }

const tidy = (value: number) => String(Number(value.toFixed(3)))

const asSource = (values: NameTuning) =>
  `export const NAME_DEFAULTS: NameTuning = {\n${(Object.keys(NAME_DEFAULTS) as Array<keyof NameTuning>)
    .map((k) => `  ${k}: ${tidy(values[k])}`)
    .join(',\n')}\n}`

/** Its own store and its own tab, home only — the same arrangement
 *  `narrowTuning.ts` uses for the phone's two knobs. */
export function useNameTuning() {
  const store = useCreateStore()

  const values = useControls(
    {
      size: { value: start.size, min: 0.5, max: 1.4, step: 0.01, label: 'Size' },
      y: { value: start.y, min: -300, max: 300, step: 1, label: 'Vertical' },
      opacity: { value: start.opacity, min: 0, max: 1, step: 0.01, label: 'Opacity' },
      kickerGap: { value: start.kickerGap, min: 0, max: 80, step: 1, label: 'Gap' },
      kickerSize: { value: start.kickerSize, min: 10, max: 40, step: 1, label: 'Designer size' },
      'Copy for source': button(() => {
        const text = asSource(live)
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[name] paste over NAME_DEFAULTS in src/v3/nameTuning.ts:\n\n${text}`)
      })
    },
    { store }
  ) as unknown as NameTuning

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
