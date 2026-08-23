import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Leva } from 'leva'
import { TAGS } from '../data/projects'
import MechBird from './MechBird'
import MechCursor from './MechCursor'
import MechLaser from './MechLaser'
import MechHud from './MechHud'
import { useModelTuning } from './modelTuning'
import MechDeck from './MechDeck'
import { sound } from './sound'
import { drift } from './subject'
import { entries, thumbOf, type Entry, type Frame } from './model'
import { notesFor, pins, type Note } from './notes'
import { boxOf, leadersFor, mediaBox } from './leaders'
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
 *  Matches the cover time the cell delays below add up to. */
const EXIT_MS = 340

/** How long the cover will wait for the incoming frame to be ready to paint
 *  before giving up and uncovering anyway. A still that is slow to decode is
 *  better than a stage that stays black. */
const HOLD_CAP = 900

/* ---- disintegration ----

   Swapping frames is not a fade and not a wipe. A grid of cells grows over
   the subject until it has been eaten block by block, the frame changes
   underneath at full cover, and the cells shrink away again in a *different*
   order — so it rebuilds rather than un-wipes. Some flare accent as they
   land, which makes it read as something being written rather than hidden.

   The grid covers the subject's own box and nothing else. Laid over the whole
   frame it was dissolving a great deal of black, which is why it read as a
   curtain across the screen rather than as the picture itself coming apart. */

/** Side of one cell, in frame coordinates — how big a "pixel" is. */
const CELL = 11

/** Cells are cheap but not free, and every one is a DOM node. Past this the
 *  cell grows instead, so a large subject dissolves in slightly coarser
 *  blocks rather than costing four thousand spans. */
const MAX_CELLS = 3200

/** Cells of overspill past the subject's edges. Without it the field of
 *  green has a ruled rectangular border and the whole effect reads as an
 *  overlay laid on top rather than as the picture itself coming apart. */
const BLEED = 3

/** The model floats and turns, so its box has to be the space it moves
 *  through rather than where it happens to be sitting. A still does not
 *  move, and is dissolved to its own edges exactly. */
const PAD = { x: 0.1, y: 0.18 }

const dissolveBox = (frame: Frame) => {
  const box = boxOf(frame)
  if (frame.kind !== 'model') return box
  const x = box.w * PAD.x
  const y = box.h * PAD.y
  return { x: box.x - x, y: box.y - y, w: box.w + x * 2, h: box.h + y * 2 }
}

/** Timings per grid shape, worked out once and reused. The same scatter every
 *  time is a texture; a fresh one on every swap is noise — and generating two
 *  thousand random numbers at the moment a frame changes is the one moment
 *  not to be doing it. */
interface Cell {
  out: number
  in: number
  tone: number
  scale: number
  turn: number
}

const grids = new Map<string, { columns: number; rows: number; cells: Cell[] }>()

/** Grid shapes are rounded to this many cells before anything is built.
 *
 *  Two frames a few pixels apart in aspect would otherwise each get their own
 *  shape, and a shape nothing else shares is two thousand spans to reconcile
 *  at the moment the frame changes. Rounded, most of a project's frames land
 *  on the same grid and swapping between them touches no DOM at all. Six
 *  cells in sixty is under a tenth of a cell's worth of stretch, which is
 *  less than the scatter every cell already lands with. */
const STEP = 6

