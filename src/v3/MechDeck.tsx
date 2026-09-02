import { useEffect, useRef, useState, memo } from 'react'
import { tracks } from '../data/tracks'
import { sound } from './sound'
import Segment from './Segment'

/* The deck.

   One song, on loop, and nothing to choose — so the transport is a play/pause
   key and the meter, and the rest of what a deck used to have (a track list, a
   scrubber, skip) is gone. The credit scrolls past in the panel's own
   fourteen-segment readout, the same display `INTRO` and the role reel are
   drawn in.

   It never plays uninvited, and the mute switch is on the same `sound` toggle
   the effects use, so one control still covers everything audible. With no
   file in `src/assets/audio/` it says `no signal` rather than vanishing. */

const BARS = 16
const VOLUME = 0.6
/* Doubled with a separator so the marquee wraps seamlessly — the second copy
   is exactly where the first one started. */
const CREDIT = 'MUSIC BY TARLOK SINGH · '
const TICKER = (CREDIT + CREDIT).toUpperCase()

interface Props {
  narrow?: boolean
}

function MechDeck({ narrow = false }: Props) {
  const audio = useRef<HTMLAudioElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const graph = useRef<{ analyser: AnalyserNode; data: Uint8Array } | null>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(!sound.on)

  const track = tracks[0]

  useEffect(() => {
    if (audio.current) audio.current.volume = VOLUME
  }, [])

  /* The meter taps the element through the same context the sound effects use,
     wired once. `createMediaElementSource` can only be called once per element
     and throws on the second call. */
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

  /* The bars are only written while something is playing — a property written
     to a node invalidates its subtree's style whether or not the value
     changed, so an idle deck writing sixteen unchanged values a frame was
     buying a full recalc a frame for a picture of silence. It settles to rest
     in one pass and then writes nothing. */
  useEffect(() => {
    let raf = 0
    let rested: HTMLElement | null = null
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const node = meter.current
      const tap = graph.current
      if (!node) return
      if (!(tap && playing)) {
        if (rested === node) return
        rested = node
      } else rested = null
      let sum = 0
      if (tap && playing) {
        tap.analyser.getByteFrequencyData(tap.data)
        for (let i = 0; i < node.children.length; i++) {
          const bin = tap.data[Math.floor((i / BARS) * tap.data.length)] ?? 0
          const level = bin / 255
          sum += level
          const bar = node.children[i] as HTMLElement
          bar.style.transform = `scaleY(${Math.max(0.06, level)})`
          bar.style.setProperty('--v', level.toFixed(3))
        }
      } else {
        for (let i = 0; i < node.children.length; i++) {
          const bar = node.children[i] as HTMLElement
          bar.style.transform = 'scaleY(0.06)'
          bar.style.setProperty('--v', '0')
        }
      }
      const housing = node.closest('.mech-deck') as HTMLElement | null
      housing?.style.setProperty('--level', (sum / BARS).toFixed(3))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

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

  const element = track && (
    <audio
      ref={audio}
      src={track.src}
      loop
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
    />
  )

  const meterBars = (
    <div className="mech-meter" ref={meter}>
      {Array.from({ length: BARS }, (_, i) => (
        <i key={i} style={{ ['--n' as string]: (i / (BARS - 1)).toFixed(3) }} />
      ))}
    </div>
  )

  const disc = (
    <button
      className="mech-deck-disc"
      data-on={playing}
      onClick={toggle}
      aria-label={playing ? 'Pause' : 'Play'}
      disabled={tracks.length === 0}
    >
      {meterBars}
      <span className="mech-deck-glyph">{playing ? '❚❚' : '▶'}</span>
    </button>
  )

  /* The credit, scrolling. `Segment` draws a fixed grid of lamps and does not
     scroll itself, so the whole doubled string is drawn once at full width and
     the wrapper slides it left — the second copy lands exactly where the first
     began, so the loop has no seam. `settle={false}`: it is set once and never
     changes, there is nothing to scramble from. */
  const ticker =
    tracks.length === 0 ? (
      <span className="mech-deck-empty">no signal</span>
    ) : (
      <div className="mech-deck-ticker" aria-hidden>
        <div className="mech-deck-scroll">
          <Segment text={TICKER} cells={TICKER.length} settle={false} align="left" warn />
        </div>
      </div>
    )

  const mute = (
    <button
      className="mech-deck-key"
      data-off={muted}
      onClick={() => setMuted(!sound.toggle())}
      aria-label={muted ? 'Sound on' : 'Sound off'}
    >
      {muted ? '⊘' : '≋'}
    </button>
  )

  if (narrow) {
    return (
      <div className="mech-deck mech-deck-float" data-playing={playing}>
        {element}
        {disc}
        {ticker}
        {mute}
      </div>
    )
  }

  return (
    <div className="mech-deck" data-playing={playing}>
      {element}
      <div className="mech-deck-row">
        {disc}
        {ticker}
        {mute}
        {tracks.length === 0 && import.meta.env.DEV && (
          <span className="mech-deck-hint">drop audio into src/assets/audio/</span>
        )}
      </div>
    </div>
  )
}

/* Memoised — it takes no props that change and nothing it draws depends on the
   readout, but the project screen re-renders on every phase of a frame swap. */
export default memo(MechDeck)
