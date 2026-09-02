import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Segment from './Segment'
import Typed from './Typed'
import { useNarrow } from './narrow'
import MechBank, { CELLS as BANK_CELLS } from './MechBank'
import { SLOTS, FIELDS, FIELD_LABEL, type Field } from './bank'
import type { ClusterTuning } from './clusterTuning'
import './MechCluster.css'

/* `MechSlots` is imported outright rather than lazily, and this whole
   component is what `Mech.tsx` lazy-loads instead. Every slot's bay *is* a
   `<View>`, so the subjects cannot be split off from the markup that lays them
   out — and a visitor who lands on a project URL still never pays for any of
   it, because they never mount home. */

/* ---- home, as an instrument cluster ----

   What this replaces is a line-up: five 3D subjects standing in a row over a
   shader horizon, with the name laid across the back of it. The pieces were
   good and the arrangement was a showroom — a stage with things on it, which
   is a different building from the rest of this site. Every other screen here
   is a readout: something is on a stage and the panel around it *reports* on
   it. Home was the one page not doing that.

   So home is a panel now, laid out the way a car's instrument cluster is.
   Four things drawn here, and a fifth — the warning pair, `SHOOT` / `STOP` —
   that lives one level up now, in `Alarm.tsx`, because it is the one lamp on
   the page about the page rather than about the work, and reports whether
   there is anything in the air to shoot at *regardless* of which screen is
   showing. See the note at the top of `Alarm.tsx` for why it moved:

   - a **strip of displays** across the top of the panel — what I do on the
     left, what is selected on the right, one continuous run of lamp cells.
   - the **tachometer**, the single largest instrument, filling the middle.
   - the **name and the profile**, laid over the quiet left end of it.
   - the **counts** bled off the left edge, and the **rail of work** down the
     right.

   `MechCast.tsx`, `MechWave.tsx`, `castTuning.ts`, `castTags.ts` and
   `MechCastPins.tsx` are all still here and still work; they are simply not
   mounted. Putting the line-up back is one block in Mech.tsx.

   Everything is in frame coordinates — see the note at the top of Mech.css.
   The stylesheet is `MechCluster.css`, its own file because this is a whole
   screen rather than a part of one. */

/* ---- how you pick a project ----

   The first pass at this was a bar graph: twelve projects plotted against the
   years they were made, and you pointed at a bar to read one out. It was a
   good *chart* and a bad control, for three reasons that all say the same
   thing.

   A bar is not a thing you press. There is nothing about a column of lit cells
   that says it can be chosen, so the whole bottom half of the screen read as
   an illustration of the work rather than as the way into it.

   A bar is not identifiable. The axis said 2024, and four projects were made
   in 2024 — so the only way to find out which bar was which was to sweep the
   pointer along the row and watch a display somewhere else change.

   And there is no pointer on a phone. A control whose entire affordance is
   hover has no affordance at all on half the devices that will see it.

   What replaced it is the bank of preset buttons off a car stereo: numbered,
   named, pressable slots, one lit, with the display above reading out
   whichever it is. It ran across the bottom of the frame at first; it is a
   rail down the right now, opposite the counts, with the tachometer between
   them taking the width it gave up.

   And a slot holds the project's own subject, live and turning: Mr.
   Takahashi's head, the Capsule C1 enclosure, Solomon's rider, the fish man,
   and the eight pieces built out of primitives for the projects with no model.
   The first pass put a still out of each project's media in there, which was a
   picture of a screenshot of the work — the work *is* these objects, and every
   one of them was already being rendered somewhere else on this site. One
   canvas over the bank does all twelve; see `MechSlots.tsx`. */

/** The titles, and the field each one belongs to.
 *
 *  The pair is the point. The display reads the title and the scale under it
 *  marks the field — which is exactly what a speedometer does: a number in the
 *  window and a mark on the strip beneath saying where that number falls. */
const TITLES: Array<{ title: string; field: Field }> = [
  { title: 'PRODUCT DESIGNER', field: 'product' },
  { title: 'ENGINEER', field: 'code' },
  { title: 'FILMMAKER', field: 'film' },
  { title: 'GAME DESIGNER', field: 'games' },
  { title: 'DESIGN ENGINEER', field: 'design' }
]

/** How long a reading holds before the display settles onto the next one.
 *  It is one interval for both halves of the strip: with nothing selected the
 *  left display cycles the titles, and with a project up it cycles whatever I
 *  actually did on that project — "founder", then "product designer". */
const TITLE_MS = 2600

/** How long the display keeps a project after the pointer has left the bank
 *  before it falls back to the titles. Long enough to move the pointer away
 *  and look at what it said; short enough that the screen does not sit on a
 *  stale reading. Mouse only — a tap has no "leaving". */
const RELEASE_MS = 2400

const NAME = 'Tarlok Singh'

const PROFILE =
  'Artist with 10+ years building 0→1 developer tools, AI applications, and consumer products and films. In love with building and designing beautiful things.'

/** Cells in the role reel over the counts, and in the `INTRO` cap beside it.
 *  It is the bank head's own count (`CELLS` in `MechBank.tsx`) rather than a
 *  number of its own: `.mech-display-role` and `.mech-work-rail-head` are
 *  boxed to the same width (`--count-w` and `--flank-w` are the same
 *  variable), and `Segment` scales by *width*, so two displays the same width
 *  but a different cell count render their glyphs at two different sizes —
 *  fewer cells over the same box is a bigger glyph. Sixteen (the role's own
 *  longest word) used to read as deliberately louder than the project title
 *  opposite it; on one panel reporting two kinds of fact, both readouts should
 *  print at the same size. */
const ROLE_CELLS = BANK_CELLS

