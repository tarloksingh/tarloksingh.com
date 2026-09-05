import { useEffect, useRef, useState, memo } from 'react'
import { tracks } from '../data/tracks'
import { sound, levels, type Levels } from './sound'
import { useNarrow } from './narrow'

/* The deck.

   One song, on loop. A pill: the track's name in the panel's display face
   over "Tarlok Singh" in the light weight of the title face, and a play /
   pause triangle.

   The music wants to be on. `wantPlay` starts false only because a browser
   will not let audio play before the first interaction — the effect below
   catches that first gesture anywhere on the page (the deck's own pill
   excepted, since pressing it is already a choice) and starts the song. From
   then on the pill is a normal toggle.

   The deck and a clip are never heard together. The reconcile effect plays
   the element only when `wantPlay` is set *and* no clip with sound is up
   (`clipAudible` in `sound.ts`); a clip starting fades the music out and then
   pauses the deck, the clip ending fades it back in where it left off.

   On wide there is also a small mixer — music / effects / clips sliders
   behind a toggle, persisted per browser (see `levels`). It is off on a
   phone: the sliders want a pointer and the panel wants room the layout does
   not have there.

   Docked top-right on wide; on a phone it floats fixed at the bottom of the
   window (`.mech-deck-slot` narrow rules in `Mech.css`). With no file in
   `src/assets/audio/` the pill says `no signal` rather than vanishing. */

const MIX_ROWS: [keyof Levels, string][] = [
  ['music', 'Music'],
  ['effects', 'Effects'],
  ['clip', 'Clips']
]

function MechDeck() {
  const audio = useRef<HTMLAudioElement>(null)
  const narrow = useNarrow()
  const [wantPlay, setWantPlay] = useState(false)
  const [mixOpen, setMixOpen] = useState(false)
  const [mix, setMix] = useState<Levels>(() => levels.get())

  const track = tracks[0]

  // Start the music on the first interaction anywhere — a browser will not let
  // it play before one. The pill is left out: pressing it is already an
  // explicit choice, handled by `toggle`. `started` latches the first time
  // either path fires and never resets, so a pause stays a pause.
  //
  // The check has to be *inside* `start`, not just at the effect's own setup.
  // It was only at setup before — the effect has `[]` for deps and mounts
  // once, so the listener itself was added exactly once, but nothing ever
  // took it back off or checked `started` on the way in. Every pointerdown
  // anywhere outside `.mech-deck`, for the rest of the page's life, called
  // `setWantPlay(true)` unconditionally — including the one that starts a
  // touch scroll on a phone. Desktop mostly hid this: a mouse wheel doesn't
  // fire `pointerdown`, so only a stray click reopened it there, and a phone
  // opens it on every scroll.
  const started = useRef(false)
  useEffect(() => {
    const start = (event: Event) => {
      if (started.current) return
      if ((event.target as Element | null)?.closest?.('.mech-deck')) return
      started.current = true
      sound.wake()
      setWantPlay(true)
    }
    window.addEventListener('pointerdown', start, { passive: true })
    window.addEventListener('keydown', start, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [])

  // One reconcile: run on mount, on intent changes, and on every `levels`
  // change (a slider, or a clip starting / stopping).
  const fade = useRef<number>(0)
  useEffect(() => {
    const el = audio.current
    if (!el) return

    // Ramp the element's own volume, then optionally pause. A clip with sound
    // coming up should not chop the music off — it eases out under the first
    // second of speech and eases back when the clip ends.
    const ramp = (to: number, ms: number, then?: () => void) => {
      cancelAnimationFrame(fade.current)
      const from = el.volume
      const start = performance.now()
      const step = (now: number) => {
        const t = ms <= 0 ? 1 : Math.min(1, (now - start) / ms)
        el.volume = from + (to - from) * t
        if (t < 1) fade.current = requestAnimationFrame(step)
        else then?.()
      }
      fade.current = requestAnimationFrame(step)
    }

    const sync = () => {
      setMix(levels.get())
      const target = levels.get().music
      const shouldPlay = wantPlay && !levels.clipAudible()
      if (shouldPlay) {
        if (el.paused) {
          el.volume = 0
          void el.play().catch(() => {})
        }
        ramp(target, 600)
      } else if (!el.paused) {
        ramp(0, 500, () => el.pause())
      }
    }
    sync()
    const off = levels.subscribe(sync)
    return () => {
      off()
      cancelAnimationFrame(fade.current)
    }
  }, [wantPlay])

  const toggle = () => {
    started.current = true
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

      {!narrow && (
        <>
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
        </>
      )}
    </div>
  )
}

/* Memoised — nothing it draws depends on the readout, but the project screen
   re-renders on every phase of a frame swap. */
export default memo(MechDeck)
