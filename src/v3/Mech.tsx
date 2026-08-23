import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Leva, LevaPanel } from 'leva'
import { TAGS } from '../data/projects'
import MechBird from './MechBird'
import MechCursor from './MechCursor'
import MechLaser from './MechLaser'
import MechHud from './MechHud'
import { useModelTuning } from './modelTuning'
import MechDeck from './MechDeck'
import { sound } from './sound'
import { drift, flinch, quarry } from './subject'
import { entries, thumbOf, type Entry, type Frame } from './model'
import { focus, notesFor, pins, type Note } from './notes'
import { useLabelTuning, type Handed } from './labelTuning'
import { boxOf, leadersFor, mediaBox, MODEL_BOX, type Box } from './leaders'
import './Mech.css'

const MechModel = lazy(() => import('./MechModel'))
/* Development only — the render is behind `import.meta.env.DEV`, so a visitor
   never fetches this chunk. See `MechPins.tsx`. */
const MechPins = lazy(() => import('./MechPins'))

/* The project screen.

   Laid out in the Figma's 1920×1080 coordinates, but not confined to them.
   `--px` is one of those coordinates in real pixels, scaled to whatever the
   window is; the chrome hangs off the true viewport edges while the subject
   and its leader lines share one centred 16:9 box. So the page fills the
   screen at any shape, and the labels still touch the thing they name —
   which is the entire job of a readout.

   Left: who made it, and the folds. Middle: the thing itself, with its parts
   named. Right: everything else the project has to show. */

/** How long the frame on screen takes to be eaten before the next is mounted.
 *  Matches the cover the cells below add up to — `SPREAD.out + GROW` — so the
 *  picture changes at the moment the last one lands and not before. */
const EXIT_MS = 660

/** How long the cover will wait for the incoming frame to be ready to paint
 *  before giving up and uncovering anyway. A still that is slow to decode is
 *  better than a stage that stays black — and a cover that sits there for the
 *  best part of a second while a clip buffers is worse than either, which is
 *  why this is shorter than it was and why `warm` now starts the fetch when
 *  the tile is picked rather than when the frame is mounted. */
const HOLD_CAP = 480

/* ---- disintegration ----

   Swapping frames is not a fade and not a wipe. A grid of cells grows over
   the subject while the picture fades out underneath them, the frame changes
   at full cover, and the cells shrink away again in a *different* order — so
   it rebuilds rather than un-wipes.

   **Drawn on a canvas, not built out of elements.** It was a grid of spans
   with a CSS transition each, and that put a hard ceiling on how many pixels
   the effect could have: measured in Chrome, 3,888 of them cost 11ms to write
   a property onto and 35ms for the browser to resolve style across, twice per
   swap, before anything was painted. Six thousand rectangles on a canvas is
   two or three milliseconds and no layout, no style, no DOM at all — so the
   pixels can be small and numerous, which is the only size at which this
   reads as something digitising rather than as tiles falling over.

   The loop runs only while something is moving and stops when the last cell
   has landed. */

/** Side of one cell, in frame coordinates — how big a "pixel" is, and the
 *  ceiling on how many of them there are. Both are what they are because
 *  nothing here is an element any more: the ceiling went up with the field
 *  below it, so a cell stays the size it was drawn at rather than being
 *  stretched to fill a bigger area out of the same budget. */
const CELL = 10
const MAX_CELLS = 9000

/** Cells of overspill past everything the cover has to hide, so the green
 *  thins out into the dashboard rather than stopping at a ruled line. The
 *  ring is faded across, in `gridFor` — it is the only part of the field
 *  allowed to be sparse. */
const BLEED = 5

/** Milliseconds. `GROW` is how long one cell takes to arrive or leave, and
 *  the spreads are how far apart the first and last cell of a pass are — so
 *  a whole cover is `SPREAD.out + GROW`, which is what `EXIT_MS` has to
 *  match. Slower than a swap needs to be, on purpose: the picture coming
 *  apart is the part worth watching. */
const GROW = 320
const SPREAD = { out: 340, in: 460 }

/** The model floats and turns, so its box has to be the space it moves
 *  through rather than where it happens to be sitting. It is mounted in
 *  nothing, so it gets no housing. */
const PAD = { x: 0.1, y: 0.18 }

/** A still is not what goes when a frame goes — the housing goes with it. The
 *  brackets hang 13 out and are 15 long, the strip naming the frame sits a
 *  `--label-gap` above it and the transport's buttons are 30 tall under it,
 *  and every one of those fades on `[data-covered]` with the picture. Covering
 *  the picture alone is what left the housing dissolving on its own, outside a
 *  field that stopped at the picture's edge. Frame coordinates, matching
 *  `--label-gap`, `--label-inset` and the brackets in `Mech.css`. */
const HOUSING = { x: 30, top: 40, bottom: 48 }

/** Everything the cover has to hide. */
const coverBox = (frame: Frame): Box => {
  const box = boxOf(frame)
  if (frame.kind === 'model') {
    const x = box.w * PAD.x
    const y = box.h * PAD.y
    return { x: box.x - x, y: box.y - y, w: box.w + x * 2, h: box.h + y * 2 }
  }
  return {
    x: box.x - HOUSING.x,
    y: box.y - HOUSING.top,
    w: box.w + HOUSING.x * 2,
    h: box.h + HOUSING.top + HOUSING.bottom
  }
}

