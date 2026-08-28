import { useEffect, useId, useRef, useState } from 'react'
import './Segment.css'

/* ---- the segment display ----

   A fourteen-segment alphanumeric readout, drawn rather than typed.

   There is no segment font in `public/fonts/` and adding one would not do the
   job anyway. The thing that makes a real VFD or LCD read as *hardware* is not
   the shape of the lit segments — it is the **unlit** ones, sitting there
   faintly all the time, so a word looks like it is being displayed by a fixed
   grid of lamps rather than set in a typeface that happens to look blocky. A
   font cannot draw what is switched off. So every cell here draws all fourteen
   of its segments, always, and lighting a character is a question of which
   ones come up.

   Everything is in the display's own user units and the viewBox does the
   scaling, so one rule sizes a readout and the geometry below never changes.

   Two things are drawn twice. The lit segments are painted once sharp and once
   through a Gaussian blur underneath — that is the bloom off the glass, and it
   is the whole difference between "green text" and "a lamp behind a filter".
   It is a filter on a handful of short lines and it only repaints when the
   word changes, which is the reason it is affordable at all. */

/** One cell's drawing area, and how far the next one starts along. */
const CELL = { w: 22, h: 36, advance: 27 }

/* The grid every segment is struck on. Three columns, three rows: the corners
   and the two centres. Everything below is a line between two of them. */
const L = 2
const MX = 11
const R = 20
const T = 2
const MY = 18
const B = 34

/** How far a segment stops short of the corner it runs to, so two meeting at
 *  a right angle read as two lamps and not as one bent one. */
const GAP = 2.4
/** The same, for the six that meet in the middle — tighter, because five of
 *  them converge on one point and the hole would otherwise be a hole. */
const HUB = 1.9

/** The fourteen, by their conventional letters. `G` is split in two so a
 *  middle bar can be half-lit, which is what makes G, K, R and 4 possible. */
const SEGMENTS: Record<string, [number, number, number, number]> = {
  A: [L + GAP, T, R - GAP, T],
  B: [R, T + GAP, R, MY - GAP],
  C: [R, MY + GAP, R, B - GAP],
  D: [L + GAP, B, R - GAP, B],
  E: [L, MY + GAP, L, B - GAP],
  F: [L, T + GAP, L, MY - GAP],
  G1: [L + GAP, MY, MX - HUB, MY],
  G2: [MX + HUB, MY, R - GAP, MY],
  H: [L + GAP, T + GAP, MX - HUB, MY - HUB],
  I: [MX, T + GAP, MX, MY - HUB],
  J: [R - GAP, T + GAP, MX + HUB, MY - HUB],
  K: [L + GAP, B - GAP, MX - HUB, MY + HUB],
  L: [MX, MY + HUB, MX, B - GAP],
  M: [R - GAP, B - GAP, MX + HUB, MY + HUB]
}

const KEYS = Object.keys(SEGMENTS)

/** Which segments each character lights.
 *
 *  Digits use only the seven outer ones plus both halves of the middle bar,
 *  so a number drawn here is a seven-segment number and looks it — which is
 *  what the boxed counts on this panel want. Letters are the standard
 *  starburst shapes. Anything not listed comes up blank, which is the honest
 *  thing for a display to do with a character it cannot form. */
