import { Suspense, useEffect, useRef } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { Leva, button, folder, useControls } from 'leva'
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace } from 'three'
import type { Group, Mesh, MeshStandardMaterial, OrthographicCamera } from 'three'
import { projects } from '../data/projects'
import { hasProduct, specDefaults } from '../site/products'
import {
  NARROW,
  NARROW_AT,
  NARROW_PANEL_MAX_CH,
  PATTERN_DRIFT,
  PATTERN_PARALLAX,
  TOUCH_PER_UNIT,
  PANEL_H,
  PANEL_W,
  REF_ASPECT,
  STAGE_SHIFT,
  WIDE
} from '../site/room'
import type { RoomLayout, RoomTuning } from '../site/room'
import { StudioEnvironment } from './CapsuleStage'
import Vitrine, { VITRINE_TOTAL } from './Vitrine'

export type { RoomLayout, RoomTuning } from '../site/room'

/** Draw the acrylic case and plinth around each piece. Off for now — the
 *  pieces stand in the open at the case's usual spot, just scaled up (see
 *  `PIECE_FIT`) — without deleting `Vitrine`, so flipping this back on
 *  restores the exhibit look exactly as it was. */
const SHOW_CASE = false

/* The room: one row of vitrines, one canvas, one camera.
 *
 * **Everything is in one scene, and that is the whole point.** The home page
 * used to hold a single canvas standing in for whichever project was square
 * on, and it had to fade out the instant the wall turned, because a flat
 * canvas stops matching the perspective of the cell it is standing in for.
 * That fade was the piece disappearing every time you moved — which is
 * exactly what an exhibit must not do. Here the cases *are* the scene: the
 * row slides, the camera does not move, and nothing ever needs to be hidden
 * because nothing is ever standing in for anything.
 *
 * **The camera is orthographic.** Two reasons, and both are load-bearing:
 *
 *  - It is what makes the row read as a row. Under perspective the case three
 *    steps away is seen from its side while the near one is seen head-on, so
 *    a filmstrip of identical cases arrives as a fan. Under an axonometric
 *    they are the same object repeated, which is what a gallery looks like.
 *  - World and screen become one linear scale, so the DOM copy beside each
 *    case and the case itself can be laid out from the same fractions and
 *    stay locked together at any window size. Under perspective they agree at
 *    exactly one aspect ratio.
 *
 * **The unit is one viewport height.** `RoomLens` sets the ortho zoom so the
 * frustum is exactly 1 unit tall, which means every number below is a
 * fraction of the window and there is not a pixel anywhere in the scene.
 */

/** Where the camera stands at a detent. 45 is corner-on: two faces and the
 *  lid, which is how you meet a case in a room. */
const AZIMUTH = 45
/** Degrees above it. Eye height on a case that comes up to your chest — much
 *  more and it becomes a floor plan. */
const ELEVATION = 11
/** How far the camera walks around the room between one project and the next.
 *
 *  **A quarter turn, and it has to be a quarter turn.** The cases are square,
 *  so at 90 degrees every detent shows an identical case — the same silhouette
 *  in the same place, and only what is standing inside it has changed. At any
 *  other angle the furniture changes shape from project to project, which
 *  reads as the room being unstable rather than as you moving through it.
 *
 *  This is a real orbit, and the light does *not* come with it. That is the
 *  whole point: as you scroll, the key sweeps across the case's faces, the
 *  plinth's lit and shadowed sides trade places, and the shadow on the floor
 *  swings. The piece itself is bolted to the world and never turns — every bit
 *  of its apparent rotation is you walking around it.
 *
 *  (An earlier version turned the piece instead and left the camera still. It
 *  is the same picture only if the light turns too, and then the case — being
 *  symmetrical every 90 degrees — renders identically at every step and the
 *  room goes dead.) */
const ORBIT = 90
/** Degrees the piece rests at once you have arrived, as a fraction of the
 *  per-project `turn`. Those values were camera azimuths on the old stage and
 *  ran as wide as 42 degrees; a piece presented in its case wants to be facing
 *  you and just off square, so the choice of which face is kept and the amount
 *  is pulled in. */
const REST_TURN = 0.45
/** Distance out. Orthographic, so this only sets the clipping, not the size. */
const CAM_RADIUS = 10

/**
 * Scales a piece from the world it was tuned in — a stage that normalised
 * every model to ~1.1 units — into a case half a viewport tall.
 *
 * Applied as a wrapping group rather than folded into each product's own
 * scale, so the drift `Float` adds is scaled by it too. Left unscaled, a
 * drift tuned for a 1.7-unit object throws a 0.2-unit one clean through the
 * glass.
 *
 * With the case off (`SHOW_CASE`), nothing constrains a piece's size anymore,
 * so this is bumped up from the case-era 0.105 — and each piece now has its
 * own live size multiplier on top of it, see `OBJECT_SCHEMA` below.
 */
const PIECE_FIT = 0.16

/* ---- the tuning panel ----

   Twelve pieces, all different shapes, standing in one room. "Centred in its
   slot" and "sitting right" stop being the same thing the moment the objects
   stop being the same object: a tall kiosk and a flat card, each centred on
   its own bounding box, do not read as level with each other. So each piece
   gets its own angle, size and position, live, and the numbers are written
   back into products.tsx when they are right.

   Everything below is per *project*, deliberately. An earlier version had one
   set of sliders moving all twelve at once, which can only ever find the
   compromise that suits none of them. */

/** Namespaced Leva keys for one project's controls — flat, because
 *  `useControls` merges every folder's fields into one flat result object,
 *  so two projects both naming a field `turn` would fight over the same
 *  value if the keys were not made unique per project. */
const turnKey = (id: string) => `turn__${id}`
const scaleKey = (id: string) => `scale__${id}`
const xKey = (id: string) => `x__${id}`
const yKey = (id: string) => `y__${id}`
/** Same four, namespaced again for the Mobile sub-folder each project gets —
 *  see the note on `OBJECT_SCHEMA` below. */
