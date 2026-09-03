/* ---- leva, for a visitor who cannot open it ----

   `vite.config.ts` aliases `leva` to this file in a production build, and only
   in a production build. `npm run dev` gets the real package, unchanged.

   **Why.** Every tuning hook on this site calls `useControls`, and the values
   it hands back are not a debug read-out — they *are* the layout: where the
   cluster sits, how large the name is, how a piece is turned in its bay. So
   `leva` is a static import of ten modules that `Mech.tsx` reaches on its
   first render, and it was arriving in front of first paint on a phone: 211 kB
   raw, 72 kB gzipped, of panel chrome, colour pickers, drag handles and a
   plugin system, for a control surface that only ever renders behind
   `import.meta.env.DEV`. It was the largest single thing left in the critical
   path after three.js came out of it.

   **What this is.** The smallest thing that behaves the same from the outside:
   the schema's own default values, flattened out of its folders, held in state
   so that `set()` still works. That last part is the reason this is a store
   and not a constant — `useProductTuning` and `useModelTuning` reseed their
   per-item folder when the readout swings to another project, and a `set()`
   that did nothing would render every piece with the first project's tuning.
   It is the panel that is missing in production, not the values behind it.

   **What it does not do**, because nothing in production asks for it: render
   anything (`Leva` and `LevaPanel` are empty), run a button's `onClick`, or
   keep two hooks in step through a shared store. `useCreateStore` hands back
   one inert object; the only consumer of a store is `MechPanel`, which is
   development-only and lazily imported.

   **The trap, and it is the usual one for a stub.** `tsc` always resolves
   `leva` to the real package, so nothing here is type-checked against its call
   sites — a divergence shows up in a production build and nowhere else. Keep
   the surface exactly as small as it is: if a tuning hook starts using
   something leva has and this does not, the page breaks only once it is
   deployed. The whole surface is six exports, and they are all below. */

import { useCallback, useRef, useState, type ReactNode } from 'react'

/** A folder in a schema, marked so `flatten` can walk through it. Leva's own
 *  options — `collapsed`, `order` — describe a panel, and there is no panel. */
interface Folder {
  __levaFolder: true
  schema: Record<string, unknown>
}

/** A button. It has no value, so it contributes no key — which is exactly what
 *  the real `useControls` does, and what `productTuning.ts` relies on when it
 *  reads the declared keys off the returned object. */
interface Button {
  __levaButton: true
}

const isFolder = (v: unknown): v is Folder =>
  typeof v === 'object' && v !== null && '__levaFolder' in v

const isButton = (v: unknown): v is Button =>
  typeof v === 'object' && v !== null && '__levaButton' in v

export const folder = (schema: Record<string, unknown>, _options?: unknown): Folder => ({
  __levaFolder: true,
  schema
})

export const button = (_onClick?: unknown, _settings?: unknown): Button => ({
  __levaButton: true
})

/** A schema, flattened to the object `useControls` returns.
 *
 *  Folders are walked into rather than nested, because that is what leva does:
 *  a folder groups controls in the panel and its keys land at the top level of
 *  the values. Buttons drop out. Anything else is either `{ value, … }` — a
 *  control — or a bare value, which leva also accepts. */
const flatten = (schema: Record<string, unknown>, out: Record<string, unknown> = {}) => {
  for (const [key, entry] of Object.entries(schema)) {
    if (isButton(entry)) continue
    if (isFolder(entry)) {
      flatten(entry.schema, out)
      continue
    }
    out[key] =
      typeof entry === 'object' && entry !== null && 'value' in entry
        ? (entry as { value: unknown }).value
        : entry
  }
  return out
}

/** The store every hook makes with `useCreateStore`. Inert, and shared: the
 *  only thing that reads one is the development panel. */
const INERT = {}

export const useCreateStore = () => INERT

type Schema = Record<string, unknown>
type Values = Record<string, unknown>

export function useControls(schema: Schema): Values
export function useControls(schema: Schema, options?: unknown): Values
export function useControls(
  schema: () => Schema,
  options?: unknown,
  deps?: unknown[]
): [Values, (next: Values) => void]
export function useControls(
  schema: string | Schema | (() => Schema),
  a?: unknown,
  b?: unknown[]
) {
  /* Leva also takes `useControls('Folder name', schema, …)` — the string form
     groups the controls under a named folder in the panel. There is no panel,
     so the name is dropped and the real schema slides forward a slot.
     `BlockBuilder.tsx` is the caller that uses it; without this the stub
     flattened the *string* and every value came back undefined. */
  const [realSchema, deps] =
    typeof schema === 'string'
      ? [a as Schema | (() => Schema), b]
      : [schema, b ?? (Array.isArray(a) ? (a as unknown[]) : undefined)]
  return useControlsImpl(realSchema, deps)
}

function useControlsImpl(schema: Schema | (() => Schema), deps?: unknown[]) {
  const fn = typeof schema === 'function'
  const [values, setValues] = useState<Values>(() => flatten(fn ? schema() : schema))

  /* Leva rebuilds its inputs when the deps change — `modelTuning.ts` passes
     `[isFace]`, because the Eyes folder only exists for the face — so the
     values have to be rebuilt from the new schema when it does. Compared and
     applied during the render that changed them, the same beat leva would. */
  const last = useRef<unknown[] | undefined>(deps)
  const held = useRef(values)
  if (fn && deps && last.current && deps.some((d, i) => !Object.is(d, last.current![i]))) {
    held.current = flatten(schema())
    setValues(held.current)
  }
  last.current = deps

  const set = useCallback((next: Values) => {
    setValues((current) => ({ ...current, ...next }))
  }, [])

  return fn ? [values, set] : values
}

/* The panel itself, and the absence of one. Neither is reachable in a
   production build — `MechPanel.tsx` is behind `import.meta.env.DEV` and
   lazily imported — but they are named exports of the module this file stands
   in for, so they exist. */
export const Leva = (_props?: unknown): ReactNode => null
export const LevaPanel = (_props?: unknown): ReactNode => null