/* ---- the counts ----

   Three gauges bled off the left edge of the frame, and all three come off the
   work itself — a portfolio that states a number it does not derive is a
   portfolio with a number to keep up to date.

   What used to be here was `PROJ LISTED`, `YRS ACTIVE` and `ORGS SHIPPED`, and
   the first of those was counting the list that is on the same screen: the
   rail's own head already says "12 entries". `ROLES WORN` took its place
   because it is the one number on this panel that is not visible anywhere else
   on it, and because it is what the display opposite is reading out — point at
   a project and the left half of the strip cycles that project's share of this
   count.

   **The three read a slice now, not the whole roster.** Frozen at the same
   three numbers regardless of what the panel is actually saying elsewhere read
   as decoration wearing an instrument's styling — a gauge that never moves is
   a sticker. So the gauges are filtered to whichever field is current: the
   field the cycling title falls under with nothing picked, or every field the
   selected project touches. Point at "filmmaker" and `YRS` becomes years
   active *as one* — the span between the earliest and latest film work, not
   the whole career. The scale each bar is read against (`of`) stays fixed to
   the whole roster, so a field with two projects in it reads as a short bar
   against the same ceiling rather than a differently-scaled gauge every time
   the reading changes.

   ---- three readings, not one drawn three times ----

   `ORGS SHIPPED` is gone, and the argument against it is not that the word is
   ugly. Reading the three off every slot in turn gives this:

   | slice                          | yrs | roles | orgs |
   |--------------------------------|-----|-------|------|
   | product (RDR2, GTA, Plus One…) | 11  | 4     | 3    |
   | brand (Capsule, Mecha, Slider) | 10  | 3     | 2    |
   | code (Stitchfam, Wyte, Block)  | 1   | 1     | 1    |

   They never disagree. All three are *how big is this slice* drawn three
   times — more projects in a field means more years and more roles and more
   companies, always — so the block was one reading taking up three gauges'
   worth of panel. Which also rules out the obvious swaps: projects, tags,
   media count, anything of the form "count the things in the slice" inherits
   exactly the same correlation.

   To get three readings, at least one has to be a **position** rather than a
   count. `recent` is that one: where the slice's latest work sits in the span
   of everything, so it answers *is this live* rather than *is there a lot of
   it*. The code slice is two years wide and lands at the top of the scale;
   the Rockstar work is the same size and sits at the bottom. Two bars that
   used to move together now separate, which is the whole reason for having a
   second one.

   And the ceilings are derived rather than picked. They were `{16, 12, 8}`
   against real maxima of 11, 7 and 4 — so `ORGS` could never pass 38% of its
   own bar and `ROLES` never passed 58%, regardless of what was selected. Two
   thirds of two gauges were unreachable by construction, which is a scale
   nothing is ever plotted against. The ceiling is the whole roster's own
   figure now: everything reads full, a slice reads its share of it. */
const YEARS = SLOTS.map((slot) => slot.year)
const FIRST = Math.min(...YEARS)
const SPAN = Math.max(...YEARS) - FIRST + 1
const ALL_ROLES = new Set(SLOTS.flatMap((slot) => slot.roles)).size

const countsFor = (fields: Field[]) => {
  const pool = SLOTS.filter((slot) => slot.fields.some((f) => fields.includes(f)))
  const rows = pool.length ? pool : SLOTS
  const years = rows.map((slot) => slot.year)
  const roles = new Set(rows.flatMap((slot) => slot.roles))
  const latest = Math.max(...years)
  return [
    { label: 'mileage', value: latest - Math.min(...years) + 1, of: SPAN, reads: 'years spanned' },
    { label: 'range', value: roles.size, of: ALL_ROLES, reads: 'roles worn' },
    /* Not a count of anything. `latest` against the first year of the whole
       roster: a full bar is work finished this year, an empty one is work that
       stopped at the beginning. */
    { label: 'pulse', value: latest - FIRST + 1, of: SPAN, reads: 'how recent' }
  ]
}

/** Cells in a count's bar. Small enough to be counted, which is the whole
 *  difference between a gauge and a progress bar. */
const TICKS = 16

/** Seconds a bar takes to climb to its reading on arrival, and how far it
 *  wanders around it afterwards.
 *
 *  The wander is the reason these are drawn as gauges at all. A stack of cells
 *  frozen at two-thirds is a progress bar with the styling of an instrument;
 *  a needle that will not sit perfectly still is the one thing that says
 *  something is being *measured*. It is a fraction of the bar either way — the
 *  number in the window above never moves, because that part is true. */
const RISE = 1.1
const SWAY = { rate: 0.55, depth: 0.055 }

/** And how long they take to run back down when the screen leaves. Far quicker
 *  than the climb, because the whole exit is about two hundred milliseconds —
 *  a bar easing down over a second is a bar the cover lands on top of. */
const FALL = 0.38

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n))

/* ---- the arrival, in order ----

   The cluster does not fade up as a picture. Every block comes on when a
   panel's block comes on: the housing arrives empty and dark, and whatever it
   is going to read is put into it afterwards — flickered up on a segment
   display, typed on a line of text, climbed on a gauge. A readout that arrives
   with its word already in it is a screenshot of an instrument.

   These are the beats the *contents* run on, in milliseconds from the moment
   the cover lifts. The blocks they sit in come up on the matching delays in
   `coming up, and going down` in MechCluster.css; the two lists have to be
   read together, and every number here is a little later than the block it is
   inside, because a display cannot switch on before its housing is there.

   The name is deliberately last. It is the one line on the screen that is not
   a reading, and a machine says who it belongs to once it has finished
   coming up rather than first. */