/** The canvas: everything that goes, plus the bleed ring outside it.
 *
 *  The bleed used to be counted into the grid without being added to the box,
 *  which put the ring *inside* the picture's own edges — the cells came out
 *  smaller and nothing overspilled at all. Adding it to the box is what makes
 *  it overspill; fading it in `gridFor` is what keeps it from painting a lit
 *  rectangle over the dashboard.
 *
 *  One pass at the cell size is enough. The bleed depends on the cell, the
 *  cell on the area and the area on the bleed, but the `CELL` floor wins on
 *  everything short of the largest subject, so a second pass would move the
 *  number by less than a cell. */
const fieldBox = (frame: Frame): Box => {
  const cover = coverBox(frame)
  const bleed = BLEED * Math.max(CELL, Math.sqrt((cover.w * cover.h) / MAX_CELLS))
  return { x: cover.x - bleed, y: cover.y - bleed, w: cover.w + bleed * 2, h: cover.h + bleed * 2 }
}

/** Timings per grid shape, worked out once and reused. The same scatter every
 *  time is a texture; a fresh one on every swap is noise — and generating six
 *  thousand random numbers at the moment a frame changes is the one moment
 *  not to be doing it.
 *
 *  `out` and `in` are fractions of their spread rather than milliseconds, so
 *  the timing above can be changed without invalidating a cached grid. */
interface Cell {
  out: number
  in: number
  tone: number
  scale: number
  turn: number
}

const grids = new Map<string, { columns: number; rows: number; cells: Cell[] }>()

/** Grid shapes are rounded to this many cells before anything is built, so
 *  most of a project's frames share one grid and one scatter. */
const STEP = 6

const gridFor = (box: { w: number; h: number }) => {
  // Whichever is larger: the cell we want, or the cell the budget allows. The
  // box already includes the bleed ring, so the budget counts it without
  // having to guess at what share of the grid it is.
  const side = Math.max(CELL, Math.sqrt((box.w * box.h) / MAX_CELLS))
  const quantize = (n: number) => Math.max(6, Math.round(n / STEP) * STEP)
  const columns = quantize(Math.ceil(box.w / side))
  const rows = quantize(Math.ceil(box.h / side))
  const key = `${columns}x${rows}`

  const found = grids.get(key)
  if (found) return found

  const cells: Cell[] = Array.from({ length: columns * rows }, (_, i) => {
    const across = (i % columns) / Math.max(columns - 1, 1)
    const down = Math.floor(i / columns) / Math.max(rows - 1, 1)
    // Out sweeps loosely left to right; in comes back from the middle
    // outward. Neither is tidy — the jitter is worth more than the direction,
    // and a cell at the trailing edge can still go first.
    const fromMiddle = Math.hypot(across - 0.5, down - 0.5) / 0.707

    /* Which rung of the ladder this cell sits on, weighted toward the dark
       end — a readout losing signal, not a screen of confetti — and thinned
       across the bleed ring so the field fades off rather than stopping at a
       ruled line.

       The falloff is the ring and nothing more. It used to be a flat sixth of
       the grid, which on a tall subject was a dozen cells of dusk eating into
       the picture the cover is there to hide; `BLEED / columns` is exactly the
       cells that hang outside it, so everything over the housing gets the full
       range of the ladder and only the overspill thins.

       The weight *multiplies* the roll. Dividing by it, which is what this
       did, sent every cell near an edge to a roll far above every threshold:
       the border came out brightest and the cover was a solid mint
       rectangle. Low rolls are the dark end, so damping has to scale down. */
    const ring = { x: BLEED / columns, y: BLEED / rows }
    const inset = Math.min(
      across / ring.x,
      (1 - across) / ring.x,
      down / ring.y,
      (1 - down) / ring.y
    )
    const roll = Math.random() * Math.min(inset, 1)

    return {
      out: across * 0.5 + Math.random() * 0.5,
      in: fromMiddle * 0.55 + Math.random() * 0.45,
      tone: TONES.findIndex((step) => roll <= step),
      /* Every cell lands at its own size and a few degrees off square. The
         overlap is what hides the lattice: a grid of identical squares all
         arriving at exactly 1.0 is a grid, however you time it. A square
         turned by θ needs cos θ + sin θ of scale to still cover its own
         cell, which is where the floor of 1.1 comes from. */
      scale: 1.1 + Math.random() * 0.12,
      turn: (Math.random() * 2 - 1) * 0.09
    }
  })

  const grid = { columns, rows, cells }
  grids.set(key, grid)
  return grid
}

/* ---- the ladder ----

   Seven rungs from nothing up to a pixel catching the light. It was three,
   and three is not enough to read as variation: two shades a hair apart are
   one shade with noise on it, and the whole field came out looking like one
   colour at two brightnesses.

   The thresholds are cumulative — a roll lands on the first rung it is under
   — and they are weighted hard toward the dark end, so the bright ones are
   scattered rather than everywhere. */
const TONES = [0.34, 0.53, 0.68, 0.79, 0.88, 0.95, 1]

/** Built from the readout's own accent so there is one green on the page.
 *  Rung 0 paints nothing at all: the picture is hidden by its own fade, and a
 *  filled cell out here would only paint over the dashboard. */
