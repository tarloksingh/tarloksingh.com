import { useEffect, useMemo, useRef, useState } from 'react'
import Segment from './Segment'
import Typed from './Typed'
import { MENU } from './model'
import { quarry } from './subject'
import { sound } from './sound'
import MechSlots, { hasSubject, SlotView } from './MechSlots'
import type { Tag } from '../data/projects'
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
   Five things, and the arrangement is the whole design:

   - a **warning pair** at the top of the frame, `SHOOT` / `STOP`, which is
     the one lamp on the page about the page rather than about the work: it
     reports whether there is anything in the air to shoot at.
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

type Field = 'design' | 'code' | 'film' | 'games' | 'product'

/** The scale, in the order it is printed. Three now, not five — `games` and
 *  `film` dropped off the dial row entirely rather than being left to
 *  overflow the rail's own width. */
const FIELDS: Field[] = ['product', 'code', 'design']

/** What each field reads on the dial row — not always the field's own key.
 *  `design` prints as "brand" here: the row is Product / Code / Brand, and the
 *  underlying `Field` stays `design` because that is still what `FIELD_OF`
 *  maps `3d` tags onto. Cosmetic, and kept separate from the key on purpose —
 *  the key is a fact about the data, the label is a fact about this scale. */
const FIELD_LABEL: Record<Field, string> = {
  design: 'brand',
  code: 'code',
  film: 'film',
  games: 'games',
  product: 'product'
}

/** Which field each of a project's tags falls under.
 *
 *  An editorial mapping, and it has to be — `TAGS` in projects.ts is a filter
 *  row written for browsing, and this is a five-mark scale on an instrument.
 *  Kept here rather than on the data because it is a fact about *this readout*
 *  and not about the projects. */
const FIELD_OF: Record<Tag, Field> = {
  '3d': 'design',
  tools: 'code',
  film: 'film',
  motion: 'film',
  music: 'film',
  'video games': 'games',
  hardware: 'product',
  work: 'product'
}

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

/** How many cells each half of the strip has. Wide enough for the longest
 *  title and the longest project name — "Red Dead Redemption 2" is twenty-one
 *  characters and it is not going to be abbreviated on the one display whose
 *  job is naming it. Fixed, and the same on both sides: a readout is a fixed
 *  number of lamps, and one that resized itself around each word would be a
 *  text box. */
const CELLS = 21

/** Cells in the role reel under the counts. Exactly the longest title or role
 *  — "Product Designer" is sixteen — and deliberately narrower than `CELLS`: it
 *  never has to hold a project name, and a box sized for one read as a word
 *  adrift in too much housing.
 *
 *  Sixteen rather than seventeen because the display is boxed to the width of
 *  the counts above it (`--count-w`), and a seventeenth cell put the tail of
 *  "DESIGN ENGINEER" out past the right edge of the `ORGS` gauge — a readout
 *  hanging off the block it belongs to. */
const ROLE_CELLS = 16

/** What the right-hand display says with nothing picked. A dark box on
 *  arrival reads as broken; this labels what the box is for, and it goes out
 *  the moment there is something real to put there. */
const IDLE = 'projects'

/** A role, split into the things it actually is. "Founder & Product Designer"
 *  is two jobs printed as one string, and the display cycles them — see
 *  `TITLE_MS`. */
const rolesOf = (role: string): string[] =>
  role
    .split(/[&,/]/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)

/* ---- the bank ----

   `MENU`'s own order, which is a decision about what to lead with rather than
   a sort — see `MENU_IDS` in model.ts. So slot 01 is the work that should be
   seen first, and the number on a slot means something.

   Everything a slot needs is worked out once, on the module. Twelve slots
   re-deriving their own tags and hero on every pointer move is real work on
   the one interaction this screen has. */
interface Slot {
  id: string
  title: string
  tagline: string
  company: string
  timeline: string
  year: number
  fields: Field[]
  /** What I did on it, one job per entry — what the left display reads out
   *  while this slot is up. */
  roles: string[]
  /** No material yet: Visa is under an NDA, Solomon's write-up is still to
   *  come. The slot says so rather than being left out of the bank — both are
   *  real work, and a gap at position 01 would read as a bug. */
  restricted: boolean
  /** Whether there is a subject to stand in the slot — a model or a piece.
   *  Visa is the only one without, and its slot says so rather than being left
   *  out of the bank. */
  solid: boolean
}

