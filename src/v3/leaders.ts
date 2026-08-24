import type { Frame } from './model'
import type { Note } from './notes'

/* ---- the leaders ----

   The lines that fan out of the subject and name its parts. A note can carry
   its own two points — where the line touches and where the text lands, both
   as fractions of the subject's box — and one that carries neither falls into
   the next slot of the fan traced off the Figma. See `notes.ts`, and press P
   on a project screen to place them by hand. */

/** Where a leader leaves its subject and where its text ends up, for a note
 *  that does not say.
 *
 *  `at` is a fraction of the subject's box, `elbow` the corner's offset from
 *  that tip, `run` how far the horizontal reaches, and `dir` which way it
 *  travels. The three are traced off the Figma's takahashi frame and reused
 *  for every subject — a still gets the same arms the model does. */
const SLOTS = [
  { at: [0.94, 0.08], elbow: [53, -55], run: 119, dir: 1 },
  { at: [0.0, 0.285], elbow: [-34, -29], run: 146, dir: -1 },
  { at: [0.02, 0.764], elbow: [-47, 54], run: 141, dir: -1 }
] as const

/** A fourth unpinned note starts the fan again a line lower, and so on down.
 *  Three was the Figma and is still the shape of the thing; a picture with
 *  eight things worth naming should be pinned, and this is what it gets in
 *  the meantime. */
const TIER = 66

/** How far a pinned leader runs horizontally before its text, and the least
 *  it will settle for when the text has been dragged in close. */
const RUN = { full: 104, least: 26 }

/** How far in from the frame's edges a leader's text may land — clear of the
 *  left column on one side and the rail on the other. A wide still pushes its
 *  elbows outward, and without this the "made in" line would be set on top of
 *  the project overview. */
const GUTTER = { left: 500, right: 1450 }

/* ---- the space the lines are drawn in ----

   On the wide layout it is the 1920×1080 frame, and the stage is exactly that
   box, so one SVG user unit is one `--px` and `preserveAspectRatio="none"`
   maps them one to one.

   Narrow, the stage is a box of its own — the width of the window and about
   as tall — and drawing a 1920×1080 viewBox onto it with `none` scales x and
   y by different amounts. Text does not survive that: at 390 by 409 the two
   scales differ by nearly two to one, which is a row of labels squashed flat
   sideways. It is *the* reason the lines were switched off on a phone, and
   the fix is not to reach for a font size — it is to give the canvas a
   viewBox with the stage's own proportions.

   Measured in frame units, so one user unit stays one `--px` on both layouts.
   Which means every fixed offset in this file, every radius in the
   stylesheet, and `18px * var(--type-k)` all keep rendering at the size they
   were drawn at, with nothing overridden anywhere. */
export interface Space {
  /** The canvas's coordinate box, in frame units. */
  w: number
  h: number
  narrow: boolean
}

export const FRAME_SPACE: Space = { w: 1920, h: 1080, narrow: false }

/** The subject's box on a narrow stage, in fractions of it.
 *
 *  Not the model's true bounding box — a *target*. The subject fills most of
 *  the stage there, and tips laid on the edges of what it actually occupies
 *  land in the air beside a face rather than on it. A little inside is what
 *  a leader is for. */
const NARROW_SUBJECT = { w: 0.56, h: 0.7 }

/** Narrow, there is no left column and no rail beside the stage — the only
 *  thing keeping a label on the page is the page. */
const gutterFor = (space: Space) =>
  space.narrow ? { left: space.w * 0.07, right: space.w * 0.93 } : GUTTER

const centred = (space: Space, w: number, h: number): Box => ({
  x: (space.w - w) / 2,
  y: (space.h - h) / 2,
  w,
  h
})

/** The subject's box in frame coordinates. The model's is measured off the
 *  Figma; a still's is wherever the media actually lands, which is the same
 *  sum the CSS makes so the two can never disagree. */
export const MODEL_BOX = { x: 769, y: 269, w: 403, h: 529 }
const MEDIA_MAX = { w: 780, h: 730 }

export const mediaBox = (aspect: number) => {
  const w = Math.min(MEDIA_MAX.w, MEDIA_MAX.h * aspect)
  const h = w / aspect
  return { x: 960 - w / 2, y: 540 - h / 2, w, h }
}

export type Box = { x: number; y: number; w: number; h: number }

export const boxOf = (frame: Frame, space: Space = FRAME_SPACE): Box => {
  if (!space.narrow) return frame.kind === 'flat' ? mediaBox(frame.aspect) : MODEL_BOX
  if (frame.kind !== 'flat') return centred(space, space.w * NARROW_SUBJECT.w, space.h * NARROW_SUBJECT.h)
  /* A picture is `object-fit: contain` in the stage on this layout, so where
     it actually lands is the same sum the browser is doing — whichever of the
     two dimensions runs out first. */
  const stage = space.w / space.h
  const wide = frame.aspect >= stage
  return centred(
    space,
    wide ? space.w : space.h * frame.aspect,
    wide ? space.w / frame.aspect : space.h
  )
}

/** A fraction of the subject's box, in frame coordinates. */
export const pointIn = (box: Box, at: readonly [number, number]) => [box.x + at[0] * box.w, box.y + at[1] * box.h]

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/* A note that names its own two points. Everything else falls out of them:
   the text sits over the horizontal run, so which side the label was dragged
   to is which way the elbow turns and which end the type is set from. */
const pinned = (note: Note, box: Box, gutter: { left: number; right: number }) => {
  const tip = pointIn(box, note.at!)
  const text = pointIn(box, note.to!)
  const end = clamp(text[0], gutter.left, gutter.right)
  const dir = end >= tip[0] ? 1 : -1
  const run = clamp(Math.abs(end - tip[0]) * 0.55, RUN.least, RUN.full)
  return {
    ...note,
    tip,
    elbow: [end - dir * run, text[1]],
    end,
    anchor: dir === 1 ? ('end' as const) : ('start' as const)
  }
}

const slotted = (note: Note, index: number, box: Box, gutter: { left: number; right: number }) => {
  const slot = SLOTS[index % SLOTS.length]
  const tier = Math.floor(index / SLOTS.length) * TIER
  const seat = pointIn(box, slot.at)
  // The whole arm drops a line, tip included — two lines leaving the same
  // point is one line with two labels. The tip stays on the picture, which is
  // what the clamp is for on the slots that already sit near the bottom.
  const tip = [seat[0], Math.min(seat[1] + tier, box.y + box.h)]
  const elbow = [tip[0] + slot.elbow[0], tip[1] + slot.elbow[1]]
  const room = slot.dir === 1 ? gutter.right - elbow[0] : elbow[0] - gutter.left
  const run = Math.max(40, Math.min(slot.run, room))
  return {
    ...note,
    tip,
    elbow,
    end: elbow[0] + slot.dir * run,
    anchor: slot.dir === 1 ? ('end' as const) : ('start' as const)
  }
}

export const leadersFor = (notes: Note[], box: Box, space: Space = FRAME_SPACE) => {
  const gutter = gutterFor(space)
  return notes.map((note, i) => (note.at && note.to ? pinned(note, box, gutter) : slotted(note, i, box, gutter)))
}

