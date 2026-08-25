import { button, folder, useControls, useCreateStore } from 'leva'
import { useEffect } from 'react'
import { copyText } from './clipboard'

/* ---- the pieces, and their tuning panel ----

   Ten projects have media on this site and two of them have a model: Capsule
   C1 and Mr. Takahashi. The other eight had a photograph where the subject
   should be. What they *do* have, and have had since v2, is a hand-built
   piece each in `src/site/products.tsx` — a video-texture monitor for Mecha
   Station, a phone for OpenUp, a disc case for the two game credits, a card,
   a printer, a flipbook of fish. `MechProduct.tsx` stands those on the
   project screen's stage.

   **This is not Mr. Takahashi's rig and must never become it.** `MechModel`
   is built for one face — its lighting, its lens and its morph driving are
   tuned around that head, and `MODEL_DEFAULTS` is shared with Capsule C1,
   which is already lit to look right under it. So the pieces get a studio of
   their own here, at their own exposure, with their own lens. Nothing in this
   file is read by `MechModel` and nothing in `modelTuning.ts` is read by
   `MechProduct`.

   Same arrangement as every other panel: a `_DEFAULTS` constant that is the
   shipped value, a localStorage scratchpad, and a copy button that hands back
   source to paste over it. Nothing set here reaches a visitor until it is
   pasted. */

/** What every piece shares: the lens they are framed with and the drift they
 *  sit on.
 *
 *  Everything about *light* used to be here too, and that was wrong. One
 *  exposure, one environment and two fixed lamps had to suit a matte business
 *  card, a glossy moulded kiosk, a video-texture monitor and a flipbook of
 *  fish at the same time — so any of them being right meant the others were
 *  approximately lit. They are on `PieceTuning` now.
 *
 *  This can be per-piece where the cast's could not: a project screen shows
 *  one piece at a time in a canvas of its own, so exposure and the scene's
 *  environment — both of which are one-per-canvas and had to be shared on the
 *  home stage — are free here. No layers, no isolation, nothing to keep
 *  apart. */
export interface ProductTuning {
  /** Millimetres on a 35mm back. The camera backs off to hold the framing. */
  focalLength: number
  /** How much of the frame's height a piece fills before its own `size`. */
  fill: number
  floatSpeed: number
  floatRange: number
  floatRotation: number
}

export const PRODUCT_DEFAULTS: ProductTuning = {
  focalLength: 60,
  fill: 0.72,
  floatSpeed: 1.1,
  floatRange: 0.06,
  floatRotation: 0.35
}

/** One piece's own framing. Normalising every piece to the same bounding-box
 *  height is what makes them frame consistently and is also why they need
 *  this: a flat card and a tall kiosk fitted to the same height do not read
 *  as the same size, they read as a card blown up. */
export interface PieceTuning {
  /** Multiplies `fill`. */
  size: number
  /** Degrees turned to camera — which face of the piece you meet. */
  turn: number
  /** Frame heights above centre. */
  liftY: number

  /* ---- its own light ----

     Nothing like the face's rig, and nothing like the piece next to it. A
     tenth-stop exposure lit back up by two enormous lamps is how a matte skin
     shader ends up with any specular at all; a monitor, a card and a printer
     are ordinary surfaces in an ordinary room. */
  exposure: number
  /** How strongly `RoomEnvironment` lights this piece. */
  envIntensity: number
  keyIntensity: number
  keyX: number
  keyY: number
  keyZ: number
  fillIntensity: number
  fillX: number
  fillY: number
  fillZ: number

  /* ---- how metal, how glossy ----

     Offsets, not absolutes, and that matters: a piece is built out of several
     materials on purpose — a disc case is a clear sleeve over a printed
     insert, a kiosk is a screen in a moulded shell — and writing one
     roughness across all of them flattens the thing into a single plastic.
     These move every material *relative to what it already is*, so the
     variety the piece was built with survives being tuned.

     Added rather than multiplied, which is the part that had to be got right.
     Most of these pieces are authored at `metalness: 0`, and a multiplier
     cannot lift a zero — a "Metal" slider that scales would have run its
     whole range without any of them ever turning metal. Adding can. */

  /** Taken *off* roughness, so turning it up is shinier. */
  gloss: number
  /** Added to metalness. This is the one that makes a surface read as metal
   *  rather than as bright plastic — and metal takes almost all of its colour
   *  from reflections, so it wants `reflects` up with it. */
  metal: number
  /** `envMapIntensity` outright: how much of the room the surface returns. */
  reflects: number
}