const FONT: Record<string, string> = {
  '0': 'ABCDEF',
  '1': 'BC',
  '2': 'ABG1G2ED',
  '3': 'ABCDG1G2',
  '4': 'FG1G2BC',
  '5': 'AFG1G2CD',
  '6': 'AFEDCG1G2',
  '7': 'ABC',
  '8': 'ABCDEFG1G2',
  '9': 'ABCDFG1G2',
  A: 'ABCEFG1G2',
  B: 'ABCDG2IL',
  C: 'ADEF',
  D: 'ABCDIL',
  E: 'ADEFG1',
  F: 'AEFG1',
  G: 'ACDEFG2',
  H: 'BCEFG1G2',
  I: 'ADIL',
  J: 'BCDE',
  K: 'EFG1JM',
  L: 'DEF',
  M: 'BCEFHJ',
  N: 'BCEFHM',
  O: 'ABCDEF',
  P: 'ABEFG1G2',
  Q: 'ABCDEFM',
  R: 'ABEFG1G2M',
  S: 'ACDFG1G2',
  T: 'AIL',
  U: 'BCDEF',
  V: 'EFJK',
  W: 'BCEFKM',
  X: 'HJKM',
  Y: 'HJL',
  Z: 'ADJK',
  '-': 'G1G2',
  '+': 'G1G2IL',
  '/': 'JK',
  '\\': 'HM',
  '·': 'G1G2',
  '&': 'ACDEG1IM',
  '?': 'ABG2L',
  '!': 'IL',
  ' ': ''
}

/** Splitting a character's segment string is not `split('')` — `G1` and `G2`
 *  are two letters each. Longest match first. */
const lit = (glyph: string): Set<string> => {
  const spec = FONT[glyph] ?? ''
  const on = new Set<string>()
  for (let at = 0; at < spec.length; ) {
    const two = spec.slice(at, at + 2)
    if (SEGMENTS[two]) {
      on.add(two)
      at += 2
      continue
    }
    const one = spec.slice(at, at + 1)
    if (SEGMENTS[one]) on.add(one)
    at += 1
  }
  return on
}

/* Every character's mask is worked out once, on the module. A display of
   eighteen cells re-deriving its own alphabet on every scramble frame is a
   set of string operations forty times a second for no reason. */
const MASKS = new Map<string, Set<string>>(Object.keys(FONT).map((glyph) => [glyph, lit(glyph)]))

const maskOf = (glyph: string) => MASKS.get(glyph.toUpperCase()) ?? MASKS.get(' ')!

/* ---- the settle ----

   A word does not cut to the next one. Each cell runs a few frames of random
   segments and then lands on what it is meant to say, left to right — the way
   a display that has just been told something new comes up.

   This is the one place on this screen that fakes a machine doing work, and it
   earns it: the alternative for a readout changing is a cross-fade, and a
   cross-fade is a thing a screen does, not a thing a *panel* does.

   Held in state rather than written onto the nodes, unlike everything else on
   this page that animates. It is a handful of renders — six frames over a
   quarter-second — against a component with no children, and the alternative
   is fourteen ref writes per cell per frame. */

/** How long a frame of noise holds, how many of them a cell runs before it is
 *  allowed to settle, and how far behind its neighbour each cell lands. */
const SCRAMBLE = { hold: 45, frames: 4, stagger: 30 }

const NOISE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Noise, but reproducible for a given cell on a given frame — a plain
 *  `Math.random()` would reroll every cell on every unrelated re-render, so a
 *  display sitting still while something else on the panel updates would
 *  twitch. */
const noisy = (seed: number) => NOISE[Math.abs((seed * 2654435761) % NOISE.length)]

export interface SegmentProps {
  text: string
  /** How many cells the display has. Fixed, so a shorter word does not shrink
   *  the housing around it — a readout is a fixed number of lamps and the
   *  empty ones stay visible. */
  cells: number
  /** The warm channel instead of the panel's green. One reading at a time,
   *  the same way the compass marker is the only red thing on the strip. */
  warn?: boolean
  /** Off for a display that is only ever set once — a count in a box has
   *  nothing to settle from. */
  settle?: boolean
  /** Settle on the first word too, not only on a change. Off by default for
   *  the reason in the effect below — a readout that scrambles the instant it
   *  mounts is claiming it was already on and showing something else. A
   *  project's fold headings are the exception: they really are a row of
   *  lamps being switched on when a project opens, which is what the typed
   *  titles they replaced were saying. */
  arrive?: boolean
  align?: 'center' | 'left'
  label?: string
}

