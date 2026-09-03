# Music

Drop audio files in this folder — `.mp3`, `.m4a`, `.ogg`, `.wav` or `.flac`.

They are picked up automatically: the player finds them, plays them in
filename order, and takes each title from the filename. Nothing else to edit.

```
01 - Nightfall.mp3     ->  "Nightfall"
02_Long_Way_Home.mp3   ->  "Long Way Home"
```

A leading track number is stripped, and underscores and dashes become spaces.
If a filename can't carry the title you want, override it by filename in the
`TITLES` map at the top of `src/data/tracks.ts`.

With this folder empty the site is still complete: the old player hides
itself, and v3's deck reads `audio — no signal`, which is a slot waiting for
something rather than a feature nobody knows exists.

**Keep files small.** They are bundled with the site and downloaded by every
visitor who presses play. 128–192kbps mp3 is plenty for a background loop; a
5MB track is fine, a 50MB WAV is not.
