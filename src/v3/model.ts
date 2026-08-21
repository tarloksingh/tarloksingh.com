/* The v3 view model.

   Everything here is derived from `src/data/projects.ts` — the same single
   source of truth the current site reads. Nothing is duplicated: re-tag a
   project there and this whole view re-cuts itself. */

import { projects, TAGS, type Project, type Tag } from '../data/projects'
import type { MediaItem } from '../data/media'

export type Filter = 'all' | Tag
export const FILTERS: Filter[] = ['all', ...TAGS]

/* ---- 3D ----

   Models live in `public/models/` rather than `src/assets/`, so they are not
   picked up by the media globs and have to be named. A project with a model
   gets it appended to its media, and the stage renders it live rather than
   as a picture of it. */
const MODELS: Record<string, { file: string; label: string }> = {
  'capsule-c1': { file: '/models/capsule-c1.glb', label: 'Capsule C1 — enclosure' },
  'mr-takahashi': { file: '/models/mr-takahashi.glb', label: 'Mr. Takahashi — character' }
}

/** A media item, plus the model case the base `MediaItem` has no room for. */
export type Frame =
  | (MediaItem & { kind: 'flat' })
  | { kind: 'model'; id: string; src: string; label: string; type: 'model' }

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
    { kind: 'model', id: `${project.id}/model`, src: model.file, label: model.label, type: 'model' }
  ]
}

/** Every project that has something to show, newest first. A project with no
 *  media has nothing to put on the timeline — it is a write-up waiting for
 *  assets, and an empty row reads as a bug rather than as a placeholder. */
export const entries: Entry[] = projects
  .map((project) => ({ project, year: project.year, frames: framesOf(project) }))
  .filter((entry) => entry.frames.length > 0)
  .sort((a, b) => b.year - a.year || a.project.title.localeCompare(b.project.title))

export const matches = (entry: Entry, filter: Filter, company: string | null): boolean => {
  if (filter !== 'all' && !entry.project.tags.includes(filter)) return false
  if (company && entry.project.company !== company) return false
  return true
}

/** The companies present in a filtered set, newest first — the second filter
 *  row. It only earns its space when there is more than one to choose. */
export const companiesIn = (visible: Entry[]): string[] => {
  const seen = new Map<string, number>()
  for (const entry of visible) {
    const year = seen.get(entry.project.company)
    if (year === undefined || entry.year > year) seen.set(entry.project.company, entry.year)
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([company]) => company)
}

/** Timeline rows: the visible projects bucketed by year, newest year first. */
export const byYear = (visible: Entry[]): Array<{ year: number; frames: Array<{ entry: Entry; frame: Frame }> }> => {
  const buckets = new Map<number, Array<{ entry: Entry; frame: Frame }>>()
  for (const entry of visible) {
    const row = buckets.get(entry.year) ?? []
    for (const frame of entry.frames) row.push({ entry, frame })
    buckets.set(entry.year, row)
  }
  return [...buckets.entries()].sort((a, b) => b[0] - a[0]).map(([year, frames]) => ({ year, frames }))
}

/** A poster for a 36px timeline square. Videos already have a still pulled at
 *  build time; models have none yet and fall back to a flat tile. */
export const thumbOf = (frame: Frame): string | null => {
  if (frame.kind === 'model') return null
  return frame.type === 'video' ? (frame.poster ?? null) : frame.src
}
