import { useEffect, useRef, useState, memo } from 'react'
import { tracks } from '../data/tracks'
import { sound } from './sound'

/* The deck, bottom left.

   Reads `src/data/tracks.ts`, which globs `src/assets/audio/` — dropping a
   file in that folder is the whole procedure for adding a song, and this
   picks it up with no list to keep in sync.

   It never plays uninvited, and the sound effects are on the same switch, so
   one control covers everything this page can put through a speaker. With no
   audio in the project it says so rather than disappearing: an empty slot
   that names itself is a place to put something, and a missing one is a
   feature nobody knows exists. */

const STORE_KEY = 'v3.deck.v1'

interface Stored {
  index: number
  volume: number
}

const read = (): Stored => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null') as Partial<Stored> | null
    return {
      index: Number.isInteger(parsed?.index) ? (parsed!.index as number) : 0,
      volume: typeof parsed?.volume === 'number' ? parsed!.volume : 0.5
    }
  } catch {
    return { index: 0, volume: 0.5 }
  }
}

/** Sixteen bars of a level meter, driven off the analyser. Bars rather than a
 *  waveform because this is a dashboard and a dashboard has gauges. */
const BARS = 16

interface Props {
  /** Narrow, the deck is not a strip docked in the frame's top right — it is
   *  a floating key at the bottom of the window, and the rest of the
   *  transport lives in a sheet above it. Same state, same meter, same audio
   *  element; a different shape around them. */
  narrow?: boolean
}

