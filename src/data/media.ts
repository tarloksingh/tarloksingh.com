import { aspectOf } from './dimensions'

// Turns the filenames the project data quotes ("hero.mp4") into real bundled
// URLs, without a hand-maintained import list per project.
//
// Everything under `src/assets/<project-id>/` is globbed once, eagerly, and
// keyed by "<project-id>/<filename>". Eager because these are URL strings, not
// modules — Vite emits a hashed path and nothing is actually downloaded until
// something renders it. A lazy glob would hand back promises and force every
// caller to be async for no gain.

const videoModules = import.meta.glob('../assets/*/*.mp4', {
  eager: true,
  import: 'default'
}) as Record<string, string>

const imageModules = import.meta.glob('../assets/*/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default'
}) as Record<string, string>

// Stills pulled out of every clip at build time (`scripts/posters.sh`), so a
// card can paint before any video has decoded. One extra directory level than
// the two globs above, which is what keeps them out of `imageModules`.
const posterModules = import.meta.glob('../assets/posters/*/*.jpg', {
  eager: true,
  import: 'default'
}) as Record<string, string>

// 400px silent proxies of the same clips (`scripts/field-clips.sh`). The home
// page's field plays every card at once, which is only affordable at this
// size — see `MediaItem.clip`.
const clipModules = import.meta.glob('../assets/clips/*/*.mp4', {
  eager: true,
  import: 'default'
}) as Record<string, string>

// Display-sized copies of the stills (`scripts/stills.mjs`), at 1600 and 400
// on the long edge. The masters are camera output — two and three thousand
// pixels, several megabytes — and one of those costs about 140ms of main
// thread to decode however fast it arrives. Nothing on this site ever shows a
// still larger than about 1600 device pixels, and the tiles show it at
// seventy. See `MediaItem.still` and `MediaItem.thumb`.
const stillModules = import.meta.glob('../assets/stills/*/*.jpg', {
  eager: true,
  import: 'default'
}) as Record<string, string>

const thumbModules = import.meta.glob('../assets/thumbs/*/*.jpg', {
  eager: true,
  import: 'default'
}) as Record<string, string>

/** "../assets/capsule-c1/hero.mp4" -> "capsule-c1/hero.mp4" */
const keyBy = (pattern: RegExp) => (modules: Record<string, string>) => {
  const out: Record<string, string> = {}
  for (const path of Object.keys(modules)) {
    const match = pattern.exec(path)
    if (match) out[match[1]] = modules[path]
  }
  return out
}

const videos = keyBy(/\.\.\/assets\/([^/]+\/[^/]+)$/)(videoModules)
const images = keyBy(/\.\.\/assets\/([^/]+\/[^/]+)$/)(imageModules)
const posters = keyBy(/\.\.\/assets\/posters\/([^/]+\/[^/]+)\.jpg$/)(posterModules)
const clips = keyBy(/\.\.\/assets\/clips\/([^/]+\/[^/]+)\.mp4$/)(clipModules)
const stills = keyBy(/\.\.\/assets\/stills\/([^/]+\/[^/]+)\.jpg$/)(stillModules)
const thumbs = keyBy(/\.\.\/assets\/thumbs\/([^/]+\/[^/]+)\.jpg$/)(thumbModules)

export interface MediaItem {
  type: 'video' | 'image'
  /** Bundled URL of the clip or still. */
  src: string
  /** For videos: the extracted still, shown until the clip is worth decoding. */
  poster?: string
  /** For videos: a 400px silent proxy of `src`, one to two orders of
   *  magnitude smaller. What the home page's field plays — a card there is a
   *  couple of hundred pixels wide, and playing every one of them at once is
   *  only affordable at this size. Never used on a case study. */
  clip?: string
  /** For images: the same picture at 1600 and at 400 on the long edge
   *  (`scripts/stills.mjs`). `still` is what anything showing the picture
   *  should render — the master is two to twelve megapixels and decoding one
   *  is over a tenth of a second of main thread — and `thumb` is for the rail
   *  tiles and the timeline squares. Both fall back to `src` if the
   *  derivatives have not been generated. */
  still?: string
  thumb?: string
  /** Caption, as written on the original case study. */
  label?: string
  /** Videos carrying real audio, as opposed to silent screen captures. */
  hasSound?: boolean
  /** Width / height, from the generated manifest — known before anything is
   *  fetched, so a card is laid out at its true shape and never resizes. */
  aspect: number
  /** Stable id — "<project>/<filename>" — for keys and dedupe. */
  id: string
}

export function resolveVideo(projectId: string, filename: string, label?: string, hasSound = false): MediaItem | null {
  const id = `${projectId}/${filename}`
  const src = videos[id]
  if (!src) return null
  const stem = `${projectId}/${filename.replace(/\.[^.]+$/, '')}`
  return {
    type: 'video',
    src,
    poster: posters[stem],
    thumb: posters[stem],
    clip: clips[stem],
    label,
    hasSound,
    aspect: aspectOf(id),
    id
  }
}

export function resolveImage(projectId: string, filename: string, label?: string): MediaItem | null {
  const id = `${projectId}/${filename}`
  const src = images[id]
  if (!src) return null
  const stem = `${projectId}/${filename.replace(/\.[^.]+$/, '')}`
  return {
    type: 'image',
    src,
    still: stills[stem] ?? src,
    thumb: thumbs[stem] ?? stills[stem] ?? src,
    label,
    aspect: aspectOf(id),
    id
  }
}

/** Every filename the data quotes that has no matching asset on disk. */
export function findMissing(refs: Array<{ projectId: string; filename: string }>) {
  return refs
    .map(({ projectId, filename }) => `${projectId}/${filename}`)
    .filter((id) => !videos[id] && !images[id])
}