const IN = {
  /** The reel over the counts, and the rail's own display. */
  role: 440,
  head: 540,
  intro: 460,
  /** The three bars start climbing from empty. */
  counts: 520,
  /** The needle's first sweep of the scale. */
  tach: 680,
  /** The first subject lands in the bank, and how far behind it the next. */
  slot: 620,
  slotStep: 55,
  /** And how fast the bank empties again, from the bottom up. */
  slotBack: 30,
  /** The field dials: all the way round, back to nothing, then live. A dial
   *  that has swept its own scale once is a dial you have been shown the range
   *  of — which is what every cluster does on ignition and the only reason
   *  anyone knows a tachometer goes to eight. */
  arcFull: 1040,
  arcZero: 1700,
  arcLive: 1960
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** `on`, but `ms` later — and back to false the instant `on` goes, with no
 *  delay on the way down. The panel's beats (see `IN`) are all "this block is
 *  there by now, so its reading may start"; leaving is not staged the same way
 *  and a gauge that waited half a second to notice the screen was going would
 *  be climbing behind the cover. */
const useBeat = (on: boolean, ms: number) => {
  const [at, setAt] = useState(false)
  useEffect(() => {
    if (!on) {
      setAt(false)
      return
    }
    if (reduced()) {
      setAt(true)
      return
    }
    const timer = window.setTimeout(() => setAt(true), ms)
    return () => window.clearTimeout(timer)
  }, [on, ms])
  return at
}

/* ---- the tachometer ----

   The single largest instrument on the panel, the way the reference's own
   tachometer is the biggest thing on its dash, and the thing the name and the
   profile are laid over.

   It is not a chart. What was here before was: one column a year, projects
   shipped against the years worked — real data, and it read as a graph pasted
   onto a dashboard, because a bar chart of twelve things sitting under a bank
   that lists the same twelve things is the same information drawn twice.

   So it is an instrument instead, and it reports on nothing: revs, sweeping
   up the scale and falling back, the way a tachometer does with a foot on the
   throttle. The columns stand at a fixed power curve; what moves is how far
   along that curve the needle has got, and the red zone at the top of the
   scale is painted on the face — a mark, not a reading, exactly like a real
   one. Nothing on this screen selects anything here. The work is picked in
   the rail. */
/** Thirty-four slim columns with a gap about their own width, which is what the
 *  reference has: a wide, shallow bank of hairlines. Twenty-two was an
 *  over-correction — the columns came out fat and far apart, which is a row of
 *  blocks with air between them rather than a graph. */
const TACH_COLS = 34

/** Where the red zone starts, as a fraction of the scale — and it is written
 *  as the mark it lands on rather than as a number that happens to look right.
 *
 *  The axis under the face prints eight marks, `space-between`, so mark `n`
 *  sits at `n / 7` of the width. Set this by eye and the line lands *between*
 *  two of them, which is what it did at 0.82: a redline three quarters of the
 *  way from the 5 to the 6, reading as a mark nobody had bothered to line up.
 *  A real one starts *at* a number on the dial. */
const TACH_MARKS = ['0.5', '1', '2', '3', '4', '5', '6', '7']
/** Which of those marks the red zone begins on. */
const TACH_RED_AT = 5
const TACH_RED = TACH_RED_AT / (TACH_MARKS.length - 1)

/** How many cells tall a column can be — and, through `TACH_FACE` below, how
 *  tall the face itself is and therefore how tall the rail opposite stands.
 *
 *  Twenty-six, down from thirty-three. The reference is a *shallow* bank —
 *  a face about two and a half times wider than it is tall — and a graph
 *  standing nearly as tall as it is wide stops being a strip along the top of a
 *  dash and starts being the page. */
const TACH_ROWS = 26

/** The gap between two cells in a column, and how tall the cell at a given
 *  height up it stands.
 *
 *  **Graded, not uniform.** A column of identical cells is a progress bar in a
 *  dashboard's clothes; what the reference does is stand tall segments at the
 *  foot of a column and shorten them as they climb, so the bottom of the graph
 *  is solid and the top of it dissolves into ticks. The curve that grading
 *  draws across the face — the boundary where the tall cells give out — is a
 *  second reading of the same power curve, for free. */
const CELL_GAP = 3
const cellH = (n: number) => Math.max(7, 14 - n * 1.2)

/** How tall a column standing `k` cells is, gaps included. Every column height
 *  on the face is one of these, so the cells never end mid-way through one and
 *  the face is exactly `TACH_ROWS` cells tall. */
const ladder = (k: number) => {
  let h = 0
  for (let n = 0; n < k; n += 1) h += (n ? CELL_GAP : 0) + cellH(n)
  return h
}

/** The face's own height, in frame units — the ladder, not a round number
 *  picked in the stylesheet. `.mech-tach-face` reads it back as `--face`. */
const TACH_FACE = ladder(TACH_ROWS)

const clampInt = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n))

/** The power curve, one entry per column: up off idle, a long plateau, and
 *  falling away past the red mark. A hair of wobble on top, because a curve
 *  that is perfectly smooth is a function plotted rather than an engine
 *  measured — deterministic, so it is the same shape on every load.
 *
 *  **It idles high** — a third of the scale rather than a twentieth — because
 *  that is what the reference does: the left end of its bank is a run of
 *  columns already well off the floor, not a flat line waiting to start.
 *
 *  There was a pass where the rise was pushed out to 0.52 to keep the columns
 *  from running up through the intro paragraph laid over the face. The intro is
 *  a readout box in the head row now, above the columns rather than among them
 *  — see `.mech-intro` in MechCluster.css — so the curve is free to be the
 *  shape it should have been all along. */
const CURVE = Array.from({ length: TACH_COLS }, (_, i) => {
  const t = i / (TACH_COLS - 1)
  const rise = 1 / (1 + Math.exp(-(t - 0.4) * 6))
  const fall = 1 - 0.16 * Math.pow(Math.max(0, t - 0.8) / 0.2, 2)
  const raw = clamp(0.3 + 0.7 * rise * fall + 0.012 * Math.sin(i * 2.7), 0.2, 1)
  let cells = 1
  while (cells < TACH_ROWS && ladder(cells + 1) <= raw * TACH_FACE) cells += 1
  return ladder(clampInt(cells, 1, TACH_ROWS)) / TACH_FACE
})

/** A column's cells, as one gradient rather than twenty-six elements.
 *
 *  Two of these exist, one per colour, built once on the module and handed to
 *  every column as an inline `background-image`. The colour is a live reading
 *  of `--on` — the column's own "has the sweep reached me" — so the string is
 *  the same for all thirty-four of them and only the custom property the rAF
 *  writes decides how bright any of it burns.
 *
 *  Anchored to the foot of the column and never repeated: the stops are the
 *  ladder above, so cell three is the same height on a column of four as on a
 *  column of twenty-six.
 *
 *  ---- and why every stop in here is a plain token ----
 *
 *  **This string is resolved from scratch every time the column restyles, and
 *  the column restyles every time the needle moves.** `--rev` is written on
 *  the face, `--on` is derived from it per column, and thirty-four columns
 *  then re-resolve whatever this expands to. It used to expand to a hundred
 *  and four positions of `calc(N * var(--px))` and fifty-two colours of
 *  `rgba(var(--accent-rgb), calc(...))` — call it three and a half thousand
 *  calc-bearing tokens for one frame of a gauge sweeping.
 *
 *  Measured on a throttled handset, that made the tachometer the most
 *  expensive thing on the page by a distance: fifty-seven style recalculations
 *  touching under a hundred elements each, at **15.6ms apiece** — twelve times
 *  the per-element cost of the passes that restyle the whole document — for
 *  887ms of the six seconds it takes this page to come up.
 *
 *  Two things fix it and neither is visible:
 *
 *  **Positions are percentages.** `background-size` already declares the box
 *  as `--face` frame units tall (`TACH_FACE`, which is what the ladder sums
 *  to), so a stop at `at` frame units *is* `at / TACH_FACE` of the box. Same
 *  pixels, no `calc()`, no `--px`.
 *
 *  **The colour is one registered custom property.** `--cell-ink` and
 *  `--cell-warn` are declared with `@property … syntax: '<color>'` in
 *  MechCluster.css, which is what makes the difference: a *registered*
 *  property computes to a resolved colour once per element, and `var()`
 *  substitutes that value. Unregistered, `var()` substitutes the token stream
 *  instead and the `calc()` inside it is re-evaluated at all fifty-two stops.
 *  A browser without `@property` falls back to exactly the old behaviour —
 *  correct, and as slow as it was before. */
