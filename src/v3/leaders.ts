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

export const boxOf = (frame: Frame): Box => (frame.kind === 'flat' ? mediaBox(frame.aspect) : MODEL_BOX)

/** A fraction of the subject's box, in frame coordinates. */
export const pointIn = (box: Box, at: readonly [number, number]) => [box.x + at[0] * box.w, box.y + at[1] * box.h]

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/* A note that names its own two points. Everything else falls out of them:
   the text sits over the horizontal run, so which side the label was dragged
   to is which way the elbow turns and which end the type is set from. */
const pinned = (note: Note, box: Box) => {
  const tip = pointIn(box, note.at!)
  const text = pointIn(box, note.to!)
  const end = clamp(text[0], GUTTER.left, GUTTER.right)
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

const slotted = (note: Note, index: number, box: Box) => {
  const slot = SLOTS[index % SLOTS.length]
  const tier = Math.floor(index / SLOTS.length) * TIER
  const seat = pointIn(box, slot.at)
  // The whole arm drops a line, tip included — two lines leaving the same
  // point is one line with two labels. The tip stays on the picture, which is
  // what the clamp is for on the slots that already sit near the bottom.
  const tip = [seat[0], Math.min(seat[1] + tier, box.y + box.h)]
  const elbow = [tip[0] + slot.elbow[0], tip[1] + slot.elbow[1]]
  const room = slot.dir === 1 ? GUTTER.right - elbow[0] : elbow[0] - GUTTER.left
  const run = Math.max(40, Math.min(slot.run, room))
  return {
    ...note,
    tip,
    elbow,
    end: elbow[0] + slot.dir * run,
    anchor: slot.dir === 1 ? ('end' as const) : ('start' as const)
  }
}

export const leadersFor = (notes: Note[], box: Box) =>
  notes.map((note, i) => (note.at && note.to ? pinned(note, box) : slotted(note, i, box)))

