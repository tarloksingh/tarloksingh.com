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
  /** Where the lines that carry on along the edge sit, in corner units: the y
   *  of every arm that reaches the corner box's own edge rather than stopping
   *  inside it. One rail is one line run between this corner and the next
   *  ornament along — see `rail` in ProjectFrame.tsx, which draws them.
   *
   *  The rails are what make the frame a frame at any shape of window. The
   *  ornaments are square and fixed, so on a wide screen they cannot meet in
   *  the middle however large they are drawn; the rails are the part that
   *  stretches, and they are generated rather than authored because a run
   *  along an edge is the one piece of this drawing with nothing to say. */
  rails: number[]
  /** The y, in the crest's own units, of the line its two outer ends sit on.
   *  The crest is hung so that this lands on the rail — the ornament rises
   *  above the edge, it does not float over it. */
  crestArm: number
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
    ],
    rails: [8, 22],
    crestArm: 40
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
    ],
    rails: [5, 17],
    crestArm: 34
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
    ],
    rails: [5],
    crestArm: 30
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
    ],
    rails: [9],
    crestArm: 26
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
    ],
    rails: [10],
    crestArm: 32
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
    ],
    rails: [7],
    crestArm: 42
  }
]

/** The frame for a project, by its index in the row. Wraps, so adding a
 *  project never leaves one without a frame. */
export const frameFor = (index: number) =>
  FRAMES[((index % FRAMES.length) + FRAMES.length) % FRAMES.length]

/* The one around the name on the home page.
 *
 * Deliberately not in `FRAMES` — it belongs to no project and should never
 * come up in the row's rotation. It is the same machinery drawn to a
 * different brief: where a project's frame is a printer's rule, this is
 * growing. A stem sweeps the corner, leaves hang off it, a bloom opens where
 * it turns, and the crest is two runners meeting in a flower at the middle of
 * each edge. `ProjectFrame` draws it much more slowly than it draws those —
 * see `VINE_DRAW` in Home.tsx — because a thing that grows should not arrive
 * at the same speed as a thing that is ruled.
 *
 * `reach` is under 1 on purpose: this frame is drawn around a box a fraction
 * of the size of a project's exhibit, and at the ornament's usual share of it
 * the four corners meet in the middle with no run of stem left between them.
 */
export const VINE_FRAME: FrameVariant = {
  reach: 0.82,
  /* Written in the order it grows, which matters much more here than it does
     for a project's frame: this one is drawn over about a quarter of a minute
     (`VINE_DRAW`, Home.tsx) and most visitors will only ever see the first
     part of it, so the sequence has to make sense stopped at any point. The
     stem goes down first, then the ornaments come out along it working from
     the ends of the arms in toward the turn — which is the way growth
     actually travels, and it means a vine caught early is a young vine rather
     than a finished one with pieces missing. */
  corner: [
    // The stem, out of the bottom of one arm and away along the other.
    'M9 152 C9 100 13 64 31 42 C49 20 88 10 152 9',
    // A leaf at the far end of each arm. Everything below comes in mirrored
    // pairs about the diagonal, so the corner reads the same whichever of the
    // four turns it has been flipped onto.
    'M9 148 C22 147 31 139 30 128 C18 130 10 138 9 148',
    'M148 9 C147 22 139 31 128 30 C130 18 138 10 148 9',
    // A bloom sitting straight on the stem, one per arm.
    'M26 97 C33 98 37 103 34 109 C38 115 35 121 28 120 C23 124 17 122 17 116 C11 114 10 107 15 104 C15 98 20 96 26 97',
    'M21 106 C26 104 29 107 27 111 C24 114 19 112 21 106',
    'M97 26 C98 33 103 37 109 34 C115 38 121 35 120 28 C124 23 122 17 116 17 C114 11 107 10 104 15 C98 15 96 20 97 26',
    'M106 21 C104 26 107 29 111 27 C114 24 112 19 106 21',
    // A second leaf further in.
    'M13 86 C25 83 32 74 30 63 C19 67 12 76 13 86',
    'M86 13 C83 25 74 32 63 30 C67 19 76 12 86 13',
    // And the last thing to open: the bloom hung inside the turn on a short
    // stalk off the sweep. It sits where it does because that is the one part
    // of the corner with room for it — a flower on the arms is a bead on a
    // string, and one on the turn itself collides with everything the turn is
    // already doing.
    'M47 26 C51 32 52 37 53 41',
    'M58 39 C66 40 70 46 66 53 C71 60 67 68 59 67 C54 73 46 71 45 63 C38 61 37 53 43 48 C43 41 50 38 58 39',
    'M52 51 C57 49 60 52 58 56 C55 59 50 57 52 51'
  ],
  crest: [
    // Two runners in off the edge line, rising to meet in the middle.
    'M2 40 C30 40 56 39 80 30',
    'M158 40 C130 40 104 39 80 30',
    // A leaf off each, and a closed bud further along it.
    'M24 40 C26 31 34 26 43 28 C39 37 32 42 24 40',
    'M136 40 C134 31 126 26 117 28 C121 37 128 42 136 40',
    'M58 37 C53 33 53 26 58 22 C63 26 63 33 58 37',
    'M102 37 C107 33 107 26 102 22 C97 26 97 33 102 37',
    // The flower they meet in: a petal opening either side, and one standing
    // up between them. On the bottom edge this is flipped, so the standing
    // petal points down and away — which is where the page hangs the stroke
    // that says to scroll (`.hm-vine-cue`, Home.css).
    'M80 30 C70 29 64 21 67 12 C75 15 80 22 80 30',
    'M80 30 C90 29 96 21 93 12 C85 15 80 22 80 30',
    'M80 26 C74 21 74 11 80 5 C86 11 86 21 80 26'
  ],
  rails: [9],
  crestArm: 40
}