const ladder = (accent: string) => [
  '',
  '#0b1c17',
  '#123028',
  '#1b483b',
  '#2c7660',
  `rgba(${accent}, 0.85)`,
  '#e2fff3'
]

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Smoothstep. The same shape the cells used to get from their transition
 *  curve, now that there is no transition to get it from. */
const ease = (t: number) => t * t * (3 - 2 * t)

const Disintegration = memo(function Disintegration({ frame, phase }: { frame: Frame; phase: 'out' | 'in' }) {
  const surface = useRef<HTMLCanvasElement>(null)
  const box = fieldBox(frame)
  const { columns, rows, cells } = gridFor(box)
  /* The grid can change without the phase changing: the frame underneath is
     swapped at full cover, and a still of a different shape brings a
     different grid with it. Restarting the animation there would rebuild the
     cover from nothing at the one moment it has to be complete — so a run
     that is not a phase change starts already finished. */
  const last = useRef<'out' | 'in' | null>(null)

  useEffect(() => {
    const canvas = surface.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    /* The accent is read off the element rather than written here twice —
       `--accent` on `.mech` is the one green on the page. */
    const accent =
      getComputedStyle(canvas).getPropertyValue('--accent-rgb').trim() || '134, 226, 180'
    const palette = ladder(accent)

    let width = 0
    let height = 0
    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Measured on a resize rather than every frame: reading a rect inside the
    // loop is a layout flush sixty times a second for a number that changes
    // when the window does.
    const watch = new ResizeObserver(measure)
    watch.observe(canvas)
    measure()

    const spread = phase === 'out' ? SPREAD.out : SPREAD.in
    const turning = last.current !== phase
    last.current = phase
    const started = turning ? performance.now() : performance.now() - (spread + GROW)
    let raf = 0

    const paint = (now: number) => {
      const at = now - started
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)

      const cw = width / columns
      const ch = height / rows

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        if (cell.tone === 0) continue

        const delay = (phase === 'out' ? cell.out : cell.in) * spread
        const along = ease(clamp01((at - delay) / GROW))
        const size = (phase === 'out' ? along : 1 - along) * cell.scale
        if (size <= 0.01) continue

        const x = (i % columns) * cw + cw / 2
        const y = Math.floor(i / columns) * ch + ch / 2
        const w = cw * size
        const h = ch * size

        // `setTransform` rather than save/rotate/restore: the same result for
        // six thousand cells without six thousand state pushes.
        const cos = Math.cos(cell.turn)
        const sin = Math.sin(cell.turn)
        context.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * x, dpr * y)
        context.fillStyle = palette[cell.tone]
        context.fillRect(-w / 2, -h / 2, w, h)
      }

      if (at < spread + GROW) raf = requestAnimationFrame(paint)
    }

    raf = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(raf)
      watch.disconnect()
    }
  }, [phase, cells, columns, rows])

  return (
    <div
      className="mech-dissolve"
      style={{
        left: `calc(${box.x} * var(--px))`,
        top: `calc(${box.y} * var(--px))`,
        width: `calc(${box.w} * var(--px))`,
        height: `calc(${box.h} * var(--px))`
      }}
    >
      <canvas ref={surface} />
    </div>
  )
})

/* ---- warming ----

   The pictures on this page are big: several of them are multi-megabyte webp,
   and decoding one of those is a hundred milliseconds of main thread. Doing
   it at the moment the cover lifts is exactly the stutter you can see, and
   `HOLD_CAP` only ever hid the loading half of it.

   So the frames either side of the one on the stage are pulled through the
   network and the decoder while nothing is happening, and the decoded bitmap
   is still warm when you step to them. Neighbours rather than everything: a
   project with a dozen stills is fifty megabytes of decoded pixels, and
   nobody opens a readout to look at all of it at once. */

const warmed = new Set<string>()

/** Held so the browser does not collect a clip the moment it is buffered and
 *  then have to fetch it again a second later. Two or three at a time. */
const buffering: HTMLVideoElement[] = []
const BUFFERS = 4

const warm = (frame: Frame | undefined) => {
  if (!frame || frame.kind === 'model' || warmed.has(frame.id)) return
  warmed.add(frame.id)

  if (frame.type === 'image') {
    const image = new Image()
    image.src = frame.still ?? frame.src
    // `decode` is the part that matters — a fetch alone leaves the expensive
    // half to happen on the frame it is first painted.
    void image.decode?.().catch(() => {})
    return
  }

  /* Clips are the slow ones — several megabytes each, and the housing waits
     for `loadeddata` before it uncovers, which is the pause. Pulled through
     the network here, into the HTTP cache the real `<video>` will hit; the
     element is never mounted and never plays. */
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.src = frame.src
  video.load()
  buffering.push(video)
  while (buffering.length > BUFFERS) {
    const old = buffering.shift()
    if (old) old.src = ''
  }
}

/** Whenever the browser has a moment. Not `setTimeout(0)`: this is deliberately
 *  the lowest-priority work on the page, and it is competing with a boot
 *  sequence and a WebGL context coming up. */