/** What every piece started at, which is what the whole set was lit by before
 *  any of them had a rig of their own. Seeded rather than neutral so nothing
 *  changed appearance the day this became per-piece — the numbers below are
 *  the shared studio's, copied. */
export const PIECE_FALLBACK: PieceTuning = {
  size: 1,
  turn: 0,
  liftY: 0,
  exposure: 0.55,
  envIntensity: 2.2,
  keyIntensity: 2.4,
  keyX: 3,
  keyY: 4,
  keyZ: 5,
  fillIntensity: 0.9,
  fillX: -4,
  fillY: 1,
  fillZ: -3,
  gloss: 0,
  metal: 0,
  reflects: 1
}

/** Seeded from the `turn` each piece already carries in `products.tsx` —
 *  those were settled by eye against a real render and are the right starting
 *  pose here too. `size` and `liftY` start neutral and are for this screen's
 *  own composition, which is a readout with leader lines coming off it rather
 *  than a case in a room. */
export const PIECE_DEFAULTS: Record<string, PieceTuning> = {
  'mecha-station': { ...PIECE_FALLBACK, size: 1.05, turn: -20, liftY: 0 },
  openup: { ...PIECE_FALLBACK, size: 0.76, turn: 26, liftY: 0 },
  stitchfam: { ...PIECE_FALLBACK, size: 0.82, turn: 28, liftY: 0 },
  'red-dead-redemption-2': { ...PIECE_FALLBACK, size: 0.8, turn: 34, liftY: 0 },
  'grand-theft-auto-v': { ...PIECE_FALLBACK, size: 0.8, turn: -34, liftY: 0 },
  'wyte-card': { ...PIECE_FALLBACK, size: 0.72, turn: 38, liftY: 0 },
  /* The one piece whose bounding box is not the piece. Block Builder's blocks
     fly apart and stack, so `Resize` normalises the volume they travel
     through rather than any of them, and at a neutral size the blocks
     themselves come out the size of the type. */
  'block-builder': { ...PIECE_FALLBACK, size: 2.4, turn: 131.1, liftY: 0.06 },
  'slider-engine': { ...PIECE_FALLBACK, size: 0.86, turn: 0, liftY: 0 }
}

export const pieceFor = (projectId: string): PieceTuning => PIECE_DEFAULTS[projectId] ?? PIECE_FALLBACK

const STORE_KEY = 'v3.product.tuning.v1'

interface Stored {
  studio?: Partial<ProductTuning>
  pieces?: Record<string, PieceTuning>
}

const stored = (): Stored => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Stored) : {}
  } catch {
    return {}
  }
}

const saved = typeof window === 'undefined' ? {} : stored()
const start: ProductTuning = { ...PRODUCT_DEFAULTS, ...saved.studio }

/** Current values, kept fresh by the hook — the copy button reads these
 *  rather than closing over state that would be a render behind. Same
 *  arrangement as `modelTuning.ts`'s `live`. */
const live = { studio: { ...start }, pieces: { ...PIECE_DEFAULTS, ...saved.pieces }, id: '' }

const keys = Object.keys(PRODUCT_DEFAULTS) as Array<keyof ProductTuning>
const PIECE_KEYS = Object.keys(PIECE_FALLBACK) as Array<keyof PieceTuning>

const tidy = (value: number) => String(Number(value.toFixed(4)))

const asSource = () => {
  const studio = `export const PRODUCT_DEFAULTS: ProductTuning = {\n${keys
    .map((key) => `  ${key}: ${tidy(live.studio[key])}`)
    .join(',\n')}\n}`
  const pieces = `export const PIECE_DEFAULTS: Record<string, PieceTuning> = {\n${Object.entries(live.pieces)
    .map(([id, piece]) => {
      const body = PIECE_KEYS.map((k) => `${k}: ${tidy(piece[k])}`).join(', ')
      return `  '${id}': { ${body} }`
    })
    .join(',\n')}\n}`
  return `${studio}\n\n${pieces}`
}

/** The panel, and the values it is currently set to.
 *
 *  Its own store, and therefore its own panel — the same reasoning as
 *  `labelTuning.ts`. The per-piece folder is reseeded when the project
 *  changes rather than rebuilt: Leva reads a schema once, so a folder built
 *  for Mecha Station would still be showing Mecha Station's numbers after the
 *  readout swung to OpenUp. */