const narrowTurnKey = (id: string) => `narrowTurn__${id}`
const narrowScaleKey = (id: string) => `narrowScale__${id}`
const narrowXKey = (id: string) => `narrowX__${id}`
const narrowYKey = (id: string) => `narrowY__${id}`

/** Where the panel's numbers survive a reload.
 *
 *  Tuning twelve pieces on four axes each is an afternoon, and losing it to a
 *  stray refresh is what makes a tool stop getting used. This is a scratchpad
 *  and not a source of truth — nothing in it ever reaches a visitor, whose
 *  browser has an empty one and therefore sees exactly what products.tsx
 *  says. `Copy for source` is how a number stops being temporary. */
const STORE_KEY = 'gallery.tuning.v2'

const readStore = (): Record<string, number> => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    // Private mode, a full quota, a half-written value from an interrupted
    // save — none of it is worth taking the gallery down for.
    return {}
  }
}

const saved = typeof window === 'undefined' ? {} : readStore()

/** Every control's current value, kept up to date by `Gallery3D`. The copy
 *  button is built with the schema at module scope and has no other way to
 *  see what the panel now says. */
const live: Record<string, number> = { ...saved }

/** Controls that live outside this file — Adam's Face folder, Capsule C1's
 *  Material/Angle folder, any future piece with its own tunable knobs —
 *  register themselves here so the one "Copy for source" button can include
 *  them too, without this file needing to know their schemas. Keyed by a
 *  human-readable label rather than a Leva key: there's no shared namespace
 *  to collide in, and the label is what the copied text should read anyway. */
export const EXTRA_CONTROLS: Record<string, { value: number; defaultValue: number }> = {}

/** The one non-numeric light control (fillColor is a hex string), kept out
 *  of `live`/`saved` so those can stay a plain number map — everything else
 *  the panel writes back is a number. */
const COLOR_STORE_KEY = 'gallery.tuning.fillColor.v1'
const FILL_COLOR_DEFAULT = '#ffffff'
const savedFillColor =
  (typeof window !== 'undefined' && window.localStorage.getItem(COLOR_STORE_KEY)) || FILL_COLOR_DEFAULT
let liveFillColor = savedFillColor

/** One collapsed folder per project — built once at module scope, not per
 *  render, so retyping a value does not fight a schema object that is a new
 *  reference every time.
 *
 *  Each slider starts where products.tsx already has that piece, so the panel
 *  opens showing what is actually on screen rather than a row of zeroes you
 *  have to find your way back from. Turn is shown post-`REST_TURN`, i.e. the
 *  angle you can see; scale is a multiplier on the piece's own.
 *
 *  Each project also gets a nested Mobile folder, read instead of the outer
 *  four when the label is stacked under the case (`Row` in this file, keyed
 *  off the `narrow` prop) — same reasoning as the Layout folder's Desktop/
 *  Mobile split in `LAYOUT_SCHEMA`: a piece sized to sit next to its label on
 *  a laptop is not sized right stacked above it on a phone, and one number
 *  serving both meant fixing one broke the other. Seeded from
 *  `spec.narrow` (products.tsx) — which itself falls back to the desktop
 *  pose — rather than always from the desktop *slider's* live value, so a
 *  project that already has a narrow pose on disk opens the panel showing
 *  it rather than silently overwriting it with whatever desktop happens to
 *  be set to right now. Scale is seeded as a ratio: the model is only ever
 *  built once, at the desktop scale (see `exhibitFor`), so the Mobile
 *  slider is a multiplier on that same baked size, not a second absolute
 *  one. */
const OBJECT_SCHEMA = Object.fromEntries(
  projects.map((project) => {
    const spec = specDefaults(project.id)
    const seed = (key: string, fallback: number) => saved[key] ?? fallback
    const id = project.id
    const turnDefault = Math.round(spec.turn * REST_TURN)
    const scaleDefault = 1
    const xDefault = spec.offsetX
    const yDefault = spec.offsetY
    const turnLive = seed(turnKey(id), turnDefault)
    const scaleLive = seed(scaleKey(id), scaleDefault)
    const xLive = seed(xKey(id), xDefault)
    const yLive = seed(yKey(id), yDefault)
    const narrowTurnDefault = Math.round(spec.narrowTurn * REST_TURN)
    const narrowScaleDefault = spec.narrowScale / spec.scale
    return [
      project.title,
      folder(
        {
          [turnKey(id)]: {
            value: turnLive,
            min: -180,
            max: 180,
            step: 1,
            label: 'Turn °'
          },
          [scaleKey(id)]: {
            value: scaleLive,
            min: 0.4,
            max: 2.5,
            step: 0.02,
            label: 'Scale ×'
          },
          // Both in viewport heights, so a step of X and a step of Y move the
          // piece the same distance on screen — which is the whole point of
          // having two sliders rather than a pair of unrelated numbers.
          [xKey(id)]: {
            value: xLive,
            min: -0.6,
            max: 0.6,
            step: 0.005,
            label: 'X'
          },
          [yKey(id)]: {
            value: yLive,
            min: -0.6,
            max: 0.6,
            step: 0.005,
            label: 'Y'
          },
          Mobile: folder(
            {
              [narrowTurnKey(id)]: {
                value: seed(narrowTurnKey(id), narrowTurnDefault),
                min: -180,
                max: 180,
                step: 1,
                label: 'Turn °'
              },
              [narrowScaleKey(id)]: {
                value: seed(narrowScaleKey(id), narrowScaleDefault),
                min: 0.4,
                max: 2.5,
                step: 0.02,
                label: 'Scale ×'
              },
              [narrowXKey(id)]: {
                value: seed(narrowXKey(id), spec.narrowOffsetX),
                min: -0.6,
                max: 0.6,
                step: 0.005,
                label: 'X'
              },
              [narrowYKey(id)]: {
                value: seed(narrowYKey(id), spec.narrowOffsetY),
                min: -0.6,
                max: 0.6,
                step: 0.005,
                label: 'Y'
              }
            },
            { collapsed: true }
          )
        },
        { collapsed: true }
      )
    ]
  })
)

