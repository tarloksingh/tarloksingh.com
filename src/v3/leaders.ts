import type { Frame } from './model'
import type { Note } from './notes'

/* ---- the leaders ----

   The lines that fan out of the subject and name its parts. A note can carry
   its own two points — where the line touches and where the text lands, both
   as fractions of the subject's box — and one that carries neither falls into
   the next slot of the fan traced off the Figma. See `notes.ts`, and press P
   on a project screen to place them by hand. */

/* ---- a note is a card now ----

   It used to be a key and a value stacked on a horizontal rule — "tool" in
   accent over "blender" in white — with the line elbowing into the rule's far
   end. Two words was all it could ever hold: a third turned the rule into a
   ruler, and a sentence was out of the question, because SVG text does not
   wrap and there was nothing for it to wrap inside.

   So the label is a box, and the line runs straight into the corner of it.
   Which corner is the one *facing* the subject, and the box grows away from
   there — up and to the left of a tip on its lower right, and so on round. It
   is the one anchoring rule that needs no measurement: the corner the line has
   to reach is a corner we placed, so the geometry here stays a pure function
   of two points and the line never has to wait for a layout pass to know where
   it ends. The card's own size is left to the text, inside a `max-width`. */

/** The card, in frame units.
 *
 *  `w` is the widest it may be set and `min` the narrowest it will be squeezed
 *  to against a gutter. `h` is not a height — the card's height is its text's
 *  — but the room *reserved* for one, and it is deliberately far more than any
 *  card needs: `foreignObject` clips to its own rectangle, so anything past
 *  this is cut off mid-sentence with the border still drawn around what is
 *  left, which looks like a wrapping bug and is not one. It has to cover the
 *  worst case, and the worst case is a small window, where type sits on its
 *  rem floor and is half again the size in frame units that it is at the cap.
 *  Reserving it costs nothing: the seat inside is `pointer-events: none` and
 *  the card is pinned to a corner of it, so the extra never moves anything.
 *
 *  `room` is the smaller number the vertical flip is decided against — what a
 *  card usually wants rather than what it may take. `glow` is the slack left
 *  around the card on every side, for the same clipping reason. */
export const CARD = { w: 340, min: 168, h: 340, room: 130, glow: 34 }

/** Where a leader leaves its subject and where its card is seated, for a note
 *  that does not say.
 *
 *  `at` is a fraction of the subject's box and `seat` the corner's offset from
 *  that tip, in frame units. Traced off the Figma's takahashi frame and reused
 *  for every subject — a still gets the same arms the model does. */
const SLOTS = [
  { at: [0.94, 0.08], seat: [172, -60] },
  { at: [0.0, 0.285], seat: [-180, -34] },
  { at: [0.02, 0.764], seat: [-188, 50] }
] as const

/** A fourth unpinned note starts the fan again a line lower, and so on down.
 *  Three was the Figma and is still the shape of the thing; a picture with
 *  eight things worth naming should be pinned, and this is what it gets in
 *  the meantime. */
const TIER = 66

/** How far in from the frame's edges a card may land — clear of the left
 *  column on one side and the rail on the other. A wide still pushes its
 *  seats outward, and without this the "made in" card would be set on top of
 *  the project overview.
 *
 *  A card *grows* to its gutter where a line of type merely ended at one, so
 *  the right-hand number matters far more than it used to: at 1450 every card
 *  on that side came out three lines deep in a column half the width it
 *  should be. It is out at the rail now.
 *
 *  The left is not free the same way and was already right. Both columns are
 *  laid out in `--type`, which has a rem floor, so they are *widest in frame
 *  units on the smallest window* — measured there, the fold list reaches 486
 *  and the rail starts at 1710. These clear both with a little to spare, and
 *  moving either one in the hope of a wider card puts a sentence over the
 *  project overview. */
const GUTTER = { left: 500, right: 1660 }

/** And how far from the top and bottom of the canvas — which on the wide
 *  layout is the whole window, so the top has a header and a music deck across
 *  it and the bottom has the compass and the footer. A two-word label cleared
 *  those by being small; a card has to be told. Narrow, the canvas is the
 *  stage alone and neither is inside it. */
const edgeFor = (space: Space) => (space.narrow ? { top: 26, bottom: 26 } : { top: 172, bottom: 108 })

/** How far clear of its own tip a card is pushed when it has no choice but to
 *  reach back across it. */
const CLEAR = 34

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

type Gutter = { left: number; right: number }