/* A sprig, for the things you can press.
 *
 * The same hand as the frames at the size of a line of type: one runner with a
 * leaf either side of it and a closed bud at its end, drawn in a 100 x 44 box
 * that grows left to right off an anchor at (0, 32). Sprig.tsx sets one on each
 * side of whatever it is put on, the left one mirrored, and the whole thing is
 * a CSS transition on the dash rather than a loop — see Sprig.css. It is the
 * frames' trick shrunk to something that can afford to happen on a hover.
 *
 * A bud rather than the frames' open flower, and only five strokes. This is
 * drawn a couple of centimetres wide next to a word, where five petals come
 * out as a blot; the bud is the one shape that still reads as a flower at that
 * size, and it is the same one the crests carry.
 *
 * Written outward from the anchor, in the order it should arrive. Retracting
 * plays the same list backwards — see the two `transition-delay`s in Sprig.css.
 */
export const SPRIG: string[] = [
  'M0 32 C24 32 46 31 64 25 C74 21 81 17 86 12',
  'M26 32 C29 24 37 20 45 22 C41 30 34 34 26 32',
  'M52 28 C56 34 55 42 48 45 C45 38 47 31 52 28',
  'M86 12 C77 10 72 2 76 -6 C84 -3 89 4 86 12',
  'M86 12 C95 10 100 2 96 -6 C88 -3 83 4 86 12'
]

/* `SPRIG`, turned to grow down instead of sideways — every x and y in its five
 * paths swapped, which is a 90-degree turn done to the coordinates themselves
 * rather than to the drawing on screen. A `transform: rotate()` was the other
 * way to get here and was worse: it pivots the whole box around one point, and
 * getting that point to land back on the anchor without also dragging the
 * drawing off-centre from whatever it is grown under takes a translation
 * solved for the rotation, in the rotated frame, which is a great deal of
 * trigonometry to carry for a hover effect. Transposed, the anchor is just
 * wherever it always was — (0, 32) becomes (32, 0), still the box's own edge —
 * and Sprig.css centres it with the same arithmetic the sideways pair already
 * uses, no rotation involved.
 *
 * For the menu: three items sit close enough together that a sprig reaching
 * sideways off one runs into the next (see Sprig.tsx's `vertical` prop). Read
 * downward — flipped with `scaleY(-1)` in Sprig.css, it is the one that reads
 * upward. */
