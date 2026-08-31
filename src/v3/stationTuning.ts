import { button, folder, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'
import { setStationParts, STATION_DEFAULTS, type StationPart, type StationParts } from './stationParts'

/* ---- the Station tab ----

   Mecha Station is the one piece on this site that is three objects rather
   than one. `size` on the **Piece** tab scales all three together, which is
   the right control for every other piece and no help at all when the problem
   is the register standing through the monitor's foot.

   So this tab, and only on that project: X, Y, Z, Size and Turn for each of
   the register, the reader and the monitor. Same arrangement as every other
   panel here — a `_DEFAULTS` constant that is what ships, a localStorage
   scratchpad merged over it, and a copy button that hands back source to paste
   into `stationParts.ts`. Nothing set here reaches a visitor until it is
   pasted, and a tab that looks dead is almost always a stale scratchpad: press
   **Reset**. */

const STORE_KEY = 'v3.station.tuning.v1'

const PARTS = ['register', 'reader', 'monitor'] as const
const LABELS: Record<(typeof PARTS)[number], string> = {
  register: 'Cash register',
  reader: 'Card reader',
  monitor: 'Monitor'
}

const stored = (): Partial<Record<string, Partial<StationPart>>> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Partial<StationPart>>) : {}
  } catch {
    return {}
  }
}

/* Each part filled from its default first, so a scratchpad saved before a
   field existed cannot hand the piece an `undefined` scale — the same note as
   in `productTuning.ts`. */
const saved = typeof window === 'undefined' ? {} : stored()
const start: StationParts = Object.fromEntries(
  PARTS.map((id) => [id, { ...STATION_DEFAULTS[id], ...saved[id] }])
) as unknown as StationParts

/** Current values, kept fresh by the hook — the copy button fires outside the
 *  render it was declared in, so it reads this rather than closing over state
 *  that would be a render behind. Same arrangement as `productTuning.ts`. */
const live: StationParts = { ...start }

const tidy = (value: number) => String(Number(value.toFixed(4)))

const asSource = (parts: StationParts) =>
  `export const STATION_DEFAULTS: StationParts = {\n${PARTS.map((id) => {
    const part = parts[id]
    const body = (Object.keys(STATION_DEFAULTS[id]) as Array<keyof StationPart>)
      .map((key) => `${key}: ${tidy(part[key])}`)
      .join(', ')
    return `  ${id}: { ${body} }`
  }).join(',\n')}\n}`

/* One flat schema rather than three built in a loop: Leva reads a schema once
   and the keys have to be literals for the values to come back typed. */
const partFolder = (id: (typeof PARTS)[number]) =>
  folder(
    {
      [`${id}X`]: { value: start[id].x, min: -1.5, max: 1.5, step: 0.005, label: 'X' },
      [`${id}Y`]: { value: start[id].y, min: -1.5, max: 1.5, step: 0.005, label: 'Y' },
      [`${id}Z`]: { value: start[id].z, min: -1.5, max: 1.5, step: 0.005, label: 'Z' },
      [`${id}Scale`]: { value: start[id].scale, min: 0.2, max: 2.5, step: 0.01, label: 'Size' },
      [`${id}Turn`]: { value: start[id].turn, min: -180, max: 180, step: 0.5, label: 'Turn' }
    },
    { collapsed: false }
  )

/** The Station panel, and the placement it is currently set to. Its own store,
 *  and therefore its own tab — the same reasoning as every other tuning hook
 *  here. Mounted only on Mecha Station's screen; see `Mech.tsx`. */
export function useStationTuning() {
  const store = useCreateStore()

  /* The *function* form of `useControls` hands back `[values, set]`, not the
     values — the same tuple `productTuning.ts` destructures. Reading it as the
     values gave every part an `undefined` X and Y, which three quietly turns
     into a `NaN` matrix: no error, no warning, an empty canvas. */
  const [values] = useControls(
    () => ({
      'Copy for source': button(() => {
        const text = asSource(live)
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[station] paste over STATION_DEFAULTS in src/v3/stationParts.ts:\n\n${text}`)
      }),
      Reset: button(() => {
        window.localStorage.removeItem(STORE_KEY)
        window.location.reload()
      }),
      [LABELS.register]: partFolder('register'),
      [LABELS.reader]: partFolder('reader'),
      [LABELS.monitor]: partFolder('monitor')
    }),
    { store }
  ) as unknown as [Record<string, number>]

  const parts: StationParts = Object.fromEntries(
    PARTS.map((id) => [
      id,
      {
        x: values[`${id}X`],
        y: values[`${id}Y`],
        z: values[`${id}Z`],
        scale: values[`${id}Scale`],
        turn: values[`${id}Turn`]
      }
    ])
  ) as unknown as StationParts

  const serialised = JSON.stringify(parts)
  useEffect(() => {
    const next = JSON.parse(serialised) as StationParts
    for (const id of PARTS) live[id] = next[id]
    setStationParts(next)
    try {
      window.localStorage.setItem(STORE_KEY, serialised)
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
  }, [serialised])

  return { store, parts }
}
