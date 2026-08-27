import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import MechPanel, { type PanelTab } from './MechPanel'
import Typed from './Typed'
import MechBird from './MechBird'
import MechMoth from './MechMoth'
import MechCursor from './MechCursor'
import MechLaser from './MechLaser'
import Alarm from './Alarm'
import MechHud from './MechHud'
import MechTiles from './MechTiles'
import { useModelTuning } from './modelTuning'
import { useProductTuning } from './productTuning'
import { useClusterTuning } from './clusterTuning'
import MechDeck from './MechDeck'
import MechMenu from './MechMenu'
import { useNarrowTuning } from './narrowTuning'
import { sound } from './sound'
import { useNarrow } from './narrow'
import { useReveal } from './reveal'
import { drift, flinch, quarry } from './subject'
import { findProject, thumbOf, type Entry, type Frame } from './model'
import { focus, notesFor, pins, type Note } from './notes'
import { useLabelTuning, type Handed } from './labelTuning'
import { boxOf, FRAME_SPACE, leadersFor, mediaBox, type Space } from './leaders'
import './Mech.css'

const MechModel = lazy(() => import('./MechModel'))
const MechProduct = lazy(() => import('./MechProduct'))
/* Development only — the render is behind `import.meta.env.DEV`, so a visitor
   never fetches this chunk. See `MechPins.tsx`. */
const MechPins = lazy(() => import('./MechPins'))
/* Home, and everything in it. Lazy because the bank puts every project's own
   3D subject in its slot, which pulls three.js and eleven scene graphs in with
   it — a visitor who lands straight on a project URL should never fetch any of
   that. See `MechSlots.tsx`. */
const MechCluster = lazy(() => import('./MechCluster'))

/* ---- what home used to be ----

   A line-up: five 3D subjects standing over a shader horizon, each with a tag
   that drew itself in on hover, and the name laid across the back of it.
   `MechCast.tsx`, `MechWave.tsx`, `MechCastPins.tsx`, `castTuning.ts`,
   `castTags.ts`, `nameTuning.ts` and `tint.ts` are all still here and all
   still work — nothing was deleted. They are simply not mounted any more.

   The reason is not that any of it was bad. It is that a stage with objects
   standing on it is a *showroom*, and every other screen on this site is a
   readout: something is on a stage and the panel around it reports on it. Home
   was the one page not doing that. See the note at the top of
   `MechCluster.tsx` for what replaced it, and `git show` this commit for the
   block that mounted the line-up if it is ever wanted back. */

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
 *  backwards after a beat. The longest of those is the leader retracting — up
 *  to 260 of delay (`OUT_STEP.most`) and 520 of undraw — and this has to
 *  outlast it, or the next set of lines is drawn over the last set still
 *  coming off. Timed in Mech.css, under `entries, and their inverses`. */
const EXIT_MS = 1050

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

/* ---- the stage, in frame units ----

   The leaders are drawn onto the stage in a viewBox, and on the wide layout
   that box is the frame itself: 1920×1080, exactly what `.mech-stage`
   measures, so one user unit is one `--px` and nothing is distorted.

   Narrow, the stage is its own shape and a 1920×1080 viewBox stretched onto
   it squashes every label flat sideways. So the canvas takes the stage's own
   proportions instead — measured here, in frame units, which is the one
   number that keeps a user unit worth one `--px` on both layouts. See
   `Space` in leaders.ts.

   Both boxes are read off the DOM rather than worked out: `--px` is a `min()`
   over rem and viewport units that `getComputedStyle` hands back unevaluated,
   and the stage's height is a `min()` of its own. The probe is already there
   for `--type-k`; it is sized by both units, so a hundred of its height is a
   hundred `--px`. */
