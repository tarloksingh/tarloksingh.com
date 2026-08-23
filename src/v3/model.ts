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

/** A media item, plus the model case the base `MediaItem` has no room for. */
export type Frame =
  | (MediaItem & { kind: 'flat' })
  | { kind: 'model'; id: string; src: string; label: string; type: 'model'; aspect: number }

/** One project, flattened into what the three panes actually draw. */
export interface Entry {
  project: Project
  year: number
  frames: Frame[]
}

const framesOf = (project: Project): Frame[] => {
  const flat: Frame[] = project.media.map((item) => ({ ...item, kind: 'flat' as const }))
  const model = MODELS[project.id]
  if (!model) return flat
  return [
    ...flat,
    { kind: 'model', id: `${project.id}/model`, src: model.file, label: model.label, type: 'model', aspect: 1 }
  ]
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

/** A poster for a 36px timeline square or a 68px rail tile. Never the master:
 *  a dozen tiles each decoding a twelve-megapixel photograph to draw it at
 *  seventy pixels is most of what a project screen costs to open. See
 *  `MediaItem.thumb`. */
export const thumbOf = (frame: Frame): string | null => {
  if (frame.kind === 'model') return null
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
      if (frame.kind === 'model') return []
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
