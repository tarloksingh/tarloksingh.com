/* Hand-drawn frames — one per project.
 *
 * A frame is two drawings shown six times: a **corner**, written for the
 * top-left in a 160 x 160 box with the corner itself at the origin and flipped
 * onto the other three; and a **crest**, written for the top edge in a
 * 160 x 56 box and flipped onto the bottom. Written once and mirrored so a
 * frame can never disagree with itself edge to edge — see `ProjectFrame.tsx`.
 *
 * The corners run a long way down each arm on purpose. Kept short they read as
 * crop marks, which is a printer's instruction rather than an ornament; it is
 * the length of the sweep and the fact that it is still going when it meets
 * the crest that makes the four of them read as one frame around the piece
 * rather than as four decorations near it.
 *
 * Every path is stroked, never filled, and every one starts at the corner (or,
 * for a crest, at its outer end) and travels outward. That is what makes them
 * draw: the stroke is dashed at `pathLength="1"` and the offset walks from 1
 * to 0, so the line arrives the way a pen would put it there. Separate `d`
 * strings rather than subpaths of one, so each stroke draws on its own clock
 * and the ornament assembles instead of unrolling.
 *
 * They are deliberately not exact. A perfect curve reads as a border.
 */
export interface FrameVariant {
  /** The corner, in a 160 x 160 box, corner at the origin. */
  corner: string[]
  /** The centre ornament for the top and bottom edges, in a 160 x 56 box. */
  crest: string[]
  /** How far the drawing sits from the piece, as a fraction of the default
   *  inset. Above 1 gives a wider variant the room it needs. */
  reach: number
}

export const FRAMES: FrameVariant[] = [
  // Long sweep, curled at both ends, with an inner line shadowing it.
  {
    reach: 1,
    corner: [
      'M8 152 C8 96 11 62 27 40 C43 18 78 8 152 8',
      'M152 8 C163 5 168 12 162 17 C156 21 149 13 156 9',
      'M8 152 C5 163 12 168 17 162 C21 156 13 149 9 156',
      'M22 148 C22 100 25 70 39 51 C53 32 84 22 148 22',
      'M44 62 C53 45 68 34 88 29'
    ],
    crest: [
      'M2 40 C36 40 58 34 74 20',
      'M158 40 C124 40 102 34 86 20',
      'M74 20 C78 8 82 8 86 20 C82 30 78 30 74 20',
      'M80 30 L80 44'
    ]
  },
  // Two lines running together the whole way — the ruled, quiet one.
  {
    reach: 1.05,
    corner: [
      'M4 156 C4 92 6 58 24 36 C42 14 80 5 156 5',
      'M16 158 C16 100 18 68 34 48 C50 28 86 17 158 17',
      'M156 5 C166 3 170 8 167 14',
      'M4 156 C2 166 8 170 13 167'
    ],
    crest: [
      'M4 34 C40 34 62 28 76 14',
      'M156 34 C120 34 98 28 84 14',
      'M76 14 C80 6 80 6 84 14'
    ]
  },
  // Ruled corner with a scallop set along each arm, where the arms have room
  // for one — two curls hung on the turn itself just collide into a blot.
  {
    reach: 0.96,
    corner: [
      'M5 158 L5 30 C5 14 14 5 30 5 L158 5',
      'M58 5 C68 16 84 16 94 5',
      'M5 58 C16 68 16 84 5 94',
      'M120 5 C126 12 136 12 142 5',
      'M5 120 C12 126 12 136 5 142'
    ],
    crest: [
      'M6 30 L62 30',
      'M154 30 L98 30',
      'M62 30 C70 30 74 22 80 12 C86 22 90 30 98 30'
    ]
  },
  // A wave running the length of each edge, the way the reference frame does.
  {
    reach: 1.12,
    corner: [
      'M6 158 C6 118 14 88 30 66 C46 44 76 24 110 16 C128 11 144 9 158 9',
      'M18 156 C20 122 30 96 48 76 C66 56 94 40 124 33',
      'M158 9 C167 7 171 12 168 18',
      'M6 158 C4 167 10 171 16 168'
    ],
    crest: [
      'M2 26 C26 26 44 32 60 40 C68 44 74 40 78 30',
      'M158 26 C134 26 116 32 100 40 C92 44 86 40 82 30',
      'M78 30 C79 22 81 22 82 30'
    ]
  },
  // The sparse one: a single unhurried line, and two flicks off it.
  {
    reach: 0.92,
    corner: [
      'M7 154 C7 100 10 66 26 44 C42 22 76 10 154 10',
      'M36 92 C40 68 52 52 72 42',
      'M154 10 C164 8 169 13 166 19',
      'M7 154 C5 164 11 169 16 166'
    ],
    crest: [
      'M8 32 C44 32 66 26 80 12',
      'M152 32 C116 32 94 26 80 12'
    ]
  },
  // The most ornamental: a double curl at each end and a leaf off the sweep.
  {
    reach: 1.04,
    corner: [
      'M6 150 C6 96 9 62 25 40 C41 18 76 7 150 7',
      'M150 7 C168 3 176 12 169 21 C163 28 152 22 159 14',
      'M6 150 C2 168 11 176 20 169 C27 163 21 152 13 159',
      'M50 58 C58 42 72 32 90 27 C82 38 76 50 74 62',
      'M20 146 C20 104 23 76 36 58'
    ],
    crest: [
      'M2 42 C34 42 56 36 72 22',
      'M158 42 C126 42 104 36 88 22',
      'M72 22 C76 10 84 10 88 22 C84 32 76 32 72 22',
      'M66 34 C72 40 88 40 94 34'
    ]
  }
]

/** The frame for a project, by its index in the row. Wraps, so adding a
 *  project never leaves one without a frame. */
export const frameFor = (index: number) =>
  FRAMES[((index % FRAMES.length) + FRAMES.length) % FRAMES.length]
