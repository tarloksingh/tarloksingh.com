import { button, folder, useControls } from 'leva'
import { useEffect } from 'react'

/* ---- the wall's tuning panel ----

   Same arrangement as the gallery's (`src/three/Gallery3D.tsx`): Leva in
   development only, a scratchpad in localStorage so a session survives a
   reload, and a copy button that hands back something to paste into source.
   Nothing set here reaches a visitor until it is written into `WALL_DEFAULTS`
   below by hand. That is the point of the copy button.

   The gallery's panel had to track which source numbers each control was
   measured against, because its values are scattered across four files and a
   pasted one would otherwise be re-reported forever. This one does not need
   any of that: there is exactly one object, in this file, and the panel's
   defaults *are* the source values. Paste, and a control that matched stops
   differing. Nothing to drift out of step. */

export interface WallTuning {
  columns: number
  tileWidth: number
  tileHeight: number
  gap: number
  radius: number
  tilt: number
  turn: number
  roll: number
  perspective: number
  depth: number
  speed: number
  direction: 'up' | 'down'
  variance: number
  parallax: number
  pauseOnHover: boolean
  holdHoveredColumn: boolean
  play: 'hover' | 'always'
  lift: number
  fade: number
  dim: number
  grayscale: boolean
  overlayColor: string
}

/** What the home screen renders. The copy button emits a replacement for this
 *  whole object — one paste, one target, no merging by hand. */
export const WALL_DEFAULTS: WallTuning = {
  columns: 6,
  tileWidth: 210,
  tileHeight: 124,
  gap: 18,
  radius: 7,
  tilt: 34,
  turn: -26,
  roll: 7,
  perspective: 700,
  depth: 110,
  speed: 16,
  direction: 'up',
  variance: 0.4,
  parallax: 0,
  pauseOnHover: false,
  holdHoveredColumn: false,
  play: 'always',
  lift: 34,
  fade: 0.2,
  dim: 0.62,
  grayscale: false,
  overlayColor: '#000000'
}

const STORE_KEY = 'v3.wall.tuning.v1'

const stored = (): Partial<WallTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Partial<WallTuning>) : {}
  } catch {
    return {}
  }
}

const start: WallTuning = { ...WALL_DEFAULTS, ...(typeof window === 'undefined' ? {} : stored()) }

/** Current values, kept fresh by the hook. The copy button reads this rather
 *  than closing over state that would be a render behind. */
const live: WallTuning = { ...start }

const quote = (value: unknown) => (typeof value === 'string' ? `'${value}'` : String(value))

/** `WALL_DEFAULTS`, as source, with the numbers the panel is showing. */
const asSource = (values: WallTuning) => {
  const body = (Object.keys(WALL_DEFAULTS) as Array<keyof WallTuning>)
    .map((key) => `  ${key}: ${quote(values[key])}`)
    .join(',\n')
  return `export const WALL_DEFAULTS: WallTuning = {\n${body}\n}`
}

const changedCount = (values: WallTuning) =>
  (Object.keys(WALL_DEFAULTS) as Array<keyof WallTuning>).filter((key) => values[key] !== WALL_DEFAULTS[key]).length

/** Every DriftWall prop, as a panel. Returns what to spread onto the wall. */
export function useWallTuning(): WallTuning {
  const values = useControls({
    'Copy for source': button(() => {
      const text = asSource(live)
      void navigator.clipboard?.writeText(text)
      const n = changedCount(live)
      // eslint-disable-next-line no-console
      console.log(
        `[wall] ${n} value${n === 1 ? '' : 's'} differ from source. Paste over WALL_DEFAULTS in src/v3/wallTuning.ts:\n\n${text}`
      )
    }),
    Reset: button(() => {
      window.localStorage.removeItem(STORE_KEY)
      window.location.reload()
    }),

    Grid: folder(
      {
        columns: { value: start.columns, min: 1, max: 12, step: 1 },
        tileWidth: { value: start.tileWidth, min: 60, max: 420, step: 1 },
        tileHeight: { value: start.tileHeight, min: 40, max: 300, step: 1 },
        gap: { value: start.gap, min: 0, max: 80, step: 1 },
        radius: { value: start.radius, min: 0, max: 40, step: 1 }
      },
      { collapsed: true }
    ),

    Perspective: folder(
      {
        tilt: { value: start.tilt, min: -80, max: 80, step: 1 },
        turn: { value: start.turn, min: -80, max: 80, step: 1 },
        roll: { value: start.roll, min: -45, max: 45, step: 1 },
        perspective: { value: start.perspective, min: 200, max: 2400, step: 10 },
        depth: { value: start.depth, min: -400, max: 600, step: 5 }
      },
      { collapsed: true }
    ),

    Motion: folder(
      {
        speed: { value: start.speed, min: 0, max: 160, step: 1 },
        direction: { value: start.direction, options: ['up', 'down'] as const },
        variance: { value: start.variance, min: 0, max: 1, step: 0.01 },
        parallax: { value: start.parallax, min: 0, max: 4, step: 0.1 },
        pauseOnHover: start.pauseOnHover,
        holdHoveredColumn: start.holdHoveredColumn
      },
      { collapsed: true }
    ),

    Tiles: folder(
      {
        play: { value: start.play, options: ['always', 'hover'] as const },
        lift: { value: start.lift, min: 0, max: 200, step: 1 },
        fade: { value: start.fade, min: 0, max: 1, step: 0.01 },
        dim: { value: start.dim, min: 0, max: 1, step: 0.01 },
        grayscale: start.grayscale,
        overlayColor: start.overlayColor
      },
      { collapsed: true }
    )
  }) as unknown as WallTuning

  /* Keep the scratchpad and the copy button's view of the world current.
     Keyed on the serialised values rather than the object: Leva hands back a
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
