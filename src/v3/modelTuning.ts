import { button, folder, useControls, useCreateStore } from 'leva'
import { copyText } from './clipboard'
import { useEffect, useRef } from 'react'

/* ---- the subject's tuning panel ----

   Same arrangement as the wall's (`wallTuning.ts`) and the gallery's: Leva in
   development only, a scratchpad in localStorage so a session survives a
   reload, and a copy button that hands back the whole `MODEL_DEFAULTS` object
   to paste into this file. Nothing set here reaches a visitor until it is
   pasted — that is the point of the copy button.

   Lighting starts where v2's gallery left it, because that is where this face
   was lit. Exposure and the light intensities are one setting: the tenth-stop
   exposure is why the numbers look enormous, and moving either alone throws
   the face out. */

export interface ModelTuning {
  /** Millimetres on a 35mm back. The camera backs off to hold the framing. */
  focalLength: number
  /** How much of the frame's height the subject fills. */
  fill: number
  /** Degrees the subject leans toward the pointer, across the whole frame. */
  lean: number

  /* ---- where it stands ----

     The pieces have had these since they arrived and the models never did,
     which is why an enclosure could be lit six ways and not turned round
     once. `turn` is the one that matters: which face of the thing you meet. */
  /** Degrees about the vertical axis. */
  turn: number
  /** Degrees about the horizontal one. */
  tilt: number
  /** Frame heights above centre. */
  liftY: number
  floatSpeed: number
  floatRange: number
  floatRotation: number

  exposure: number
  envIntensity: number
  keyIntensity: number
  keyX: number
  keyY: number
  keyZ: number
  fillIntensity: number
  fillX: number
  fillY: number
  fillZ: number

  envMapIntensity: number
  roughnessBoost: number
  metalnessScale: number

  /** How eagerly the eyes react, and how far they are ever allowed to go —
   *  a twitchy cursor at the edge of the screen should not be able to roll
   *  them past a rotation a face could actually make. */
  lookH: number
  lookV: number
  lookMaxH: number
  lookMaxV: number
  /** Where the eyes sit when they are looking at nothing.
   *
   *  Not zero. `HorizontalLook` and `VerticalLook` are single morphs that
   *  translate the whole eye mesh from one extreme of its travel to the
   *  other — the glTF accessors give both a min equal to their max, so each
   *  is one rigid slide, and the horizontal covers 65% of the eye's own
   *  width. Influence 0 is not a centred gaze, it is hard left; the middle of
   *  the sweep is. Which also means the eyes can only ever move ±0.5 from
   *  here, so the caps above are small numbers now. */
  lookCenterH: number
  lookCenterV: number
  lookSpeed: number
  /** Which way round each axis runs. On the panel rather than in the source
   *  because the morph's own sign convention is not written down anywhere and
   *  is faster to settle by looking at it. */
  lookFlipH: boolean
  lookFlipV: boolean
  /** Follow the bird over the pointer while it is in the air. */
  watchBird: boolean
  /** Seconds the head takes to come off the pointer and onto the bird. The
   *  turn itself is damped downstream, but damping only ever softens the end
   *  of a move — without a ramp on the target the first frame of it is a
   *  whip round. This is the number that makes him notice the bird rather
   *  than acquire it. */
  watchCatch: number
  blinkMin: number
  blinkMax: number
}

export const MODEL_DEFAULTS: ModelTuning = {
  focalLength: 200,
  fill: 0.56,
  lean: 11,
  turn: 0,
  tilt: 0,
  liftY: 0,
  floatSpeed: 0.9,
  floatRange: 0.14,
  floatRotation: 1.5,

  exposure: 0.05,
  envIntensity: 3.1,
  keyIntensity: 28.5,
  keyX: 12,
  keyY: 0.22,
  keyZ: 12,
  fillIntensity: 71.3,
  fillX: -0.32,
  fillY: 0.08,
  fillZ: -0.66,

  envMapIntensity: 0,
  roughnessBoost: -0.93,
  metalnessScale: 0,

  lookH: 0.8,
  lookV: 0.5,
  lookMaxH: 0.3,
  lookMaxV: 0.22,
  lookCenterH: 0.5,
  lookCenterV: 0.5,
  lookSpeed: 4,
  lookFlipH: false,
  lookFlipV: false,
  watchBird: true,
  watchCatch: 1.8,
  blinkMin: 2.5,
  blinkMax: 9.5
}

