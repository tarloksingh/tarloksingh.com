/* The v3 view model.

   Everything here is derived from `src/data/projects.ts` — the same single
   source of truth the current site reads. Nothing is duplicated: re-tag a
   project there and this whole view re-cuts itself. */

import { projects, type Project } from '../data/projects'
import type { MediaItem } from '../data/media'

/* ---- 3D ----

   Models live in `public/models/` rather than `src/assets/`, so they are not
   picked up by the media globs and have to be named. A project with a model
   gets it appended to its media, and the stage renders it live rather than
   as a picture of it. */
const MODELS: Record<string, { file: string; label: string }> = {
  'capsule-c1': { file: '/models/capsule-c1.glb', label: 'Capsule C1 — enclosure' },
  /* `adam-face.glb` is Mr. Takahashi — the head was modelled for Adam and
     kept its filename through the pivot. This is the export v2 renders (see
     `src/three/AdamFace.tsx`), a tenth the weight of the textured one and
     carrying the same morph targets, which is where all of its life is. */
  'mr-takahashi': { file: '/models/adam-face.glb', label: 'Mr. Takahashi — character' }
}

/* ---- waiting on files ----

   Two subjects that are wanted and do not exist yet: an AK-pattern rifle for
   Grand Theft Auto V and a revolver for Red Dead Redemption 2, to stand where
   those two currently show a disc case.

   Listed rather than wired, deliberately. `useGLTF` suspends on a fetch and a
   404 never resolves it, so pointing `MODELS` at a file that is not there is
   a project screen that stays under its cover forever — a worse failure than
   not having the model, because it looks like the page is broken rather than
   like the model is missing.

   Dropping either one in is: put the GLB in `public/models/` under the name
   below, and move that line up into `MODELS`. Nothing else — the stage, the
   tile rail and the leaders all read the same map. */
export const PENDING_MODELS: Record<string, { file: string; label: string }> = {
  'grand-theft-auto-v': { file: '/models/gta-v-rifle.glb', label: 'Grand Theft Auto V — the rifle' },
  'red-dead-redemption-2': { file: '/models/rdr2-revolver.glb', label: 'Red Dead Redemption 2 — the revolver' }
}

/* ---- pieces ----

   Eight of the ten projects have no model and had a photograph where the
   subject should be. What they do have — and have had since v2 — is a piece
   built for each of them in `src/site/products.tsx`: a video-texture monitor,
   a phone, two disc cases, a card, a stacking loop, a flipbook of fish. This
   is the list of the ones worth standing on a project screen.

   Not derived from `products.tsx`'s own registry, deliberately. Importing it
   here would pull three.js and a dozen components into the module every
   screen reads to know what a project *is* — the piece itself is fetched by
   `MechProduct`, which is lazy, and this is only the fact that there is one. */
const PIECES: Record<string, string> = {
  'mecha-station': 'Mecha Station — the terminal',
  openup: 'Plus One — the app',
  stitchfam: 'StitchFam — the loop',
  'red-dead-redemption-2': 'Red Dead Redemption 2 — the case',
  'grand-theft-auto-v': 'Grand Theft Auto V — the case',
  'wyte-card': 'Wyte — the card',
  'block-builder': 'Block Builder — the pieces',
  'slider-engine': 'Slider Engine — fish man'
}

/** A media item, plus the two things the base `MediaItem` has no room for: a
 *  model, and a piece built out of primitives.
 *
 *  Three kinds rather than two because they mount three different things —
 *  a still or a clip, `MechModel` (one face's rig), `MechProduct` (a neutral
 *  studio). Everything that only cares whether a frame is a picture asks
 *  `kind === 'flat'`. */
export type Frame =
  | (MediaItem & { kind: 'flat' })
  | { kind: 'model'; id: string; src: string; label: string; type: 'model'; aspect: number }
  | { kind: 'piece'; id: string; project: string; label: string; type: 'model'; aspect: number }

/** One project, flattened into what the three panes actually draw. */
export interface Entry {
  project: Project
  year: number
  frames: Frame[]
}

const framesOf = (project: Project): Frame[] => {
  const flat: Frame[] = project.media.map((item) => ({ ...item, kind: 'flat' as const }))
  const model = MODELS[project.id]
  if (model) {
    return [
      ...flat,
      { kind: 'model', id: `${project.id}/model`, src: model.file, label: model.label, type: 'model', aspect: 1 }
    ]
  }
  const piece = PIECES[project.id]
  if (piece) {
    return [
      ...flat,
      { kind: 'piece', id: `${project.id}/piece`, project: project.id, label: piece, type: 'model', aspect: 1 }
    ]
  }
  return flat
}

/** Every project that has something to show, newest first. A project with no
 *  media has nothing to put on the timeline — it is a write-up waiting for
 *  assets, and an empty row reads as a bug rather than as a placeholder. */
export const entries: Entry[] = projects
  .map((project) => ({ project, year: project.year, frames: framesOf(project) }))
  .filter((entry) => entry.frames.length > 0)
  .sort((a, b) => b.year - a.year || a.project.title.localeCompare(b.project.title))