const SLOTS: Slot[] = MENU.map((item) => ({
  id: item.project.id,
  title: item.project.title,
  tagline: item.project.tagline,
  company: item.project.company,
  timeline: item.project.timeline,
  year: item.project.year,
  fields: [...new Set(item.project.tags.map((tag) => FIELD_OF[tag]).filter(Boolean))],
  roles: rolesOf(item.project.role),
  restricted: Boolean(item.project.restricted),
  solid: hasSubject(item.project.id)
}))

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
   selected project touches. Point at "filmmaker" and `YRS ACTIVE` becomes
   years active *as one* — the span between the earliest and latest film work,
   not the whole career. The scale each bar is read against (`of`) stays fixed
   to the whole roster, though, so a field with two projects in it reads as a
   short bar against the same ceiling rather than a differently-scaled gauge
   every time the reading changes. */
const COUNT_OF = { yrs: 16, roles: 12, orgs: 8 }

const countsFor = (fields: Field[]) => {
  const pool = SLOTS.filter((slot) => slot.fields.some((f) => fields.includes(f)))
  const rows = pool.length ? pool : SLOTS
  const years = rows.map((slot) => slot.year)
  const roles = new Set(rows.flatMap((slot) => slot.roles))
  const orgs = new Set(rows.map((slot) => slot.company))
  return [
    { label: 'yrs', value: Math.max(...years) - Math.min(...years) + 1, of: COUNT_OF.yrs },
    { label: 'roles', value: roles.size, of: COUNT_OF.roles },
    { label: 'orgs', value: orgs.size, of: COUNT_OF.orgs }
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

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n))

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

/** Where the red zone starts, as a fraction of the scale. The throttle is
 *  wound up to just short of it and only occasionally clips in — a needle that
 *  lives in the red is a needle nobody looks at. */
const TACH_RED = 0.82

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
 *  every column as an inline `background-image`. The colour is left as a live
 *  `calc()` over `--on` — the column's own "has the sweep reached me" — so the
 *  string is the same for all twenty-two of them and only the custom property
 *  the rAF writes decides how bright any of it burns.
 *
 *  Anchored to the foot of the column and never repeated: the stops are the
 *  ladder above, so cell three is the same height on a column of four as on a
 *  column of twenty-six. */
const cellStack = (colour: string) => {
  const stops: string[] = []
  let at = 0
  for (let n = 0; n < TACH_ROWS; n += 1) {
    if (n) at += CELL_GAP
    const top = at + cellH(n)
    stops.push(
      `transparent calc(${at} * var(--px))`,
      `${colour} calc(${at} * var(--px))`,
      `${colour} calc(${top} * var(--px))`,
      `transparent calc(${top} * var(--px))`
    )
    at = top
  }
  return `linear-gradient(to top, ${stops.join(', ')})`
}

const CELLS_LIT = cellStack('rgba(var(--accent-rgb), calc(0.07 + 0.93 * var(--on)))')
const CELLS_RED = cellStack('rgba(var(--warn-rgb), calc(0.09 + 0.91 * var(--on)))')

/** Where the needle idles, and the range it is blipped to. It spends longer
 *  wound up than resting on purpose: an instrument sitting at its stop is an
 *  instrument that reads as switched off, and the columns near idle are the
 *  short ones at the quiet end of the curve. */
const REV_IDLE = 0.2
const REV_PEAK = [0.64, 0.92]
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