/* ---- one rig per model ----

   `MODEL_DEFAULTS` used to be *the* rig, and both GLB models on this site ran
   on it: Mr. Takahashi, who it was built around, and Capsule C1, which was
   tuned to look acceptable under a setup designed for a face. Acceptable is
   not the same as lit — an injection-moulded enclosure and a matte skin
   shader want opposite things from a key, and the face's is a tenth-stop
   exposure hauled back up by two enormous lamps.

   So the defaults are the *starting* rig and each model keeps its own copy.
   Seeded identical, deliberately: nothing changed appearance the day this
   split, and the two only diverge as they are tuned apart. */
const STORE_KEY = 'v3.model.tuning.v2'

const stored = (): Partial<ModelTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Partial<ModelTuning>) : {}
  } catch {
    return {}
  }
}

const start: ModelTuning = { ...MODEL_DEFAULTS, ...(typeof window === 'undefined' ? {} : stored()) }

/** Current values, kept fresh by the hook. The copy button reads this rather
 *  than closing over state that would be a render behind. */
/** Every model's rig, by project id. Anything not named here falls back to
 *  the defaults, so adding a third GLB needs no entry until it wants one. */
export const MODEL_RIGS: Record<string, ModelTuning> = {
  'mr-takahashi': { ...MODEL_DEFAULTS },
  /* An enclosure, and for a while an enclosure wearing a face's rig. It was
     `{ ...MODEL_DEFAULTS, watchBird: false }`, which is this file's whole
     argument undone: `MODEL_DEFAULTS` *is* Mr. Takahashi's rig, so spreading
     it is the thing "one rig per model" exists to stop. It is why the case
     came up the wrong colour — v2 renders *this same GLB* correctly, and
     every number below is v2's own, not a guess:
     `LIGHT_DEFAULTS` in `src/three/Gallery3D.tsx` and `CAPSULE_DEFAULTS` in
     `src/three/CapsuleC1.tsx`.

     Dumping the export explains what each one was doing. Six materials: two
     grey at 0.8, two pure black (`[0, 0, 0, 1]` — the logo and the front
     panel), and **two carrying no `pbrMetallicRoughness` block at all**,
     which in glTF means the defaults apply: white, `metallicFactor: 1`,
     `roughnessFactor: 1`.

     - **`envMapIntensity: 0` was the big one.** It scales the environment's
       contribution on every material, and at zero the case gets no reflection
       whatsoever — only the two directional lights. A metal has no diffuse
       response, so the export's two metallic materials had *nothing* left to
       render with. For an injection-moulded enclosure the environment is the
       look. v2 sets 1.3.
     - **`metalnessScale` is a multiplier and `metalnessBoost` in v2 is
       additive.** At 0 it forced those two metals to dielectric. 1 is the
       identity, which leaves the export saying what it was authored to say;
       v2's +0.24 cannot be expressed here, and does not need to be — the two
       materials it was lifting are already at 1.
     - **`roughnessBoost` is added too**, and his -0.93 clamps all six to
       roughness 0. The black logo was not a washed-out black, it was a black
       mirror. v2 boosts the case by -0.24.
     - **The fill light was nearly six times too strong** — 71.3 against
       v2's 12.3 — which flattens the case and lifts the blacks off the floor.

     `exposure` comes across as v2's 0.1 rather than his 0.05, and the light
     intensities with it, because the two are one setting: ACES is not linear,
     so v2's key of 30 at 0.1 is not 60 at 0.05. `MechModel` sets
     `toneMappingExposure` per canvas and a project screen has one subject on
     it, so this is the case's own exposure and reaches nothing else.

     The framing (`fill`, `turn`, `tilt`) is deliberately still `MODEL_DEFAULTS`
     and still wants a pass on the **Subject** tab — `fit` normalises a model by
     its height alone, which is right for a head and wrong for a wide flat box.

     It has no eyes to move and no reason to look at a bird — `watchBird`
     drives the whole subject's lean toward whatever the gaze is tracking, so
     left on it made a piece of hardware turn to follow something flying
     past. */
  'capsule-c1': {
    ...MODEL_DEFAULTS,
    exposure: 0.1,
    envIntensity: 3.4,
    keyIntensity: 30,
    keyX: -3.78,
    keyY: 0.2,
    keyZ: 9,
    fillIntensity: 12.3,
    fillX: 2.1,
    fillY: -0.2,
    fillZ: -1,
    envMapIntensity: 1.3,
    roughnessBoost: -0.24,
    metalnessScale: 1,
    watchBird: false
  }
}

