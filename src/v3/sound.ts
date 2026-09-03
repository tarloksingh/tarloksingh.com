/* The readout's own noise.

   Everything is synthesised — oscillators, one noise buffer, a filter or two.
   No files, so there is nothing to load, nothing to cache, and no reason for
   a hover tick to be a network request. It also means every sound can be
   tuned by reading it, which a sample cannot.

   Nothing plays until the visitor has interacted with the page. That is
   partly because browsers refuse to start an AudioContext before a gesture,
   but mostly because sound arriving unasked on someone's speakers at work is
   a hostile thing for a page to do. */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null

/** Built on first use and resumed on every one after: a context created
 *  before a gesture starts suspended, and stays that way until something
 *  asks it not to be. */
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = current.effects
    master.connect(ctx.destination)

    // Two seconds of white noise, reused by everything that needs air in it.
    const frames = ctx.sampleRate * 2
    noise = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** A tone with an envelope. `ramp` sweeps the pitch across the life of the
 *  note, which is most of what separates a blip from a thunk. */
function tone(options: {
  type?: OscillatorType
  from: number
  to?: number
  gain: number
  attack?: number
  length: number
  delay?: number
}) {
  const context = audio()
  if (!context || !master) return
  const at = context.currentTime + (options.delay ?? 0)
  const osc = context.createOscillator()
  const level = context.createGain()

  osc.type = options.type ?? 'sine'
  osc.frequency.setValueAtTime(options.from, at)
  if (options.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), at + options.length)

  const attack = options.attack ?? 0.004
  level.gain.setValueAtTime(0.0001, at)
  level.gain.exponentialRampToValueAtTime(options.gain, at + attack)
  level.gain.exponentialRampToValueAtTime(0.0001, at + options.length)

  osc.connect(level).connect(master)
  osc.start(at)
  osc.stop(at + options.length + 0.02)
}

/** Filtered noise. `from`/`to` sweep the filter rather than the pitch. */
function air(options: { from: number; to: number; gain: number; length: number; q?: number; delay?: number }) {
  const context = audio()
  if (!context || !master || !noise) return
  const at = context.currentTime + (options.delay ?? 0)
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const level = context.createGain()

  source.buffer = noise
  source.loop = true
  filter.type = 'bandpass'
  filter.Q.value = options.q ?? 1.2
  filter.frequency.setValueAtTime(options.from, at)
  filter.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), at + options.length)

  level.gain.setValueAtTime(0.0001, at)
  level.gain.exponentialRampToValueAtTime(options.gain, at + 0.012)
  level.gain.exponentialRampToValueAtTime(0.0001, at + options.length)

  source.connect(filter).connect(level).connect(master)
  source.start(at)
  source.stop(at + options.length + 0.02)
}