const round = (n: number, places: number) => Number(n.toFixed(places))

/** Treats two numbers as equal once they're this close — float drift from a
 *  round-trip through a slider's step shouldn't read as "changed". */
const closeTo = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

/**
 * The panel's numbers, written out in the shape the source keeps them in —
 * but only the ones that actually differ from their default, across every
 * section of the panel (Objects, Layout, Lighting, and whatever any other
 * piece has registered into `EXTRA_CONTROLS`). One button covers all of it:
 * a session that only nudged one slider shouldn't hand back forty-eight
 * unchanged lines to sift through for the one that matters.
 *
 * Turn and scale are converted back on the way out: the panel shows the
 * angle actually on screen and a multiplier on the piece's own size, while
 * products.tsx stores the pre-`REST_TURN` angle and the size itself.
 */
function fullTuningSource() {
  const lines: string[] = []

  // ---- Objects: one line per project, only for the fields that moved.
  // Mobile's four nest under a `narrow: { ... }` inside the same entry —
  // that's the shape `ProductSpec['narrow']` expects in products.tsx. ----
  const objectLines = projects
    .filter((project) => hasProduct(project.id))
    .flatMap((project) => {
      const spec = specDefaults(project.id)
      const id = project.id
      const turnDefault = Math.round(spec.turn * REST_TURN)
      const turnLive = live[turnKey(id)] ?? turnDefault
      const scaleLive = live[scaleKey(id)] ?? 1
      const xLive = live[xKey(id)] ?? spec.offsetX
      const yLive = live[yKey(id)] ?? spec.offsetY

      const fields: string[] = []
      if (!closeTo(turnLive, turnDefault)) fields.push(`turn: ${round(turnLive / REST_TURN, 1)}`)
      if (!closeTo(scaleLive, 1)) fields.push(`scale: ${round(spec.scale * scaleLive, 3)}`)
      if (!closeTo(xLive, spec.offsetX)) fields.push(`offsetX: ${round(xLive, 3)}`)
      if (!closeTo(yLive, spec.offsetY)) fields.push(`offsetY: ${round(yLive, 3)}`)

      // Mobile's own four, each compared against `spec.narrow*` (which is
      // already "the desktop value, unless products.tsx already overrides
      // it") rather than against the desktop slider's live value — the
      // same reasoning `OBJECT_SCHEMA`'s seeding above uses.
      const narrowTurnDefault = Math.round(spec.narrowTurn * REST_TURN)
      const narrowScaleDefault = spec.narrowScale / spec.scale
      const narrowTurnLive = live[narrowTurnKey(id)] ?? narrowTurnDefault
      const narrowScaleLive = live[narrowScaleKey(id)] ?? narrowScaleDefault
      const narrowXLive = live[narrowXKey(id)] ?? spec.narrowOffsetX
      const narrowYLive = live[narrowYKey(id)] ?? spec.narrowOffsetY

      const narrowFields: string[] = []
      if (!closeTo(narrowTurnLive, narrowTurnDefault)) {
        narrowFields.push(`turn: ${round(narrowTurnLive / REST_TURN, 1)}`)
      }
      if (!closeTo(narrowScaleLive, narrowScaleDefault)) {
        narrowFields.push(`scale: ${round(spec.scale * narrowScaleLive, 3)}`)
      }
      if (!closeTo(narrowXLive, spec.narrowOffsetX)) narrowFields.push(`offsetX: ${round(narrowXLive, 3)}`)
      if (!closeTo(narrowYLive, spec.narrowOffsetY)) narrowFields.push(`offsetY: ${round(narrowYLive, 3)}`)
      if (narrowFields.length > 0) fields.push(`narrow: { ${narrowFields.join(', ')} }`)

      return fields.length > 0 ? [`  '${id}': { ${fields.join(', ')} },`] : []
    })
  if (objectLines.length > 0) {
    lines.push('// src/site/products.tsx — merge into each SPECS entry', ...objectLines, '')
  }

  // ---- Layout: the room's own proportions, desktop and mobile apart ----
  const layoutLines: string[] = []
  const spacingLive = live.spacing ?? 1
  if (!closeTo(spacingLive, 1)) {
    layoutLines.push(`WIDE.stepW        ${round(WIDE.stepW * spacingLive, 3)}   // was ${WIDE.stepW}`)
  }
  if (!closeTo(live.shift ?? STAGE_SHIFT, STAGE_SHIFT)) layoutLines.push(`STAGE_SHIFT       ${live.shift}`)
  if (!closeTo(live.narrowAt ?? NARROW_AT, NARROW_AT)) layoutLines.push(`NARROW_AT         ${live.narrowAt}`)
  if (!closeTo(live.panelW ?? PANEL_W, PANEL_W)) layoutLines.push(`PANEL_W           ${live.panelW}`)
  if (!closeTo(live.panelH ?? PANEL_H, PANEL_H)) layoutLines.push(`PANEL_H           ${live.panelH}`)

  const narrowSpacingLive = live.narrowSpacing ?? 1
  if (!closeTo(narrowSpacingLive, 1)) {
    layoutLines.push(`NARROW.stepW      ${round(NARROW.stepW * narrowSpacingLive, 3)}   // was ${NARROW.stepW}`)
  }
  if (!closeTo(live.narrowCaseH ?? NARROW.caseH, NARROW.caseH)) {
    layoutLines.push(`NARROW.caseH      ${live.narrowCaseH}   // was ${NARROW.caseH}`)
  }
  if (!closeTo(live.narrowCaseY ?? NARROW.caseY, NARROW.caseY)) {
    layoutLines.push(`NARROW.caseY      ${live.narrowCaseY}   // was ${NARROW.caseY}`)
  }
  if (!closeTo(live.narrowPanelMaxCh ?? NARROW_PANEL_MAX_CH, NARROW_PANEL_MAX_CH)) {
    layoutLines.push(`NARROW_PANEL_MAX_CH  ${live.narrowPanelMaxCh}`)
  }
  if (!closeTo(live.narrowPanelH ?? PANEL_H, PANEL_H)) layoutLines.push(`narrowPanelH      ${live.narrowPanelH}`)
  if (layoutLines.length > 0) lines.push('// src/site/room.ts', ...layoutLines, '')

  // ---- Lighting: the shared rig, only the lights that actually moved ----
  const lightingLines: string[] = []
  const envLive = live.envIntensity ?? LIGHT_DEFAULTS.envIntensity
  const ambientLive = live.ambientIntensity ?? LIGHT_DEFAULTS.ambientIntensity
  const keyXLive = live.keyX ?? LIGHT_DEFAULTS.keyX
  const keyYLive = live.keyY ?? LIGHT_DEFAULTS.keyY
  const keyZLive = live.keyZ ?? LIGHT_DEFAULTS.keyZ
  const keyIntensityLive = live.keyIntensity ?? LIGHT_DEFAULTS.keyIntensity
  const fillXLive = live.fillX ?? LIGHT_DEFAULTS.fillX
  const fillYLive = live.fillY ?? LIGHT_DEFAULTS.fillY
  const fillZLive = live.fillZ ?? LIGHT_DEFAULTS.fillZ
  const fillIntensityLive = live.fillIntensity ?? LIGHT_DEFAULTS.fillIntensity

  if (!closeTo(envLive, LIGHT_DEFAULTS.envIntensity)) {
    lightingLines.push(`<StudioEnvironment intensity={${round(envLive, 2)}} />`)
  }
  if (!closeTo(ambientLive, LIGHT_DEFAULTS.ambientIntensity)) {
    lightingLines.push(`<ambientLight intensity={${round(ambientLive, 2)}} />`)
  }
  if (
    !closeTo(keyXLive, LIGHT_DEFAULTS.keyX) ||
    !closeTo(keyYLive, LIGHT_DEFAULTS.keyY) ||
    !closeTo(keyZLive, LIGHT_DEFAULTS.keyZ) ||
    !closeTo(keyIntensityLive, LIGHT_DEFAULTS.keyIntensity)
  ) {
    lightingLines.push(
      `<directionalLight position={[${round(keyXLive, 2)}, ${round(keyYLive, 2)}, ${round(keyZLive, 2)}]} intensity={${round(keyIntensityLive, 2)}} ... (castShadow + shadow-* props unchanged) />`
    )
  }
  if (
    !closeTo(fillXLive, LIGHT_DEFAULTS.fillX) ||
    !closeTo(fillYLive, LIGHT_DEFAULTS.fillY) ||
    !closeTo(fillZLive, LIGHT_DEFAULTS.fillZ) ||
    !closeTo(fillIntensityLive, LIGHT_DEFAULTS.fillIntensity) ||
    liveFillColor !== FILL_COLOR_DEFAULT
  ) {
    lightingLines.push(
      `<directionalLight position={[${round(fillXLive, 2)}, ${round(fillYLive, 2)}, ${round(fillZLive, 2)}]} intensity={${round(fillIntensityLive, 2)}} color="${liveFillColor}" />`
    )
  }
  if (lightingLines.length > 0) lines.push('// src/three/Gallery3D.tsx — lighting block', ...lightingLines, '')

  // ---- Whatever any other piece (Adam, Capsule C1, ...) has registered ----
  const extraLines = Object.entries(EXTRA_CONTROLS)
    .filter(([, { value, defaultValue }]) => !closeTo(value, defaultValue))
    .map(([label, { value, defaultValue }]) => `${label}: ${round(value, 3)}   // was ${round(defaultValue, 3)}`)
  if (extraLines.length > 0) {
    lines.push('// Per-piece controls — see that piece’s own component for where each default lives', ...extraLines)
  }

  return lines.length > 0 ? lines.join('\n').trimEnd() : '// Nothing has been changed from its default yet.'
}