const cellStack = (ink: string) => {
  const stops: string[] = []
  let at = 0
  const pc = (units: number) => `${((units / TACH_FACE) * 100).toFixed(4)}%`
  for (let n = 0; n < TACH_ROWS; n += 1) {
    if (n) at += CELL_GAP
    const top = at + cellH(n)
    stops.push(`transparent ${pc(at)}`, `${ink} ${pc(at)}`, `${ink} ${pc(top)}`, `transparent ${pc(top)}`)
    at = top
  }
  return `linear-gradient(to top, ${stops.join(', ')})`
}

const CELLS_LIT = cellStack('var(--cell-ink)')
const CELLS_RED = cellStack('var(--cell-warn)')

/** Where the needle idles, and the range it is blipped to. It spends longer
 *  wound up than resting on purpose: an instrument sitting at its stop is an
 *  instrument that reads as switched off, and the columns near idle are the
 *  short ones at the quiet end of the curve. */
const REV_IDLE = 0.2
/** Pulled in with the redline. These were 0.64–0.92 against a red zone that
 *  started at 0.82; against one that starts at 0.71 the same numbers would
 *  park the needle in the red almost permanently, which is the one place a
 *  needle is not supposed to live. */
const REV_PEAK = [0.55, 0.79]
const REV_HOLD = { idle: [0.45, 1.1], wound: [1, 2.2] }

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** The dotted trace over the tops of the columns — the envelope the columns
 *  are standing under, which is what makes the graph read as a face with a
 *  curve printed on it rather than as a row of bars. Drawn in a 100 × 100
 *  viewBox stretched to the face, so it needs no measurement. */