const useStageSpace = (
  stage: RefObject<HTMLDivElement | null>,
  probe: RefObject<HTMLElement | null>,
  narrow: boolean
): Space => {
  const [space, setSpace] = useState<Space>(FRAME_SPACE)

  useEffect(() => {
    if (!narrow) {
      setSpace(FRAME_SPACE)
      return
    }
    const box = stage.current
    const unit = probe.current
    if (!box || !unit) return

    const measure = () => {
      const px = unit.getBoundingClientRect().height / 100
      const rect = box.getBoundingClientRect()
      if (px <= 0 || rect.height <= 0) return
      setSpace((was) => {
        const w = Math.round(rect.width / px)
        const h = Math.round(rect.height / px)
        return was.w === w && was.h === h && was.narrow ? was : { w, h, narrow: true }
      })
    }

    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(box)
    watch.observe(unit)
    return () => watch.disconnect()
  }, [stage, probe, narrow])

  return space
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
  if (!frame || frame.kind !== 'flat' || warmed.has(frame.id)) return
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

/** The name, which the corner signature types in on a project screen. Home
 *  says it for itself, large, in the middle of the cluster — see
 *  `MechCluster.tsx`, which owns its own copy because it is the one thing on
 *  that screen the layout is built around. */
const NAME = 'Tarlok Singh'

/** The project's write-up, in the order it is read.
 *
 *  Roles used to stand on their own under the title; they read as one more
 *  fact about the project, so they take their place among the other folds
 *  instead — right after the overview, where the standalone line used to sit.
 *
 *  Every one of them arrives shut. A project used to open on its overview —
 *  on the narrow layout, whatever it led with — and that is a screen
 *  answering before it has been asked: the subject is already on the stage
 *  and the title already above it, and a drawer standing open is the one
 *  thing in the column that was not opened by the reader. */
const foldsFor = (project: Entry['project'] | undefined) => {
  if (!project) return []
  return [
    ...(project.intro ? [{ id: 'overview', title: 'project overview', text: project.intro, tags: undefined }] : []),
    ...project.sections
      .filter((section) => section.id === 'roles')
      .map((section) => ({ id: section.id, title: section.title.toLowerCase(), text: section.text, tags: section.tags })),
    ...project.sections
      .filter((section) => section.id !== 'roles')
      .map((section) => ({ id: section.id, title: section.title.toLowerCase(), text: section.text, tags: section.tags }))
  ]
}

/** The model goes first. "Open a project" means the object, and the stills are
 *  what you step to afterwards — `model.ts` appends it because the index
 *  screen wants it last. */
const modelFirst = (entry: Entry): Frame[] => [
  ...entry.frames.filter((frame) => frame.kind !== 'flat'),
  ...entry.frames.filter((frame) => frame.kind === 'flat')
]

interface LeadersProps {
  notes: Note[]
  box: ReturnType<typeof boxOf>
  space: Space
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
const IN_STEP = { from: 240, by: 170 }
const OUT_STEP = { by: 90, most: 260 }

function Leaders({ notes, box, space, floats, lit, onLit }: LeadersProps) {
  const group = useRef<SVGGElement>(null)
  const list = leadersFor(notes, box, space)

  /* The labels ride the same bob the subject is on, read from what the float
     actually did this frame rather than from an animation timed to look like
     it — two clocks that agree at the start and not a minute later is exactly
     the sort of thing nobody can name and everybody notices.

     Damped a little, so the lines lag the head by a hair. Chasing it exactly
     makes the whole assembly feel welded together; trailing it makes the
     labels feel pinned *to* something. */
  /* `drift` is published in the frame's own coordinates — a 1920×1080 box —
     because that is the space the wide layout draws in. A narrow canvas is a
     different number of units tall for the same amount of world, so the bob
     has to be converted on the way in or the labels swing twice as far as the
     head does. */
  const perFrame = space.h / 1080
  useEffect(() => {
    if (!floats) return
    let raf = 0
    let x = 0
    let y = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      x += (drift.x * perFrame - x) * 0.18
      y += (drift.y * perFrame - y) * 0.18
      group.current?.setAttribute('transform', `translate(${x} ${y})`)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [floats, perFrame])

  return (
    <svg
      className="mech-leaders"
      viewBox={`0 0 ${space.w} ${space.h}`}
      preserveAspectRatio="none"
      data-lit={lit !== null}
      aria-hidden
    >
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
  /** Narrow, the housing has no frame coordinates to sit at: the stage is a
   *  real box of its own rather than a 16:9 island inside a 1920-unit frame,
   *  and the picture fills it. See `narrow viewports` in Mech.css. */
  narrow: boolean
  onReady: () => void
}

function Flat({ frame, index, count, narrow, onReady }: FrameProps) {
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
    <div className="mech-housing" data-full={full} style={narrow ? undefined : place} ref={shell}>
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

/** How long the machine takes to come up: the grid strikes on, the compass
 *  spins and settles, and only then do the leaders extend. Trimmed down from
 *  1500 — the subject (the model or the first still) uncovers at the same
 *  moment, and it was sitting behind the cover longer than the boot itself
 *  needed. Still generous enough to cover the one-time cost of a model's
 *  first mount: building the WebGL context, compiling shaders, cloning the
 *  scene graph. */
const BOOT_MS = 1200

interface Props {
  /** The project on screen, or `null` for the home screen.
   *
   *  Home is a *state of this component*, not a screen beside it. The whole
   *  page — the dashboard, the grid, the compass, the header, the footer, the
   *  bird and the reticle — is one machine that is already running, and
   *  opening a project should be that machine retargeting rather than a new
   *  page being built. Two components meant two of everything and a black
   *  frame between them where the second one booted; the background flicker
   *  was the second `.mech` painting over the first.
   *
   *  So there is one. Home puts the cast on the stage, the readout in the
   *  side column and the index across the bottom; a project puts its subject,
   *  its write-up and its tile rail in the same three places. Everything else
   *  never moves, because it is never remounted. */
  id: string | null
  /** Retarget to another project without unmounting: the readout swings over
   *  rather than the page being replaced. */
  onProject: (id: string) => void
  onHome: () => void
}



export default function Mech({ id, onProject, onHome }: Props) {
  /* Keyed on whichever model is on screen. The two GLB models used to share
     one rig, so Capsule C1 — an injection-moulded enclosure — was lit by a
     setup built around a face. At home it is always Mr. Takahashi, who stands
     in the cast. See `MODEL_RIGS` in `modelTuning.ts`. */
  const tuning = useModelTuning(id ?? 'mr-takahashi')
  /* The phone's two knobs — how large the subject and the pictures sit in a
     stage that is no longer a 16:9 island. Its own panel, because the other
     two are hidden at this width. See `narrowTuning.ts`. */
  const { store: narrowStore, values: narrowScale } = useNarrowTuning()
  /* The label maker's half that belongs on the panel rather than over the
     picture: copying out, reverting, and adding a line without having a
     picture to click on. See `labelTuning.ts`. */
  const [handed, setHanded] = useState<Handed>(null)
  const labels = useLabelTuning(setHanded)
  /* The project on screen trails the one in the URL by a transit, the same
     way the frame trails the tile you picked. Retargeting is the readout
     swinging over to something else, not a page being replaced. */
  const [shownId, setShownId] = useState<string | null>(id)
  /* The pieces' own studio, on its own panel. Keyed on the project because
     the per-piece folder shows one piece at a time — see `productTuning.ts`. */
  const pieces = useProductTuning(shownId ?? '')
  /* Home's own handful of numbers — where the cluster sits, how large the name
     is, how far it bleeds. The four tabs this replaces (Cast, Tags, Wave,
     Name) went with the line-up they described. See `clusterTuning.ts`. */
  const cluster = useClusterTuning()
  const [booting, setBooting] = useState(true)
  const [lit, setLit] = useState<string | null>(null)
  /* `home` is the whole difference between the two states, and it is read
     off what is on screen rather than off the prop — during a retarget the
     prop has already changed and the page has not, which is the entire point
     of `shownId`. */
  const home = shownId === null
  const found = shownId ? findProject(shownId) : null
  const project = found?.project ?? null
  const entry = found?.entry ?? null
  const frames = useMemo(() => (entry ? modelFirst(entry) : []), [entry])
  /* Whether the *screen* is changing, as opposed to the frame on it.
     `phase === 'out'` is true for both — stepping the tile rail runs the same
     beat — and the name handing itself to the header has to happen only on
     the first. See the retarget effect below, which is the one place this is
     ever set. */
  const [transiting, setTransiting] = useState(false)
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
  const [open, setOpen] = useState<string | null>(null)
  const rail = useRef<HTMLDivElement>(null)
  const railWrap = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const scale = useRef<HTMLElement>(null)
  useTypeScale(root, scale)
  const narrow = useNarrow()
  const space = useStageSpace(stage, scale, narrow)
  /* Blocks draw themselves in as they are reached — narrow only, where the
     page scrolls and half of it starts below the fold. See `reveal.ts`. */
  useReveal(root, narrow)
  /* The green does not drift any more. `tint.ts` rotated `--accent` in step
     with the hue of the wave under the cast, and with the wave gone there is
     nothing for the panel to be following — a colour that wanders on its own
     is a screensaver, not an instrument. The hook is still in the file if a
     drifting supply is ever wanted back. */
  /* What has been pinned in this browser, if anything. Subscribed rather than
     read once: the editor writes to the same store the leaders read from, so
     a drag moves the real line rather than a preview of one. */
  const drafts = useSyncExternalStore(pins.subscribe, pins.snapshot, pins.snapshot)
  const [pinning, setPinning] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    if (!narrow) setMenu(false)
  }, [narrow])

  const current = frames[shown]
  const modelFrame = frames.find((frame) => frame.kind === 'model')
  const pieceFrame = frames.find((frame) => frame.kind === 'piece')
  const covered = phase !== 'in' || booting
  /* `covered` also spans `hold`, which is when the next frame's housing first
     mounts — a fresh set of brackets, label and transport that have no exit to
     play. Scoping the exit animations to `leaving` instead keeps `hold` from
     handing them `data-covered`'s "true" and having them open on the wrong
     keyframe: `mech-unpop`'s first frame is full opacity, held there by
     `animation-fill-mode: both` until its delay runs out, which is the flash. */
  const leaving = phase === 'out'

  // The machine coming up, once, on arrival.
  useEffect(() => {
    sound.boot()
    const timer = window.setTimeout(() => setBooting(false), BOOT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  /* The subject's canvas learns its size from a ResizeObserver, and a tab that
     is still in the background when the page loads throttles that observer's
     first callback away entirely — so a project opened in a tab you have not
     looked at yet mounts a canvas stuck at its 300×150 default and stays that
     way even once you switch to it. A resize event makes r3f's `useMeasure`
     re-read the box. Fired straight rather than off a `requestAnimationFrame`
     (which a background tab pauses), and again the moment the tab is shown,
     which is the frame that actually needs it. The canvas is lazy and mounts a
     beat after this effect, so the opening kicks are spread across the first
     second; every one past the mount is a harmless re-measure to the same
     size. Home's cluster canvas is `position: fixed` over the viewport and
     never has this problem. */
  useEffect(() => {
    if (home) return
    const kick = () => window.dispatchEvent(new Event('resize'))
    const timers = [0, 200, 600, 1200].map((ms) => window.setTimeout(kick, ms))
    const onShow = () => {
      if (!document.hidden) kick()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => {
      timers.forEach(window.clearTimeout)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [home])

  /* Retargeting. The subject comes apart, the project underneath changes, and
     the rail goes back to the model — reusing the same cover the frame swap
     uses, because it is the same gesture at a larger scale.

     Home is one more target, not a special case. Going home and going to a
     different project run the identical beat: what is on the stage leaves,
     `shownId` changes underneath, and what replaces it draws itself in. The
     dashboard, the header and the footer are never told any of it happened,
     which is what "seamless" means here — not a transition between two
     screens, but the absence of a second screen to transition to. */
  useEffect(() => {
    if (id === shownId) return
    sound.dissolve()
    setPhase('out')
    setTransiting(true)
    const timer = window.setTimeout(() => {
      setShownId(id)
      setIndex(0)
      setShown(0)
      /* Shut, not open on the overview. A project used to arrive with its
         first fold already down, which is a screen answering a question
         nobody asked yet — the subject is on the stage and the title is
         above it, and the write-up is there to be opened when you want it. */
      setOpen(null)
      setPhase('hold')
      /* Cleared on the same beat the screen actually changes, so whichever
         of the two names is mounting on the other side of it mounts with
         something to type rather than something to delete. */
      setTransiting(false)
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
    // A model, the cast, or a project with nothing on its stage at all: none
    // of them have a picture to decode, so none of them have anything to wait
    // for.
    if (!frames[shown] || frames[shown].kind !== 'flat') {
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
    if (!current || current.kind === 'flat') return
    quarry.subject = {
      rect: () => {
        const box = stage.current?.getBoundingClientRect()
        if (!box) return null
        // `space` is the frame the subject is actually drawn in — 1920×1080
        // wide, a narrower box of its own on a phone (`useStageSpace`). This
        // used to assume 1920 unconditionally, which on narrow put the
        // hitbox at the wrong scale and offset entirely: shots low on the
        // stage — the bottom half of the face — landed below where the box
        // actually was.
        const model = boxOf(current, space)
        const px = box.width / space.w
        const pad = { x: model.w * PAD.x, y: model.h * PAD.y }
        return new DOMRect(
          box.left + (model.x - pad.x) * px,
          box.top + (model.y - pad.y) * px,
          (model.w + pad.x * 2) * px,
          (model.h + pad.y * 2) * px
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
  }, [current, space])

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

  // A project with a dozen frames outruns the rail's height (or, narrow, its
  // width), so stepping with the arrow keys has to bring the tile back into
  // view on whichever axis it now scrolls.
  //
  // Both axes are named either way. `block` defaults to `'start'` when it is
  // left out, and narrow the page itself is the vertical scroller — so asking
  // only for `inline: 'nearest'` scrolled the whole screen down to put the
  // tile strip at the top of the window, taking the subject off it.
  useEffect(() => {
    rail.current?.children[index]?.scrollIntoView(
      narrow ? { inline: 'nearest', block: 'nearest' } : { block: 'nearest', inline: 'nearest' }
    )
  }, [index, narrow])

  // The rail's own scrubber: a thumb sized and placed off the tile strip's
  // real scroll state, and a track that only shows itself once there is
  // somewhere for the thumb to go. Narrow, the rail scrolls sideways instead
  // of down — see the `NARROW_QUERY` comment above — so the same measurement
  // is taken off the other axis and written to a different pair of custom
  // properties, which Mech.css only reads under `[data-narrow='true']`.
  useEffect(() => {
    const el = rail.current
    const wrap = railWrap.current
    if (!el || !wrap) return

    const update = () => {
      const scrollable = narrow ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1
      wrap.dataset.scrollable = String(scrollable)
      if (!scrollable) return
      if (narrow) {
        wrap.style.setProperty('--thumb-w', `${(el.clientWidth / el.scrollWidth) * 100}%`)
        wrap.style.setProperty('--thumb-left', `${(el.scrollLeft / el.scrollWidth) * 100}%`)
      } else {
        wrap.style.setProperty('--thumb-h', `${(el.clientHeight / el.scrollHeight) * 100}%`)
        wrap.style.setProperty('--thumb-top', `${(el.scrollTop / el.scrollHeight) * 100}%`)
      }
    }

    update()
    el.addEventListener('scroll', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [frames, narrow])

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

  // A project id that matches nothing at all. Home is not this case: it has
  // no project on purpose.
  if (!home && !project) return <div className="mech" />

  const notes = entry && current ? notesFor(entry, current, drafts) : []
  const folds = foldsFor(project ?? undefined)
  /* A project in the index with nothing to put on the stage — Visa, under an
     NDA, and Solomon, whose write-up is still to come. Both are real work and
     both are listed, so opening one has to land somewhere: the `restricted`
     note on its own card, in place of the subject. See `MENU` in `model.ts`
     for why a project with no media is in the index at all. */
  const bare = !home && !current
  /* What the readout in the side column is about — only ever a project. Home
     has no side column any more: the whole screen is the cluster, and the name
     sits in the middle of it. */
  const lede = project ?? null

  /* Which panels belong to what is on screen. This is the whole reason the
     panel is tabbed: every panel used to be mounted all the time, so home
     offered a project subject's lighting rig — titled "Subject tuning", which
     does not say whose subject — and a project screen offered none of home's.
     Home's four tabs (Cast, Tags, Wave, Name) went with the line-up they
     described; what is left is the cluster's own handful of numbers. */
  const panels: PanelTab[] = import.meta.env.DEV
    ? narrow
      ? [{ id: 'scale', label: 'Scale', store: narrowStore }]
      : home
        ? [{ id: 'cluster', label: 'Cluster', store: cluster.store }]
        : [
            ...(modelFrame ? [{ id: 'subject', label: 'Subject', store: tuning.store }] : []),
            ...(pieceFrame ? [{ id: 'piece', label: 'Piece', store: pieces.store }] : []),
            { id: 'labels', label: 'Labels', store: labels }
          ]
    : []

  return (
    <div
      className="mech"
      ref={root}
      /* Bloom is a property of the room, not of home. It is set here rather
         than on `.mech-cluster` — which only exists on home — because a knob
         living on the screen it lights means every glow on the site falls back
         to 1 the moment a project opens, and the swap reads as the lights
         changing. See *one room, both screens* in Mech.css. */
      style={{ ['--cluster-glow' as string]: cluster.values.glow }}
      data-boot={booting}
      data-pins={pinning}
      data-narrow={narrow}
      /* The whole retarget, not just the stage's part of it. The index and the
         tile rail take their exit off this — see `the exchange` in Mech.css. */
      data-covered={covered}
    >
      {/* Sized by both units at once, so the ratio between them can be read
          off one box. See `useTypeScale`. */}
      <i className="mech-scale" ref={scale} aria-hidden />
      {/* Development only, and portalled to `body` for the same reason the
          gallery's panel is: rendered in place it would sit inside the
          readout's stacking context and paint under the chrome. */}
      {/* One panel, tabbed, and only the tabs this screen can actually
          change — see `MechPanel.tsx`. Portalled to `body` for the same
          reason it always was: rendered in place it would sit inside the
          readout's stacking context and paint under the chrome.

          Off entirely at phone width. Leva's own minimum is most of a
          390-point window, and the one adjustment the narrow layout needs is
          the only tab left. */}
      {typeof document !== 'undefined' && import.meta.env.DEV
        ? createPortal(<MechPanel tabs={panels} />, document.body)
        : null}

      <Source handed={handed} onClose={() => setHanded(null)} />

      {/* The 3D horizon that used to sit under the line-up is gone with it —
          `.mech-wave-layer` and `MechWave.tsx` are both still here, unmounted.
          What is left under the readout is the flat phosphor grid, which is
          the surface this panel is printed on and the one the reference has. */}
      <MechHud />
      {/* The grid's cells dealt in from the middle of the window, once, while
          the rest of the machine comes up. It takes itself down when its own
          ripple is over rather than being cut off with the boot flag, which
          is a little shorter than the furthest cell needs — see `LIFE` in
          `MechTiles.tsx`. Mounted plainly, because `.mech` is never
          unmounted: this runs once per page load, which is the point. */}
      <MechTiles />
      <MechCursor />
      <MechBird />
      <MechMoth />
      <MechLaser />
      <Alarm />

      {menu && (
        <MechMenu shownId={shownId} onProject={onProject} onHome={onHome} onClose={() => setMenu(false)} />
      )}

      <div className="mech-frame">
        <header className="mech-head">
          {/* Home already says whose site this is — large, in the middle of
              the cluster. This signature in the corner is a way back from a
              project, not a second copy of the same name, so it only draws
              once there is a project to come back from.

              And it is the same name, handed over. Opening a project takes the
              cluster off screen; a beat later this types itself into the
              corner, one character at a time, in the same typeface. Going home
              runs it the other way. Two blocks of markup, one gesture — which
              is the whole reason `transiting` exists as a separate flag from
              `phase`: stepping the tile rail is also an exit, and the name has
              no business reacting to it. */}
          {!home && (
            <button className="mech-wordmark" onClick={onHome}>
              <Typed text={NAME} run="wordmark" delay={0.12} speed={34} caret={false} back={transiting} />
            </button>
          )}

          {/* One control, on both layouts. Ten projects is too many for a tag
              row to stand in for and too many to spell out along the header —
              it used to be a row of tag chips here and a second strip of
              every title along the bottom edge, and neither one told you
              where you actually were. This opens the same index sheet
              `MechMenu` draws on a phone: every project, named and typed in,
              one control to reach any of them. */}
          <button
            className="mech-menu-key"
            onClick={() => {
              sound.select()
              setMenu(true)
            }}
            aria-label="Open the index"
          >
            <i />
            <i />
            <i />
          </button>
        </header>

        {/* Docked between the header and the rail rather than down in the
            footer — the same right edge as the tile strip below it. Narrow,
            there is no room for a transport nobody asked for, so it drops
            off the frame entirely rather than floating over the page. */}
        {!narrow && (
          <div className="mech-deck-slot">
            <MechDeck />
          </div>
        )}

        {/* Home: the whole screen, as one instrument cluster. The lamps, the
            name, the display that reads out either a title or whatever project
            the pointer is on, the counts, and the bar graph that is both the
            work and the way into it. See `MechCluster.tsx`. */}
        {home && (
          <Suspense fallback={null}>
            <MechCluster onProject={onProject} covered={covered} tuning={cluster.values} />
          </Suspense>
        )}

        {/* The subject and its labels share one box so that scaling the window
            moves them together. Only a project has one: home's cluster is the
            frame's own child and needs no stage under it, and an empty 16:9
            box sitting in the middle of the cluster is a box that eats the
            pointer over half of it. */}
        {!home && (
        <div
          className="mech-stage"
          ref={stage}
          data-covered={covered}
          data-leaving={leaving}
          data-kind={current?.kind ?? 'bare'}
          style={narrow ? { ['--media-scale' as string]: narrowScale.media } : undefined}
        >
          {/* The model is mounted for as long as the project has one, and
              hidden rather than unmounted while a still is on the stage.

              Unmounting it threw away a WebGL context, a compiled set of
              shaders, a cloned scene graph and a generated environment map,
              and building all of that again is most of a hundred milliseconds
              on the main thread — a hitch, every single time you stepped back
              to the model. Hidden and stopped it costs nothing per frame: see
              `live` in MechModel, which puts the render loop to sleep. */}
          {/* Nothing to put on the stage, and that is the truth about the
              project rather than a failure to load one. */}
          {bare && project && (
            <div className="mech-bare">
              <span className="mech-bare-tag">no material</span>
              <p>{project.restricted ?? project.intro}</p>
            </div>
          )}

          {modelFrame && (
            <div className="mech-model-layer" data-on={current?.kind === 'model'}>
              <Suspense fallback={null}>
                {/* The same lens, framed larger. `fill` is how much of the
                    stage's height the subject takes, and on a phone the stage
                    is a tall box rather than a wide one — a head framed for
                    the middle of a 16:9 island is a speck in it. Nothing
                    about `MODEL_DEFAULTS` moves; the multiplier is narrow's
                    own, on its own panel. */}
                <MechModel
                  src={modelFrame.src}
                  tuning={narrow ? { ...tuning, fill: tuning.fill * narrowScale.model } : tuning}
                  live={current?.kind === 'model'}
                />
              </Suspense>
            </div>
          )}
          {/* A project has a model or a piece, never both — but the two are
              mounted the same way and for the same reason: hidden rather than
              unmounted while a still is on the stage, because a WebGL context
              and its shaders cost most of a hundred milliseconds to build
              again. See `MechProduct.tsx`, which is a studio of its own and
              shares nothing with the face's rig. */}
          {pieceFrame && (
            <div className="mech-model-layer" data-on={current?.kind === 'piece'}>
              <Suspense fallback={null}>
                <MechProduct
                  project={pieceFrame.project}
                  tuning={pieces.studio}
                  piece={narrow ? { ...pieces.piece, size: pieces.piece.size * narrowScale.model } : pieces.piece}
                  live={current?.kind === 'piece'}
                />
              </Suspense>
            </div>
          )}
          {current?.kind === 'flat' && (
            <Flat
              // Prefixed: the leaders below are keyed on the same frame, and
              // two siblings under one parent with the same key is a duplicate
              // React resolves by leaving the outgoing housing in the DOM.
              key={`flat-${current.id}`}
              frame={current}
              index={shown}
              count={frames.length}
              narrow={narrow}
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
          {!booting && phase !== 'hold' && current && (
            <Leaders
              key={`leaders-${current.id}`}
              notes={notes}
              box={boxOf(current, space)}
              space={space}
              floats={current.kind !== 'flat'}
              lit={lit}
              onLit={setLit}
            />
          )}

          {import.meta.env.DEV && pinning && current && (
            <Suspense fallback={null}>
              <MechPins frame={current} notes={notes} onClose={() => setPinning(false)} />
            </Suspense>
          )}
        </div>
        )}

        {/* Home's way into the work is the bar graph in the cluster: twelve
            projects plotted against the years they were made, which you point
            at to read and press to open. What that replaced, in order, was a
            row of twelve named boxes along this edge, and then a line-up of
            five 3D subjects that each put their own tag up on hover. The list
            lost to the objects because a shape is not scannable; the objects
            lost because a stage with things standing on it is a showroom, and
            seven of the twelve projects had no object to stand there at all.
            A graph has a bar for every one of them.

            Everything the graph cannot reach — the way home, the index by name
            — is behind the one control in the header. See `MechMenu.tsx`. */}

        {/* The tile strip, which is a project's own thing — home has the
            index in this slot instead. Unmounted rather than hidden: the two
            never overlap, and whichever one is up fades out on `data-covered`
            before the swap and the other fades in after it, so the exchange
            reads as one control changing rather than two appearing. */}
        {!home && frames.length > 0 && (
        <div className="mech-rail-wrap" ref={railWrap} data-arrive>
          <div className="mech-rail" ref={rail}>
            {frames.map((frame, i) => {
              const thumb = thumbOf(frame)
              return (
                <button
                  key={frame.id}
                  className="mech-tile"
                  aria-pressed={i === index}
                  aria-label={frame.label ?? project?.title}
                  title={frame.label ?? project?.title}
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
          <div className="mech-rail-track" aria-hidden>
            <div className="mech-rail-thumb" />
          </div>
        </div>
        )}

        {/* A project's column, and only a project's. It used to be mounted on
            home too — empty, with a handful of rules re-shaping it around
            nothing — and everything it once held there is the cluster's now.
            An empty absolutely-positioned column over half the screen is a
            column that eats the pointer. */}
        {!home && (
        <section className="mech-side">
          {/* See `display: contents` under `narrow viewports` in Mech.css for
              why the title gets its own wrapper rather than folding straight
              into `.mech-side`: a project's title needs to sit above the
              picture on a narrow layout while the write-up stays below the
              tile strip, and that reorder has to happen at this level. */}
          <div className="mech-lede">
            {/* The title is set to one line, and on a phone that is a promise
                the type size cannot keep on its own: "mr. takahashi" fits at
                the size the frame asks for and "red dead redemption 2" is two
                lines of it, which is what the split in the middle of a name
                was. `--title-len` hands the stylesheet the character count so
                it can cap the size against the width — measured off the count
                rather than the rendered box because the title types itself in
                a character at a time, and a box measured mid-type is a box
                that is still growing. See `.mech-title` in Mech.css. */}
            {lede && (
              <>
                <h1 className="mech-title" style={{ ['--title-len' as string]: lede.title.length }}>
                  <Typed text={lede.title} run={lede.id} />
                </h1>
                {lede.tagline && (
                  <p className="mech-tagline">
                    <Typed text={lede.tagline} run={lede.id} delay={0.3} speed={22} caret={false} />
                  </p>
                )}
              </>
            )}
          </div>

          {/* Sized to its own content and sandwiched between two flexible
              spacers (`.mech-folds-wrap`'s ::before/::after) rather than
              stretched to fill the space under the title — that is what
              lets it sit centred in whatever room is left, biased a little
              above true middle. */}
          <div className="mech-folds-wrap">
            <div className="mech-folds">
              {folds.map((fold, i) => {
                const isOpen = open === fold.id
                return (
                  <div className="mech-fold" key={fold.id} data-open={isOpen} data-arrive>
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
                      <Typed
                        text={fold.title}
                        run={shownId ?? 'home'}
                        delay={0.5 + i * 0.08}
                        speed={18}
                        caret={false}
                      />
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
          </div>
        </section>
        )}

        <footer className="mech-foot" data-arrive>
          <a className="mech-comms" href="mailto:hello@tarloksingh.com">
            <span className="mech-comms-to">hello@tarloksingh.com</span>
            <i className="mech-foot-dot" aria-hidden />
          </a>
          <p className="mech-credit">
            <i className="mech-foot-dot" aria-hidden />
            <span>developed by tarlok singh</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
