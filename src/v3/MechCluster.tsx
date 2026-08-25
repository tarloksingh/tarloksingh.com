import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Segment from './Segment'
import Typed from './Typed'
import { MENU } from './model'
import { kills } from './kills'
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

   So home is a panel now, laid out the way a car's instrument cluster is: a
   row of indicator lamps along the top, one dominant readout across the middle
   with a smaller cluster either side of it, and a bank of selectable slots
   filling the bottom.

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

   What replaced it is the bank of preset buttons off a car stereo: a row of
   numbered, named, pressable slots, one lit, with the display above reading
   out whichever it is. It is loud — twelve boxes across the whole frame — and
   there is nothing to work out.

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

/** The scale, in the order it is printed. */
const FIELDS: Field[] = ['design', 'code', 'film', 'games', 'product']

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

/** How long a title holds before the display settles onto the next one. */
const TITLE_MS = 2600

/** How long the display keeps a project after the pointer has left the bank
 *  before it falls back to the titles. Long enough to move the pointer away
 *  and look at what it said; short enough that the screen does not sit on a
 *  stale reading. Mouse only — a tap has no "leaving". */
const RELEASE_MS = 2400

const NAME = 'Tarlok Singh'

const PROFILE =
  'Artist with 10+ years building 0→1 developer tools, AI applications, and consumer products and films. In love with building and designing beautiful things.'

/** How many cells the main display has. Wide enough for the longest title and
 *  the longest project name, and fixed — a readout is a fixed number of lamps,
 *  and one that resized itself around each word would be a text box. */
const CELLS = 21

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
  /** No material yet: Visa is under an NDA, Solomon's write-up is still to
   *  come. The slot says so rather than being left out of the bank — both are
   *  real work, and a gap at position 01 would read as a bug. */
  restricted: boolean
  /** Whether there is a subject to stand in the slot — a model or a piece.
   *  Visa is the only one without, and its slot says so rather than being left
   *  out of the bank. Also what the 3D lamp reports. */
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
  restricted: Boolean(item.project.restricted),
  solid: hasSubject(item.project.id)
}))

/** The counts down the right-hand side. All three come off the work itself —
 *  a portfolio that states a number it does not derive is a portfolio with a
 *  number to keep up to date. */
const COUNTS = (() => {
  const years = SLOTS.map((slot) => slot.year)
  return [
    { label: 'proj', unit: 'listed', value: SLOTS.length, of: 16 },
    { label: 'yrs', unit: 'active', value: Math.max(...years) - Math.min(...years) + 1, of: 16 },
    { label: 'orgs', unit: 'shipped', value: new Set(SLOTS.map((slot) => slot.company)).size, of: 8 }
  ]
})()

/** Cells in a count's bar. Small enough to be counted, which is the whole
 *  difference between a gauge and a progress bar. */
const TICKS = 16

/* ---- the lamps ----

   The row along the top, and every one of them now says something.

   They used to be `PWR`, `GRID` and `SCAN` — three lamps that were simply on,
   which is what most of the lamps on a real cluster are, and which on a screen
   is three words pretending to be instruments. A warning lamp is only worth
   drawing if there is a state it is warning about.

   So the row reports on whatever is selected in the bank below: what the
   project is made of, and whether it can be shown at all. Move along the slots
   and the top of the panel answers — which is the same trick the display
   plays, and it is what makes the cluster read as one machine rather than as
   three unrelated widgets stacked up. `HIT` is the odd one out and stays: it
   is the gun's, and it is the only lamp that is about the page rather than
   about the work. */
function Lamps({ slot }: { slot: Slot | null }) {
  const downed = useSyncExternalStore(kills.subscribe, kills.snapshot, kills.snapshot)

  const lamps = [
    { key: 'sel', on: slot !== null, warn: false },
    { key: '3d', on: slot?.solid ?? false, warn: false },
    { key: 'film', on: slot?.fields.includes('film') ?? false, warn: false },
    { key: 'game', on: slot?.fields.includes('games') ?? false, warn: false },
    { key: 'nda', on: slot?.restricted ?? false, warn: true },
    { key: 'hit', on: downed > 0, warn: true }
  ]

  return (
    <div className="mech-lamps" aria-hidden>
      {lamps.map((lamp) => (
        <i key={lamp.key} className="mech-lamp" data-on={lamp.on} data-warn={lamp.warn}>
          <span>{lamp.key}</span>
        </i>
      ))}
    </div>
  )
}

/** A count, drawn the way the temperature and the oil pressure are on the
 *  reference: the number in segments over a stack of lit cells, with what it
 *  measures printed underneath. */
function Gauge({ label, unit, value, of }: (typeof COUNTS)[number]) {
  const lit = Math.round((value / of) * TICKS)
  return (
    <div className="mech-gauge">
      <span className="mech-gauge-n">
        <Segment text={String(value).padStart(2, '0')} cells={2} settle={false} label={`${value} ${label}`} />
      </span>
      {/* Stacked bottom-up: the strip is `column-reverse`, so the first cell
          is the one at the foot of the gauge and lighting the first `lit` of
          them fills it from the bottom, which is the only direction a gauge
          has ever filled. */}
      <span className="mech-gauge-bar">
        {Array.from({ length: TICKS }, (_, n) => (
          <i key={n} data-on={n < lit} />
        ))}
      </span>
      <span className="mech-gauge-label">{label}</span>
      <span className="mech-gauge-unit">{unit}</span>
    </div>
  )
}