export const sound = {
  /** Woken on the first real gesture: the context cannot start before one. */
  wake() {
    audio()
  },

  /** The one context on the page. The deck taps its `<audio>` element into
   *  this rather than opening a second — two contexts is two output devices
   *  as far as the browser is concerned, and only one of them gets resumed by
   *  a gesture aimed at the other. */
  context() {
    return audio()
  },

  /** Crossing something you could press. Short and high enough to sit above
   *  the music without being in the same register as it. */
  tick() {
    tone({ type: 'square', from: 2100, gain: 0.028, length: 0.022 })
  },

  /** Acquiring a target — the reticle's brackets landing on something. */
  lock() {
    tone({ type: 'square', from: 1500, to: 900, gain: 0.05, length: 0.055 })
    air({ from: 3200, to: 1400, gain: 0.03, length: 0.07 })
  },

  /** Committing to something: a tile, a fold, a project. */
  select() {
    tone({ type: 'triangle', from: 660, to: 990, gain: 0.075, length: 0.07 })
    tone({ type: 'sine', from: 1320, gain: 0.035, length: 0.05, delay: 0.045 })
  },

  /** A frame coming apart and going back together. Two passes of air rather
   *  than one, so the sound has the same shape the picture does. */
  dissolve() {
    air({ from: 700, to: 5200, gain: 0.05, length: 0.26, q: 0.7 })
    air({ from: 5200, to: 900, gain: 0.04, length: 0.3, q: 0.7, delay: 0.3 })
  },

  /** The gun. A short bright crack with a pitch that falls out from under
   *  it — the drop is what keeps a laser from reading as a beep — over a
   *  breath of air for the discharge. */
  shot() {
    tone({ type: 'sawtooth', from: 2400, to: 260, gain: 0.075, length: 0.13 })
    tone({ type: 'square', from: 1200, to: 180, gain: 0.035, length: 0.09 })
    air({ from: 6000, to: 900, gain: 0.05, length: 0.16, q: 0.8 })
  },

  /** The bolt arriving on something that is not a target: a tap, and nothing
   *  else. Quieter than the shot, so a miss reads as a miss. */
  splash() {
    air({ from: 2600, to: 700, gain: 0.03, length: 0.09, q: 1.6 })
  },

  /** A bolt landing on the subject. Low and short and slightly unpleasant —
   *  it is a thing being hit, not a thing being picked. Nothing breaks, but
   *  nobody enjoys it either. */
  thud() {
    tone({ type: 'sine', from: 180, to: 52, gain: 0.11, length: 0.22 })
    air({ from: 900, to: 160, gain: 0.06, length: 0.13, q: 0.9 })
  },

  /** The bird, hit. */
  hit() {
    air({ from: 4000, to: 300, gain: 0.14, length: 0.22, q: 0.6 })
    tone({ type: 'sawtooth', from: 420, to: 60, gain: 0.06, length: 0.3 })
  },

  /** The machine coming up. A sweep, then the panel settling. */
  boot() {
    air({ from: 180, to: 4200, gain: 0.045, length: 0.75, q: 0.5 })
    tone({ type: 'sine', from: 110, to: 220, gain: 0.05, length: 0.6 })
    tone({ type: 'triangle', from: 990, gain: 0.05, length: 0.09, delay: 0.82 })
    tone({ type: 'triangle', from: 1480, gain: 0.04, length: 0.12, delay: 0.9 })
  }
}

/* ---- levels ----

   Three things make noise on the page: the synth effects (punctuation), the
   music, and a clip's own audio track. One store behind a small panel on the
   deck, persisted per browser, so the balance can be set by ear without a
   rebuild. A clip and the music are never heard at once — while a clip with
   sound is playing the deck pauses, and resumes where it left off when the
   clip stops (the deck watches `clipAudible`). */

export type Levels = { music: number; effects: number; clip: number }

export const LEVELS_DEFAULT: Levels = { music: 0.6, effects: 0.3, clip: 0.72 }
const LEVELS_KEY = 'v3.levels.v1'

const clampLevel = (value: unknown, fallback: number): number =>
  typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback

function loadLevels(): Levels {
  try {
    const raw = JSON.parse(window.localStorage.getItem(LEVELS_KEY) ?? '{}') as Record<string, unknown>
    return {
      music: clampLevel(raw.music, LEVELS_DEFAULT.music),
      effects: clampLevel(raw.effects, LEVELS_DEFAULT.effects),
      clip: clampLevel(raw.clip, LEVELS_DEFAULT.clip)
    }
  } catch {
    return { ...LEVELS_DEFAULT }
  }
}

let current: Levels = typeof window === 'undefined' ? { ...LEVELS_DEFAULT } : loadLevels()
let claims = 0
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

export const levels = {
  /** The set values, for the panel to draw. */
  get: (): Levels => current,

  /** Whether a clip with its own audio is playing right now. The deck pauses
   *  itself while this is true. */
  clipAudible: (): boolean => claims > 0,

  set(patch: Partial<Levels>) {
    current = { ...current, ...patch }
    if (master) master.gain.value = current.effects
    try {
      window.localStorage.setItem(LEVELS_KEY, JSON.stringify(current))
    } catch {
      /* private mode — losing the preference is fine */
    }
    notify()
  },

  reset() {
    levels.set({ ...LEVELS_DEFAULT })
  },

  /** Fired on any change — a slider moved, or a clip started or stopped. */
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }
}

/** A clip with audio holds this while it plays; the music ducks for it.
 *  Ref-counted: several clips, one dip. Returns its own release. */
export function claimAudio() {
  claims += 1
  if (claims === 1) notify()
  let released = false
  return () => {
    if (released) return
    released = true
    claims -= 1
    if (claims === 0) notify()
  }
}
