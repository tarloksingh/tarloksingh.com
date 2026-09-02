import { button, folder, useControls, useCreateStore } from 'leva'
import { copyText } from './clipboard'
import { useEffect, useRef } from 'react'
import { MODELS } from './model'

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
  /** Added to whatever the export was authored with, never multiplied — the
   *  same rule the pieces follow, and for the same reason plus one more.
   *
   *  No multiplier lifts a zero, and metalness is the one surface property
   *  where zero is a *different material model* rather than a low setting: a
   *  dielectric reflects white, a metal tints its reflection with its own base
   *  colour. Capsule C1's logo is authored black at `metalness: 0` and
   *  `roughness: 0.046` — a black mirror — so as a dielectric it reflects the
   *  room and comes out white, and no amount of scaling a zero changes that.
   *  v2 lifts it to 0.24, the reflection picks up the black, and the logo
   *  reads black. That is the whole difference between the two screens. */
  metalnessBoost: number

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
  /* -1, not 0. The face's rig used to multiply by zero, which forced all
     thirteen of its materials to dielectric — and six of them are authored
     metallic (the eyes at 0.28, one at a full 1.0). Under an additive boost
     the identity is 0, so plain 0 here would have quietly changed a face that
     already looked right; -1 clamps them all to zero exactly as before. */
  metalnessBoost: -1,

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
/* Bumped from `.v2`. Every scratchpad written before the rig-swap fix above
   has one model's numbers saved under the other's name, and those are merged
   *over* the source constants — so leaving the old key in place would mean
   this file's corrected rigs stayed invisible on any browser that had opened
   both models, with no way for the reader to know why. A new key discards
   them. */
