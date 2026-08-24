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

export interface ProductTuning {
  /** Millimetres on a 35mm back. The camera backs off to hold the framing. */
  focalLength: number
  /** How much of the frame's height a piece fills before its own `size`. */
  fill: number
  exposure: number
  envIntensity: number
  keyIntensity: number
  fillIntensity: number
  floatSpeed: number
  floatRange: number
  floatRotation: number
}

export const PRODUCT_DEFAULTS: ProductTuning = {
  focalLength: 60,
  fill: 0.72,
  /* Nothing like the face's 0.05. That number goes with `keyIntensity: 28.5`
     and a fill of 71 — a tenth-stop exposure lit back up by two enormous
     lamps, which is how a matte skin shader ends up with any specular at all.
     A monitor, a card and a printer are ordinary surfaces in an ordinary
     room, and the room is `RoomEnvironment` at roughly the strength v2's
     gallery ran them at (see `ROOM_LIGHT` and the per-piece `lift()` calls in
     products.tsx — these are the middle of that range). */
  exposure: 0.55,
  envIntensity: 2.2,
  keyIntensity: 2.4,
  fillIntensity: 0.9,
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
}

export const PIECE_FALLBACK: PieceTuning = { size: 1, turn: 0, liftY: 0 }

/** Seeded from the `turn` each piece already carries in `products.tsx` —
 *  those were settled by eye against a real render and are the right starting
 *  pose here too. `size` and `liftY` start neutral and are for this screen's
 *  own composition, which is a readout with leader lines coming off it rather
 *  than a case in a room. */
export const PIECE_DEFAULTS: Record<string, PieceTuning> = {
  'mecha-station': { size: 1.05, turn: -20, liftY: 0 },
  openup: { size: 0.76, turn: 26, liftY: 0 },
  stitchfam: { size: 0.82, turn: 28, liftY: 0 },
  'red-dead-redemption-2': { size: 0.8, turn: 34, liftY: 0 },
  'grand-theft-auto-v': { size: 0.8, turn: -34, liftY: 0 },
  'wyte-card': { size: 0.72, turn: 38, liftY: 0 },
  /* The one piece whose bounding box is not the piece. Block Builder's blocks
     fly apart and stack, so `Resize` normalises the volume they travel
     through rather than any of them, and at a neutral size the blocks
     themselves come out the size of the type. */
  'block-builder': { size: 2.4, turn: 131.1, liftY: 0.06 },
  'slider-engine': { size: 0.86, turn: 0, liftY: 0 }
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

const tidy = (value: number) => String(Number(value.toFixed(4)))

const asSource = () => {
  const studio = `export const PRODUCT_DEFAULTS: ProductTuning = {\n${keys
    .map((key) => `  ${key}: ${tidy(live.studio[key])}`)
    .join(',\n')}\n}`
  const pieces = `export const PIECE_DEFAULTS: Record<string, PieceTuning> = {\n${Object.entries(live.pieces)
    .map(([id, piece]) => `  '${id}': { size: ${tidy(piece.size)}, turn: ${tidy(piece.turn)}, liftY: ${tidy(piece.liftY)} }`)
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
          liftY: { value: seed.liftY, min: -0.5, max: 0.5, step: 0.005, label: 'Lift' }
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

      Lighting: folder(
        {
          exposure: { value: start.exposure, min: 0.01, max: 2, step: 0.01 },
          envIntensity: { value: start.envIntensity, min: 0, max: 8, step: 0.05, label: 'Env' },
          keyIntensity: { value: start.keyIntensity, min: 0, max: 12, step: 0.05, label: 'Key' },
          fillIntensity: { value: start.fillIntensity, min: 0, max: 12, step: 0.05, label: 'Fill' }
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
    if (live.id) live.pieces[live.id] = { size: values.size, turn: values.turn, liftY: values.liftY }
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ studio: live.studio, pieces: live.pieces }))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  return { store, studio: values as ProductTuning, piece: values as PieceTuning }
}
