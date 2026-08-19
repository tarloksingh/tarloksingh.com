import type { CSSProperties, Ref } from 'react'
import { HALO_CLUSTER, HALO_CURL, HALO_RUNNER } from './frames'
import './VineHalo.css'

/* Growth off the ring around the name, spreading past its own edge — the
 * "spreading" experiment: the ring is a frame, drawn to a shape, and this is
 * the same plant refusing to stay inside it.
 *
 * A dense tangle at each of the four corners (`HALO_CLUSTER`), where a
 * real corner's growth actually piles up, and a few lighter tendrils along
 * the straight edges between them (`HALO_RUNNER`/`HALO_CURL`) connecting one
 * corner's growth toward the next rather than standing alone. Positioned
 * rather than laid out — there is no flow for any of this to sit in — each
 * one `--vh-at` of the way along an edge, or at a corner outright, and turned
 * to point away from the box by `--vh-rot`, a few degrees either side of
 * straight out, hand-picked per piece rather than random.
 *
 * No JavaScript loop of its own: like `Sprig.tsx`, this draws itself with
 * `pathLength` and a CSS transition, toggled by the `data-on` this
 * component's own root carries. `active` is not simply the frame's own — see
 * `haloOn` in Home.tsx, which waits for the ring to finish drawing first, so
 * this reads as growing *out of* a frame that already exists rather than
 * alongside one that is still arriving.
 *
 * `rootRef` is how it shakes with that same ring: `ProjectFrame`'s weave is
 * generated once, in its own loop, and handed here through `onJitter`
 * (Home.tsx) rather than duplicated — see `--pf-x`/`--pf-y`/`--pf-r` in
 * VineHalo.css, the same three properties `ProjectFrame.css` reads for
 * itself. */

interface Runner {
  edge: 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br'
  /** Percent of the way along that edge — ignored at a corner. */
  at?: number
  /** Degrees either side of straight out from the edge (or corner). */
  rot: number
  /** This piece's own reach, as a fraction of its base length. */
  scale: number
  /** Seconds into the grow before this one starts. */
  delay: number
  curl?: boolean
  /** A corner tangle rather than a single edge tendril. */
  cluster?: boolean
}

const CORNERS: Runner[] = [
  { edge: 'tl', rot: -4, scale: 1, delay: 0, cluster: true },
  { edge: 'tr', rot: 5, scale: 0.9, delay: 0.2, cluster: true },
  { edge: 'bl', rot: 6, scale: 0.95, delay: 0.35, cluster: true },
  { edge: 'br', rot: -5, scale: 1.05, delay: 0.1, cluster: true }
]

const RUNNERS: Runner[] = [
  ...CORNERS,

  { edge: 'top', at: 35, rot: 7, scale: 0.8, delay: 0.45 },
  { edge: 'top', at: 65, rot: -8, scale: 0.75, delay: 0.15 },

  { edge: 'bottom', at: 32, rot: -6, scale: 0.75, delay: 0.3 },
  { edge: 'bottom', at: 68, rot: 8, scale: 0.85, delay: 0.5 },

  { edge: 'left', at: 45, rot: -9, scale: 0.7, delay: 0.4, curl: true },

  { edge: 'right', at: 48, rot: 9, scale: 0.75, delay: 0.25 }
]

const stroke = (d: string, i: number) => (
  <path key={d} d={d} pathLength="1" strokeDasharray="1" style={{ '--sp-i': i } as CSSProperties} />
)

interface VineHaloProps {
  active: boolean
  rootRef?: Ref<HTMLDivElement>
}

export default function VineHalo({ active, rootRef }: VineHaloProps) {
  return (
    <div className="vh" ref={rootRef} data-on={active ? 'true' : undefined} aria-hidden="true">
      {RUNNERS.map((runner, i) => {
        const paths = runner.cluster ? HALO_CLUSTER : runner.curl ? HALO_CURL : HALO_RUNNER
        return (
          <span
            key={i}
            className={`vh-r vh-r--${runner.edge}`}
            style={
              {
                '--vh-at': runner.at !== undefined ? `${runner.at}%` : undefined,
                '--vh-rot': `${runner.rot}deg`,
                '--vh-scale': runner.scale,
                '--vh-delay': `${runner.delay}s`
              } as CSSProperties
            }
          >
            <svg viewBox={runner.cluster ? '0 0 100 100' : '0 0 40 90'} fill="none" focusable="false">
              {paths.map(stroke)}
            </svg>
          </span>
        )
      })}
    </div>
  )
}