const STORE_KEY = 'v3.model.tuning.v3'

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
     - **`roughnessBoost` is added too**, and his -0.93 clamps all six to
       roughness 0. The black logo was not a washed-out black, it was a black
       mirror. v2 boosts the case by -0.24.
     - **The fill light was nearly six times too strong** — 71.3 against
       v2's 12.3 — which flattens the case and lifts the blacks off the floor.

     The two surface numbers below are still v2's. The lamps and the exposure
     are not any more: they were v2's for exactly as long as it took to look at
     the case on this screen, which frames it far larger and from another side,
     and they have since been set by eye on the **Subject** tab. Exposure and
     intensity remain one setting — ACES is not linear, so these are only
     meaningful together — and `MechModel` sets `toneMappingExposure` per
     canvas, so this is the case's own exposure and reaches nothing else.

     The framing is its own too: `fill` 0.15 against a face's 0.56, because
     `fit` normalises a model by its height alone — right for a head, and
     wrong for a wide flat box, which comes out enormous at a head's number.

     **It does not move with the pointer, and that is `lean: 0`.** Not the eye
     controls, which is the natural place to look: it has no morph targets, so
     `lookH`, `lookSpeed` and the rest are writing to nothing on this model
     whatever they are set to — the only thing that ever turned the case was
     `Lean` in `MechModel`, which swings the whole subject toward the gaze by
     `lean` degrees. `watchBird: false` had already taken the bird out of that
     gaze; zero takes the pointer out of it as well and the case stands
     still. */
  'capsule-c1': {
    ...MODEL_DEFAULTS,
    fill: 0.15,
    lean: 0,
    turn: -138,
    tilt: 21,
    liftY: -0.045,
    floatRange: 0.24,
    floatRotation: 0,
    exposure: 0.05,
    envIntensity: 1.8,
    keyIntensity: 41,
    keyX: 8.36,
    keyY: -2.66,
    keyZ: 12,
    fillIntensity: 44.3,
    fillX: -1.77,
    fillY: 1.44,
    fillZ: -1.15,
    envMapIntensity: 1.3,
    roughnessBoost: -0.24,
    metalnessBoost: 0.24,
    watchBird: false
  },

  /* ---- the two guns ----

     Both are Sketchfab exports of real objects: a Colt single-action for Red
     Dead Redemption 2 and an M4 carbine for Grand Theft Auto V, standing where
     the same generic disc case used to stand for *both* games.

     They are the first long subjects here, and the framing is where that
     shows. `fit` in MechModel normalises a model by its **height alone** —
     right for a head, and the same trap Capsule C1 hit from the other side.
     A gun is three or four times longer than it is tall, so its height is a
     short edge and dividing by it makes the length enormous; a face's `fill`
     of 0.56 runs both ends of either of these clean off the stage. A quarter
     of it is what puts a whole gun inside a 16:9 frame.

     **And "long" is not the same axis twice.** The revolver is exported along
     its own X and the rifle along its own Z, so at `turn: 0` one is side-on
     and the other is pointing down the barrel at you — which does not read as
     a rifle, it reads as a muzzle. Worth measuring rather than guessing: the
     world boxes are 4.73 × 1.85 × 0.58 and 0.015 × 0.052 × 0.184, and nothing
     on either screen tells you which axis you are looking down.

     Both are set by eye on the **Subject** tab from there, and the numbers
     below are that export. Two things in it are worth not tidying:

     - **The revolver is on an 18mm lens** against everything else's 200. That
       is the one subject on the site where the perspective is the point: a
       long lens on a gun this size is an elevation drawing, and the wide one
       throws the barrel away from you and puts the cylinder and the hammer in
       your hand. `distanceFor` moves the camera in to hold the framing, so
       the focal length is doing nothing but choosing how much foreshortening
       there is.
     - **Neither leans.** `lean: 0`, like Capsule C1 and unlike the face. A
       head turning to follow the pointer is a head; a gun doing it is a
       turret tracking you, which is a much louder gesture than this page
       wants. They drift and that is all. */
  'red-dead-redemption-2': {
    ...MODEL_DEFAULTS,
    focalLength: 18,
    fill: 0.25,
    lean: 0,
    turn: -127,
    tilt: 16.5,
    liftY: -0.015,
    exposure: 0.1,
    envIntensity: 2.6,
    keyZ: -8.77,
    fillZ: -0.37,
    /* +1, which clamps every surface on it to fully rough. The export is a
       Sketchfab scan-style bake: the shading is already painted into the base
       colour map, and any gloss added on top of it reads as cling film over
       a photograph rather than as steel. */
    roughnessBoost: 1,
    metalnessBoost: 0.1
  },

  'grand-theft-auto-v': {
    ...MODEL_DEFAULTS,
    fill: 0.27,
    lean: 0,
    turn: 35,
    tilt: -1,
    liftY: 0.035,
    floatRange: 0.2,
    floatRotation: 0.5,
    /* Brighter than anything else here, because the subject is a black rifle:
       its base colour is near enough to the page it stands on that at the
       revolver's numbers it read as a silhouette. Almost all of the shape is
       specular, so the lamps do the work and there is very little diffuse
       response to fall back on — hence a key at 80, with the metalness taken
       all the way up rather than the roughness taken down. */
    exposure: 0.07,
    envIntensity: 2.1,
    keyIntensity: 80,
    keyX: 12,
    keyY: -11.15,
    fillIntensity: 31.5,
    fillX: -12,
    fillY: -0.93,
    fillZ: 1.41,
    roughnessBoost: -0.68,
    metalnessBoost: 1,
    watchBird: false
  },

  /* A flat card. `fit` normalises by height, so at a face's fill it comes out
     as tall as the stage — the same trap the guns hit. Starter numbers; tune
     on the Subject tab. */
  'wyte-card': {
    ...MODEL_DEFAULTS,
    fill: 0.37,
    lean: 8.5,
    turn: 79.5,
    tilt: -18.5,
    liftY: 0.03,
    floatSpeed: 4,
    floatRange: 0.065,
    floatRotation: 0,
    exposure: 0.34,
    envIntensity: 5.4,
    keyIntensity: 80,
    keyX: 12,
    keyY: -7.59,
    keyZ: 12,
    fillIntensity: 70.8,
    fillX: 12,
    fillY: 12,
    fillZ: -7.69,
    envMapIntensity: 0,
    roughnessBoost: -0.39,
    metalnessBoost: -1,
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
/* Which rig the panel is currently showing, and its live values — the copy
   button closes over this file's schema, which Leva reads once, so a raw
   `projectId` / `values` in the button is frozen to whichever model the panel
   first mounted under. Re-pointed every render in the hook body. */
const shown: { id: string; rig: ModelTuning } = { id: 'mr-takahashi', rig: { ...MODEL_DEFAULTS } }
/* Every key filled from `MODEL_DEFAULTS` first, then the shipped rig, then
   whatever was last saved. A saved rig from before a field existed — `Place`
   was added to the schema after these scratchpads were first written — is a
   partial object, and a shallow `{ ...MODEL_RIGS, ...savedRigs }` let it
   replace a complete rig with one missing `turn`/`tilt`/`liftY`. Those reach
   `MechModel` as `undefined`, `degToRad(undefined)` is `NaN`, and a group at
   a NaN rotation takes the whole subject off screen — an invisible model that
   reads as the canvas being broken. */
/* Filtered against `MODELS` on the way in as well as on the way out, because
   a scratchpad written before the guard below existed has an entry for every
   project that was ever opened — eight of them piece projects wearing a full
   copy of the face's rig. Left in, they survive into `asSource()` and the
   export claims six models for a site that has two. */
const rigs: Record<string, ModelTuning> = Object.fromEntries(
  [...new Set([...Object.keys(MODEL_RIGS), ...Object.keys(savedRigs)])]
    .filter((id) => id in MODELS)
    .map((id) => [id, { ...MODEL_DEFAULTS, ...MODEL_RIGS[id], ...savedRigs[id] }])
)
const keys = Object.keys(MODEL_DEFAULTS) as Array<keyof ModelTuning>

/** Long float tails are what a slider's step arithmetic leaves behind, not a
 *  value anyone chose; pasted back into source they are just noise. */
const tidy = (value: number | boolean) => (typeof value === 'number' ? String(Number(value.toFixed(4))) : String(value))

const rigLine = (id: string, rig: ModelTuning) =>
  `  '${id}': { ${keys.map((key) => `${key}: ${tidy(rig[key])}`).join(', ')} }`

const asSource = () =>
  `export const MODEL_RIGS: Record<string, ModelTuning> = {\n${Object.entries(rigs)
    .map(([id, rig]) => rigLine(id, rig))
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
    'Copy this one': button(() => {
      /* `shown`, not `projectId` / `values` — Leva reads this schema once, so
         a raw closure is frozen to whichever model the panel first mounted
         under. That is how the Subject tab handed back
         `'capsule-c1': { <MODEL_DEFAULTS> }` after a navigation. `shown` is
         re-pointed every render below. */
      const rig = { ...MODEL_DEFAULTS, ...shown.rig }
      const text = `${rigLine(shown.id, rig)},`
      void copyText(text)
      // eslint-disable-next-line no-console
      console.log(`[model] Paste this row into MODEL_RIGS in src/v3/modelTuning.ts:\n\n${text}`)
    }),
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
       the other export does not have.

       Spreading it was only ever half the job, though, and for a while the
       half that does not show. Leva reads a schema **once per deps change**,
       and this hook had no deps — so whichever model the panel first mounted
       under decided what it declared for the rest of the session. The first
       mount is always home, home passes `FACE`, and the Eyes folder was
       therefore declared every single time and stayed declared over Capsule
       C1: twelve controls for eyes that model does not have, sitting above a
       Follow slider that could not have moved it. `[isFace]` below is what
       makes the condition mean anything. */
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
        metalnessBoost: { value: seed.metalnessBoost, min: -1, max: 1, step: 0.01, label: 'Metal +' }
      },
      { collapsed: true }
    )
  }), { store }, [isFace]) as unknown as [ModelTuning, (next: Partial<ModelTuning>) => void]

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
  /* Re-read when the schema is rebuilt, not latched on the first mount. The
     `[isFace]` deps above mean the key set genuinely changes mid-session now,
     and a stale list here is the crash this list exists to prevent: it would
     let `blinkMin` through to a `set()` that no longer has an input for it.
     Leva has already re-run the schema by the time this render reads
     `values`, so the keys are the new ones. */
  const declared = useRef<string[]>([])
  const declaredFor = useRef<boolean | null>(null)
  if (declaredFor.current !== isFace) {
    declaredFor.current = isFace
    declared.current = Object.keys(values as object)
  }

  /* Reseed when the readout swings to the other model. Without this, opening
     Capsule C1 after Mr. Takahashi would show his numbers on the panel and
     write them over hers the moment anything was dragged. */
  useEffect(() => {
    const next = rigs[projectId] ?? MODEL_DEFAULTS
    setValues(
      Object.fromEntries(
        Object.entries(next).filter(([key]) => declared.current.includes(key))
      ) as Partial<ModelTuning>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  /* Which model the panel's current `values` actually belong to.
 
     This is the fix for the two rigs swapping places. `setValues` in the
     reseed above does not land until a render later, so on the commit where
     `projectId` changes this effect still holds the *previous* model's
     numbers — and it used to write them into `rigs[owner]`, where `owner` had
     already been moved on. Opening Capsule C1 after Mr. Takahashi therefore
     saved his rig as hers, and going back saved hers as his, and both went
     straight to `localStorage`, so it survived the reload and looked like the
     source constants were being ignored. It is why his eyes came up blank
     (her `envMapIntensity: 1.3` and her metalness on a face lit for
     neither) and why the case's black logo stayed white however many times
     this file was corrected. */
  const wroteFor = useRef(projectId)

  const serialised = JSON.stringify(values)
  useEffect(() => {
    if (wroteFor.current !== projectId) {
      wroteFor.current = projectId
      return
    }
    /* Nothing to remember for a project that has no model. The panel is
       mounted on every screen — `Mech` calls this hook unconditionally and
       passes `id ?? FACE` — so without this, opening any of the eight piece
       projects saved whatever rig was loaded under *that* project's id, and
       the export came back listing Mecha Station and Block Builder as models
       wearing Mr. Takahashi's lamps. Harmless on screen, because `rigFor` is
       only ever asked about a model, and thoroughly confusing on paper. */
    if (!(projectId in MODELS)) return

    Object.assign(live, values)
    /* Merged over what the rig already held, never replacing it. `values`
       only carries what the panel declared, and the panel no longer declares
       the same thing for every model — saving it bare would drop `lookH` and
       `blinkMin` off Capsule C1's record the moment anything was dragged, and
       `asSource()` prints every key of every rig, so they would come back out
       as `undefined`. Pasted into source that is `degToRad(undefined)`, a NaN
       rotation, and a subject that renders nowhere. */
    rigs[projectId] = { ...MODEL_DEFAULTS, ...rigs[projectId], ...(values as ModelTuning) }
    try {
      window.localStorage.setItem(STORE_KEY, serialised)
      window.localStorage.setItem(`${STORE_KEY}.rigs`, JSON.stringify(rigs))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised, projectId])

  /* Layered, not handed over bare, and this is the second half of the same
     bug. Leva reads a schema **once**, and this one is conditional — no Eyes
     folder unless the model is the face. So whichever model happens to mount
     first decides what the panel declares for the rest of the session: land
     on Capsule C1 and Mr. Takahashi is later drawn from a `values` with no
     `lookH`, no `lookMaxV`, no `blinkMin`. Those reach `MechModel` as
     `undefined`, the eye and blink arithmetic turns to `NaN`, and a morph
     target driven by `NaN` renders as a blank eye — which is exactly what it
     looked like, and reads as the model being broken rather than as a panel
     that never declared the control.
 
     Merging over the rig and then the defaults means an undeclared key falls
     back to a real number instead of `undefined`, whatever order the two
     models are opened in. */
  const merged = { ...MODEL_DEFAULTS, ...(rigs[projectId] ?? {}), ...values }
  /* Set in render, not an effect, so a copy click on the same commit the model
     changed still reads the one on screen. */
  shown.id = projectId
  shown.rig = merged as ModelTuning

  return { ...merged, store }
}
