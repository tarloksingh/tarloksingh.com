/* Hand-drawn corner flourishes — one set per project.
 *
 * Each variant is a corner, drawn in a 100 x 100 box with the corner itself at
 * the origin. The other three are the same paths flipped, so a frame is one
 * drawing shown four times rather than four drawings that have to be kept in
 * agreement — see `ProjectFrame.tsx`.
 *
 * Every path is stroked, never filled, and every one is written so it starts
 * at the corner and travels outward. That is what makes them draw: the stroke
 * is dashed at `pathLength="1"` and the offset is walked from 1 to 0, so the
 * line arrives from the corner the way a pen would put it there. Written as
 * separate `d` strings rather than subpaths of one, so each stroke draws on
 * its own clock and the ornament assembles instead of unrolling.
 *
 * They are deliberately not symmetrical or exact. The frame is meant to read
 * as drawn around the piece by hand, and a perfect curve reads as a border.
 */
export interface FrameVariant {
  /** The strokes, corner-first. */
  strokes: string[]
  /** How wide the drawn box sits, as a fraction of the shorter viewport edge.
   *  Bigger numbers put the corners further out. */
  reach: number
}

export const FRAMES: FrameVariant[] = [
  // A single sweep with a curl closing each end.
  {
    reach: 1,
    strokes: [
      'M3 62 C3 30 30 3 62 3',
      'M62 3 C76 2 82 9 76 15 C70 20 62 14 69 8',
      'M3 62 C2 76 9 82 15 76 C20 70 14 62 8 69'
    ]
  },
  // Two lines running together, the inner one shorter — a ruled corner.
  {
    reach: 1.06,
    strokes: [
      'M2 70 C2 32 32 2 70 2',
      'M10 74 C10 40 40 10 74 10',
      'M70 2 C80 1 86 5 84 11'
    ]
  },
  // A ruled corner with a scallop set along each arm. The flourishes sit out
  // where the arms have room for them, not at the turn — two curls hung on
  // the corner itself just collide into a blot.
  {
    reach: 0.94,
    strokes: [
      'M4 80 L4 16 C4 9 9 4 16 4 L80 4',
      'M38 4 C44 11 53 11 59 4',
      'M4 38 C11 44 11 53 4 59'
    ]
  },
  // A wave, the way the reference frame runs its edges.
  {
    reach: 1.1,
    strokes: [
      'M2 78 C2 54 10 40 24 30 C38 20 52 14 78 12',
      'M78 12 C86 11 90 6 86 2',
      'M2 78 C1 86 6 90 10 86'
    ]
  },
  // Three short strokes fanning out of the corner — the sparse one.
  {
    reach: 0.9,
    strokes: [
      'M5 66 C5 34 34 5 66 5',
      'M20 44 C24 32 32 24 44 20',
      'M66 5 C74 3 79 6 78 12'
    ]
  },
  // A double curl, the most ornamental of the set.
  {
    reach: 1.02,
    strokes: [
      'M3 66 C3 32 32 3 66 3',
      'M66 3 C82 1 90 8 84 16 C79 22 70 17 76 10',
      'M3 66 C1 82 8 90 16 84 C22 79 17 70 10 76',
      'M26 40 C30 32 36 27 44 24'
    ]
  }
]

/** The frame for a project, by its index in the row. Wraps, so adding a
 *  project never leaves one without a frame. */
export const frameFor = (index: number) => FRAMES[((index % FRAMES.length) + FRAMES.length) % FRAMES.length]
