import { useEffect, useRef, useState, memo } from 'react'
import { tracks } from '../data/tracks'
import { sound, music, LEVELS } from './sound'

/* The deck.

   One song, on loop. A pill: the track's name in the panel's display face
   over "Tarlok Singh" in the light weight of the title face, and a play /
   pause triangle. No track list, no scrubber, no meter — there is nothing to
   choose and nothing to scrub.

   It never plays uninvited. With no file in `src/assets/audio/` the pill says
   `no signal` rather than vanishing. Wide layout only, as before. */

function MechDeck() {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  const track = tracks[0]

  useEffect(() => {
    if (audio.current) audio.current.volume = LEVELS.music
    // A clip with its own sound pulls the music down while it plays.
    return music.onDuck((ducked) => {
      if (audio.current) audio.current.volume = ducked ? LEVELS.musicDuck : LEVELS.music
    })
  }, [])

  const toggle = () => {
    const el = audio.current
    if (!el) return
    sound.wake()
    sound.select()
    if (el.paused) {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  if (!track) {
    return (
      <div className="mech-deck">
        <span className="mech-deck-pill mech-deck-pill-empty">no signal</span>
      </div>
    )
  }

  return (
    <div className="mech-deck" data-playing={playing}>
      <audio
        ref={audio}
        src={track.src}
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        className="mech-deck-pill"
        onClick={toggle}
        aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <span className="mech-deck-lines">
          <span className="mech-deck-title">{track.title}</span>
          <span className="mech-deck-by">Tarlok Singh</span>
        </span>
        <span className="mech-deck-play" aria-hidden />
      </button>
    </div>
  )
}

/* Memoised — nothing it draws depends on the readout, but the project screen
   re-renders on every phase of a frame swap. */
export default memo(MechDeck)
