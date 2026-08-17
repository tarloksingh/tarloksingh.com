// Resolves each project's own asset folder into a small media set for the
// home page collage, instead of hand-maintaining a per-project import list.
// Most projects only shipped video captures, so videos fill out the slots
// once a project's static images run out.
const imageModules = import.meta.glob('../assets/*/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }) as Record<
  string,
  string
>
const videoModules = import.meta.glob('../assets/*/*.mp4', { eager: true, import: 'default' }) as Record<string, string>

export interface ProjectMediaItem {
  type: 'image' | 'video'
  src: string
}

const groupByProject = (modules: Record<string, string>) => {
  const grouped: Record<string, string[]> = {}
  for (const path of Object.keys(modules).sort()) {
    const match = /\.\.\/assets\/([^/]+)\//.exec(path)
    if (!match) continue
    const projectId = match[1]
    grouped[projectId] ??= []
    grouped[projectId].push(modules[path])
  }
  return grouped
}

// path -> url, keyed by "<projectId>/<filename>" for exact-file overrides.
const videosByFile: Record<string, string> = {}
for (const path of Object.keys(videoModules)) {
  const match = /\.\.\/assets\/([^/]+\/[^/]+)$/.exec(path)
  if (match) videosByFile[match[1]] = videoModules[path]
}

const imagesByProject = groupByProject(imageModules)
const videosByProject = groupByProject(videoModules)

// A few projects' asset folders are dominated by unrelated captures — for
// these, only the named files are eligible rather than the whole folder.
const MEDIA_OVERRIDES: Record<string, string[]> = {
  'capsule-c1': ['Branding_1.mp4', 'Branding_3.mp4', 'Branding_4.mp4', 'Branding_5.mp4']
}

// Returns up to `count` media items for a project, images first, then
// videos. Never repeats a source — projects with fewer distinct assets than
// `count` just get fewer cards.
export function getProjectMedia(projectId: string, count: number): ProjectMediaItem[] {
  const override = MEDIA_OVERRIDES[projectId]
  if (override) {
    return override
      .map((filename) => videosByFile[`${projectId}/${filename}`])
      .filter((src): src is string => Boolean(src))
      .slice(0, count)
      .map((src) => ({ type: 'video', src }))
  }

  const ordered: ProjectMediaItem[] = [
    ...(imagesByProject[projectId] ?? []).map((src): ProjectMediaItem => ({ type: 'image', src })),
    ...(videosByProject[projectId] ?? []).map((src): ProjectMediaItem => ({ type: 'video', src }))
  ]
  return ordered.slice(0, count)
}