export default function Segment({
  text,
  cells,
  warn = false,
  settle = true,
  arrive = false,
  align = 'center',
  label
}: SegmentProps) {
  const id = useId()
  const want = text.toUpperCase().slice(0, cells)
  const pad = align === 'center' ? Math.max(0, Math.floor((cells - want.length) / 2)) : 0
  const target = ' '.repeat(pad) + want

  /** Which frame of the settle this is. `-1` is settled: every cell shows what
   *  it is meant to, and nothing is running. */
  const [frame, setFrame] = useState(-1)
  const first = useRef(true)

  useEffect(() => {
    // The first word is not a change. A display that scrambles the moment it
    // is mounted is one that was already on and showing something else, which
    // is a lie about a page that has just booted.
    if (!settle || (first.current && !arrive)) {
      first.current = false
      setFrame(-1)
      return
    }
    first.current = false
    let n = 0
    setFrame(0)
    // The last cell settles `frames` of noise plus its own place in the
    // cascade after the start; one more frame past that ends the run.
    const last = SCRAMBLE.frames + Math.ceil(((cells - 1) * SCRAMBLE.stagger) / SCRAMBLE.hold)
    const timer = window.setInterval(() => {
      n += 1
      setFrame(n > last ? -1 : n)
      if (n > last) window.clearInterval(timer)
    }, SCRAMBLE.hold)
    return () => window.clearInterval(timer)
  }, [target, cells, settle, arrive])

  /** How many cells have landed. Below zero for the opening frames, where the
   *  whole display is still churning. */
  const settled =
    frame < 0 ? cells : Math.floor((frame * SCRAMBLE.hold - SCRAMBLE.frames * SCRAMBLE.hold) / SCRAMBLE.stagger) + 1

  const glyphs = Array.from({ length: cells }, (_, n) => {
    const want = target[n] ?? ' '
    if (n < settled) return want
    // A cell with no character to show never scrambles: lighting lamps where
    // the word has already ended is noise for its own sake.
    if (want === ' ') return ' '
    return noisy(frame * cells + n)
  })

  const width = cells * CELL.advance

  return (
    <span className="mech-seg" data-warn={warn} aria-label={label ?? text}>
      <svg viewBox={`0 0 ${width} ${CELL.h + 4}`} preserveAspectRatio="xMidYMid meet" aria-hidden focusable="false">
        <defs>
          <filter id={`bloom-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>

        {/* Every segment of every cell, unlit. The grid of lamps the word is
            displayed *on*, and the reason this reads as hardware. */}
        <g className="mech-seg-off">
          {glyphs.map((_, n) =>
            KEYS.map((key) => {
              const [x1, y1, x2, y2] = SEGMENTS[key]
              const dx = n * CELL.advance + (CELL.advance - CELL.w) / 2
              return <line key={`${n}-${key}`} x1={x1 + dx} y1={y1 + 2} x2={x2 + dx} y2={y2 + 2} />
            })
          )}
        </g>

        {/* The lit ones, blurred, then again sharp on top. Same nodes twice —
            the blur is the light coming off the glass and the sharp pass is
            the segment itself, and neither one alone looks like either. */}
        {[`bloom`, `sharp`].map((pass) => (
          <g
            key={pass}
            className={pass === 'bloom' ? 'mech-seg-glow' : 'mech-seg-on'}
            filter={pass === 'bloom' ? `url(#bloom-${id})` : undefined}
          >
            {glyphs.map((glyph, n) =>
              [...maskOf(glyph)].map((key) => {
                const [x1, y1, x2, y2] = SEGMENTS[key]
                const dx = n * CELL.advance + (CELL.advance - CELL.w) / 2
                return <line key={`${n}-${key}`} x1={x1 + dx} y1={y1 + 2} x2={x2 + dx} y2={y2 + 2} />
              })
            )}
          </g>
        ))}
      </svg>
    </span>
  )
}