/** How the room itself is set, as opposed to what is standing in it. Split
 *  into a Desktop group and a Mobile group that share nothing but the
 *  breakpoint between them — every other number here used to move both
 *  layouts at once, which meant there was no way to fix the phone's spacing
 *  or case size without also nudging the desktop version. `narrowAt` is the
 *  one exception: it's the switch between the two, not a proportion of
 *  either, so there is only one of it. */
const LAYOUT_SCHEMA = {
  narrowAt: {
    value: saved.narrowAt ?? NARROW_AT,
    min: 480,
    max: 1400,
    step: 10,
    label: 'Mobile below px'
  },
  Desktop: folder(
    {
      spacing: {
        value: saved.spacing ?? 1,
        min: 0.5,
        max: 2.2,
        step: 0.02,
        label: 'Case spacing ×'
      },
      shift: {
        value: saved.shift ?? STAGE_SHIFT,
        min: -20,
        max: 20,
        step: 0.5,
        label: 'Stage shift %'
      },
      panelW: {
        value: saved.panelW ?? PANEL_W,
        min: 14,
        max: 40,
        step: 0.5,
        label: 'Panel width vw'
      },
      panelH: {
        value: saved.panelH ?? PANEL_H,
        min: 0,
        max: 60,
        step: 1,
        label: 'Panel min-height vh'
      }
    },
    { collapsed: true }
  ),
  Mobile: folder(
    {
      narrowSpacing: {
        value: saved.narrowSpacing ?? 1,
        min: 0.5,
        max: 2.2,
        step: 0.02,
        label: 'Case spacing ×'
      },
      narrowCaseH: {
        value: saved.narrowCaseH ?? NARROW.caseH,
        min: 0.15,
        max: 0.6,
        step: 0.01,
        label: 'Case height vh'
      },
      narrowCaseY: {
        value: saved.narrowCaseY ?? NARROW.caseY,
        min: 0,
        max: 0.35,
        step: 0.005,
        label: 'Case lift vh'
      },
      narrowPanelMaxCh: {
        value: saved.narrowPanelMaxCh ?? NARROW_PANEL_MAX_CH,
        min: 20,
        max: 60,
        step: 1,
        label: 'Panel max width ch'
      },
      narrowPanelH: {
        value: saved.narrowPanelH ?? PANEL_H,
        min: 0,
        max: 60,
        step: 1,
        label: 'Panel min-height vh'
      },
      touchPerUnit: {
        value: saved.touchPerUnit ?? TOUCH_PER_UNIT,
        min: 400,
        max: 2600,
        step: 50,
        label: 'Swipe px / project'
      }
    },
    { collapsed: true }
  ),
  /* The wallpaper behind everything — `.site-pattern` in tokens.css. It is
     not part of the room, but it is the only tuning panel on the site and
     the drift is a thing to be tried at a few strengths rather than argued
     about in the abstract, so it is here. Gallery.tsx and ProjectPage.tsx
     are what actually drive it; see pattern.ts. */
  Background: folder(
    {
      patternParallax: {
        value: saved.patternParallax ?? PATTERN_PARALLAX,
        label: 'Drift on scroll'
      },
      patternDrift: {
        value: saved.patternDrift ?? PATTERN_DRIFT,
        min: -400,
        max: 400,
        step: 10,
        label: 'Drift px / screen'
      }
    },
    { collapsed: true }
  )
}

