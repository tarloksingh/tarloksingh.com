/* The music.

   TO ADD SONGS: drop audio files into `src/assets/audio/`. That is the whole
   procedure — they are found, ordered by filename, and titled from it. No
   list to keep in sync, because a list you have to remember to update is a
   list that goes stale the first time you are in a hurry.

   Filenames become titles: `03 - Night Drive.mp3` → "Night Drive". Prefix
   with numbers to fix the order. If a filename can't carry the title you
   want, override it in `TITLES` below by filename. */

const audioModules = import.meta.glob('../assets/audio/*.{mp3,m4a,ogg,wav,flac}', {
  eager: true,
  import: 'default'
}) as Record<string, string>

/** Filename (with extension) → the title to show instead of the derived one. */
const TITLES: Record<string, string> = {}

export interface Track {
  title: string
  src: string
  file: string
}

const titleFrom = (file: string) =>
  file
    .replace(/\.[^.]+$/, '')
    // A leading track number is for ordering the files, not for reading out.
    .replace(/^\s*\d+\s*[-._)]?\s*/, '')
    .replace(/[_-]+/g, ' ')
    .trim()

export const tracks: Track[] = Object.keys(audioModules)
  .sort()
  .map((path) => {
    const file = path.split('/').pop() ?? path
    // A filename that is nothing but a track number derives to an empty
    // string, so the raw filename is the last resort.
    return { file, src: audioModules[path], title: TITLES[file] ?? (titleFrom(file) || file) }
  })