export function useProductTuning(projectId: string) {
  const store = useCreateStore()
  /* The schema is read once, so it has to open on the piece that is actually
     on screen — the effect below only catches the *next* one. */
  const seed = live.pieces[projectId] ?? PIECE_FALLBACK

  const [values, set] = useControls(
    () => ({
      'Copy for source': button(() => {
        const text = asSource()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[pieces] paste over PRODUCT_DEFAULTS and PIECE_DEFAULTS in src/v3/productTuning.ts:\n\n${text}`)
      }),
      Reset: button(() => {
        window.localStorage.removeItem(STORE_KEY)
        window.location.reload()
      }),

      'This piece': folder(
        {
          size: { value: seed.size, min: 0.2, max: 2.5, step: 0.01, label: 'Size' },
          turn: { value: seed.turn, min: -180, max: 180, step: 0.1, label: 'Turn' },
          liftY: { value: seed.liftY, min: -0.5, max: 0.5, step: 0.005, label: 'Lift' },

          /* This piece's rig, and nobody else's. */
          Light: folder(
            {
              exposure: { value: seed.exposure, min: 0.01, max: 3, step: 0.01, label: 'Exposure' },
              envIntensity: { value: seed.envIntensity, min: 0, max: 12, step: 0.05, label: 'Room' },
              keyIntensity: { value: seed.keyIntensity, min: 0, max: 40, step: 0.1, label: 'Key' },
              keyX: { value: seed.keyX, min: -12, max: 12, step: 0.1, label: 'Key X' },
              keyY: { value: seed.keyY, min: -12, max: 12, step: 0.1, label: 'Key Y' },
              keyZ: { value: seed.keyZ, min: -12, max: 12, step: 0.1, label: 'Key Z' },
              fillIntensity: { value: seed.fillIntensity, min: 0, max: 40, step: 0.1, label: 'Fill' },
              fillX: { value: seed.fillX, min: -12, max: 12, step: 0.1, label: 'Fill X' },
              fillY: { value: seed.fillY, min: -12, max: 12, step: 0.1, label: 'Fill Y' },
              fillZ: { value: seed.fillZ, min: -12, max: 12, step: 0.1, label: 'Fill Z' }
            },
            { collapsed: true }
          ),

          /* How metal and how glossy. Relative to what the piece was built
             with — see the note in `PieceTuning`. For a metal look: Metal up,
             Gloss up, Reflects up. Metal on its own only ever darkens,
             because a metal with nothing to reflect is a black surface. */
          Surface: folder(
            {
              gloss: { value: seed.gloss, min: -1, max: 1, step: 0.01, label: 'Gloss' },
              metal: { value: seed.metal, min: -1, max: 1, step: 0.01, label: 'Metal' },
              reflects: { value: seed.reflects, min: 0, max: 8, step: 0.02, label: 'Reflects' }
            },
            { collapsed: true }
          )
        },
        { collapsed: false }
      ),

      Lens: folder(
        {
          focalLength: { value: start.focalLength, min: 18, max: 200, step: 1, label: 'mm' },
          fill: { value: start.fill, min: 0.2, max: 0.95, step: 0.01, label: 'Fills' }
        },
        { collapsed: true }
      ),

      Drift: folder(
        {
          floatSpeed: { value: start.floatSpeed, min: 0, max: 4, step: 0.05, label: 'Speed' },
          floatRange: { value: start.floatRange, min: 0, max: 0.3, step: 0.005, label: 'Range' },
          floatRotation: { value: start.floatRotation, min: 0, max: 1.5, step: 0.02, label: 'Turn' }
        },
        { collapsed: true }
      )
    }),
    { store }
  ) as unknown as [ProductTuning & PieceTuning, (values: Partial<PieceTuning>) => void]

  // Reseed the per-piece folder when the readout swings to another project.
  useEffect(() => {
    live.id = projectId
    if (!projectId) return
    set(live.pieces[projectId] ?? PIECE_FALLBACK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const serialised = JSON.stringify(values)
  useEffect(() => {
    for (const key of keys) (live.studio[key] as number) = values[key]
    if (live.id) {
      live.pieces[live.id] = Object.fromEntries(
        PIECE_KEYS.map((k) => [k, values[k]])
      ) as unknown as PieceTuning
    }
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ studio: live.studio, pieces: live.pieces }))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  return { store, studio: values as ProductTuning, piece: values as PieceTuning }
}