/** The room's own lights — shared by every piece, so tuning one project's
 *  case necessarily moves everyone else's too. `fullTuningSource` above
 *  diffs the live panel against exactly these numbers, so they have to stay
 *  the single source of truth for "default" rather than duplicated as bare
 *  literals in the schema below. */
const LIGHT_DEFAULTS = {
  envIntensity: 5.6,
  ambientIntensity: 0,
  keyIntensity: 25,
  keyX: -3.78,
  keyY: 0.2,
  keyZ: 9,
  fillIntensity: 11.1,
  fillX: 2.1,
  fillY: -0.2,
  fillZ: -1
}

/** Defaults below match what's hardcoded in the JSX — tuned against a
 *  screenshot of the Blender viewport rather than derived from a physical
 *  rig, so don't read the position/intensity numbers as meaningful on their
 *  own; nothing here reaches a visitor until its number is copied back into
 *  that JSX by hand — see `LAYOUT_SCHEMA` above for why. */
const LIGHT_SCHEMA = {
  envIntensity: {
    value: saved.envIntensity ?? LIGHT_DEFAULTS.envIntensity,
    min: 0,
    max: 12,
    step: 0.1,
    label: 'Environment ×'
  },
  ambientIntensity: {
    value: saved.ambientIntensity ?? LIGHT_DEFAULTS.ambientIntensity,
    min: 0,
    max: 3,
    step: 0.05,
    label: 'Ambient'
  },
  Key: folder({
    keyIntensity: {
      value: saved.keyIntensity ?? LIGHT_DEFAULTS.keyIntensity,
      min: 0,
      max: 30,
      step: 0.1,
      label: 'Intensity'
    },
    keyX: { value: saved.keyX ?? LIGHT_DEFAULTS.keyX, min: -10, max: 10, step: 0.1, label: 'X' },
    keyY: { value: saved.keyY ?? LIGHT_DEFAULTS.keyY, min: -10, max: 10, step: 0.1, label: 'Y' },
    keyZ: { value: saved.keyZ ?? LIGHT_DEFAULTS.keyZ, min: -10, max: 10, step: 0.1, label: 'Z' }
  }),
  Fill: folder({
    fillIntensity: {
      value: saved.fillIntensity ?? LIGHT_DEFAULTS.fillIntensity,
      min: 0,
      max: 20,
      step: 0.1,
      label: 'Intensity'
    },
    fillColor: { value: savedFillColor, label: 'Color' },
    fillX: { value: saved.fillX ?? LIGHT_DEFAULTS.fillX, min: -10, max: 10, step: 0.1, label: 'X' },
    fillY: { value: saved.fillY ?? LIGHT_DEFAULTS.fillY, min: -10, max: 10, step: 0.1, label: 'Y' },
    fillZ: { value: saved.fillZ ?? LIGHT_DEFAULTS.fillZ, min: -10, max: 10, step: 0.1, label: 'Z' }
  })
}

interface Piece {
  id: string
  /** Which slot in the row — the project's index. */
  slot: number
  node: ReactNode
  /** The size the piece was *built* at — already baked into `node`. Kept
   *  because the narrow set below is an absolute size too, and the model is
   *  never rebuilt per breakpoint: turning one into the other needs the
   *  number it is being measured against. See `exhibitFor` in products.tsx. */
  scale: number
  /** Degrees the piece is turned to face inside its case. */
  turn: number
  /** Multiplies `envMapIntensity` on the piece's own materials. See the note
   *  on `lift` in products.tsx: one exposure now lights the whole room, so a
   *  product that used to carry its own carries a lift instead. */
  lift: number
  /** Where the piece sits relative to the dead centre of its slot, in
   *  viewport heights: `offsetX` across the screen, `offsetY` up it. See the
   *  note on them in products.tsx. */
  offsetX: number
  offsetY: number
  /** The same four, for when the room is narrow — see the note on
   *  `ProductSpec['narrow']` in products.tsx. `Row` picks this set or the
   *  plain one above per frame; nothing here forces the piece to rebuild. */
  narrowScale: number
  narrowTurn: number
  narrowOffsetX: number
  narrowOffsetY: number
  floatIntensity: number
  /** `Float`'s rotational wobble. Zero everywhere — see products.tsx. */
  floatRotation: number
  floatSpeed: number
}

