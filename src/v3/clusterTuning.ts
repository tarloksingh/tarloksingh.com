import { button, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'

/* ---- the home cluster's own panel ----

   Four numbers, and deliberately only four. The cluster is a fixed layout in
   frame coordinates — where the bands sit, how wide the flanks are and how the
   graph is spaced are all decisions, written in `MechCluster.css` where they
   can be read next to what they affect. What is on here is the handful of
   things that are genuinely a matter of taste in front of a real screen:
   whether the whole cluster sits high or low, how large the name is against
   the readout under it, how far the panel bleeds, and how tall the graph
   stands.

   The tabs this replaces — Cast, Tags, Wave, Name — went with the line-up they
   described. Their files are all still here; see the note at the top of
   `MechCluster.tsx`. */

export interface ClusterTuning {
  /** Frame units off vertical centre. Negative moves the whole cluster up. */
  y: number
  /** Scales the width-fitted name. 1 is the full width of its column. */
  name: number
  /** How far the lit things bleed. 0 is a wireframe, 2 is a panel behind fog. */
  glow: number
  /** How tall a slot in the bank stands, in frame units. */
  slot: number
}

export const CLUSTER_DEFAULTS: ClusterTuning = {
  y: 0,
  name: 0.88,
  glow: 1.2,
  slot: 82
}

const STORE_KEY = 'v3.cluster.tuning.v1'

const stored = (): Partial<ClusterTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Partial<ClusterTuning>) : {}
  } catch {
    return {}
  }
}

const start: ClusterTuning = { ...CLUSTER_DEFAULTS, ...(typeof window === 'undefined' ? {} : stored()) }

const live: ClusterTuning = { ...start }

const tidy = (value: number) => String(Number(value.toFixed(3)))

const asSource = (values: ClusterTuning) =>
  `export const CLUSTER_DEFAULTS: ClusterTuning = {\n${(Object.keys(CLUSTER_DEFAULTS) as Array<keyof ClusterTuning>)
    .map((k) => `  ${k}: ${tidy(values[k])}`)
    .join(',\n')}\n}`

export function useClusterTuning() {
  const store = useCreateStore()

  const values = useControls(
    {
      y: { value: start.y, min: -220, max: 220, step: 1, label: 'Vertical' },
      name: { value: start.name, min: 0.4, max: 1.4, step: 0.01, label: 'Name size' },
      glow: { value: start.glow, min: 0, max: 2, step: 0.01, label: 'Bloom' },
      slot: { value: start.slot, min: 64, max: 260, step: 1, label: 'Slot height' },
      'Copy for source': button(() => {
        const text = asSource(live)
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[cluster] paste over CLUSTER_DEFAULTS in src/v3/clusterTuning.ts:\n\n${text}`)
      })
    },
    { store }
  ) as unknown as ClusterTuning

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
