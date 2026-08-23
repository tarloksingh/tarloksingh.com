import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
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
import { boxOf, leadersFor, mediaBox, MODEL_BOX } from './leaders'
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

/** How long the frame on screen takes to leave before the next is mounted:
 *  the picture's own fade, then everything mounted around it running its entry
 *  backwards after a beat. The longest of those is the leader retracting —
 *  140 of delay and 420 of draw — and this has to outlast it, or the next set
 *  of lines is drawn over the last set still coming off. Timed in Mech.css,
 *  under `entries, and their inverses`. */
const EXIT_MS = 800

/** How long the stage will wait, empty, for the incoming frame to be ready to
 *  paint before bringing it in anyway. Nothing covers the gap now, so this is
 *  a hole in the middle of the transition rather than time hidden behind a
 *  field of cells — shorter than it was for that reason, and mostly unspent:
 *  `warm` starts the fetch when the tile is picked, so a neighbour is usually
 *  decoded before its turn comes. */
const HOLD_CAP = 300

/* ---- the type scale ----

   `--type` in Mech.css floors the type at a rem so it survives a small window
   and follows browser zoom. It reaches everything set in HTML by being a
   length. It cannot reach the leaders or the compass: those are SVG text,
   drawn in user units that the viewBox scales by `--px`, and a rem written in
   there would be scaled along with everything else.

   What crosses is the ratio between the two — a plain number multiplies the
   same in both coordinate systems. It has to be measured rather than worked
   out here: `--px` and `--type` are `min()`/`max()` over rem and viewport
   units, and `getComputedStyle` hands back the expression, not the value. So
   a hidden probe is sized by both and its own box is read.

   On a resize, which is also what zoom fires. */
const useTypeScale = (root: RefObject<HTMLDivElement | null>, probe: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const host = root.current
    const box = probe.current
    if (!host || !box) return

    const measure = () => {
      const rect = box.getBoundingClientRect()
      if (rect.height > 0) host.style.setProperty('--type-k', String(rect.width / rect.height))
    }

    measure()
    /* The probe, not the window. Its own box is the two units, so it changes
       whenever either of them does — a resize, a zoom, or the reader turning
       their browser's text size up, which moves the rem without moving the
       window at all. */
    const watch = new ResizeObserver(measure)
    watch.observe(box)
    return () => watch.disconnect()
  }, [root, probe])
}

/* ---- the swap ----

   Frames do not cross-fade and they no longer come apart either. It is four
   beats in order, and the order is the whole idea: the picture goes, then the
   labels that were pointing at it follow it out — a leader should still be
   pointing while there is something to point at — then the next picture
   arrives, and only then do its own labels draw themselves in.

   What this replaces is a field of cells drawn over the subject, which is in
   `50629fd` if it is ever wanted back. Two things were wrong with it that a
   fade does not have: the field was the subject's own box, so a 16:9 frame
   followed by a 9:16 one changed the size of the block mid-swap, and the
   canvas cleared as the box changed, which is the blank between them.

   Every beat is a CSS transition on `opacity` or an animation the leaders
   already had; nothing here paints. The lengths live in `Mech.css` beside the
   rules that use them, except the two the machine has to know about: how long
   the picture and its labels take to leave, and how long the next one is
   allowed to keep the stage empty while it decodes. */

/** The model floats and turns, so the space it is a target in has to be what
 *  it moves through rather than where it happens to be sitting. */
const PAD = { x: 0.1, y: 0.18 }

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

/** The two cascades a set of leaders runs, in milliseconds. `in` waits out the
 *  picture it is naming and then lays the lines on one after another; `out`
 *  takes them off in the opposite order — last in, first away — which is what
 *  makes it read as the arrival undone rather than as a second, different
 *  cascade of its own.
 *
 *  Shorter steps going out, and capped. An entry can take as long as it likes;
 *  an exit has a swap waiting on it, and six pinned notes leaving at the
 *  entry's own pace would be most of a second of goodbye. The cap is what
 *  `EXIT_MS` is set against. */
const IN_STEP = { from: 200, by: 130 }
const OUT_STEP = { by: 70, most: 210 }

function Leaders({ notes, box, floats, lit, onLit }: LeadersProps) {
  const group = useRef<SVGGElement>(null)
  const list = leadersFor(notes, box)

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
      {list.map((leader, i) => {
        const y = leader.elbow[1]
        const length =
          Math.abs(leader.end - leader.elbow[0]) +
          Math.hypot(leader.tip[0] - leader.elbow[0], leader.tip[1] - y)
        /* This leader's place in each cascade, handed to the stylesheet as
           variables rather than spent here as `animation-delay`. An inline
           delay is a delay no rule can override, which is what kept the way
           out from having any timing of its own — see `entries, and their
           inverses` in Mech.css, where both directions are written. */
        const delay = IN_STEP.from + i * IN_STEP.by
        const back = Math.min((list.length - 1 - i) * OUT_STEP.by, OUT_STEP.most)

        const on = lit !== null && (lit === leader.label || lit === leader.fold)

        return (
          <g
            key={leader.label}
            data-on={on}
            style={{ ['--d' as string]: `${delay}ms`, ['--d-out' as string]: `${back}ms` }}
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
            />
            <circle
              className="mech-leader-mark"
              cx={leader.tip[0]}
              cy={leader.tip[1]}
              r={6.5}
            />
            <circle
              className="mech-leader-core"
              cx={leader.tip[0]}
              cy={leader.tip[1]}
              r={1.9}
            />
            <polyline
              className="mech-leader"
              points={`${leader.end},${y} ${leader.elbow[0]},${y} ${leader.tip[0]},${leader.tip[1]}`}
              style={{ ['--l' as string]: length }}
            />
            <text
              className="mech-leader-label"
              x={leader.end}
              y={y - 9}
              textAnchor={leader.anchor}
            >
              {leader.label}
            </text>
            <text
              className="mech-leader-value"
              x={leader.end}
              y={y + 21}
              textAnchor={leader.anchor}
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
  const root = useRef<HTMLDivElement>(null)
  const scale = useRef<HTMLElement>(null)
  useTypeScale(root, scale)
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
    <div className="mech" ref={root} data-boot={booting} data-pins={pinning}>
      {/* Sized by both units at once, so the ratio between them can be read
          off one box. See `useTypeScale`. */}
      <i className="mech-scale" ref={scale} aria-hidden />
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
          {/* Mounted for the two phases the picture is on the stage and not
              the one where it is empty, so the lines that are leaving belong
              to the frame that is leaving — and the ones arriving mount at the
              moment the next picture starts, which is what their own draw-in
              is timed against. */}
          {!booting && phase !== 'hold' && (
            <Leaders
              key={`leaders-${current.id}`}
              notes={notes}
              box={boxOf(current)}
              floats={current.kind === 'model'}
              lit={lit}
              onLit={setLit}
            />
          )}

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