/** One slot in the bank.
 *
 *  The loop is mounted only for the selected slot. Twelve `<video>` elements
 *  decoding at once is most of a second of main thread and a fan spinning up,
 *  and eleven of them would be playing where nobody is looking. Selected, the
 *  slot comes alive; at rest it is its own still, dim. Which is also the
 *  clearest thing the bank does: the one you are on is the one that is moving. */
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
           one is not wasted, it fills in the display and the lamps. */
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
   *  is leaving for a project — the same cover every other slot on this page
   *  takes. */
  covered: boolean
  tuning: ClusterTuning
}

export default function MechCluster({ onProject, covered, tuning }: Props) {
  /* Which slot is selected. It persists rather than following the pointer:
     a preset bank holds the preset you pressed, and on a phone there is no
     "leaving" for it to be cleared by. What does release it is the pointer
     leaving the bank on a mouse, after a beat — see `RELEASE_MS`. */
  const [picked, setPicked] = useState<number | null>(null)
  const [title, setTitle] = useState(0)
  const release = useRef(0)

  const slot = picked === null ? null : SLOTS[picked]

  /* The titles cycle only while the display is theirs. A rotation running on
     underneath a project's name would snatch the display back mid-read. */
  useEffect(() => {
    if (slot) return
    const timer = window.setInterval(() => setTitle((at) => (at + 1) % TITLES.length), TITLE_MS)
    return () => window.clearInterval(timer)
  }, [slot])

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
      setPicked((at) => (at === null ? (step > 0 ? 0 : SLOTS.length - 1) : (at + step + SLOTS.length) % SLOTS.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reading = slot ? slot.title : TITLES[title].title
  /* What the scale marks. With a project up it is every field that project
     touches — usually two or three of the five lit at once, which is the whole
     reason it is a scale and not a single needle. Otherwise it is the one
     field the current title falls under. */
  const marked = slot ? slot.fields : [TITLES[title].field]

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
        ['--cluster-y' as string]: tuning.y,
        ['--cluster-name' as string]: tuning.name,
        ['--cluster-glow' as string]: tuning.glow,
        ['--cluster-slot' as string]: tuning.slot
      }}
    >
      <Lamps slot={slot} />

      {/* ---- the identity band ---- */}
      <div className="mech-band mech-band-top">
        {/* The profile, as a readout rather than as a paragraph on a page.
            It used to be set in the site's Helvetica at body size and colour,
            which made it the one humanist, low-contrast, ragged thing on a
            panel of hard tracked caps — it read as a paragraph someone had
            pasted onto an instrument. Same words, in the panel's own voice:
            a technical face, in a housing, under a label, on the phosphor. */}
        <section className="mech-profile">
          <span className="mech-cap">profile</span>
          <p>{PROFILE}</p>
        </section>

        <section className="mech-ident">
          <h1 className="mech-ident-name" style={{ ['--name-len' as string]: NAME.length }}>
            <Typed text={NAME} run="cluster-name" delay={0.4} speed={44} caret={false} />
          </h1>

          {/* The display, and the scale under it. Boxed, because the one on the
              reference is boxed and because a lit thing needs an edge to be lit
              *inside* of — a segment word floating on the grid is a graphic.

              The warm channel is the redline and nothing else: a project that
              cannot be shown. Every other reading is green. */}
          <div className="mech-readout" data-warn={slot?.restricted ?? false} data-on={slot !== null}>
            <Segment
              text={reading}
              cells={CELLS}
              warn={slot?.restricted ?? false}
              label={reading}
            />
          </div>

          <div className="mech-scale-row">
            {FIELDS.map((name) => (
              <span key={name} className="mech-field" data-on={marked.includes(name)}>
                {name}
              </span>
            ))}
          </div>
        </section>

        <section className="mech-counts">
          {COUNTS.map((count) => (
            <Gauge key={count.label} {...count} />
          ))}
        </section>
      </div>

      {/* The rule between the two halves of the panel, and the bank's own
          label. One hairline doing both jobs: the reference divides its
          clusters with exactly this — a line with small caps sitting on it —
          and a separate divider above a separate label would be two lines
          saying one thing. */}
      <div className="mech-divider">
        <span className="mech-cap">selected work</span>
        {/* What to do about it, and it changes as soon as there is something
            to do. A control that never says what pressing it will get you is
            a control people look at. */}
        <span className="mech-divider-do" data-on={slot !== null}>
          {slot ? `press to open ${slot.title.toLowerCase()}` : `${SLOTS.length} entries · pick one`}
        </span>
      </div>

      {/* ---- the bank ---- */}
      <div className="mech-band mech-band-bank">
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
              bank so it stacks with them — it covers the whole viewport and
              paints only in the rectangles the views give it. */}
          <MechSlots />

          {/* The scan lines and the accent that turn twelve full-colour
              renders into the panel's own phosphor.

              A grid of its own, matching the bank cell for cell, rather than
              one sheet over the whole thing. Both are forced by where the
              canvas sits: it is a sibling of the slots, so a `::after` inside
              `.mech-slot-shot` would paint *under* the very picture it is
              meant to be over — and one flat sheet across the bank would tint
              the names and the numbers along with the pictures. One cell per
              bay, the same twelve columns, the same gap. */}
          <span className="mech-bank-veil" aria-hidden>
            {SLOTS.map((item) => (
              <i key={item.id} />
            ))}
          </span>
        </div>

        {/* The selected project's own line. Fixed height whether or not there
            is one, so the bank does not shift up the screen every time the
            display is released. */}
        <div className="mech-detail" data-on={slot !== null}>
          {slot && (
            <>
              <span>{slot.tagline}</span>
              <i />
              <span>{slot.company}</span>
              <i />
              <span>{slot.timeline}</span>
              {slot.restricted && (
                <>
                  <i />
                  <span className="mech-detail-warn">restricted</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