function Tach({ children }: { children?: React.ReactNode }) {
  const face = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = face.current
    if (!node) return
    if (reduced()) {
      node.style.setProperty('--rev', String(Math.round(0.62 * TACH_COLS) / TACH_COLS))
      return
    }

    let raf = 0
    let rev = 0
    /* The machine coming up: the first thing the needle does is sweep the
       scale and drop back, which is what a cluster does when the ignition is
       turned and is the reason a real one is worth watching at all. */
    let target = REV_PEAK[1]
    let hold = 0.95
    let previous = performance.now()
    let shown = -1

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now

      hold -= dt
      if (hold <= 0) {
        const wound = target > REV_IDLE + 0.01
        target = wound ? REV_IDLE : rand(REV_PEAK[0], REV_PEAK[1])
        const next = wound ? REV_HOLD.idle : REV_HOLD.wound
        hold = rand(next[0], next[1])
      }

      // Up fast and down slow, which is the whole character of a throttle
      // being blipped — the same rise and fall at the same rate is a slider.
      rev += (target - rev) * Math.min(1, (target > rev ? 3.6 : 1.9) * dt)
      const shake = Math.sin(now / 61) * 0.006 + Math.sin(now / 23) * 0.003

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
        {['0.5', '1', '2', '3', '4', '5', '6', '7'].map((mark, n) => (
          <span key={mark} data-red={n >= 6}>
            {mark}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---- the warning pair ----

   The top of the frame, and the one lamp on this page that is about the page
   rather than about the work. There is a bird crossing the readout and a moth
   on it, both of them shootable, and until now the only thing that said so was
   a tally in the footer counting what you had already brought down — which
   only ever appeared *after* you had worked out on your own that the reticle
   was a gun.

   So it is a pair rather than a single lamp, and only one of them is ever lit:
   `STOP` while there is nothing in the air, `SHOOT` the moment there is. Two
   states of one instruction, which is what a shift light is, and what makes
   the row read as an instruction rather than as a label.

   It asks `quarry` rather than being told. The gun already walks that set
   several times a frame to find out what a bolt has hit; this is the same
   question one frame at a time, and it means a third creature mounted
   tomorrow lights the lamp with nothing wired up. */
function Alarm() {
  const [up, setUp] = useState(false)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      let any = false
      for (const creature of quarry.creatures) {
        if (creature.at()) {
          any = true
          break
        }
      }
      // Returning the same value is a bail-out, not a render — which is what
      // makes asking this every frame affordable.
      setUp((was) => (was === any ? was : any))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="mech-alarm" aria-hidden>
      {/* `cells` matches each word exactly now — `STOP` at `cells={5}` left a
          trailing blank cell (Segment centres by padding blanks on both
          sides, and one spare cell over an even split rounds down to zero
          leading blanks), which is what was reading as the word sitting in
          the upper-left of its box instead of centred in it. */}
      <i className="mech-alarm-key" data-on={up}>
        <Segment text="SHOOT" cells={5} settle={false} label="shoot" />
      </i>
      <i className="mech-alarm-key" data-warn data-on={!up}>
        <Segment text="STOP" cells={4} warn settle={false} label="stop" />
      </i>
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
function Counts({ fields }: { fields: Field[] }) {
  const bars = useRef<Array<HTMLSpanElement | null>>([])
  const rows = useMemo(() => countsFor(fields), [fields.join(',')])
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const shownFrac = useRef(rows.map(() => 0))

  useEffect(() => {
    const settle = () =>
      rowsRef.current.forEach((count, n) =>
        bars.current[n]?.style.setProperty('--lit', String(Math.round((count.value / count.of) * TICKS)))
      )

    if (reduced()) {
      settle()
      return
    }

    let raf = 0
    let previous = performance.now()
    const shownCells = rowsRef.current.map(() => -1)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const since = now / 1000
      // Framerate-independent: the same time-to-settle at any frame rate,
      // the way `Drift`'s `k` and the tach's own easing both work.
      const k = 1 - Math.pow(0.001, dt / RISE)

      rowsRef.current.forEach((count, n) => {
        const target = count.value / count.of
        const frac = (shownFrac.current[n] += (target - shownFrac.current[n]) * k)
        const settled = Math.abs(target - frac) < 0.01
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
        <div className="mech-gauge" key={count.label} aria-label={`${count.value} ${count.label}`}>
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

/** One slot in the bank.
 *
 *  The subject is live only for the selected slot. Twelve of them turning at
 *  once is work nobody is looking at; selected, the slot comes alive. Which is
 *  also the clearest thing the bank does: the one you are on is the one that
 *  is moving. */
function SlotBox({
  slot,
  n,
  on,
  onPick,
  onOpen
}: {
  slot: Slot
  n: number
  on: boolean
  onPick: () => void
  onOpen: () => void
}) {
  return (
    <button
      className="mech-slot"
      data-on={on}
      data-bare={!slot.solid}
      aria-label={`${slot.title} — ${slot.tagline}, ${slot.timeline}`}
      aria-pressed={on}
      style={{ ['--i' as string]: n }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onPick()
      }}
      onFocus={onPick}
      onClick={() => {
        sound.select()
        /* A press on the slot you are already on opens it; a press on any
           other selects it first. On a mouse that is one click either way,
           because the pointer selected it on the way in. On a phone it is the
           two taps a control with no hover has always needed — and the first
           one is not wasted, it fills in the display and the scale. */
        if (on) onOpen()
        else onPick()
      }}
    >
      {/* The bay. `SlotView` renders the `.mech-slot-shot` element itself and
          scissors the shared canvas to it — see `MechSlots.tsx`, which is also
          where the reason the element cannot be handed in from outside is
          written down. Its children are three.js and never reach the DOM, so
          the empty state is a sibling laid over it rather than a child. */}
      {slot.solid ? (
        <SlotView id={slot.id} live={on} />
      ) : (
        <span className="mech-slot-shot">
          <span className="mech-slot-bare">no signal</span>
        </span>
      )}

      <span className="mech-slot-bar">
        <span className="mech-slot-name">{slot.title}</span>
        <span className="mech-slot-foot">
          {/* Stencilled on the bay, the way a number on a bank of anything is.
              It sits in the label rather than over the picture because the
              picture is WebGL and the canvas paints above the DOM under it. */}
          <span className="mech-slot-n">
            <Segment text={String(n + 1).padStart(2, '0')} cells={2} settle={false} label={`slot ${n + 1}`} />
          </span>
          <span className="mech-slot-year">{slot.year}</span>
        </span>
      </span>
    </button>
  )
}

interface Props {
  onProject: (id: string) => void
  /** Held back while the machine is still booting, and again while the screen
   *  is leaving for a project. It is not a fade any more: every block on the
   *  panel has its own entrance and its own exit, and this is what runs both —
   *  see *coming up, and going down* in MechCluster.css. */
  covered: boolean
  tuning: ClusterTuning
}

export default function MechCluster({ onProject, covered, tuning }: Props) {
  /* Which slot is selected. It persists rather than following the pointer:
     a preset bank holds the preset you pressed, and on a phone there is no
     "leaving" for it to be cleared by. What does release it is the pointer
     leaving the bank on a mouse, after a beat — see `RELEASE_MS`. */
  const [picked, setPicked] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const release = useRef(0)
  const railList = useRef<HTMLDivElement>(null)

  /* The bank's canvas is `position: fixed` and scissors each subject to its
     slot's own rect — see `MechSlots.tsx`. `getBoundingClientRect` does not
     know the rail scrolls: a slot half scrolled out of `.mech-work-rail-list`
     is clipped by the browser as a *button*, but its picture is drawn by a
     scissor test against a rect that never shrank, so it painted straight
     through the clip and out the top or bottom of the rail.

     `--rail-clip-top` / `--rail-clip-bottom` are the fix: the rail-list's own
     distance from the top and bottom of the viewport, written onto itself so
     `.mech-bank-gl` — a descendant in the tree even though it is fixed —
     inherits them and clips its own paint to exactly the band the list
     occupies. Recomputed on scroll and resize, not every frame: the rail's
     position on screen only changes on those two events. */
  useEffect(() => {
    const node = railList.current
    if (!node) return
    let raf = 0
    const measure = () => {
      raf = 0
      const rect = node.getBoundingClientRect()
      node.style.setProperty('--rail-clip-top', `${Math.max(0, rect.top)}px`)
      node.style.setProperty('--rail-clip-bottom', `${Math.max(0, window.innerHeight - rect.bottom)}px`)
    }
    const request = () => {
      if (raf) return
      raf = requestAnimationFrame(measure)
    }
    request()
    node.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    const ro = new ResizeObserver(request)
    ro.observe(node)
    return () => {
      node.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

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

  return (
    <div
      className="mech-cluster"
      data-covered={covered}
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
        ['--cluster-tach' as string]: tuning.tach
      }}
    >
      <Alarm />

      {/* The name and the panel below it, as one group that centres in
          whatever room is left under the warning pair — rather than the
          panel's own `flex: 1` pinning everything to the top the moment a
          window is taller than the content needs. `SHOOT` / `STOP` and the
          tally above them stay where they are; only this group moves. */}
      <div className="mech-panel-mid">
        {/* The identity, on its own now — between the warning pair and the
            instrument rather than laid over the quiet end of it. Red-orange,
            the panel's one warm colour, because this is the one line on the
            screen that is not a reading: it is who built it. */}
        <section className="mech-ident">
          <h1 className="mech-ident-name" style={{ ['--name-len' as string]: NAME.length }}>
            <Typed text={NAME} run="cluster-name" delay={0.4} speed={44} caret={false} />
          </h1>
        </section>

        <div className="mech-body">
        {/* ---- the left flank ---- */}
        <div className="mech-flank">
          {/* What I do — cycling the titles with nothing picked, or what I
              did on the selected project.

              It stands *over* the gauges now, in the place the three two-cell
              numbers used to occupy. Under them it was a fourth line on a block
              that was already digits, noun and qualifier deep; over them it is
              the block's one reading, with the bars beneath it as the scale —
              which is the arrangement the whole panel uses everywhere else.

              Centred in a box that is the gauges' own width (`--count-w`), so
              it lands over the middle of the three. It was left-set for a pass
              while the box was still wider than they were and drifting looked
              like the problem. */}
          <div className="mech-display mech-display-role" data-on={slot !== null}>
            <Segment text={reading} cells={ROLE_CELLS} label={reading} />
          </div>

          <Counts fields={marked} />
        </div>

        {/* ---- the middle ---- */}
        <div className="mech-main">
          <Tach>
          {/* The black readout box at the top-left of the instrument — the
              position the reference gives its own digits. The label is drawn
              in the same segment glyphs as every other reading on the panel,
              and the paragraph under it is the one thing on this screen that
              is prose rather than a number. */}
          <section className="mech-intro">
            <span className="mech-intro-cap">
              <Segment text="INTRO" cells={5} settle={false} label="intro" />
            </span>

            {/* The profile, as a readout rather than as a paragraph on a
                page. It used to be set in the site's Helvetica at body size
                and colour, which made it the one humanist, low-contrast,
                ragged thing on a panel of hard tracked caps. Same words, in
                the panel's own monospace.

                Typed rather than dropped in — every other line on this panel
                arrives a character at a time, and a paragraph that simply
                appeared read as the one line the machine had not actually
                switched on. `back` follows `covered`: opening a project
                backspaces it out rather than leaving it frozen on screen
                behind the cover, which is what a paragraph with no exit of
                its own did. Fast both ways — `speed`/`backSpeed` are a
                fraction of the name's, or a hundred and fifty-odd characters
                either takes several seconds to arrive or is still typing
                itself out after `EXIT_MS` has already unmounted it. */}
            <p className="mech-profile">
              <Typed text={PROFILE} run="cluster-intro" delay={0.6} speed={9} caret={false} back={covered} backSpeed={4} />
            </p>
          </section>
          </Tach>
        </div>

        {/* ---- the rail ----

            Work, on the right, the full height of the panel — see *the bank is
            the navigation* for why it is pressable slots rather than a graph. */}
        <aside className="mech-work-rail">
          {/* The project's own title, above the bank rather than in a run
              across the top of the panel — pressing a slot still changes
              what this reads. */}
          <div className="mech-work-rail-head">
            {/* Always the warm channel — this is what has been picked, and
                the rail and the scale under it are the two things on the
                panel that report a *pick* rather than a *reading*. It does
                not drop back to green with nothing selected, unlike the
                rest of the panel's readouts: the row it sits above is warm
                too now (see `.mech-slot-name`), and a header that changed
                colour depending on what it named would say the opposite of
                what the row under it says. */}
            <div className="mech-display" data-on={slot !== null} data-idle={slot === null} data-warn>
              <Segment
                text={slot ? slot.title : IDLE}
                cells={CELLS}
                warn
                label={slot ? slot.title : 'nothing selected'}
              />
            </div>
          </div>

          {/* Scrolls on its own — twelve rows at a size worth pressing do not
              all fit a real window's height, and a rail is allowed to scroll
              where a row of preset buttons across the bottom was not.
              `railList` is what keeps the bank's canvas clipped to exactly
              this band as it scrolls — see the effect above. */}
          <div className="mech-work-rail-list" ref={railList}>
            <div className="mech-bank" onPointerEnter={hold} onPointerLeave={letGo}>
              {SLOTS.map((item, n) => (
                <SlotBox
                  key={item.id}
                  slot={item}
                  n={n}
                  on={picked === n}
                  onPick={() => {
                    hold()
                    setPicked(n)
                  }}
                  onOpen={() => onProject(item.id)}
                />
              ))}

              {/* The one canvas every bay above draws into. Mounted inside the
                  bank so it stacks with them — it covers the whole viewport
                  and paints only in the rectangles the views give it. */}
              <MechSlots />

              {/* The scan lines and the accent that turn twelve full-colour
                  renders into the panel's own phosphor. A grid of its own,
                  matching the bank cell for cell — see *twelve renders, on one
                  panel's supply* for why it cannot be a child of a bay or a
                  flat sheet over the whole rail. */}
              <span className="mech-bank-veil" aria-hidden>
                {SLOTS.map((item) => (
                  <i key={item.id} />
                ))}
              </span>
            </div>
          </div>

          {/* The scale, moved down under the bank — see `FieldGauge` above.
              Was under the instrument in the middle column; the rail is
              where the rest of what a selection *says* lives now. */}
          <div className="mech-scale-row">
            {FIELDS.map((name) => (
              <FieldGauge key={name} name={name} on={marked.includes(name)} />
            ))}
          </div>
        </aside>
        </div>
      </div>
    </div>
  )
}
