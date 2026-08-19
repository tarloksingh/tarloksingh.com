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

/* The underline for a menu item — `SPRIG`'s vocabulary laid flat and run the
 * width of a word instead of hung off the end of one. A runner leaving the
 * word's left edge and travelling under it, a leaf above and a leaf below,
 * and the same two-petal bud at the tip, opened rightward here because that
 * is the direction of travel.
 *
 * Drawn in a 100 x 26 box that is stretched to the item's own width, so the
 * vine is as long as the word it belongs to rather than a fixed drawing
 * parked under words of three different lengths. Five strokes, in the order
 * they grow, which is what `--sp-n: 5` in Menu.css counts.
 *
 * Flat on purpose. The runner drops eight units over its whole length, which
 * at a menu item's size is a couple of pixels: enough that it reads as drawn
 * rather than ruled, not so much that three of them in a row look crooked. */
/* ---- the birds ----
 *
 * Same pen as everything else here: stroked, never filled, deliberately not
 * exact. Two poses of one bird, both drawn facing right in a 44 x 30 box —
 * `Birds.tsx` mirrors it with a `scaleX(-1)` when it is travelling the other
 * way, so there is one drawing rather than two that could disagree.
 *
 * Perched, the feet stand on y = 28, which is what `Birds.tsx` lands on a
 * rail: the bird's own contact point, not the bottom of its box.
 *
 * Written in the order they should arrive, because the perched pose draws
 * itself on landing the way the sprigs and the frames do — body first, then
 * the things that only make sense once there is a body for them to be on. */
export const BIRD_SIT: string[] = [
  // Beak, over the head, down the back to where the tail leaves it.
  'M40 10 C36 4 28 3 22 7 C16 10 11 14 7 17',
  // Throat, breast, belly, back to the same point — the body closes.
  'M40 10 C42 13 41 17 37 19 C31 22 23 23 17 22 C12 21 9 19 7 17',
  // The tail: two edges of one wedge, out of the back of the body and down.
  'M7 17 C4 19 2 21 -1 23',
  'M10 20 C7 21 4 22 0 23',
  'M40 10 L45 11 L40 12',
  // The folded wing, laid along the flank.
  'M31 13 C27 16 22 19 17 21',
  'M36 9 C37 9 37 10 36 10 C35 10 35 9 36 9',
  // Legs. Bent, not ruled: two straight sticks under a bird read as a
  // diagram of one.
  'M23 22 C23 25 22 26 23 28',
  'M27 22 C27 25 26 26 27 28'
]

/** Which stroke of `BIRD_SIT` is the folded wing. A perched bird shakes it
 *  out every few seconds, and that rotation has to be put on the wing alone
 *  rather than on the whole group — see `.bd-sit-wing` in Birds.css. */
export const BIRD_SIT_WING = 5

/* Flying: the same bird stretched level, tail forked out behind. The wings
 * are separate so they can beat — see `.bd-wing-*` in Birds.css, which shows
 * one and hides the other on a steps() cycle rather than tweening between
 * them. A wing that interpolates reads as rubber; a wing that cuts between
 * two positions reads as a wingbeat, which is the same reason the frames'
 * weave is stepped at 12fps and not eased. */
export const BIRD_BODY: string[] = [
  'M41 12 C37 7 30 6 24 9 C18 11 11 14 6 16',
  'M41 12 C43 14 42 18 38 19 C31 21 23 22 16 21 C11 20 9 18 6 16',
  'M6 16 C3 14 1 12 -1 10',
  'M41 12 L46 13 L41 15'
]

/* Each wing is one stroke that goes out along the leading edge and comes back
 * along the trailing one, so it has width — two curves close together read as
 * a blade, which is what these were before they were drawn at size and
 * looked at.
 *
 * The up-stroke leaves the back line and the down-stroke leaves the belly,
 * because on a downbeat the wing root is behind the body and only the part
 * below it is visible. A down-wing drawn from the shoulder crosses the whole
 * body on its way out. */
export const BIRD_WING_UP: string[] = ['M26 11 C20 2 14 -4 6 -8 C11 0 14 7 17 12']

export const BIRD_WING_DOWN: string[] = ['M24 21 C20 26 15 30 9 31 C13 26 15 24 17 21']

/* The mark on the date line — the year is a label standing over one point on
 * a rule, so what grows out of it grows *downward*, onto the point it names:
 * a stem out of the label's baseline, a leaf either side of it, and the same
 * two-petal bud at the tip, which lands on the rule.
 *
 * Deliberately not `SPRIG`. That one reaches out to either side of a word,
 * which says "this word", and the footer's label is not making a claim about
 * itself — it is pointing at somewhere on a line eight pixels below it. The
 * button on an exhibit keeps the sprig; this is the other gesture.
 *
 * Drawn in a 20 x 44 box off a top-centre anchor, (10, 0). Five strokes, in
 * the order they grow — the count `.hm-foot-pin` in Home.css staggers on. */
export const DATE_PIN: string[] = [
  'M10 0 C10 8 9 16 10 24 C10 28 10 31 10 34',
  'M10 12 C6 11 3 7 4 2 C8 4 11 8 10 12',
  'M10 22 C14 21 17 17 16 12 C12 14 9 18 10 22',
  'M10 34 C5 35 2 39 4 44 C8 42 11 38 10 34',
  'M10 34 C15 35 18 39 16 44 C12 42 9 38 10 34'
]

export const MENU_VINE: string[] = [
  'M0 8 C18 8 34 12 52 13 C68 14 82 15 92 17',
  'M26 10 C28 4 35 1 42 3 C39 9 33 12 26 10',
  'M58 13 C61 19 59 25 52 26 C50 20 53 14 58 13',
  'M92 17 C93 10 99 6 105 8 C104 14 98 18 92 17',
  'M92 17 C93 24 99 28 105 26 C104 20 98 16 92 17'
]
