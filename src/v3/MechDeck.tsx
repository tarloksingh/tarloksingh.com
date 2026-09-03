import { useEffect, useRef, useState, memo } from 'react'
import { tracks } from '../data/tracks'
import { sound, levels, type Levels } from './sound'

/* The deck.

   One song, on loop. A pill: the track's name in the panel's display face
   over "Tarlok Singh" in the light weight of the title face, and a play /
   pause triangle. No track list, no scrubber, no meter — there is nothing to
   choose and nothing to scrub.

   Alongside it, a small mixer: three sliders — the music, the synth effects
   and a clip's own audio — behind a toggle, so the balance can be set by ear
   from the page rather than in `sound.ts`. Values persist per browser and the
   music ducks under a talking clip automatically; see `levels` in `sound.ts`.

   It never plays uninvited. With no file in `src/assets/audio/` the pill says
   `no signal` rather than vanishing. Wide layout only, as before. */

const MIX_ROWS: [keyof Levels, string][] = [
  ['music', 'Music'],
  ['effects', 'Effects'],
  ['clip', 'Clips']
]

function MechDeck() {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [mixOpen, setMixOpen] = useState(false)
  const [mix, setMix] = useState<Levels>(() => levels.get())

  const track = tracks[0]

  useEffect(() => {
    const apply = () => {
      setMix(levels.get())
      if (audio.current) audio.current.volume = levels.music()
    }
    apply()
    return levels.subscribe(apply)
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
    <div className="mech-deck" data-playing={playing} data-mix={mixOpen}>
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

      <button
        className="mech-deck-mix-toggle"
        onClick={() => {
          sound.wake()
          setMixOpen((was) => !was)
        }}
        aria-label="Sound levels"
        aria-expanded={mixOpen}
      >
        <i />
        <i />
        <i />
      </button>

      {mixOpen && (
        <div className="mech-deck-mix">
          {MIX_ROWS.map(([key, label]) => (
            <label key={key} className="mech-deck-mix-row">
              <span>{label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={mix[key]}
                onChange={(event) => {
                  sound.wake()
                  levels.set({ [key]: Number(event.target.value) })
                }}
              />
            </label>
          ))}
          <button className="mech-deck-mix-reset" onClick={() => levels.reset()}>
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

/* Memoised — nothing it draws depends on the readout, but the project screen
   re-renders on every phase of a frame swap. */
export default memo(MechDeck)