interface Gallery3DProps {
  pieces: Piece[]
  /** Live scroll position — read every frame, never through a render. Slot
   *  `n` is centred when this reads `n`. */
  progressRef: MutableRefObject<number>
  /** Which slot is being looked at — see `onFocus` in Gallery.tsx, which is
   *  where this actually matters; the row itself no longer treats the
   *  focused piece any differently from its neighbours. */
  focus: number
  /** How many projects the row loops through. */
  count: number
  layout: RoomLayout
  /** Whether the label is stacked under the case rather than beside it —
   *  see the note on it in ProductStage.tsx. `Row` reads each piece's
   *  `narrow*` fields instead of its plain ones while this is true. */
  narrow: boolean
  /** Hands the tuning panel's room settings back to `Gallery.tsx`, which owns
   *  the room's proportions and applies them to the labels as well. */
  onTune?: (tuning: RoomTuning) => void
  /** The old-film experiment — see `noir` in `Gallery.tsx`. Desaturates the
   *  render and steps the whole scene to a real 12fps instead of the
   *  display's own. */
  noir?: boolean
}

/** 1 world unit = the height of the window. Where the camera *stands* is
 *  written every frame in `Row`, because it walks with the scroll. */
function RoomLens() {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)

  useEffect(() => {
    camera.zoom = size.height
    camera.updateProjectionMatrix()
  }, [camera, size.height])

  return null
}

/**
 * The row, slid by the scroll.
 *
 * Each case is placed from its *shortest signed distance* to where you are
 * standing, exactly as the copy panels are — not from its index with the whole
 * row translated underneath. The row is a loop: walking past the last project
 * walks into the first, and under absolute indices that case is eleven steps
 * away rather than one, so it is nowhere near the screen at the moment you
 * are supposed to be arriving at it.
 */
interface RowExtra {
  /** Distance between two slots, in world units. */
  step: number
  /** How far right the whole row stands, in world units — `layout.shiftW`
   *  converted by the same aspect ratio the step is. */
  shift: number
  /** Every per-object control's live value, by namespaced key
   *  (`OBJECT_SCHEMA`), read once per frame rather than through a render. */
  objectControls: Record<string, number>
}

function Row({
  pieces,
  progressRef,
  count,
  layout,
  narrow,
  step,
  shift,
  objectControls
}: Gallery3DProps & RowExtra) {
  const slots = useRef(new Map<string, Group>())
  const turns = useRef(new Map<string, Group>())
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const progress = progressRef.current

    // ---- where you are standing ----
    // The camera walks around the room as you scroll. Everything below is
    // measured from this one angle, in the same frame, so the room can never
    // be laid out for a viewpoint the camera is not at.
    const azimuth = MathUtils.degToRad(AZIMUTH + progress * ORBIT)
    const elevation = MathUtils.degToRad(ELEVATION)
    const flat = CAM_RADIUS * Math.cos(elevation)
    camera.position.set(
      flat * Math.sin(azimuth),
      CAM_RADIUS * Math.sin(elevation) + layout.caseY,
      flat * Math.cos(azimuth)
    )
    camera.lookAt(0, layout.caseY, 0)

    // The direction that is horizontal *on screen* from here: the camera's own
    // right vector, which for a camera orbiting Y and aimed at the axis is
    // (cos A, 0, −sin A) whatever the elevation. Unit length, and the
    // projection is orthographic, so a case moved `d` along it moves exactly
    // `d` world units across the frame — which is what lets the row and the
    // DOM copy beside it share one step.
    //
    // It has to be recomputed here rather than baked in as a constant: the
    // camera is walking, so the direction that means "to the right" is walking
    // with it. Laid out on a fixed axis the row swings off the screen the
    // moment the orbit starts.
    const rightX = Math.cos(azimuth)
    const rightZ = -Math.sin(azimuth)

    for (const piece of pieces) {
      const group = slots.current.get(piece.id)
      if (!group) continue
      let delta = piece.slot - progress
      delta = delta - Math.round(delta / count) * count

      /* The piece is bolted to the world.

         Written as "where the camera is now, plus the angle this piece should
         rest at, plus how far away from it you are" — which works out to a
         value that does not change as you scroll, because the camera's own
         term cancels the delta's. So it never turns; all of its apparent
         rotation is the orbit. Expressing it this way rather than as a fixed
         world angle is what keeps it right across the wrap at the end of the
         row, where the slot index and the scroll position are a whole lap
         apart. */
      const turn = turns.current.get(piece.id)
      if (turn) {
        const rest = narrow
          ? (objectControls[narrowTurnKey(piece.id)] ?? piece.narrowTurn * REST_TURN)
          : (objectControls[turnKey(piece.id)] ?? piece.turn * REST_TURN)
        turn.rotation.y = azimuth + MathUtils.degToRad(rest + delta * ORBIT)
      }

      /* Three things move a piece horizontally and they are all one number:
         how far along the row it is, how far right the whole stage is set
         (`shift` — see `shiftW` in room.ts), and its own X nudge. All three
         are distances *across the screen*, so all three are multiplied into
         the camera's right vector together. Vertical needs no such treatment:
         world Y is up on screen at any azimuth. */
      const x = narrow
        ? (objectControls[narrowXKey(piece.id)] ?? piece.narrowOffsetX)
        : (objectControls[xKey(piece.id)] ?? piece.offsetX)
      const y = narrow
        ? (objectControls[narrowYKey(piece.id)] ?? piece.narrowOffsetY)
        : (objectControls[yKey(piece.id)] ?? piece.offsetY)
      const along = delta * step + shift + x
      const up = layout.caseY + y
      group.position.set(along * rightX, up, along * rightZ)
    }
  })
  return (
    <group>
      {pieces.map((piece) => (
        <group
          key={piece.id}
          ref={(el) => {
            if (el) slots.current.set(piece.id, el)
            else slots.current.delete(piece.id)
          }}
        >
          <Vitrine height={layout.caseH} showCase={SHOW_CASE}>
            <Lift intensity={piece.lift}>
              <group
                scale={
                  PIECE_FIT *
                  (narrow
                    ? // The model is only ever built once, at the desktop
                      // scale (see `exhibitFor`), so the narrow multiplier
                      // has to be expressed as a ratio against it rather
                      // than as its own absolute size.
                      (objectControls[narrowScaleKey(piece.id)] ?? piece.narrowScale / piece.scale)
                    : (objectControls[scaleKey(piece.id)] ?? 1))
                }
                ref={(el) => {
                  if (el) turns.current.set(piece.id, el)
                  else turns.current.delete(piece.id)
                }}
              >
                {/* No arrival animation — a piece in a case does not rise
                    and fade as you walk up to it, it is simply there. All
                    of its apparent motion is the orbit, in the loop above. */}
                <Float
                  speed={piece.floatSpeed}
                  floatIntensity={piece.floatIntensity}
                  rotationIntensity={piece.floatRotation}
                >
                  <Suspense fallback={null}>{piece.node}</Suspense>
                </Float>
              </group>
            </Lift>
          </Vitrine>
        </group>
      ))}
    </group>
  )
}