const gridFor = (box: { w: number; h: number }) => {
  // Whichever is larger: the cell we want, or the cell the budget allows.
  const side = Math.max(CELL, Math.sqrt((box.w * box.h) / MAX_CELLS))
  const quantize = (n: number) => Math.max(6, Math.round(n / STEP) * STEP)
  const columns = quantize(Math.ceil(box.w / side)) + BLEED * 2
  const rows = quantize(Math.ceil(box.h / side)) + BLEED * 2
  const key = `${columns}x${rows}`

  const found = grids.get(key)
  if (found) return found

  const cells = Array.from({ length: columns * rows }, (_, i) => {
    const across = (i % columns) / Math.max(columns - 1, 1)
    const down = Math.floor(i / columns) / Math.max(rows - 1, 1)
    // Out sweeps loosely left to right; in comes back from the middle
    // outward. Neither is tidy — the jitter is worth more than the direction,
    // and a cell at the trailing edge can still go first.
    const fromMiddle = Math.hypot(across - 0.5, down - 0.5) / 0.707

    /* Three tones, weighted hard toward black — a readout losing signal, not
       a screen of confetti — and thinned further toward the edges so the
       green fades off into the black instead of stopping at a ruled line.

       The weight *multiplies* the roll. Dividing by it, which is what this
       did, sent every cell near an edge to a roll far above every threshold:
       the border came out brightest and the cover was a solid mint
       rectangle. Low rolls are the dark end, so damping has to scale down. */
    const inset = Math.min(across, 1 - across, down, 1 - down)
    const roll = Math.random() * Math.min(inset / 0.16, 1)

    return {
      out: Math.round((across * 0.5 + Math.random() * 0.5) * 170),
      in: Math.round((fromMiddle * 0.55 + Math.random() * 0.45) * 260),
      tone: roll < 0.87 ? 0 : roll < 0.97 ? 1 : 2,
      /* Every cell lands at its own size and a few degrees off square. The
         overlap is what hides the lattice: a grid of identical squares all
         arriving at exactly 1.0 is a grid, however you time it. A square
         turned by θ needs cos θ + sin θ of scale to still cover its own
         cell, which is where the floor of 1.1 comes from. */
      scale: 1.1 + Math.random() * 0.12,
      turn: Math.round((Math.random() * 2 - 1) * 5)
    }
  })

  const grid = { columns, rows, cells }
  grids.set(key, grid)
  return grid
}

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

const warm = (frame: Frame | undefined) => {
  if (!frame || frame.kind === 'model' || frame.type !== 'image' || warmed.has(frame.id)) return
  warmed.add(frame.id)
  const image = new Image()
  image.src = frame.src
  // `decode` is the part that matters — a fetch alone leaves the expensive
  // half to happen on the frame it is first painted.
  void image.decode?.().catch(() => {})
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

function Disintegration({ frame, phase }: { frame: Frame; phase: 'out' | 'in' }) {
  const box = dissolveBox(frame)
  const { columns, rows, cells } = gridFor(box)

  // Held by identity across phase changes. React bails out of reconciling
  // children it is handed the same elements for, which is the difference
  // between changing one attribute and diffing four thousand spans at the
  // exact moment the frame is meant to be moving.
  const grid = useMemo(
    () =>
      cells.map((cell, i) => (
        <span
          key={i}
          data-tone={cell.tone}
          style={{
            ['--out' as string]: `${cell.out}ms`,
            ['--in' as string]: `${cell.in}ms`,
            ['--s' as string]: cell.scale,
            ['--r' as string]: `${cell.turn}deg`
          }}
        />
      )),
    [cells]
  )

  // The grid overspills the subject by `BLEED` cells on every side, so the
  // box it is laid out in is bigger than the box it is dissolving.
  const over = { x: (box.w / (columns - BLEED * 2)) * BLEED, y: (box.h / (rows - BLEED * 2)) * BLEED }

  return (
    <div
      className="mech-dissolve"
      data-phase={phase}
      style={{
        left: `calc(${box.x - over.x} * var(--px))`,
        top: `calc(${box.y - over.y} * var(--px))`,
        width: `calc(${box.w + over.x * 2} * var(--px))`,
        height: `calc(${box.h + over.y * 2} * var(--px))`,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`
      }}
    >
      {grid}
    </div>
  )
}

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
          src={frame.src}
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
            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '❙❙' : '▶'}
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
            >
              {muted ? '⊘' : '≋'}
            </button>
          </>
        ) : (
          <span className="mech-time">{frame.label ?? ''}</span>
        )}

        <button onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'}>
          {full ? '⤡' : '⤢'}
        </button>
      </div>
    </div>
  )
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
      for (const frame of frames) gridFor(dissolveBox(frame))
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
            <Leva
              collapsed
              hidden={!import.meta.env.DEV}
              titleBar={{ title: 'Subject tuning' }}
              theme={{
                colors: { elevation1: '#161616', elevation2: '#1d1d1d', elevation3: '#292929' },
                sizes: { rootWidth: 'min(340px, calc(100vw - 20px))' }
              }}
            />,
            document.body
          )
        : null}

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
        <div className="mech-stage">
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