const tracePoints = (from: number, to: number) =>
  CURVE.slice(from, to)
    .map((h, n) => {
      const i = from + n
      const x = ((i + 0.5) / TACH_COLS) * 100
      // Lifted clear of the cells it caps, in the same units.
      const y = (1 - h) * 100 - 3.4
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

const REDLINE_AT = Math.round(TACH_RED * TACH_COLS)

/* ---- how the needle moves ----

   At a **constant rate**, not on an eased chase, and this is the one place on
   the panel where that is the right answer.

   Everything else here settles exponentially — the counts, the subjects'
   scale, the drift — because those are things arriving at a value and an
   exponential arrival is what "settling" looks like. The tachometer is not
   arriving anywhere: it is a bar graph of thirty-four lamps and what you
   actually watch is the *edge* travelling along it, because `--rev` is
   snapped to whole columns before it is written (see the tick).

   An exponential moves that edge fast at first and then slower and slower, so
   the lamps light in a rush and then visibly stall — four columns in one
   frame near the start, and better than a tenth of a second between the last
   two. Which is exactly what it looked like: a stagger rather than a sweep.
   Linear gives an even cadence, one column every few frames the whole way, and
   the whole thing reads as a wipe.

   The character survives the change. Up fast and down slow is what makes a
   blip a blip, and it is still here — it is two rates now rather than two
   easings. */
const REV_RATE = {
  /** The ignition sweep: 0 to the top of the range. The slowest of the four
   *  on purpose — it is the one move on this instrument anybody actually
   *  watches from the beginning, so it is a deliberate wipe up the scale
   *  rather than a flick. About one column every fifty milliseconds. */
  sweep: 0.62,
  /** A blip, up. */
  up: 0.9,
  /** And down, which is slower — a throttle closing is not a throttle
   *  opening. */
  down: 0.42,
  /** Off the scale entirely, when the screen leaves. Much quicker than the
   *  down-blip, because the whole exit is a couple of hundred milliseconds and
   *  a needle still coasting down when the cover arrives is a needle that
   *  never came off. */
  off: 1.3
}

/** How long the sweep holds at the top before falling back to idle. */
const SWEEP_HOLD = 0.5

/** Toward `to` at a fixed rate, never past it. */
const toward = (from: number, to: number, rate: number, dt: number) =>
  from < to ? Math.min(to, from + rate * dt) : Math.max(to, from - rate * dt)

/** `start` is the cover lifting, and it is the ignition key both ways.
 *
 *  Held off, the face reads nought — every column dark, the graph an empty
 *  grid of unlit cells — and the first thing it does when it is let go is the
 *  sweep it has always done: up the scale and back down. That sweep is the
 *  arrival. It used to run behind the boot's cover, so the instrument was
 *  found already idling, which is the difference between a machine coming up
 *  and a picture of one. Taken away again, the needle falls to nought and the
 *  columns go out under it.
 *
 *  One loop for both, and it never restarts. That is the reason `start` is
 *  read off a ref rather than being a dependency: re-running the effect would
 *  put `rev` back to zero, and the drop the exit is asking for is the *same*
 *  needle running down from wherever it actually was. */
function Tach({ start, children }: { start: boolean; children?: React.ReactNode }) {
  const face = useRef<HTMLDivElement>(null)
  const on = useRef(start)
  on.current = start

  useEffect(() => {
    const node = face.current
    if (!node || !reduced()) return
    node.style.setProperty('--rev', start ? String(Math.round(0.62 * TACH_COLS) / TACH_COLS) : '0')
  }, [start])

  useEffect(() => {
    const node = face.current
    if (!node || reduced()) return
    node.style.setProperty('--rev', '0')

    let raf = 0
    let rev = 0
    /** `off` before the cover lifts and again once it comes back down;
     *  `sweep` is the one wipe up the scale on arrival; `run` is the
     *  instrument doing its own thing. */
    let mode: 'off' | 'sweep' | 'run' = 'off'
    let live = false
    let target = 0
    let hold = 0
    let previous = performance.now()
    let shown = -1

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now

      if (on.current !== live) {
        live = on.current
        /* The machine coming up: the first thing the needle does is sweep the
           scale and drop back, which is what a cluster does when the ignition
           is turned and is the reason a real one is worth watching at all. And
           going down, it simply falls off the bottom. */
        mode = live ? 'sweep' : 'off'
        target = live ? REV_PEAK[1] : 0
        hold = SWEEP_HOLD
      }

      if (mode === 'run') {
        hold -= dt
        if (hold <= 0) {
          const wound = target > REV_IDLE + 0.01
          target = wound ? REV_IDLE : rand(REV_PEAK[0], REV_PEAK[1])
          const next = wound ? REV_HOLD.idle : REV_HOLD.wound
          hold = rand(next[0], next[1])
        }
      }

      const rate =
        mode === 'off' ? REV_RATE.off : mode === 'sweep' ? REV_RATE.sweep : target > rev ? REV_RATE.up : REV_RATE.down
      rev = toward(rev, target, rate, dt)

      /* The sweep hands over to the running instrument the moment it tops
         out, and holds there a beat first — a needle that touches its stop
         and turns straight round has not been *swept*, it has been flicked. */
      if (mode === 'sweep' && rev >= target - 1e-4) {
        mode = 'run'
        hold = SWEEP_HOLD
      }

      /* The hair of tremor only while it is sitting still. Under a snap to
         whole columns it is worth a lamp either way, which reads as an
         instrument that will not quite settle — and, laid over a column edge
         that is already travelling, as the sweep stumbling. */
      const holding = Math.abs(target - rev) < 1e-4
      const shake = live && holding ? Math.sin(now / 61) * 0.006 + Math.sin(now / 23) * 0.003 : 0

      /* Snapped to whole columns before it is written. A bar graph lights
         lamps, so a value between two of them is a value with nowhere to go —
         and snapping also means the property is only written when the reading
         has actually moved, which is what keeps a style invalidation over
         thirty-four columns off most frames. */
      const at = Math.round(clamp(rev + shake, 0, 1) * TACH_COLS) / TACH_COLS
      if (at === shown) return
      shown = at
      node.style.setProperty('--rev', String(at))
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="mech-tach">
      {/* The top line, and whatever is handed in goes on it — on this panel,
          the intro. It is a slot rather than content of its own because the row
          is the instrument's furniture and the words on it are not. */}
      <div className="mech-tach-head">{children}</div>

      {/* `--cols` is handed to the stylesheet rather than written into it: each
          column works out whether the sweep has reached it from its own index
          against `--rev`, and that arithmetic needs to know how many there
          are. Hard-code it in the CSS and changing `TACH_COLS` here leaves a
          graph that lights the wrong half of itself. */}
      <div
        className="mech-tach-face"
        ref={face}
        style={{ ['--cols' as string]: TACH_COLS, ['--red' as string]: TACH_RED }}
        aria-hidden
      >
        <div className="mech-tach-bank">
          {CURVE.map((h, i) => (
            <span
              key={i}
              className="mech-tach-col"
              data-red={i >= REDLINE_AT}
              style={{
                ['--h' as string]: h,
                ['--i' as string]: i,
                backgroundImage: i >= REDLINE_AT ? CELLS_RED : CELLS_LIT
              }}
            />
          ))}
        </div>

        {/* Two polylines rather than one dashed in two colours: the trace goes
            warm where the face does, and a single element cannot change stroke
            half way along. They share the column either side of the mark so
            the join is a point and not a gap. */}
        <svg className="mech-tach-trace" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <polyline className="mech-tach-line" points={tracePoints(0, REDLINE_AT + 1)} vectorEffect="non-scaling-stroke" />
          <polyline
            className="mech-tach-line mech-tach-line-red"
            points={tracePoints(REDLINE_AT, TACH_COLS)}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <span className="mech-tach-redline" />
      </div>

      <div className="mech-tach-axis" aria-hidden>
        {TACH_MARKS.map((mark, n) => (
          <span key={mark} data-red={n >= TACH_RED_AT}>
            {mark}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---- the field dials ----

   A ring of even blocks, and a sweep that lights them one after another from
   the top.

   The blocks used to *ramp* — a C open at the bottom with each one reaching
   further out than the last, the way a digital speedometer's arc is drawn.
   That was a shape doing two jobs: the wedge says how far round a reading has
   got, and there is no reading here. A field is on or it is off, so a ring
   whose blocks are all the same is telling the truth and a ring that fans out
   is drawing a scale nothing is being plotted against.

   What survived the ramp is the *movement*, which was the good part: the
   blocks light in sequence rather than all at once. That is what makes it read
   as a gauge answering rather than a lamp switching, and it costs a transition
   delay per block.

   Straight spokes rather than arc segments. At this size (a gauge about thirty
   units across on a 1920 frame) the curvature across one block is under a
   pixel, and a spoke is a `<line>` with four numbers where an arc is a path
   with a sweep flag and an `A` command per cell. */
const ARC = {
  box: 40,
  mid: 20,
  /** Where every block starts and ends. The hole in the middle is what makes
   *  it a dial face rather than a pie. */
  r0: 9.5,
  len: 5.5,
  /** From twelve o'clock, clockwise, all the way round — so the sweep starts
   *  where a dial's own zero is. */
  from: -90,
  cells: 12
}

const ARC_SEGS = Array.from({ length: ARC.cells }, (_, n) => {
  const a = ((ARC.from + n * (360 / ARC.cells)) * Math.PI) / 180
  return {
    x1: ARC.mid + Math.cos(a) * ARC.r0,
    y1: ARC.mid + Math.sin(a) * ARC.r0,
    x2: ARC.mid + Math.cos(a) * (ARC.r0 + ARC.len),
    y2: ARC.mid + Math.sin(a) * (ARC.r0 + ARC.len)
  }
})

/** One mark on the scale under the bank.
 *
 *  A dial rather than a meter. Every other reading on this panel is a stack of
 *  cells climbing — the counts, the tach, the displays — and five more of them
 *  in a row along the bottom made the fifth block on the screen say nothing the
 *  other four had not already said in the same shape. A dial is the one
 *  instrument grammar a dashboard has that this panel was not using.
 *
 *  A field is on or it isn't, so the ring lights all the way round or not at
 *  all — but it does not simply *appear*. Each block carries its own index as
 *  `--n` and the stylesheet turns that into a transition delay, so switching a
 *  field on runs the ring round from twelve o'clock in about a third of a
 *  second and switching it off drops the lot at once. Which is the right way
 *  round: a gauge sweeping up is a gauge taking a reading, and a gauge sweeping
 *  *down* is a gauge pretending the reading went away gradually. */
function FieldGauge({ name, on }: { name: Field; on: boolean }) {
  return (
    <div className="mech-field-gauge" data-on={on}>
      <svg className="mech-field-ring" viewBox={`0 0 ${ARC.box} ${ARC.box}`} focusable="false" aria-hidden>
        {ARC_SEGS.map((seg, n) => (
          <line key={`t${n}`} className="mech-field-track" {...seg} />
        ))}
        {ARC_SEGS.map((seg, n) => (
          <line key={`l${n}`} className="mech-field-lit" style={{ ['--n' as string]: n }} {...seg} />
        ))}
      </svg>
      <span className="mech-field-label">{FIELD_LABEL[name]}</span>
    </div>
  )
}

/** The three counts, and the one loop that moves all three.
 *
 *  One rAF for the block rather than one per gauge, and it writes a cell count
 *  onto each bar rather than a state update — three custom properties on three
 *  elements, and only on the frames the reading actually crosses a cell. See
 *  `RISE` and `SWAY` for what it is doing and why.
 *
 *  `fields` drives which slice of the roster the three numbers describe — see
 *  `countsFor`. The bars ease toward whatever it currently resolves to rather
 *  than restarting the climb from zero on every change: `shownFrac` is a
 *  fraction per gauge that chases its target at a fixed rate, so landing on
 *  "filmmaker" mid-cycle slides the bars to that reading rather than dropping
 *  them back to empty and climbing again, which is what happens if the
 *  arrival animation is simply re-run. */
function Counts({ fields, start }: { fields: Field[]; start: boolean }) {
  const bars = useRef<Array<HTMLSpanElement | null>>([])
  const rows = useMemo(() => countsFor(fields), [fields.join(',')])
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const shownFrac = useRef(rows.map(() => 0))
  /* `start` is read off a ref, and the loop below never restarts, for the same
     reason the tachometer's does not: the exit is these bars running *down*
     from wherever they had got to, and re-running the effect would put them at
     zero first — which is the drop, not the run down to it. */
  const on = useRef(start)
  on.current = start

  useEffect(() => {
    if (!reduced()) return
    rowsRef.current.forEach((count, n) =>
      bars.current[n]?.style.setProperty('--lit', start ? String(Math.round((count.value / count.of) * TICKS)) : '0')
    )
  }, [start])

  useEffect(() => {
    if (reduced()) return

    let raf = 0
    let previous = performance.now()
    const shownCells = rowsRef.current.map(() => -1)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const since = now / 1000
      const live = on.current
      // Framerate-independent: the same time-to-settle at any frame rate,
      // the way `Drift`'s `k` and the tach's own easing both work.
      const k = 1 - Math.pow(0.001, dt / (live ? RISE : FALL))

      rowsRef.current.forEach((count, n) => {
        /* Nought until the block is on screen, and nought again the moment it
           starts leaving. The climb from nothing to the reading *is* the
           arrival — three bars found already sitting at two-thirds are three
           bars nobody watched fill — and the run back down is the same
           gesture backwards, which is the only honest way for a gauge to
           stop reading. */
        const target = live ? count.value / count.of : 0
        const frac = (shownFrac.current[n] += (target - shownFrac.current[n]) * k)
        const settled = live && Math.abs(target - frac) < 0.01
        const sway = settled
          ? (Math.sin(since * SWAY.rate + n * 2.1) + Math.sin(since * SWAY.rate * 2.7 + n) * 0.4) * SWAY.depth
          : 0
        const cells = Math.round(clamp(frac + sway, 0, 1) * TICKS)
        if (cells === shownCells[n]) return
        shownCells[n] = cells
        bars.current[n]?.style.setProperty('--lit', String(cells))
      })
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    /* Bars and their labels, and nothing else on top of them.

       The two-cell number over each gauge is gone, and so is the second line
       under it — `active`, `worn`, `shipped`. Between the digits, the noun and
       the qualifier, one reading was being printed three times, and the block
       ran so tall that the bars it exists for were the least of it. What the
       numbers said the bars already say, which is all a gauge is for: a bar
       against a fixed ceiling means "a lot of" or "a few", and that is the
       honest resolution of these three. The reel of what I do stands where the
       digits were — see the flank in `MechCluster` — so the top of the block is
       still a readout, just one that is not repeating the row below it. */
    <section className="mech-counts">
      {rows.map((count, n) => (
        <div className="mech-gauge" key={count.label} aria-label={`${count.reads}: ${count.value} of ${count.of}`}>
          {/* Stacked bottom-up: the strip is `column-reverse`, so the first
              cell is the one at the foot of the gauge and lighting the first
              `--lit` of them fills it from the bottom, which is the only
              direction a gauge has ever filled. Each cell knows its own index
              and works out whether it is under the level itself — one property
              written per bar per change, rather than sixteen. */}
          <span
            className="mech-gauge-bar"
            ref={(node) => {
              bars.current[n] = node
            }}
          >
            {Array.from({ length: TICKS }, (_, cell) => (
              <i key={cell} style={{ ['--n' as string]: cell }} />
            ))}
          </span>
          <span className="mech-gauge-label">{count.label}</span>
        </div>
      ))}
    </section>
  )
}

/* The narrow name's font-size is a `cqw` formula the same as the wide one —
   see `.mech-ident-name` — but that formula is only an *estimate* of how
   wide the rendered text comes out, off an average per-character advance
   that is not this font's real one. On the wide layout the gutter around it
   hides the error; bled to the edges down here, it either fell short of
   them or ran past — and worse, ran past by a different amount on Mobile
   Safari than in a desktop browser, because font metrics for a self-hosted
   display face are not identical across engines. A guessed constant cannot
   chase that.

   So this measures instead: `probe` is an off-screen copy of the same text
   at the same font-size (same class, same custom properties, so it always
   matches), and `--name-fit` is `min(1, available / probe's real width)`,
   written onto `ident` and read by `.mech-ident-name`'s `transform: scale()`
   on the narrow layout only. Shrink-only — the formula above already starts
   deliberately a little large, so this only ever pulls it in to fit
   whatever actually rendered, on whatever actually rendered it.

   Both boxes are watched, not just `ident`. Audiowide is a self-hosted face
   and loads after first paint — the probe measures in a fallback font for
   that first frame, narrower than the real one, and a ratio taken against
   that stale width is too generous. Watching `probe` too means the swap-in
   itself re-triggers a measure. */
const useNameFit = (narrow: boolean, ident: RefObject<HTMLElement | null>, probe: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!narrow) return
    const identEl = ident.current
    const probeEl = probe.current
    if (!identEl || !probeEl) return

    const measure = () => {
      const available = identEl.getBoundingClientRect().width
      const natural = probeEl.scrollWidth
      identEl.style.setProperty('--name-fit', String(natural > 0 ? Math.min(1, available / natural) : 1))
    }

    measure()
    void document.fonts?.ready?.then(measure)
    const watch = new ResizeObserver(measure)
    watch.observe(identEl)
    watch.observe(probeEl)
    return () => watch.disconnect()
  }, [narrow, ident, probe])
}

interface Props {
  onProject: (id: string) => void
  /** Held back while the machine is still booting, and again while the screen
   *  is leaving for a project. It is what holds the panel down and what runs
   *  its entrances — see *coming up, and going down* in MechCluster.css. */
  covered: boolean
  /** Covered *because it is on its way out*, as opposed to covered because it
   *  has only just arrived. The exits hang off this and not off `covered`,
   *  and that distinction is the whole fix for home flashing when you come
   *  back to it: coming home mounts this component on the `hold` beat, with
   *  `covered` still true, and an exit is a `to`-only keyframe under
   *  `animation-fill-mode: both` — so its held first frame is the panel at
   *  full opacity in its finished position. One painted frame of the whole
   *  cluster, before the entrances take it back to nothing and bring it in.
   *  Same trap, and the same fix, as `leaving` on the project screen's
   *  housing; see the note beside it in Mech.tsx. */
  leaving: boolean
  tuning: ClusterTuning
}

export default function MechCluster({ onProject, covered, leaving, tuning }: Props) {
  /* Which slot is selected. It persists rather than following the pointer:
     a preset bank holds the preset you pressed, and on a phone there is no
     "leaving" for it to be cleared by. What does release it is the pointer
     leaving the bank on a mouse, after a beat — see `RELEASE_MS`. */
  const [picked, setPicked] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const release = useRef(0)
  const narrow = useNarrow()
  const identRef = useRef<HTMLElement>(null)
  const nameProbe = useRef<HTMLHeadingElement>(null)
  useNameFit(narrow, identRef, nameProbe)

  /* ---- the arrival ----

     `covered` is the boot's cover, and it is also true for the beat this
     component mounts on when you come back to home from a project. So `up` is
     the one signal every readout on the panel waits for: nothing types, no
     gauge climbs and no subject is dealt until it is true, and everything
     below counts its own delay from that moment rather than from mount. See
     `IN` at the top of this file for the order.

     A plain boolean, not a phase count, because the panel's own blocks are
     already staggered in CSS and these only have to be *later than* the block
     they sit in. */
  const up = !covered
  /* Two readings that climb rather than switch on, so they wait for the block
     around them to have finished arriving before they start. */
  const revUp = useBeat(up, IN.tach)
  const countsUp = useBeat(up, IN.counts)

  /* The field dials' ignition sweep: all the way round, back to nothing, then
     live. Three timers rather than a keyframe because the dial has no
     animation of its own — it is twelve blocks lit by a transition off
     `data-on`, and the stagger that makes it read as a sweep is a
     transition-delay per block. Driving it from here means the flourish and
     the reading it settles into are the same mechanism, so there is nothing to
     hand over between them. */
  const [arc, setArc] = useState<'off' | 'full' | 'zero' | 'live'>('off')

  useEffect(() => {
    if (!up) {
      setArc('off')
      return
    }
    if (reduced()) {
      setArc('live')
      return
    }
    const timers = [
      window.setTimeout(() => setArc('full'), IN.arcFull),
      window.setTimeout(() => setArc('zero'), IN.arcZero),
      window.setTimeout(() => setArc('live'), IN.arcLive)
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [up])

  const slot = picked === null ? null : SLOTS[picked]

  /* What the left display is working through. With nothing picked it is the
     titles; with a project up it is what I did on that project, which is
     usually one thing and sometimes two. One reel either way, so there is no
     second code path for the case that happens to have one entry. */
  const reel = slot ? slot.roles : TITLES.map((title) => title.title)
  const at = step % Math.max(1, reel.length)

  /* Back to the top whenever the reel changes. Landing on "product designer"
     because that is where the titles happened to have got to is a display
     reading out its own scroll position. */
  useEffect(() => setStep(0), [slot?.id])

  useEffect(() => {
    if (reel.length < 2) return
    const timer = window.setInterval(() => setStep((n) => n + 1), TITLE_MS)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel.length, slot?.id])

  useEffect(() => () => window.clearTimeout(release.current), [])

  /* The arrow keys step the bank, the same as the tile rail on a project
     screen. Not while something is being typed into — the dev panel is one
     keypress away and its fields are real. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const on = event.target as HTMLElement | null
      if (on && (on.tagName === 'INPUT' || on.tagName === 'TEXTAREA' || on.isContentEditable)) return
      const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      if (!step) return
      window.clearTimeout(release.current)
      setPicked((was) => (was === null ? (step > 0 ? 0 : SLOTS.length - 1) : (was + step + SLOTS.length) % SLOTS.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reading = reel[at] ?? ''
  /* What the scale marks. With a project up it is every field that project
     touches — usually two or three of the five lit at once, which is the whole
     reason it is a scale and not a single needle. Otherwise it is the one
     field the current title falls under. */
  const marked = slot ? slot.fields : [TITLES[at % TITLES.length].field]

  const hold = () => window.clearTimeout(release.current)
  const letGo = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    window.clearTimeout(release.current)
    release.current = window.setTimeout(() => setPicked(null), RELEASE_MS)
  }

  const identity = (
    <section className="mech-ident" ref={identRef}>
      <h1 className="mech-ident-name" style={{ ['--name-len' as string]: NAME.length }}>
        {/* The finished line, drawn in nothing, and it does two jobs.
            It gives the heading its **height** from the first frame: an `h1`
            whose only content is `Typed`'s empty span has no line box at all,
            which is zero pixels tall — so the panel underneath used to sit
            about a hundred and forty pixels high and drop into place the
            instant the first character landed. And it gives it its **width**,
            which is what lets the typing run from a fixed left edge: the box
            is the whole name wide and centred in the frame, so characters
            fill it left to right instead of the line growing out from its own
            middle and shunting every letter sideways on every keystroke. */}
        <span className="mech-ident-full" aria-hidden>
          {NAME}
        </span>
        <span className="mech-ident-typed">
          {/* Last on the panel, and it types from the moment the cover
              lifts rather than from mount — see `start` on `Typed`. */}
          <Typed
            text={NAME}
            run="cluster-name"
            delay={1.25}
            speed={96}
            caret={false}
            start={up}
            back={covered}
            backSpeed={40}
          />
        </span>
      </h1>
      {/* Off-screen, always the full text regardless of where `Typed` has
          got to — see `useNameFit`. */}
      <h1
        className="mech-ident-name mech-ident-probe"
        aria-hidden
        ref={nameProbe}
        style={{ ['--name-len' as string]: NAME.length }}
      >
        {NAME}
      </h1>
    </section>
  )

  /* The profile, as a readout rather than as a paragraph on a page. It used
     to be set in the site's Helvetica at body size and colour, which made it
     the one humanist, low-contrast, ragged thing on a panel of hard tracked
     caps. Same words, in the panel's own monospace.

     Typed rather than dropped in — every other line on this panel arrives a
     character at a time, and a paragraph that simply appeared read as the
     one line the machine had not actually switched on. `back` follows
     `covered`: opening a project backspaces it out rather than leaving it
     frozen on screen behind the cover, which is what a paragraph with no
     exit of its own did. Fast both ways — `speed`/`backSpeed` are a fraction
     of the name's, or a hundred and fifty-odd characters either takes
     several seconds to arrive or is still typing itself out after
     `EXIT_MS` has already unmounted it. */
  /* What I do — cycling the titles with nothing picked, or what I did on the
     selected project.

     Two places, one of which renders. Wide it stands over the gauges in the
     left flank, in the place the three two-cell numbers used to occupy —
     under them it was a fourth line on a block that was already digits, noun
     and qualifier deep; over them it is the block's one reading with the bars
     beneath it as the scale, which is the arrangement the whole panel uses
     everywhere else.

     Narrow it comes out of the flank entirely and sits between the
     instrument and the name. Down here the counts are a wide row rather than
     a column of gauges, so a reading standing over them was a caption on a
     chart; above the name it is the line that says what the name *does*,
     which is the order those two facts want to be read in. `--role-size`,
     `--role-top` and `--role-gap` on the Cluster tab are its size and the air
     either side of it — see `.mech-display-role` in MechCluster.css. */
  const roleDisplay = (
    <div className="mech-display mech-display-role" data-on={slot !== null} data-warn>
      <Segment text={reading} cells={ROLE_CELLS} arrive wait={IN.role} start={up} back={covered} label={reading} warn />
    </div>
  )

  const introSection = (
    <section className="mech-intro">
      <span className="mech-intro-cap mech-display" data-on data-warn>
        {/* Flickered up, the same as the reel opposite it. It was `settle:
            false` — a cap that never changes has nothing to settle *from* —
            but arriving is not a change, it is the lamps coming on, and
            `arrive` is the switch for exactly that. */}
        <Segment
          text="INTRO"
          cells={ROLE_CELLS}
          /* Left-set beside the paragraph it caps on the wide layout; centred
             down here, where the whole intro block is centred under the name
             and a sign hard against the left edge of a centred paragraph is
             the one thing in the column not lining up with anything. */
          align={narrow ? 'center' : 'left'}
          arrive
          wait={IN.intro}
          start={up}
          back={covered}
          label="intro"
          warn
        />
      </span>

      <p className="mech-profile">
        <Typed text={PROFILE} run="cluster-intro" delay={0.6} speed={9} caret={false} back={covered} backSpeed={3} />
      </p>
    </section>
  )

  return (
    <div
      className="mech-cluster"
      data-covered={covered}
      data-leaving={leaving}
      style={{
        /* The graph's own height, in frame units, handed to the whole panel
           rather than to the face alone. It is the sum of the cell ladder (see
           `TACH_FACE`), so it is not a number anyone can pick — and the rail
           opposite is sized off it, because *the rail is as tall as the
           instrument* is the rule and this is where the instrument's height
           actually comes from. */
        ['--face' as string]: TACH_FACE,
        ['--cluster-y' as string]: tuning.y,
        ['--cluster-name' as string]: tuning.name,
        ['--cluster-glow' as string]: tuning.glow,
        ['--cluster-slot' as string]: tuning.slot,
        ['--cluster-tach' as string]: tuning.tach,
        ['--intro-y' as string]: tuning.introY,
        ['--bay-fade' as string]: tuning.bayFade,
        ['--bay-blur' as string]: tuning.bayBlur,
        ['--role-size' as string]: tuning.roleSize,
        ['--role-top' as string]: tuning.roleTop,
        ['--role-gap' as string]: tuning.roleGap,
        ['--profile-size' as string]: tuning.profileSize,
        ['--profile-ink' as string]: tuning.profileInk
      }}
    >
      {/* The name and the panel below it, as one group that centres in
          whatever room the frame has under the warning pair — rather than
          the panel's own `flex: 1` pinning everything to the top the moment
          a window is taller than the content needs. `SHOOT` / `STOP` and the
          tally between them are global chrome now, not part of this
          component at all — see `Alarm.tsx`, mounted in `Mech.tsx` next to
          `MechCursor` / `MechBird` / `MechLaser`, so they survive the swap
          to a project instead of unmounting with the rest of the cluster. */}
      <div className="mech-panel-mid">
        {/* The identity, on its own now — between the warning pair and the
            instrument rather than laid over the quiet end of it. Red-orange,
            the panel's one warm colour, because this is the one line on the
            screen that is not a reading: it is who built it.

            On the narrow layout it drops to below the instrument instead —
            `narrow` picks which of the two spots below actually renders it,
            so there is one `.mech-ident` in the tree rather than two Typed
            runs racing each other. */}
        {!narrow && identity}

        <div className="mech-body">
        {/* ---- the left flank ---- */}
        <div className="mech-flank">
          {/* Centred in a box that is the gauges' own width (`--count-w`), so
              it lands over the middle of the three. It was left-set for a pass
              while the box was still wider than they were and drifting looked
              like the problem. Narrow renders the same block above the name
              instead — see `roleDisplay`. */}
          {!narrow && roleDisplay}

          <Counts fields={marked} start={countsUp} />
        </div>

        {/* Narrow only — the wide layout's copy renders inside `Tach`,
            over the graph's face. Down here it reads better after the
            counts than above a graph nobody has scrolled to yet. */}
        {narrow && introSection}

        {/* ---- the middle ---- */}
        <div className="mech-main">
          <Tach start={revUp}>
          {/* The black readout box at the top-left of the instrument — the
              position the reference gives its own digits. The label is drawn
              in the same segment glyphs as every other reading on the panel,
              and the paragraph under it is the one thing on this screen that
              is prose rather than a number.

              Narrow moves it out from here entirely — below the counts
              rather than above the graph, so `!narrow` gates it and the
              other copy of the same markup renders after `.mech-flank`
              instead. */}
          {!narrow && introSection}
          </Tach>
          {/* The reel first, then the name it is a reading about. */}
          {narrow && roleDisplay}
          {narrow && identity}
        </div>

        {/* ---- the rail ----

            Work, on the right, the full height of the panel — see *the bank is
            the navigation* for why it is pressable slots rather than a graph.
            It is `MechBank.tsx` now rather than markup here, because a project
            screen mounts the same rail down its own right-hand margin. */}
        <MechBank
          picked={picked}
          onPick={(n) => {
            hold()
            setPicked(n)
          }}
          onOpen={onProject}
          up={up}
          covered={covered}
          narrow={narrow}
          title={slot ? slot.title : null}
          onHold={hold}
          onRelease={letGo}
        >
          {/* The scale, under the bank — see `FieldGauge` above. Handed in as
              children rather than living in `MechBank`: the dials report on
              home's own selection, and a project screen's copy of the bank
              has no selection to report. */}
          <div className="mech-scale-row">
            {/* `arc` is the ignition sweep — every dial round to full, then
                back to nothing, then whatever is actually being read. See the
                effect that drives it. */}
            {FIELDS.map((name) => (
              <FieldGauge key={name} name={name} on={arc === 'full' || (arc === 'live' && marked.includes(name))} />
            ))}
          </div>
        </MechBank>
        </div>
      </div>
    </div>
  )
}
