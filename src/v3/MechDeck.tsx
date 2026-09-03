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
   from the page rather than in `sound.ts`. Values persist per browser.

   The deck and a clip are never heard together. `wantPlay` is what the pill
   says — the visitor's intent — and the reconcile effect below plays the
   element only when that is set *and* no clip with sound is up (`clipAudible`
   in `sound.ts`). A clip starting pauses the deck; the clip ending resumes it
   where it left off, because a paused `<audio>` keeps its `currentTime`.

   It never plays uninvited. With no file in `src/assets/audio/` the pill says
   `no signal` rather than vanishing. Wide layout only, as before. */

const MIX_ROWS: [keyof Levels, string][] = [
  ['music', 'Music'],
  ['effects', 'Effects'],
  ['clip', 'Clips']
]

function MechDeck() {
  const audio = useRef<HTMLAudioElement>(null)
  const [wantPlay, setWantPlay] = useState(false)
  const [mixOpen, setMixOpen] = useState(false)
  const [mix, setMix] = useState<Levels>(() => levels.get())

  const track = tracks[0]

  // One reconcile, run on mount, on every intent change, and on every `levels`
  // change (a slider, or a clip starting / stopping): the element plays only
  // when the visitor wants it and nothing is talking over it.
  useEffect(() => {
    const el = audio.current
    if (!el) return
    const sync = () => {
      setMix(levels.get())
      el.volume = levels.get().music
      const shouldPlay = wantPlay && !levels.clipAudible()
      if (shouldPlay && el.paused) void el.play().catch(() => {})
      if (!shouldPlay && !el.paused) el.pause()
    }
    sync()
    return levels.subscribe(sync)
  }, [wantPlay])

  const toggle = () => {
    sound.wake()
    sound.select()
    setWantPlay((was) => !was)
  }

  if (!track) {
    return (
      <div className="mech-deck">
        <span className="mech-deck-pill mech-deck-pill-empty">no signal</span>
      </div>
    )
  }

  return (
    <div className="mech-deck" data-playing={wantPlay} data-mix={mixOpen}>
      <audio ref={audio} src={track.src} loop />
      <button
        className="mech-deck-pill"
        onClick={toggle}
        aria-label={wantPlay ? `Pause ${track.title}` : `Play ${track.title}`}
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
