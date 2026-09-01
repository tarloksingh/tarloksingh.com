import { button, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'

/* ---- the home cluster's own panel ----

   Five numbers now, not four. The cluster is a fixed layout in frame
   coordinates — where the bands sit, how wide the flanks are and how the
   graph is spaced are all decisions, written in `MechCluster.css` where they
   can be read next to what they affect. What is on here is the handful of
   things that are genuinely a matter of taste in front of a real screen:
   whether the whole cluster sits high or low, how large the name is against
   the readout under it, how far the panel bleeds, how tall the graph stands,
   and — the newest one — how wide the instrument itself stands against the
   counts and the rail either side of it.

   The tabs this replaces — Cast, Tags, Wave, Name — went with the line-up they
   described. Their files are all still here; see the note at the top of
   `MechCluster.tsx`. */

export interface ClusterTuning {
  /** Frame units off vertical centre. Negative moves the whole cluster up. */
  y: number
  /** Scales the width-fitted name. 1 is the full width of its column. */
  name: number
  /** How far the lit things bleed. 0 is a wireframe, 2 is a panel behind fog,
   *  and past that it is a lens with the aperture open — every glow radius on
   *  the screen is a multiple of this and so is every glow alpha, so the top of
   *  the range blows the highlights out on purpose. */
  glow: number
  /** How tall a slot in the bank stands, in frame units. */
  slot: number
  /** How wide the tachometer stands, in frame units — `--tach-w`.
   *
   *  `.mech-main`, the column it sits in, is `flex: 1` and centres it; wind
   *  this up and the instrument's own edges move out to meet the counts and
   *  the rail either side of it, which is the actual knob for "the middle
   *  column feels far from its neighbours" — the gap between the three
   *  columns (`.mech-body`'s own `gap`) is a much smaller number than the
   *  dead air `flex: 1` leaves either side of a fixed-width instrument, and
   *  turning that gap down further does nothing about the second one. */
  tach: number
  /** Frame units the whole intro block (`INTRO` and the paragraph) is dropped
   *  by, to sit its row level with the role reel across the panel. A
   *  `translateY`, so it does not lengthen the tachometer's head row. */
  introY: number
  /** The intro paragraph's (`.mech-profile`) size, in `--type` units. */
  profileSize: number
  /** The intro paragraph's ink: alpha on the phosphor accent. Its hue rides
   *  `--accent` with everything else on the panel, so this is the only part of
   *  its colour that is a matter of taste — 0.62 sits it behind the readings,
   *  1 brings it level with them. */
  profileInk: number
  /** How deep the soft edge on each bay runs, in frame units — the strip at
   *  the top and bottom of a slot where the subject fades and blurs into the
   *  panel instead of ending on the border. 0 is a hard cut. */
  bayFade: number
  /** The blur radius on that same edge strip, in frame units. Pairs with
   *  `bayFade`: the fade is the colour ramp, this is the softening of the
   *  picture under it. */
  bayBlur: number
  /** **Narrow only.** How large the role reel stands above the name, as a
   *  fraction of the column's width.
   *
   *  It is a width and not a font size because `Segment` scales its glyphs to
   *  whatever box it is given — twenty-one cells across whatever it has — so
   *  the box's width *is* the reading's size, and shrinking the box is the
   *  only knob that keeps the cells square while it does it. */
  roleSize: number
  /** **Narrow only.** Frame units of air between the instrument and the role
   *  reel. */
  roleTop: number
  /** **Narrow only.** Frame units of air between the role reel and the name
   *  under it. */
  roleGap: number
}

export const CLUSTER_DEFAULTS: ClusterTuning = {
  y: 0,
  name: 1.63,
  glow: 2.97,
  slot: 98,
  tach: 995,
  introY: 0,
  profileSize: 11.5,
  profileInk: 0.94,
  bayFade: 30,
  bayBlur: 3,
  roleSize: 0.8,
  roleTop: 10,
  roleGap: 0
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
      name: { value: start.name, min: 0.4, max: 2.2, step: 0.01, label: 'Name size' },
      glow: { value: start.glow, min: 0, max: 5, step: 0.01, label: 'Bloom' },
      slot: { value: start.slot, min: 64, max: 260, step: 1, label: 'Slot height' },
      tach: { value: start.tach, min: 500, max: 1190, step: 5, label: 'Instrument width' },
      introY: { value: start.introY, min: -40, max: 120, step: 1, label: 'Intro drop' },
      profileSize: { value: start.profileSize, min: 8, max: 18, step: 0.5, label: 'Intro size' },
      profileInk: { value: start.profileInk, min: 0.2, max: 1, step: 0.01, label: 'Intro ink' },
      bayFade: { value: start.bayFade, min: 0, max: 80, step: 1, label: 'Bay edge fade' },
      bayBlur: { value: start.bayBlur, min: 0, max: 12, step: 0.5, label: 'Bay edge blur' },
      /* Narrow only, and labelled so — the same panel is open on both
         layouts and three controls that do nothing on the one in front of
         you are three controls that read as broken. */
      roleSize: { value: start.roleSize, min: 0.3, max: 1, step: 0.01, label: 'Reel size (phone)' },
      roleTop: { value: start.roleTop, min: -40, max: 80, step: 1, label: 'Reel air above (phone)' },
      roleGap: { value: start.roleGap, min: -40, max: 80, step: 1, label: 'Reel air below (phone)' },
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
