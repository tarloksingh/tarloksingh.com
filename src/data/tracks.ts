export interface Track {
  title: string
  /** File under `public/audio/`. Empty means nothing plays for this entry. */
  src: string
}

// PLACEHOLDER LIST — no music has been supplied yet.
// To wire up real songs: drop the files into `public/audio/` and set `src` to
// `/audio/<filename>`. The titles below are what the wheel displays, so rename
// them freely; the wheel and the player both read from this one array.
export const tracks: Track[] = [
  { title: 'Track One', src: '' },
  { title: 'Track Two', src: '' },
  { title: 'Track Three', src: '' },
  { title: 'Track Four', src: '' },
  { title: 'Track Five', src: '' },
  { title: 'Track Six', src: '' }
]