const whenIdle = (run: () => void) => {
  const host = window as Window & {
    requestIdleCallback?: (cb: () => void) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (host.requestIdleCallback) {
    const id = host.requestIdleCallback(run)
    return () => host.cancelIdleCallback?.(id)
  }
  const timer = window.setTimeout(run, 600)
  return () => window.clearTimeout(timer)
}

/** The model goes first. "Open a project" means the object, and the stills are
 *  what you step to afterwards — `model.ts` appends it because the index
 *  screen wants it last. */
const modelFirst = (entry: Entry): Frame[] => [
  ...entry.frames.filter((frame) => frame.kind === 'model'),
  ...entry.frames.filter((frame) => frame.kind !== 'model')
]

interface LeadersProps {
  notes: Note[]
  box: ReturnType<typeof boxOf>
  floats: boolean
  /** A fold the pointer is over, or a leader's own label. Anything named is
   *  lit and everything else is dimmed — one at a time, so the link reads as
   *  a link rather than as a colour scheme. */
  lit: string | null
  onLit: (key: string | null) => void
}

function Leaders({ notes, box, floats, lit, onLit }: LeadersProps) {
  const group = useRef<SVGGElement>(null)

  /* The labels ride the same bob the subject is on, read from what the float
     actually did this frame rather than from an animation timed to look like
     it — two clocks that agree at the start and not a minute later is exactly
     the sort of thing nobody can name and everybody notices.

     Damped a little, so the lines lag the head by a hair. Chasing it exactly
     makes the whole assembly feel welded together; trailing it makes the
     labels feel pinned *to* something. */
  useEffect(() => {
    if (!floats) return
    let raf = 0
    let x = 0
    let y = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      x += (drift.x - x) * 0.18
      y += (drift.y - y) * 0.18
      group.current?.setAttribute('transform', `translate(${x} ${y})`)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [floats])

  return (
    <svg className="mech-leaders" viewBox="0 0 1920 1080" preserveAspectRatio="none" data-lit={lit !== null} aria-hidden>
      <g ref={group}>
      {leadersFor(notes, box).map((leader, i) => {
        const y = leader.elbow[1]
        const length =
          Math.abs(leader.end - leader.elbow[0]) +
          Math.hypot(leader.tip[0] - leader.elbow[0], leader.tip[1] - y)
        const delay = 200 + i * 130

        const on = lit !== null && (lit === leader.label || lit === leader.fold)

        return (
          <g
            key={leader.label}
            data-on={on}
            onPointerEnter={() => onLit(leader.label)}
            onPointerLeave={() => onLit(null)}
          >
            {/* The mark on the spot. A line arriving at a picture tells you
                there is something there; a ring opening on it tells you
                *which* thing, which is the entire job of a leader and the one
                part a bare polyline could never do. Drawn before the line so
                the line is laid over it rather than under. */}
            <circle
              className="mech-leader-ping"
              cx={leader.tip[0]}
              cy={leader.tip[1]}
              r={13}
              style={{ animationDelay: `${delay + 520}ms` }}
            />
            <circle
              className="mech-leader-mark"
              cx={leader.tip[0]}
              cy={leader.tip[1]}
              r={6.5}
              style={{ animationDelay: `${delay + 420}ms` }}
            />
            <circle
              className="mech-leader-core"
              cx={leader.tip[0]}
              cy={leader.tip[1]}
              r={1.9}
              style={{ animationDelay: `${delay + 420}ms` }}
            />
            <polyline
              className="mech-leader"
              points={`${leader.end},${y} ${leader.elbow[0]},${y} ${leader.tip[0]},${leader.tip[1]}`}
              style={{ ['--l' as string]: length, animationDelay: `${delay}ms` }}
            />
            <text
              className="mech-leader-label"
              x={leader.end}
              y={y - 9}
              textAnchor={leader.anchor}
              style={{ animationDelay: `${delay + 300}ms` }}
            >
              {leader.label}
            </text>
            <text
              className="mech-leader-value"
              x={leader.end}
              y={y + 21}
              textAnchor={leader.anchor}
              style={{ animationDelay: `${delay + 380}ms` }}
            >
              {leader.value}
            </text>
          </g>
        )
      })}
      </g>
    </svg>
  )
}

/* ---- transport icons ----

   Drawn rather than typed. The transport was a row of single characters —
   `▶`, `⊘`, `⤢` — at eleven frame pixels, which is a row of specks: nobody
   could tell the full screen control from the mute one, and `⊘` does not say
   "muted" in any font. These are the same weight of line as the reticle and
   the bird, and they scale with the frame like everything else.

   `viewBox` is 24 square for all of them, so one CSS rule sizes the set. */

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="mech-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
    {children}
  </svg>
)

const PLAY = (
  <Icon>
    {/* The one filled shape in the set: a triangle in outline reads as a
        cursor rather than as play. */}
    <path className="mech-icon-solid" d="M 8 5 L 19 12 L 8 19 Z" />
  </Icon>
)

const PAUSE = (
  <Icon>
    <path d="M 9 5 v 14 M 15 5 v 14" />
  </Icon>
)

const SOUND = (
  <Icon>
    <path d="M 4 9.5 h 3.5 L 12 5.5 v 13 L 7.5 14.5 H 4 Z" />
    <path d="M 15.5 9 a 4.4 4.4 0 0 1 0 6" />
    <path d="M 18 6.5 a 8 8 0 0 1 0 11" />
  </Icon>
)

const MUTED = (
  <Icon>
    <path d="M 4 9.5 h 3.5 L 12 5.5 v 13 L 7.5 14.5 H 4 Z" />
    <path d="M 16 9.5 l 5 5 M 21 9.5 l -5 5" />
  </Icon>
)

const FULL = (
  <Icon>
    <path d="M 4 9 V 4 h 5 M 20 9 V 4 h -5 M 4 15 v 5 h 5 M 20 15 v 5 h -5" />
  </Icon>
)

const UNFULL = (
  <Icon>
    <path d="M 9 4 v 5 H 4 M 15 4 v 5 h 5 M 9 20 v -5 H 4 M 15 20 v -5 h 5" />
  </Icon>
)

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/* ---- the housing ----

   The subject sits in something, the way every readout on a dashboard does:
   corner brackets, a label strip naming what you are looking at, and a scale
   of ticks along the bottom edge. Without it a still is a picture floating in
   a void, and the rest of the screen is instruments.

   Positioned in frame coordinates off the same `mediaBox()` the leaders are
   laid out against, so the housing, the labels and the lines cannot disagree
   about where the picture is. */

interface FrameProps {
  frame: Extract<Frame, { kind: 'flat' }>
  index: number
  count: number
  onReady: () => void
}

function Flat({ frame, index, count, onReady }: FrameProps) {
  const box = mediaBox(frame.aspect)
  const shell = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const [at, setAt] = useState(0)
  const [length, setLength] = useState(0)
  const [full, setFull] = useState(false)

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === shell.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const place = {
    left: `calc(${box.x} * var(--px))`,
    top: `calc(${box.y} * var(--px))`,
    width: `calc(${box.w} * var(--px))`,
    height: `calc(${box.h} * var(--px))`
  }

  /** The cover comes off when the picture can actually be painted, which is
   *  after the decode and not after the download. Called from both the ref
   *  and `load`; lifting a cover that is already up is a no-op. */
  const decoded = (image: HTMLImageElement) => {
    const done = () => onReady()
    if (image.decode) void image.decode().then(done, done)
    else done()
  }

  const toggleFull = () => {
    sound.select()
    if (document.fullscreenElement) void document.exitFullscreen()
    else void shell.current?.requestFullscreen().catch(() => {})
  }

  const togglePlay = () => {
    const el = video.current
    if (!el) return
    sound.select()
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }

  return (
    <div className="mech-housing" data-full={full} style={place} ref={shell}>
      <div className="mech-housing-label">
        <span>{frame.type === 'video' ? 'clip' : 'still'}</span>
        <span className="mech-housing-count">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
      </div>

      {frame.type === 'video' ? (
        /* No `poster`. The cover is held until `loadeddata`, so a poster has
           nothing left to do except be the thing that flashes if the clip is
           slower than the cap. Muted on arrival because a clip that starts
           talking on its own is a hostile thing for a page to do — the
           transport is how you ask for the sound. */
        <video
          className="mech-media"
          ref={video}
          src={frame.src}
          muted={muted}
          loop
          autoPlay
          playsInline
          onClick={togglePlay}
          onLoadedData={onReady}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setAt(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setLength(event.currentTarget.duration)}
        />
      ) : (
        <img
          className="mech-media"
          // The 1600px copy, never the master — see `MediaItem.still`.
          src={frame.still ?? frame.src}
          alt={frame.label ?? ''}
          // Decoded off the main thread, and the cover held until it is —
          // `load` only means the bytes arrived, and uncovering onto a
          // multi-megabyte webp that has not been decoded yet is a stall on
          // the exact frame the picture is meant to appear.
          decoding="async"
          // A cached image can finish loading before React attaches the
          // handler, and then `onLoad` never fires and the cover sits there
          // until the cap.
          ref={(el) => {
            if (el?.complete) decoded(el)
          }}
          onLoad={(event) => decoded(event.currentTarget)}
        />
      )}

      <i className="mech-corner" data-at="tl" />
      <i className="mech-corner" data-at="tr" />
      <i className="mech-corner" data-at="bl" />
      <i className="mech-corner" data-at="br" />

      <div className="mech-transport">
        {frame.type === 'video' ? (
          <>
            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>
              {playing ? PAUSE : PLAY}
            </button>
            <input
              type="range"
              min={0}
              max={length || 0}
              step={0.01}
              value={at}
              onChange={(event) => {
                const to = Number(event.target.value)
                if (video.current) video.current.currentTime = to
                setAt(to)
              }}
              aria-label="Seek"
            />
            <span className="mech-time">
              {clock(at)} / {clock(length)}
            </span>
            <button
              data-off={muted}
              onClick={() => {
                sound.select()
                setMuted((was) => !was)
              }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Sound on' : 'Mute'}
            >
              {muted ? MUTED : SOUND}
            </button>
          </>
        ) : (
          <span className="mech-time">{frame.label ?? ''}</span>
        )}

        <button
          onClick={toggleFull}
          aria-label={full ? 'Exit full screen' : 'Full screen'}
          title={full ? 'Exit full screen' : 'Full screen'}
        >
          {full ? UNFULL : FULL}
        </button>
      </div>
    </div>
  )
}

/* ---- the source, on screen ----

   Whatever the copy buttons hand over is also shown, always, in a field that
   is already selected. The clipboard is the one part of this that cannot be
   checked: there is no reading it back, `execCommand` reports success it did
   not have, and on a plain http origin — which is what the dev server is over
   the tailnet — the modern API is not there at all.

   Portalled to `body` rather than drawn on the readout. Inside `.mech` the
   native cursor is hidden, so a text field there is one you cannot see
   yourself select in, and the pin overlay treats every press as a placement.
   Out here it is an ordinary dialog and ⌘C is an ordinary ⌘C. */
function Source({ handed, onClose }: { handed: Handed; onClose: () => void }) {
  const field = useRef<HTMLTextAreaElement>(null)

  // In an effect rather than a ref callback: the button that opened this still
  // has the focus at the moment the ref runs, and whichever of the two lands
  // second is the one that wins.
  useEffect(() => {
    if (!handed) return
    const timer = window.setTimeout(() => {
      field.current?.focus()
      field.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [handed])

  if (!handed) return null

  return createPortal(
    <div className="mech-source" role="dialog" aria-label="Label source">
      <div className="mech-source-head">
        <span>
          {handed.copied ? 'copied ✓' : 'no clipboard on this origin'} — paste into NOTES in src/v3/notes.ts
        </span>
        <button
          onClick={() => {
            field.current?.focus()
            field.current?.select()
          }}
        >
          select all
        </button>
        <button onClick={onClose}>close</button>
      </div>
      <textarea ref={field} readOnly value={handed.text} spellCheck={false} />
    </div>,
    document.body
  )
}

/** Both panels wear the same dark theme as the readout rather than Leva's
 *  default blue-on-grey. */
const PANEL = {
  colors: { elevation1: '#161616', elevation2: '#1d1d1d', elevation3: '#292929' },
  sizes: { rootWidth: 'min(340px, calc(100vw - 20px))' }
}

/** How long the machine takes to come up: the grid strikes on, the compass
 *  spins and settles, and only then do the leaders extend. */
const BOOT_MS = 1500

interface Props {
  id: string
  /** Retarget to another project without unmounting: the readout swings over
   *  rather than the page being replaced. */
  onProject: (id: string) => void
  onHome: () => void
}

/** Reveals its text a character at a time. Used once, on the title, because
 *  the title is the one line that changes when the readout retargets. */
function Typed({ text, run }: { text: string; run: string }) {
  const out = useRef<HTMLSpanElement>(null)
  /* The only thing state is used for here is the caret going out at the end.
     Setting it per character re-rendered the whole project screen forty times
     a second while the title typed — the rail, the folds, the leaders and all
     — which is a stutter you can see, on the one beat of the page that is
     meant to be a machine coming up smoothly. The text itself is written
     straight to the node. */
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDone(false)
    let at = 0
    if (out.current) out.current.textContent = ''
    const timer = window.setInterval(() => {
      at += 1
      if (out.current) out.current.textContent = text.slice(0, at)
      if (at >= text.length) {
        window.clearInterval(timer)
        setDone(true)
      }
    }, 26)
    return () => window.clearInterval(timer)
  }, [text, run])

  return (
    <>
      <span ref={out} />
      <span className="mech-caret" data-done={done} />
    </>
  )
}

export default function Mech({ id, onProject, onHome }: Props) {
  const tuning = useModelTuning()
  /* The label maker's half that belongs on the panel rather than over the
     picture: copying out, reverting, and adding a line without having a
     picture to click on. See `labelTuning.ts`. */
  const [handed, setHanded] = useState<Handed>(null)
  const labels = useLabelTuning(setHanded)
  /* The project on screen trails the one in the URL by a transit, the same
     way the frame trails the tile you picked. Retargeting is the readout
     swinging over to something else, not a page being replaced. */
  const [shownId, setShownId] = useState(id)
  const [booting, setBooting] = useState(true)
  const [lit, setLit] = useState<string | null>(null)
  const entry = entries.find((item) => item.project.id === shownId) ?? null
  const frames = useMemo(() => (entry ? modelFirst(entry) : []), [entry])
  const [index, setIndex] = useState(0)
  /* What is actually on the stage, which trails `index` by the swap. Picking
     a tile lights it immediately — the feedback is instant — while the frame
     it points at is eaten and the next one arrives.

     Three phases, not two. `hold` is the frame after the cover completes and
     before it lifts: the incoming still or clip is mounted but has not
     necessarily painted, and uncovering onto an undecoded video is what was
     showing its poster for a beat and then cutting to the real thing. */
  const [shown, setShown] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out' | 'hold'>('in')
  const [open, setOpen] = useState<string | null>('overview')
  const rail = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  /* What has been pinned in this browser, if anything. Subscribed rather than
     read once: the editor writes to the same store the leaders read from, so
     a drag moves the real line rather than a preview of one. */
  const drafts = useSyncExternalStore(pins.subscribe, pins.snapshot, pins.snapshot)
  const [pinning, setPinning] = useState(false)

  const current = frames[shown]
  const modelFrame = frames.find((frame) => frame.kind === 'model')
  const covered = phase !== 'in' || booting

  // The machine coming up, once, on arrival.
  useEffect(() => {
    sound.boot()
    const timer = window.setTimeout(() => setBooting(false), BOOT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  /* Retargeting. The subject comes apart, the project underneath changes, and
     the rail goes back to the model — reusing the same cover the frame swap
     uses, because it is the same gesture at a larger scale. */
  useEffect(() => {
    if (id === shownId) return
    sound.dissolve()
    setPhase('out')
    const timer = window.setTimeout(() => {
      setShownId(id)
      setIndex(0)
      setShown(0)
      setOpen('overview')
      setPhase('hold')
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [id, shownId])


  useEffect(() => {
    if (index === shown) return
    /* Started here rather than when the frame is mounted, which is a third of
       a second later at full cover: the cover is time the picture could have
       been loading in, and spending it doing nothing is most of the pause
       people saw between one picture and the next. */
    warm(frames[index])
    sound.dissolve()
    setPhase('out')
    const timer = window.setTimeout(() => {
      setShown(index)
      setPhase('hold')
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [index, shown])

  // A model is its own Suspense boundary and has nothing to decode; anything
  // else lifts the cover when it says it is ready, or when the cap runs out.
  useEffect(() => {
    if (phase !== 'hold') return
    if (frames[shown]?.kind === 'model') {
      setPhase('in')
      return
    }
    const cap = window.setTimeout(() => setPhase('in'), HOLD_CAP)
    return () => window.clearTimeout(cap)
  }, [phase, shown, frames])

  /* The subject is a target while it is the thing on the stage. Registered
     as a box in client pixels worked out from the stage's own rect, so it
     scales with the composition and needs no element of its own — and padded
     out to the space the float actually moves the head through, the same
     reasoning as `dissolveBox`. A still is not a target: shooting a
     photograph of something is shooting a photograph. */
  useEffect(() => {
    if (current?.kind !== 'model') return
    quarry.subject = {
      rect: () => {
        const box = stage.current?.getBoundingClientRect()
        if (!box) return null
        const px = box.width / 1920
        const pad = { x: MODEL_BOX.w * PAD.x, y: MODEL_BOX.h * PAD.y }
        return new DOMRect(
          box.left + (MODEL_BOX.x - pad.x) * px,
          box.top + (MODEL_BOX.y - pad.y) * px,
          (MODEL_BOX.w + pad.x * 2) * px,
          (MODEL_BOX.h + pad.y * 2) * px
        )
      },
      hit: () => {
        flinch.at = performance.now()
        sound.thud()
      }
    }
    return () => {
      quarry.subject = null
    }
  }, [current])

  // What the panel's label buttons act on.
  useEffect(() => {
    focus.id = current?.id ?? ''
  }, [current])

  // P opens the pin editor, in development. Not while something is being
  // typed into — the editor is mostly text fields, and a shortcut that fires
  // inside one is a shortcut that cannot be spelled.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'p' && event.key !== 'P') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const on = event.target as HTMLElement | null
      if (on && (on.tagName === 'INPUT' || on.tagName === 'TEXTAREA' || on.isContentEditable)) return
      setPinning((was) => !was)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* The neighbours of whatever is on the stage, and the grid shapes this
     project's frames dissolve through — both worked out while the machine is
     still booting or the visitor is still reading, rather than on the frame
     something has to move. */
  useEffect(() => {
    return whenIdle(() => {
      warm(frames[shown + 1])
      warm(frames[shown - 1])
      warm(frames[shown + 2])
      for (const frame of frames) gridFor(fieldBox(frame))
    })
  }, [frames, shown])

  // A project with a dozen frames outruns the rail's height, so stepping with
  // the arrow keys has to bring the tile back into view.
  useEffect(() => {
    rail.current?.children[index]?.scrollIntoView({ block: 'nearest' })
  }, [index])

  // The arrow keys step the rail, the same as clicking it.
  useEffect(() => {
    if (frames.length < 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') setIndex((at) => (at - 1 + frames.length) % frames.length)
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') setIndex((at) => (at + 1) % frames.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length])

  if (!entry || !current) return <div className="mech" />

  const { project } = entry
  const roles = project.sections.find((section) => section.id === 'roles')?.tags ?? []
  const notes = notesFor(entry, current, drafts)

  const folds = [
    ...(project.intro ? [{ id: 'overview', title: 'project overview', text: project.intro, tags: undefined }] : []),
    ...project.sections
      .filter((section) => section.id !== 'roles')
      .map((section) => ({ id: section.id, title: section.title.toLowerCase(), text: section.text, tags: section.tags }))
  ]

  return (
    <div className="mech" data-boot={booting} data-pins={pinning}>
      {/* Development only, and portalled to `body` for the same reason the
          gallery's panel is: rendered in place it would sit inside the
          readout's stacking context and paint under the chrome. */}
      {typeof document !== 'undefined'
        ? createPortal(
            <>
              <Leva
                collapsed
                hidden={!import.meta.env.DEV}
                titleBar={{ title: 'Subject tuning' }}
                theme={PANEL}
              />
              {/* Its own panel, not a folder under the subject's lighting:
                  they have nothing to do with each other. Sits under the
                  first one, which is where Leva stacks a second. */}
              {import.meta.env.DEV && (
                <div className="mech-labels-panel">
                  <LevaPanel store={labels} collapsed fill titleBar={{ title: 'Labels', drag: false }} theme={PANEL} />
                </div>
              )}
            </>,
            document.body
          )
        : null}

      <Source handed={handed} onClose={() => setHanded(null)} />

      <MechHud />
      <MechCursor />
      <MechBird />
      <MechLaser />

      <div className="mech-frame">
        <header className="mech-head">
          <button className="mech-wordmark" onClick={onHome}>
            Tarlok Singh
          </button>
          {/* Each tag steps to the next project carrying it, wrapping — the
              row is a way through the work rather than a legend for it. A tag
              nothing else answers to is left inert rather than looking
              pressable and doing nothing. */}
          <nav className="mech-nav">
            <span className="mech-nav-here">{project.title.toLowerCase()}</span>
            {TAGS.filter((tag) => tag !== 'work').map((tag) => {
              const along = entries.filter((item) => item.project.tags.includes(tag))
              const next = along[(along.findIndex((item) => item.project.id === shownId) + 1) % Math.max(along.length, 1)]
              return (
                <button
                  key={tag}
                  data-on={project.tags.includes(tag)}
                  disabled={along.length === 0 || (along.length === 1 && next?.project.id === shownId)}
                  onClick={() => {
                    if (!next) return
                    sound.select()
                    onProject(next.project.id)
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </nav>
        </header>

        {/* The subject and its labels share one box so that scaling the window
            moves them together. */}
        <div className="mech-stage" ref={stage} data-covered={covered}>
          {/* The model is mounted for as long as the project has one, and
              hidden rather than unmounted while a still is on the stage.

              Unmounting it threw away a WebGL context, a compiled set of
              shaders, a cloned scene graph and a generated environment map,
              and building all of that again is most of a hundred milliseconds
              on the main thread — a hitch, every single time you stepped back
              to the model. Hidden and stopped it costs nothing per frame: see
              `live` in MechModel, which puts the render loop to sleep. */}
          {modelFrame && (
            <div className="mech-model-layer" data-on={current.kind === 'model'}>
              <Suspense fallback={null}>
                <MechModel src={modelFrame.src} tuning={tuning} live={current.kind === 'model'} />
              </Suspense>
            </div>
          )}
          {current.kind !== 'model' && (
            <Flat
              // Prefixed: the leaders below are keyed on the same frame, and
              // two siblings under one parent with the same key is a duplicate
              // React resolves by leaving the outgoing housing in the DOM.
              key={`flat-${current.id}`}
              frame={current}
              index={shown}
              count={frames.length}
              onReady={() => setPhase((at) => (at === 'hold' ? 'in' : at))}
            />
          )}
          {/* Keyed on the frame, so stepping the rail draws the leaders out
              again rather than revealing them already extended. */}
          {/* Held back until the machine is up: the leaders extending is the
              last beat of the boot, not something already there when it
              finishes. */}
          {!booting && (
            <Leaders
              key={`leaders-${current.id}`}
              notes={notes}
              box={boxOf(current)}
              floats={current.kind === 'model'}
              lit={lit}
              onLit={setLit}
            />
          )}

          <Disintegration frame={current} phase={covered ? 'out' : 'in'} />

          {import.meta.env.DEV && pinning && (
            <Suspense fallback={null}>
              <MechPins frame={current} notes={notes} onClose={() => setPinning(false)} />
            </Suspense>
          )}
        </div>

        <section className="mech-side">
          <h1 className="mech-title">
            <Typed text={project.title} run={shownId} />
          </h1>
          {roles.length > 0 && <p className="mech-roles">{roles.join(', ').toLowerCase()}</p>}

          <div className="mech-folds">
            {folds.map((fold) => {
              const isOpen = open === fold.id
              return (
                <div className="mech-fold" key={fold.id} data-open={isOpen}>
                  <button
                    onClick={() => {
                      sound.select()
                      setOpen(isOpen ? null : fold.id)
                    }}
                    onPointerEnter={() => setLit(fold.id)}
                    onPointerLeave={() => setLit(null)}
                    aria-expanded={isOpen}
                  >
                    <span className="mech-pip" />
                    <span>{fold.title}</span>
                  </button>

                  {/* Always mounted, and opened by growing its row from 0fr to
                      1fr — the only way a panel of unknown height can animate
                      shut as well as open. */}
                  <div className="mech-fold-body">
                    <div>
                      <span className="mech-fold-rule" />
                      <p>{fold.tags ? fold.tags.join(', ').toLowerCase() : fold.text}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="mech-rail" ref={rail}>
          {frames.map((frame, i) => {
            const thumb = thumbOf(frame)
            return (
              <button
                key={frame.id}
                className="mech-tile"
                aria-pressed={i === index}
                aria-label={frame.label ?? project.title}
                title={frame.label ?? project.title}
                style={{ ...(thumb ? { backgroundImage: `url(${thumb})` } : {}), ['--i' as string]: i }}
                /* Hovering is the earliest honest signal that a frame is
                   about to be wanted, and it buys a few hundred milliseconds
                   of head start on the fetch for free. */
                onPointerEnter={() => warm(frame)}
                onClick={() => {
                  sound.select()
                  setIndex(i)
                }}
              >
                {thumb ? null : <span>3D</span>}
              </button>
            )
          })}
        </div>

        <footer className="mech-foot">
          <MechDeck />
          <a href="mailto:hello@tarloksingh.com">
            hello@tarloksingh.com
          </a>
        </footer>
      </div>
    </div>
  )
}