/**
 * Dresses a piece for the room: its brightness, and its shadow.
 *
 * The room has one exposure and one environment, because it is one scene —
 * and the products were tuned back when each had its own canvas and could ask
 * for whatever exposure suited it. `envMapIntensity` is the one brightness
 * control that is per *material*, so it is what carries that tuning now.
 *
 * `castShadow` has to be set the same way. It is a property of the *mesh*, and
 * these pieces come from a dozen places — a glTF loader, a sprite billboard,
 * eight hand-built components — none of which know they are going to be stood
 * on a plinth. Setting it here is what puts every one of them on the cap
 * below it without editing all twelve.
 *
 * Re-run on every commit rather than once: a glTF streams in after this
 * subtree first mounts, and anything applied before the meshes exist is
 * applied to nothing.
 */
function Lift({ intensity, children }: { intensity: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useEffect(() => {
    ref.current?.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      const mat = mesh.material as MeshStandardMaterial
      if (mat?.isMeshStandardMaterial) mat.envMapIntensity = intensity
    })
  })
  return <group ref={ref}>{children}</group>
}

export default function Gallery3D(props: Gallery3DProps) {
  const { onTune } = props
  // Root-level — no folder name — so this sits at the top of the panel
  // rather than inside Objects, Layout, or Lighting: one button that covers
  // all three, plus whatever any other piece has registered into
  // `EXTRA_CONTROLS`, rather than one per section.
  useControls({
    'Copy for source': button(() => {
      const source = fullTuningSource()
      // Logged as well as copied, always: a clipboard write can be refused
      // and there is no useful way to tell the panel about it.
      console.log(source)
      void navigator.clipboard?.writeText(source).catch(() => {})
    })
  })
  // One folder per project (see `OBJECT_SCHEMA`) — angle, size and position,
  // each piece on its own.
  const objectControls = useControls('Objects', OBJECT_SCHEMA) as unknown as Record<string, number>
  const {
    spacing,
    shift,
    narrowAt,
    panelW,
    panelH,
    narrowSpacing,
    narrowCaseH,
    narrowCaseY,
    narrowPanelMaxCh,
    narrowPanelH,
    touchPerUnit,
    patternParallax,
    patternDrift
  } = useControls('Layout', LAYOUT_SCHEMA) as unknown as RoomTuning
  const {
    envIntensity,
    ambientIntensity,
    keyIntensity,
    keyX,
    keyY,
    keyZ,
    fillIntensity,
    fillColor,
    fillX,
    fillY,
    fillZ
  } = useControls('Lighting', LIGHT_SCHEMA) as unknown as {
    envIntensity: number
    ambientIntensity: number
    keyIntensity: number
    keyX: number
    keyY: number
    keyZ: number
    fillIntensity: number
    fillColor: string
    fillX: number
    fillY: number
    fillZ: number
  }

  useEffect(() => {
    Object.assign(live, objectControls, {
      spacing,
      shift,
      narrowAt,
      panelW,
      panelH,
      narrowSpacing,
      narrowCaseH,
      narrowCaseY,
      narrowPanelMaxCh,
      narrowPanelH,
      touchPerUnit,
      patternParallax,
      patternDrift,
      envIntensity,
      ambientIntensity,
      keyIntensity,
      keyX,
      keyY,
      keyZ,
      fillIntensity,
      fillX,
      fillY,
      fillZ
    })
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(live))
    } catch {
      // See readStore: an unavailable store means the panel does not persist,
      // which is not a reason for the gallery to stop working.
    }
  }, [
    objectControls,
    spacing,
    shift,
    narrowAt,
    panelW,
    panelH,
    narrowSpacing,
    narrowCaseH,
    narrowCaseY,
    narrowPanelMaxCh,
    narrowPanelH,
    touchPerUnit,
    patternParallax,
    patternDrift,
    envIntensity,
    ambientIntensity,
    keyIntensity,
    keyX,
    keyY,
    keyZ,
    fillIntensity,
    fillX,
    fillY,
    fillZ
  ])

  useEffect(() => {
    liveFillColor = fillColor
    try {
      window.localStorage.setItem(COLOR_STORE_KEY, fillColor)
    } catch {
      // See readStore.
    }
  }, [fillColor])

  // Up to Gallery.tsx, which owns the room's proportions and has to move the
  // wall labels by the same amounts.
  useEffect(() => {
    onTune?.({
      spacing,
      shift,
      narrowAt,
      panelW,
      panelH,
      narrowSpacing,
      narrowCaseH,
      narrowCaseY,
      narrowPanelMaxCh,
      narrowPanelH,
      touchPerUnit,
      patternParallax,
      patternDrift
    })
  }, [
    onTune,
    spacing,
    shift,
    narrowAt,
    panelW,
    panelH,
    narrowSpacing,
    narrowCaseH,
    narrowCaseY,
    narrowPanelMaxCh,
    narrowPanelH,
    touchPerUnit,
    patternParallax,
    patternDrift
  ])

  return (
    <>
      {/* Development only. Everything it sets has a permanent home in
          products.tsx and room.ts, and a visitor arriving at a portfolio
          behind a debug panel is not the impression to make.

          Solid elevation colors, against Leva's own translucent default —
          this sits over the page while it's being dragged, and seeing the
          copy through it makes the sliders hard to read and easy to
          mis-click.

          Portalled straight to `document.body`, not rendered in place: Leva
          renders itself `position: fixed`, but *in place* that fixed panel
          is still a descendant of `.gl-room`, which sets its own `z-index`
          and so opens its own stacking context — trapping the panel inside
          it no matter how high Leva's own z-index goes. The wall label
          (`.gl-panel`, a sibling of `.gl-room` one level up) sits in front
          of that whole stacking context, so the panel was painting *under*
          the label and catching none of the drag before it reached the
          stage. Escaping to `body` puts it in the root stacking context,
          above everything on the page, which is what a floating dev panel
          is supposed to be. */}
      {typeof document !== 'undefined'
        ? createPortal(
            <Leva
              collapsed
              hidden={!import.meta.env.DEV}
              titleBar={{ title: 'Exhibit tuning' }}
              theme={{
                colors: {
                  elevation1: '#161616',
                  elevation2: '#1d1d1d',
                  elevation3: '#292929'
                },
                // Wider than Leva's 280px default: Adam's controls sit four
                // folders deep (Objects › Mr. Takahashi › Face › ‹group›),
                // and each level's indent eats into the label column —
                // narrow enough at the default width that every label past
                // the first couple of characters was truncating to "…".
                //
                // Capped against the viewport, not just widened: the panel is
                // `position: fixed; right: 10px`, so a bare 420px pushed the
                // whole thing — collapse toggle included — off the left edge
                // of anything narrower than about 440px, which on a phone
                // meant tapping the title bar tapped empty page.
                sizes: {
                  rootWidth: 'min(420px, calc(100vw - 20px))'
                }
              }}
            />,
            document.body
          )
        : null}
      <Canvas
        className="gl-canvas"
        orthographic
        shadows
        dpr={[1, 1.5]}
        // Everything is within a unit of the origin and the camera is ten units
        // out, so the depth range is pulled tight around the row — the same
        // reason the perspective stage did it: flat decals on these products sit
        // coplanar with the surfaces under them and strobe otherwise.
        camera={{ position: [0, 0, 10], zoom: 1, near: 1, far: 40 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace
        }}
        // Grayscale is a compositor filter on the canvas itself rather than
        // touching any material: the renderer still lights and shades in full
        // colour, it is only ever desaturated on the way to the screen, which
        // is one line instead of walking every product's materials. The row
        // itself keeps tracking the scroll at the display's own framerate in
        // noir too — see the note on `noir` in Gallery.tsx for why stepping
        // that specifically, rather than the room's ambient look, is the one
        // thing this experiment does not do.
        style={{
          background: 'transparent',
          filter: props.noir ? 'grayscale(1) contrast(1.08) brightness(0.96)' : undefined
        }}
      >
        <RoomLens />
        <Exposure value={0.1} />

        {/* Blender's lights do not survive a glTF export, so the environment
          does most of the work on a gloss object — but an environment alone
          casts nothing, and a room with no shadow in it is a page with
          objects printed on it. The key is a real gallery light: high, in
          front, slightly to the right, and the only caster.

          Its shadow camera is pulled tight around the row. The default one
          spans a hundred units and this whole room is about two units tall, so
          left at the default the entire scene falls inside a couple of texels
          and every shadow arrives as a grey smear. */}
        <StudioEnvironment intensity={envIntensity} />
        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          castShadow
          /* Fixed, while the camera walks — and, unlike the gallery-photo
           rig this replaced, tuned against a screenshot of Adam's own
           Blender viewport rather than derived from a physical downlight,
           so its position is no longer doing the "stays lit across the
           orbit" work described in git history for the old numbers. Live
           values in the "Lighting" Leva panel; see `LIGHT_SCHEMA` above. */
          position={[keyX, keyY, keyZ]}
          intensity={keyIntensity}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={12}
          shadow-camera-left={-2.4}
          shadow-camera-right={2.4}
          shadow-camera-top={2.4}
          shadow-camera-bottom={-2.4}
          shadow-bias={-0.0008}
          shadow-normalBias={0.012}
        />
        {/* Fill, from the other side, so the turned-away faces of the
          plinths are not dead. No shadow: a second caster gives every object
          two shadows, which reads as a rendering error rather than as light. */}
        <directionalLight position={[fillX, fillY, fillZ]} intensity={fillIntensity} color={fillColor} />

        {/* Exactly under the plinths, from the vitrine's own proportions — a
          floor guessed at with a magic number is a floor the cases hover
          above, which is precisely what a shadow starting half a pedestal
          away from its object looks like. */}
        <Floor y={props.layout.caseY - (props.layout.caseH * VITRINE_TOTAL) / 2} />
        <RowWithStep {...props} objectControls={objectControls} />
      </Canvas>
    </>
  )
}