/** Timeline rows: the visible projects bucketed by year, newest year first.
 *  One square per project — its first frame — not one per image. The timeline
 *  is a way to reach a project, and the carousel is how you go through it. */
export const byYear = (visible: Entry[]): Array<{ year: number; entries: Entry[] }> => {
  const buckets = new Map<number, Entry[]>()
  for (const entry of visible) {
    buckets.set(entry.year, [...(buckets.get(entry.year) ?? []), entry])
  }
  return [...buckets.entries()].sort((a, b) => b[0] - a[0]).map(([year, group]) => ({ year, entries: group }))
}

/* ---- the index ----

   What the home screen's bottom menu lists, and in what order.

   Written out rather than derived, which is the one place on this site where
   that is the right answer. `entries` is "every project with something to put
   on a stage", and that is the correct rule for the timeline and the tile
   rail — a screen whose whole job is showing frames cannot show a project
   that has none. It is the wrong rule for an index. Visa is the largest piece
   of work here and it is under an NDA, so it has no media and never will;
   Solomon is a sibling checkout with a write-up still to come. Both belong in
   a list of the work, and a filter that reads `media.length` cannot know
   that.

   So the order is a decision, and it lives here as one. A project named in
   this list opens whether or not it has frames — see the restricted card in
   `Mech.tsx`, which is what a project screen draws when there is nothing to
   put on the stage. */
const MENU_IDS = [
  'visa',
  'a-game',
  'mr-takahashi',
  'capsule-c1',
  'slider-engine',
  'mecha-station',
  'red-dead-redemption-2',
  'openup',
  'grand-theft-auto-v',
  'stitchfam',
  'block-builder',
  'wyte-card'
]

export interface MenuItem {
  project: Project
  /** What the project screen would put on the stage, if the project has
   *  anything at all. `null` is a real state, not a missing lookup. */
  entry: Entry | null
}

export const MENU: MenuItem[] = MENU_IDS.flatMap((id) => {
  const project = projects.find((item) => item.id === id)
  if (!project) return []
  return [{ project, entry: entries.find((item) => item.project.id === id) ?? null }]
})

/** A project by id, whether or not it is in the menu and whether or not it
 *  has frames — an old link to something since dropped from the index should
 *  still open the write-up rather than a blank screen. */
export const findProject = (id: string): MenuItem | null => {
  const listed = MENU.find((item) => item.project.id === id)
  if (listed) return listed
  const project = projects.find((item) => item.id === id)
  if (!project) return null
  return { project, entry: entries.find((item) => item.project.id === id) ?? null }
}

/** The portrait a project's box shows on the home screen, by convention
 *  rather than by data — drop a file in `public/portraits/<project-id>.png`
 *  and it appears; nothing to wire up. Until it exists the `<img>` 404s and
 *  the box's `onError` handler leaves the rectangle empty. */
export const portraitOf = (projectId: string): string => `/portraits/${projectId}.png`

/** A poster for a 36px timeline square or a 68px rail tile. Never the master:
 *  a dozen tiles each decoding a twelve-megapixel photograph to draw it at
 *  seventy pixels is most of what a project screen costs to open. See
 *  `MediaItem.thumb`. */
export const thumbOf = (frame: Frame): string | null => {
  if (frame.kind !== 'flat') return null
  return frame.thumb ?? (frame.type === 'video' ? (frame.poster ?? null) : frame.src)
}

/* ---- the wall ----

   Every clip and still across every project, for the home screen. Clips ride
   on their 400px proxies rather than the full files: `media.ts` generates
   those precisely so a screen can play many at once.

   Interleaved rather than listed project by project — consecutive tiles come
   from different projects, so a column is a cross-section of the work instead
   of a run of one case study. The stride is coprime-ish with most project
   lengths, which is enough to break up the runs without needing to shuffle
   (and without a different wall on every reload). */
export interface WallItem {
  image: string
  video?: string
  title: string
  id: string
}

export const wallItems: WallItem[] = (() => {
  const flat = entries.flatMap((entry) =>
    entry.frames.flatMap((frame): WallItem[] => {
      if (frame.kind !== 'flat') return []
      // The wall draws a few hundred pixels wide at most — the 1600 copy, not
      // the master.
      const image = frame.type === 'video' ? frame.poster : (frame.still ?? frame.src)
      if (!image) return []
      return [
        {
          image,
          video: frame.type === 'video' ? frame.clip : undefined,
          title: frame.label ? `${entry.project.title} — ${frame.label}` : entry.project.title,
          id: entry.project.id
        }
      ]
    })
  )

  if (flat.length < 3) return flat

  // Walking by a stride coprime with the length visits every tile exactly
  // once — an interleave, not a sample, so nothing is dropped or doubled.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const stride = [7, 5, 11, 13, 3].find((n) => gcd(n, flat.length) === 1) ?? 1
  return flat.map((_, i) => flat[(i * stride) % flat.length])
})()
