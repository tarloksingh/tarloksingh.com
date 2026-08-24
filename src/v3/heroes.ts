/* ---- the roster ----

   Five subjects on the home screen, chosen because between them they are what
   this portfolio actually is: a character, a product, a game, a piece of
   film, and a sprite out of an engine. Not a sample of the work — a sample of
   the *kinds* of work, which is a different list and a much shorter one.

   Everything here already existed. Four of the five are assets that were
   built, rigged and tuned for something else on this site; the fifth is a
   motorcycle out of a sibling repo, copied in as a file and nothing more. See
   README.md → "The hero select". */

export interface Hero {
  id: string
  /** The project screen this opens, if there is one. The rider is from a game
   *  that has no case study yet, so it opens nothing and says so. */
  project: string | null
  title: string
  /** The line under the name — what the piece *is*, in the voice of a
   *  character-select screen's class label. */
  role: string
  kind: 'face' | 'gltf' | 'video' | 'sprite'
  /** For `gltf`: the file. For `video`: the clip. */
  src?: string
}

export const HEROES: Hero[] = [
  {
    id: 'takahashi',
    project: 'mr-takahashi',
    title: 'Mr. Takahashi',
    role: 'teacher · character',
    kind: 'face',
    src: '/models/adam-face.glb'
  },
  {
    id: 'capsule',
    project: 'capsule-c1',
    title: 'Capsule C1',
    role: 'hardware · enclosure',
    kind: 'gltf',
    src: '/models/capsule-c1.glb'
  },
  {
    id: 'rider',
    /* No case study on this site yet — the game is a sibling checkout, not a
       project here. The roster tile still opens it as a subject; the readout
       says where it is from rather than pretending there is somewhere to go. */
    project: null,
    title: 'Solomon',
    role: 'game · rider',
    kind: 'gltf',
    src: '/models/akira-rider.glb'
  },
  {
    id: 'stitchfam',
    project: 'stitchfam',
    title: 'StitchFam',
    role: 'film · the loop',
    kind: 'video',
    src: '/videos/stitchfam-hero.mp4'
  },
  {
    id: 'fish',
    project: 'slider-engine',
    title: 'Fish Man',
    role: 'engine · sprite',
    kind: 'sprite'
  }
]

/** Fourteen frames out of Unity at 12fps. The same glob `products.tsx` builds
 *  and `MechProduct` builds — three copies of a filename pattern is less than
 *  a module to share it. */
export const FISH_MAN_FRAMES = Array.from(
  { length: 14 },
  (_, i) => `/sprites/fish-man-idle/Fish_Man_Idle_${String(i).padStart(5, '0')}.png`
)