/**
 * The step and the stage shift in world units. Both arrive as fractions of a
 * fixed reference width (`REF_ASPECT`, in room.ts) rather than the *live*
 * window width — converted at a constant ratio instead of the live one, so
 * the row's spacing and the case's distance from centre hold still as the
 * window is resized. Only the camera's own zoom (`RoomLens`, tied to
 * `size.height`) still answers to the window at all, which is why the room
 * scales with height but not with width: one world unit is one viewport
 * height, and now the only axis anything here reads live.
 */
function RowWithStep(props: Gallery3DProps & Omit<RowExtra, 'step' | 'shift'>) {
  const { stepW, shiftW } = props.layout
  return <Row {...props} step={stepW * REF_ASPECT} shift={shiftW * REF_ASPECT} />
}

/**
 * The ground the row stands on: nothing but the shadow it receives.
 *
 * `shadowMaterial` draws only what is shadowed and is fully transparent
 * everywhere else, so the page's own paper shows through and there is no grey
 * plane sitting under the parchment. It is what turns three floating boxes
 * into three plinths standing on a floor.
 */
function Floor({ y }: { y: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <shadowMaterial transparent opacity={0.24} color="#14120e" />
    </mesh>
  )
}

function Exposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = value
  }, [gl, value])
  return null
}