function MechDeck({ narrow = false }: Props) {
  const initial = useRef(read())
  const audio = useRef<HTMLAudioElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const graph = useRef<{ analyser: AnalyserNode; data: Uint8Array } | null>(null)

  const [index, setIndex] = useState(() => (tracks.length ? initial.current.index % tracks.length : 0))
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(initial.current.volume)
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(!sound.on)

  const track = tracks[index]

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ index, volume }))
    } catch {
      /* private mode — losing the preference is fine */
    }
  }, [index, volume])

  useEffect(() => {
    if (audio.current) audio.current.volume = volume
  }, [volume])

  /* Swapping `src` resets the element, so a track change while playing has to
     restart it explicitly or the deck silently stops on every skip. */
  useEffect(() => {
    if (!playing) return
    void audio.current?.play().catch(() => setPlaying(false))
  }, [index, playing])

  /* The meter taps the element through the same context the sound effects
     use, wired once. `createMediaElementSource` can only be called once per
     element, and calling it twice throws rather than failing quietly. */
  useEffect(() => {
    if (!playing || graph.current || !audio.current) return
    const context = sound.context()
    if (!context) return
    const source = context.createMediaElementSource(audio.current)
    const analyser = context.createAnalyser()
    analyser.fftSize = 64
    source.connect(analyser)
    analyser.connect(context.destination)
    graph.current = { analyser, data: new Uint8Array(analyser.frequencyBinCount) }
  }, [playing])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const node = meter.current
      const tap = graph.current
      if (!node) return
      if (tap && playing) {
        tap.analyser.getByteFrequencyData(tap.data)
        for (let i = 0; i < node.children.length; i++) {
          const bin = tap.data[Math.floor((i / BARS) * tap.data.length)] ?? 0
          ;(node.children[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.06, bin / 255)})`
        }
      } else {
        for (let i = 0; i < node.children.length; i++) {
          ;(node.children[i] as HTMLElement).style.transform = 'scaleY(0.06)'
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const step = (delta: number) => {
    if (!tracks.length) return
    sound.select()
    setIndex((at) => (at + delta + tracks.length) % tracks.length)
  }

  const toggle = () => {
    const el = audio.current
    if (!el) return
    sound.wake()
    sound.select()
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  const element = track && (
    <audio
      ref={audio}
      src={track.src}
      onEnded={() => setIndex((at) => (at + 1) % tracks.length)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
    />
  )

  /* The meter is one node written to from one frame loop, so it cannot be
     rendered twice — narrow and wide hand the same element to different
     places rather than each drawing their own. */
  const meterBars = (
    <div className="mech-meter" ref={meter}>
      {Array.from({ length: BARS }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )

  if (narrow) {
    return (
      <div className="mech-deck mech-deck-float" data-open={open} data-playing={playing}>
        {element}

        {/* The sheet, above the key. Everything the strip has except the
            level meter, which stays on the key itself where it reads as the
            thing being played rather than as a control. */}
        {open && (
          <div className="mech-deck-sheet">
            <div className="mech-deck-sheet-head">
              <span className="mech-deck-tag">audio</span>
              <button className="mech-deck-key" data-off={muted} onClick={() => setMuted(!sound.toggle())}>
                {muted ? '⊘' : '≋'}
              </button>
            </div>

            {tracks.length === 0 ? (
              <span className="mech-deck-empty">no signal</span>
            ) : (
              <>
                <div className="mech-deck-sheet-row">
                  <button className="mech-deck-key" onClick={() => step(-1)} aria-label="Previous track">
                    ⟨
                  </button>
                  <span className="mech-deck-now">{track?.title ?? '—'}</span>
                  <button className="mech-deck-key" onClick={() => step(1)} aria-label="Next track">
                    ⟩
                  </button>
                </div>

                <input
                  className="mech-deck-level"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="Volume"
                />

                <ul className="mech-deck-list">
                  {tracks.map((item, i) => (
                    <li key={item.file}>
                      <button
                        aria-current={i === index}
                        onClick={() => {
                          sound.select()
                          setIndex(i)
                        }}
                      >
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <button
          className="mech-deck-disc"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={tracks.length === 0}
        >
          {meterBars}
          <span className="mech-deck-glyph">{playing ? '❙❙' : '▶'}</span>
        </button>

        {/* Attached to the key rather than beside it — one floating control
            with a way into the rest of it, not two floating controls. */}
        <button
          className="mech-deck-more"
          onClick={() => {
            sound.select()
            setOpen((was) => !was)
          }}
          aria-expanded={open}
          aria-label={open ? 'Close the deck' : 'Open the deck'}
        >
          {open ? '⌄' : '⌃'}
        </button>
      </div>
    )
  }

  return (
    <div className="mech-deck" data-open={open}>
      {element}

      <div className="mech-deck-row">
        <span className="mech-deck-tag">audio</span>

        {meterBars}

        {tracks.length === 0 ? (
          <span className="mech-deck-empty">no signal</span>
        ) : (
          <>
            <button className="mech-deck-key" onClick={() => step(-1)} aria-label="Previous track">
              ⟨
            </button>
            <button
              className="mech-deck-key"
              data-on={playing}
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? '❙❙' : '▶'}
            </button>
            <button className="mech-deck-key" onClick={() => step(1)} aria-label="Next track">
              ⟩
            </button>

            <button
              className="mech-deck-name"
              onClick={() => {
                sound.select()
                setOpen((was) => !was)
              }}
              aria-expanded={open}
            >
              {track?.title ?? '—'}
            </button>

            <input
              className="mech-deck-level"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Volume"
            />
          </>
        )}

        {/* One switch for everything audible: the music keeps its own
            transport, but muting kills the readout's chatter too. */}
        <button
          className="mech-deck-key"
          data-off={muted}
          onClick={() => setMuted(!sound.toggle())}
          aria-label={muted ? 'Sound on' : 'Sound off'}
        >
          {muted ? '⊘' : '≋'}
        </button>
      </div>

      {tracks.length === 0 && import.meta.env.DEV && (
        <span className="mech-deck-hint">drop audio into src/assets/audio/</span>
      )}

      {open && tracks.length > 0 && (
        <ul className="mech-deck-list">
          {tracks.map((item, i) => (
            <li key={item.file}>
              <button
                aria-current={i === index}
                onClick={() => {
                  sound.select()
                  setIndex(i)
                  setOpen(false)
                }}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* Memoised. It takes no props and nothing it draws depends on the readout's
   state, but the project screen re-renders on every phase of every frame swap
   — and without this, so does all of MechDeck. */
export default memo(MechDeck)