export const rigFor = (projectId: string): ModelTuning => MODEL_RIGS[projectId] ?? MODEL_DEFAULTS

const savedRigs = ((): Record<string, ModelTuning> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(`${STORE_KEY}.rigs`) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ModelTuning>) : {}
  } catch {
    return {}
  }
})()

/** Current values for whichever model is on screen, kept fresh by the hook —
 *  the copy button reads these rather than closing over state a render
 *  behind. */
const live: ModelTuning = { ...start }
/* Every key filled from `MODEL_DEFAULTS` first, then the shipped rig, then
   whatever was last saved. A saved rig from before a field existed — `Place`
   was added to the schema after these scratchpads were first written — is a
   partial object, and a shallow `{ ...MODEL_RIGS, ...savedRigs }` let it
   replace a complete rig with one missing `turn`/`tilt`/`liftY`. Those reach
   `MechModel` as `undefined`, `degToRad(undefined)` is `NaN`, and a group at
   a NaN rotation takes the whole subject off screen — an invisible model that
   reads as the canvas being broken. */
const rigs: Record<string, ModelTuning> = Object.fromEntries(
  [...new Set([...Object.keys(MODEL_RIGS), ...Object.keys(savedRigs)])].map((id) => [
    id,
    { ...MODEL_DEFAULTS, ...MODEL_RIGS[id], ...savedRigs[id] }
  ])
)
/** Whose rig `live` currently holds. */
let owner = 'mr-takahashi'

const keys = Object.keys(MODEL_DEFAULTS) as Array<keyof ModelTuning>

/** Long float tails are what a slider's step arithmetic leaves behind, not a
 *  value anyone chose; pasted back into source they are just noise. */
const tidy = (value: number | boolean) => (typeof value === 'number' ? String(Number(value.toFixed(4))) : String(value))

const asSource = () =>
  `export const MODEL_RIGS: Record<string, ModelTuning> = {\n${Object.entries(rigs)
    .map(([id, rig]) => `  '${id}': { ${keys.map((key) => `${key}: ${tidy(rig[key])}`).join(', ')} }`)
    .join(',\n')}\n}`

/** Mr. Takahashi's rig, and its own store.
 *
 *  A store rather than Leva's default one, so it can be a tab on the single
 *  dev panel instead of a second window floating over the page — which on the
 *  home screen was a panel labelled "Subject tuning" with no clue whose
 *  subject. See `MechPanel.tsx`. */
/** Which model the eye, blink and gaze controls belong to.
 *
 *  Only one subject on this site has a face. Capsule C1 is an injection
 *  moulded enclosure, and a panel offering it a blink rate, an eye-tracking
 *  sensitivity and a "watch bird" toggle is a panel describing something that
 *  is not there — every one of those drives a morph target the export does
 *  not carry. */
const FACE = 'mr-takahashi'

