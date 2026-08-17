import { useCallback, useEffect, useRef, useState } from 'react'
import { tracks } from '../data/tracks'
import './MusicPlayer.css'

/* The record player, bottom-left, on every screen.

   It lives in the shell rather than on a page, because it has to keep playing
   across a navigation — a track that restarted every time you opened a
   project would be worse than no music at all.

   It never plays uninvited. Browsers block that anyway, but the reason to
   want it blocked is that sound arriving unasked on someone's speakers at
   work is a hostile thing for a page to do. Once started, the choice sticks
   for the session.

   With `src/assets/audio/` empty the whole thing returns null, so the site is
   complete before any music exists. */

const STORE_KEY = 'ts-music'

interface Stored {
  index: number
  volume: number
}

const read = (): Stored => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return { index: 0, volume: 0.55 }
    const parsed = JSON.parse(raw) as Partial<Stored>
    return {
      index: Number.isInteger(parsed.index) ? (parsed.index as number) : 0,
      volume: typeof parsed.volume === 'number' ? parsed.volume : 0.55
    }
  } catch {
    return { index: 0, volume: 0.55 }
  }
}

export default function MusicPlayer() {
  const initial = useRef(read())
  const audioRef = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(() =>
    tracks.length ? ((initial.current.index % tracks.length) + tracks.length) % tracks.length : 0
  )
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(initial.current.volume)
  const [open, setOpen] = useState(false)
  // Set when the browser refuses playback, so the button can say so rather
  // than sitting there looking broken.
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ index, volume }))
    } catch {
      // Private browsing refuses writes. Losing the preference is fine.
    }
  }, [index, volume])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume])

  // Changing track mid-play should keep playing. `src` swapping resets the
  // element, so playback has to be restarted explicitly.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !playing) return
    audio.play().then(
      () => setBlocked(false),
      () => {
        setBlocked(true)
        setPlaying(false)
      }
    )
  }, [index, playing])

  const step = useCallback(
    (by: number) => {
      if (!tracks.length) return
      setIndex((i) => ((i + by) % tracks.length + tracks.length) % tracks.length)
    },
    []
  )

  if (!tracks.length) return null

  const track = tracks[index]

  return (
    <div
      className={`mp${open ? ' is-open' : ''}${playing ? ' is-playing' : ''}`}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <audio
        ref={audioRef}
        src={track.src}
        onEnded={() => step(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="none"
      />

      <button
        type="button"
        className="mp-toggle"
        aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={() => {
          const audio = audioRef.current
          if (!audio) return
          if (playing) {
            audio.pause()
          } else {
            audio.play().then(
              () => setBlocked(false),
              () => setBlocked(true)
            )
          }
        }}
      >
        {/* A record: hairline rim, label, spindle. It turns while playing and
            coasts to a stop when paused, which says more about the state than
            swapping a play glyph for a pause glyph would. */}
        <span className="mp-disc" aria-hidden="true">
          <span className="mp-disc-label" />
          <span className="mp-disc-spindle" />
        </span>
      </button>

      <div className="mp-body">
        <div className="mp-now">
          <p className="u-label mp-status">{blocked ? 'Blocked by browser' : playing ? 'Now playing' : 'Music'}</p>
          <p className="mp-title" title={track.title}>
            {track.title}
          </p>
        </div>

        <div className="mp-controls">
          <button type="button" onClick={() => step(-1)} aria-label="Previous track">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M18 5v14L8 12zM6 5v14" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next track">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M6 5v14l10-7zM18 5v14" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <label className="mp-volume">
            <span className="u-sr">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