/* Two points in, a card out. `seat` is where the line meets the box; `sx` and
   `sy` are which way the box grows from there, which is always *away* from the
   tip — a card laid over its own leader is a card pointing at itself.

   Both directions can be overruled by the room actually available. A seat
   dragged hard against the rail has nothing to its right whichever side of the
   subject it started on, and a card that hangs off the frame is worse than one
   on the wrong side of its own corner. */
const seated = (note: Note, tip: number[], want: number[], gutter: Gutter, space: Space) => {
  const most = space.narrow ? Math.min(CARD.w, space.w * 0.6) : CARD.w
  const least = Math.min(CARD.min, most)
  const edge = edgeFor(space)
  const floor = space.h - edge.bottom

  const anchor = [clamp(want[0], gutter.left, gutter.right), clamp(want[1], edge.top, floor)]

  const side = { left: anchor[0] - gutter.left, right: gutter.right - anchor[0] }
  let sx = anchor[0] < tip[0] ? -1 : 1
  if (sx === 1 && side.right < least && side.left > side.right) sx = -1
  else if (sx === -1 && side.left < least && side.right > side.left) sx = 1

  const room = { up: anchor[1] - edge.top, down: floor - anchor[1] }
  let sy = anchor[1] <= tip[1] ? -1 : 1
  if (sy === 1 && room.down < CARD.room && room.up > room.down) sy = -1
  else if (sy === -1 && room.up < CARD.room && room.down > room.up) sy = 1

  /** The widest this card may be set here, which is whatever is left between
   *  its corner and the gutter it is growing towards. */
  const w = clamp(sx === 1 ? side.right : side.left, least, most)

  /* A card must never be laid over the spot it is pointing at. On a wide frame
     there is room beside the subject and this never fires; on a phone stage
     there is not, the card is forced back across the middle by the flip above,
     and it arrives on top of its own tip — a label covering the thing it
     names, with its leader disappearing under it.

     Dropping it clear vertically is the move that always has somewhere to go,
     because a narrow stage is the one that is taller than it is wide. The
     anchor moves; the line simply follows it. */
  const across = sx === 1 ? tip[0] > anchor[0] - CLEAR && tip[0] < anchor[0] + w : tip[0] < anchor[0] + CLEAR && tip[0] > anchor[0] - w
  if (across) {
    const held = clamp(tip[1] + sy * CLEAR, edge.top, floor)
    // Only if the side it was pushed to is the side it actually landed on —
    // against the top or the bottom of the canvas the clamp wins and the card
    // would be dragged back over the tip rather than away from it.
    if ((held - tip[1]) * sy > 0) anchor[1] = held
  }

  /* And the card itself has to stay inside those same two lines, not just the
     corner it hangs off. This is the one place a height is guessed at, because
     the only thing that knows the real one is the browser after it has laid
     the sentence out — `CARD.room` is what a card of two or three lines
     usually comes to, and the guard is what keeps a `--warn`-lit card off the
     deck in the corner of the header. */
  const head = sy === -1 ? anchor[1] - CARD.room : anchor[1]
  const foot = sy === -1 ? anchor[1] : anchor[1] + CARD.room
  if (head < edge.top) anchor[1] += edge.top - head
  else if (foot > floor) anchor[1] -= foot - floor

  return { ...note, tip, anchor, sx, sy, w }
}

const pinned = (note: Note, box: Box, gutter: Gutter, space: Space) =>
  seated(note, pointIn(box, note.at!), pointIn(box, note.to!), gutter, space)

const slotted = (note: Note, index: number, box: Box, gutter: Gutter, space: Space) => {
  const slot = SLOTS[index % SLOTS.length]
  const tier = Math.floor(index / SLOTS.length) * TIER
  const from = pointIn(box, slot.at)
  // The whole arm drops a line, tip included — two lines leaving the same
  // point is one line with two labels. The tip stays on the picture, which is
  // what the clamp is for on the slots that already sit near the bottom.
  const tip = [from[0], Math.min(from[1] + tier, box.y + box.h)]
  return seated(note, tip, [tip[0] + slot.seat[0], tip[1] + slot.seat[1]], gutter, space)
}

export const leadersFor = (notes: Note[], box: Box, space: Space = FRAME_SPACE) => {
  const gutter = gutterFor(space)
  return notes.map((note, i) =>
    note.at && note.to ? pinned(note, box, gutter, space) : slotted(note, i, box, gutter, space)
  )
}