export function useModelTuning(
  projectId = FACE
): ModelTuning & { store: ReturnType<typeof useCreateStore> } {
  const isFace = projectId === FACE
  const store = useCreateStore()
  /* The schema is read once, so it has to open on the model that is actually
     on screen — the effect below only catches the *next* one. Same
     arrangement as the pieces' panel. */
  const seed = rigs[projectId] ?? MODEL_DEFAULTS
  const [values, setValues] = useControls(() => ({
    'Copy for source': button(() => {
      const text = asSource()
      // Not `navigator.clipboard` directly: it does not exist on a plain
      // http origin, which is what the tailnet dev server is. See
      // `clipboard.ts` — the console line below is the real fallback.
      void copyText(text)
      const n = keys.filter((key) => live[key] !== MODEL_DEFAULTS[key]).length
      // eslint-disable-next-line no-console
      console.log(
        `[model] ${n} value${n === 1 ? '' : 's'} differ from source. Paste over MODEL_DEFAULTS in src/v3/modelTuning.ts:\n\n${text}`
      )
    }),
    Reset: button(() => {
      window.localStorage.removeItem(STORE_KEY)
      window.location.reload()
    }),

    /* Where it stands. First, because on anything that is not a face it is
       the only thing you actually want. */
    Place: folder(
      {
        turn: { value: seed.turn, min: -180, max: 180, step: 0.5, label: 'Turn' },
        tilt: { value: seed.tilt, min: -180, max: 180, step: 0.5, label: 'Tilt' },
        liftY: { value: seed.liftY, min: -0.5, max: 0.5, step: 0.005, label: 'Lift' }
      },
      { collapsed: false }
    ),

    Lens: folder(
      {
        focalLength: { value: seed.focalLength, min: 18, max: 200, step: 1, label: 'mm' },
        /* 0.05 to 2, not 0.2 to 0.95. The range was set around a head, which
           `fit` normalises by height and which is about as tall as it is
           wide — so 0.2 already framed him loosely and 0.95 filled the
           stage. A wide, flat subject normalised by that same height is
           enormous before the camera has moved at all, and the old floor
           could not stand far enough back to get the whole of Capsule C1 on
           screen. Both ends are open now: `distanceFor` is `1 / fill`, so
           lower is further away and smaller. */
        fill: { value: seed.fill, min: 0.05, max: 2, step: 0.01, label: 'Fills' },
        lean: { value: seed.lean, min: 0, max: 40, step: 0.5 }
      },
      { collapsed: true }
    ),

    Drift: folder(
      {
        floatSpeed: { value: seed.floatSpeed, min: 0, max: 4, step: 0.05, label: 'Speed' },
        floatRange: { value: seed.floatRange, min: 0, max: 0.3, step: 0.005, label: 'Range' },
        floatRotation: { value: seed.floatRotation, min: 0, max: 1.5, step: 0.02, label: 'Turn' }
      },
      { collapsed: true }
    ),

    Lighting: folder(
      {
        exposure: { value: seed.exposure, min: 0.01, max: 2, step: 0.01 },
        envIntensity: { value: seed.envIntensity, min: 0, max: 12, step: 0.1, label: 'Env' },
        keyIntensity: { value: seed.keyIntensity, min: 0, max: 80, step: 0.5, label: 'Key' },
        keyX: { value: seed.keyX, min: -12, max: 12, step: 0.01 },
        keyY: { value: seed.keyY, min: -12, max: 12, step: 0.01 },
        keyZ: { value: seed.keyZ, min: -12, max: 12, step: 0.01 },
        fillIntensity: { value: seed.fillIntensity, min: 0, max: 80, step: 0.5, label: 'Fill' },
        fillX: { value: seed.fillX, min: -12, max: 12, step: 0.01 },
        fillY: { value: seed.fillY, min: -12, max: 12, step: 0.01 },
        fillZ: { value: seed.fillZ, min: -12, max: 12, step: 0.01 }
      },
      { collapsed: true }
    ),

    /* Only for the face. Spread in rather than rendered conditionally
       because Leva reads the schema once: a folder that exists with its
       inputs disabled is still a folder full of controls for morph targets
       the other export does not have. */
    ...(isFace
      ? {
          Eyes: folder(
      {
          lookH: { value: seed.lookH, min: 0, max: 2, step: 0.05, label: 'Sens H' },
          lookV: { value: seed.lookV, min: 0, max: 2, step: 0.05, label: 'Sens V' },
          lookMaxH: { value: seed.lookMaxH, min: 0.02, max: 0.5, step: 0.01, label: 'Max H' },
          lookMaxV: { value: seed.lookMaxV, min: 0.02, max: 0.5, step: 0.01, label: 'Max V' },
          lookCenterH: { value: seed.lookCenterH, min: 0, max: 1, step: 0.01, label: 'Centre H' },
          lookCenterV: { value: seed.lookCenterV, min: 0, max: 1, step: 0.01, label: 'Centre V' },
          lookSpeed: { value: seed.lookSpeed, min: 0.5, max: 14, step: 0.1, label: 'Follow' },
          lookFlipH: { value: seed.lookFlipH, label: 'Flip H' },
          lookFlipV: { value: seed.lookFlipV, label: 'Flip V' },
          watchBird: { value: seed.watchBird, label: 'Watch bird' },
          watchCatch: { value: seed.watchCatch, min: 0, max: 6, step: 0.05, label: 'Catch (s)' },
          blinkMin: { value: seed.blinkMin, min: 0.5, max: 12, step: 0.1, label: 'Blink min' },
          blinkMax: { value: seed.blinkMax, min: 1, max: 24, step: 0.1, label: 'Blink max' }
        },
            { collapsed: true }
          )
        }
      : {}),

    Material: folder(
      {
        envMapIntensity: { value: seed.envMapIntensity, min: 0, max: 4, step: 0.05, label: 'Env ×' },
        roughnessBoost: { value: seed.roughnessBoost, min: -1, max: 1, step: 0.01, label: 'Rough +' },
        metalnessScale: { value: seed.metalnessScale, min: 0, max: 2, step: 0.05, label: 'Metal ×' }
      },
      { collapsed: true }
    )
  }), { store }) as unknown as [ModelTuning, (next: Partial<ModelTuning>) => void]

  /* Keyed on the serialised values rather than the object: Leva hands back a
     fresh object on renders where nothing moved, and writing localStorage on
     every one of those is a write per frame while a slider is dragged. */
  /* Which keys this panel actually declares. Read off Leva's own values
     rather than listed here, so it cannot drift out of step with the schema
     above — which is exactly what went wrong: the Eyes folder is omitted for
     anything that is not a face, and reseeding still handed Leva `blinkMin`
     and `watchBird`. `set()` throws on a key with no input, and a throw here
     unmounts the whole app to a blank paper gradient that reads as a CSS bug
     rather than as a crash. */
  const declared = useRef<string[]>([])
  if (declared.current.length === 0) declared.current = Object.keys(values as object)

  /* Reseed when the readout swings to the other model. Without this, opening
     Capsule C1 after Mr. Takahashi would show his numbers on the panel and
     write them over hers the moment anything was dragged. */
  useEffect(() => {
    owner = projectId
    const next = rigs[projectId] ?? MODEL_DEFAULTS
    setValues(
      Object.fromEntries(
        Object.entries(next).filter(([key]) => declared.current.includes(key))
      ) as Partial<ModelTuning>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const serialised = JSON.stringify(values)
  useEffect(() => {
    Object.assign(live, values)
    rigs[owner] = { ...(values as ModelTuning) }
    try {
      window.localStorage.setItem(STORE_KEY, serialised)
      window.localStorage.setItem(`${STORE_KEY}.rigs`, JSON.stringify(rigs))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised])

  return { ...values, store }
}