export const VSPRIG: string[] = [
  'M32 0 C32 24 31 46 25 64 C21 74 17 81 12 86',
  'M32 26 C24 29 20 37 22 45 C30 41 34 34 32 26',
  'M28 52 C34 56 42 55 45 48 C38 45 31 47 28 52',
  'M12 86 C10 77 2 72 -6 76 C-3 84 4 89 12 86',
  'M12 86 C10 95 2 100 -6 96 C-3 88 4 83 12 86'
]

/* Runners off the ring around the name — `VineHalo.tsx` scatters copies of
 * these around `VINE_FRAME`'s own box, each growing outward past its edge
 * rather than staying inside it, which is the "spreading" experiment: the
 * ring itself is a frame with an edge to keep to, and this is what it looks
 * like once something growing stops respecting that edge. Not a bare ray —
 * every runner is a small stem carrying the same leaf-and-bloom vocabulary
 * the ring itself is drawn in, so a runner reads as one more thing the vine
 * put out rather than a separate mark laid over it.
 *
 * Both are drawn in a 40 x 90 box with the anchor at the bottom, (20, 90) —
 * on the frame's own rail when placed. `RUNNER` is the ordinary one: a stem,
 * a leaf part way up it, and the same three-petal bloom the crest opens into
 * (`VINE_FRAME.crest`, the last three strokes) at its own smaller scale.
 * `CURL` is rarer and used sparingly — a longer stem that loses its way and
 * turns back on itself before it closes in a bud, the way the corner's own
 * second bloom does. */
export const HALO_RUNNER: string[] = [
  'M20 90 C19 68 22 48 19 28 C19 25 19 22 20 20',
  'M17 55 C23 53 27 57 24 62 C19 64 14 60 17 55',
  'M20 20 C15 19 12 15 13 10 C17 12 20 16 20 20',
  'M20 20 C25 19 28 15 27 10 C23 12 20 16 20 20',
  'M20 18 C17 15 17 10 20 6 C23 10 23 15 20 18'
]

/* The same three-petal bloom `HALO_RUNNER` opens into, and the crest's own
 * flower (`VINE_FRAME.crest`, the last three strokes) at its own scale —
 * cropped down to just the flower and re-centred in a small box of its own,
 * for anything that wants only the bloom and not the stem it usually sits
 * on. `Menu.tsx` is the one caller: the current item's underline is this,
 * not a ruled line. */
export const MINI_BLOOM: string[] = [
  'M20 20 C15 19 12 15 13 10 C17 12 20 16 20 20',
  'M20 20 C25 19 28 15 27 10 C23 12 20 16 20 20',
  'M20 18 C17 15 17 10 20 6 C23 10 23 15 20 18'
]

export const HALO_CURL: string[] = [
  'M20 90 C18 66 24 50 14 40 C6 32 10 20 20 16 C26 13 24 6 18 4',
  'M18 4 C22 2 26 4 25 8 C24 12 19 12 17 9 C15 6 15 3 18 4'
]

/* The tangle at each corner — several of the above, sharing one anchor and
 * crossing over each other rather than standing apart, the way a real
 * corner's growth does when nothing has thinned it out. Two long scrolls
 * curl off in opposite directions and double back on themselves; two short
 * tendrils cross back over those on their way out; a straight one splits the
 * middle and closes in a bud; and a pair of unopened buds sit loose in the
 * gaps between, the way real growth leaves a few behind unopened. Eight
 * strokes, drawn in a 100 x 100 box off the same bottom-centre anchor, (50,
 * 95), everything else in this file uses. */
export const HALO_CLUSTER: string[] = [
  'M50 95 C48 70 20 65 15 40 C11 20 30 8 48 18 C40 25 32 35 38 45 C42 52 50 50 48 42',
  'M50 95 C53 68 82 64 86 42 C90 22 68 9 51 20 C60 27 68 36 62 46 C58 53 50 51 52 43',
  'M50 95 C44 78 55 68 46 58 C40 52 47 45 54 47',
  'M50 95 C56 78 45 68 54 58 C60 52 53 45 46 47',
  'M50 95 C49 70 51 45 50 22 C50 15 53 9 58 6',
  'M58 6 C63 4 67 7 65 11 C62 14 57 12 58 6',
  'M30 55 C33 53 36 55 35 58 C33 60 29 59 30 55',
  'M70 55 C67 53 64 55 65 58 C67 60 71 59 70 55'
]
