import { lazy, Suspense, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Leva, LevaPanel } from 'leva'
import HeroStage from './HeroStage'
import MechBird from './MechBird'
import MechCursor from './MechCursor'
import MechMoth from './MechMoth'
import MechLaser from './MechLaser'
import SplitReveal from './SplitReveal'
import { HEROES } from './heroes'
import { poseFor, useHeroTuning } from './heroTuning'
import { useModelTuning } from './modelTuning'
import { useNarrow } from './narrow'
import { kills } from './kills'
import { entries } from './model'
import { sound } from './sound'

const MechModel = lazy(() => import('./MechModel'))

/* The v3 home screen: a character-select arrangement — all five subjects on
   the stage at once, the full list of work as a grid of boxes underneath,
   and a readout in between that fills in for whichever one you have your eye
   on.

   This used to swap one subject in for another as the roster was pressed,
   which read as a slot machine rather than a cast: a press cut straight to a
   different character with no beat to actually look at what you'd picked.
   The wall of two hundred drifting tiles that sat behind it is gone too —
   with all five subjects up and a project grid under them there is nowhere
   left for it to sit that isn't in the way, and a phosphor grid in the same
   voice as the project screen replaces it (`.v3-scifi-bg`).

   Picking a project box no longer swaps anything. It selects: the matching
   subject — if the project has one — gets a ring of light, and the readout
   fills in with its name, its line, a brief overview, and an obvious way in.
   Pressing an already-selected box is the way in.

   Every number a panel sets is still nothing a visitor sees until it is
   pasted back into source — see `heroTuning.ts`. */

const PANEL = {
  colors: { elevation1: '#161616', elevation2: '#1d1d1d', elevation3: '#292929' },
  sizes: { rootWidth: 'min(340px, calc(100vw - 20px))' }
}

/** Every hero that opens a real case study, keyed by the project it opens —
 *  the reverse of `Hero.project`. Solomon has none (`project: null`, see
 *  `heroes.ts`) and so never lights up: there is no box for a case study
 *  that does not exist. */
const HERO_BY_PROJECT = new Map(
  HEROES.filter((hero) => hero.project).map((hero) => [hero.project as string, hero.id])
)

/** Whichever subject the dev panel edits when nothing carrying one is
 *  selected. The face has its own panel (`modelTuning.ts`) and is never a
 *  candidate here. */
const DEFAULT_TUNE_ID = HEROES.find((hero) => hero.kind !== 'face')?.id ?? HEROES[0].id

/** The newest project that actually lights up a subject, rather than simply
 *  the newest project — the newest overall may well be one of the five
 *  without a case study on the stage, and defaulting to that picks a screen
 *  where every subject starts dimmed for no reason a first-time visitor
 *  could read. `entries` is already newest first. */
const DEFAULT_SELECTED = entries.find((item) => HERO_BY_PROJECT.has(item.project.id))?.project.id ?? entries[0]?.project.id ?? null

/** The first paragraph of a project's `intro`, trimmed to a line the readout
 *  can hold without turning into the case study itself. `intro` is prose
 *  written for a full write-up; this is the same words, just not all of
 *  them. */
const briefOf = (intro: string): string => {
  const first = (intro.split('\n\n')[0] ?? intro).trim()
  if (first.length <= 220) return first
  return `${first.slice(0, 217).trimEnd()}…`
}

interface Props {
  onOpen: (projectId: string) => void
  onBrowse: () => void
}

export default function Home({ onOpen, onBrowse }: Props) {
  const narrow = useNarrow()

  /* What the readout and the grid agree on. Defaulted rather than nothing,
     so the screen says something about the work — and shows off a lit
     subject — the instant it paints instead of waiting for a press. */
  const [selected, setSelected] = useState<string | null>(DEFAULT_SELECTED)
  const entry = entries.find((item) => item.project.id === selected) ?? null
  const selectedHeroId = selected ? HERO_BY_PROJECT.get(selected) : undefined

  const tuneId = selectedHeroId && selectedHeroId !== 'takahashi' ? selectedHeroId : DEFAULT_TUNE_ID
  const tuning = useHeroTuning(tuneId)
  const face = useModelTuning()

  /** A box picks its project. Pressing the one already picked is the way
   *  in — the same tap that highlighted it now opens it, rather than a
   *  second control somewhere else being the only route. */
  const pick = (id: string) => {
    if (selected === id) {
      sound.select()
      onOpen(id)
      return
    }
    sound.tick()
    setSelected(id)
  }

  return (
    <div className="v3 v3-home">
      {typeof document !== 'undefined'
        ? createPortal(
            <>
              {/* Off at phone width — Leva's own minimum is most of a
                  390-point window. */}
              <Leva collapsed hidden={!import.meta.env.DEV || narrow} titleBar={{ title: 'Subject tuning' }} theme={PANEL} />
              {import.meta.env.DEV && !narrow && (
                <div className="v3-hero-panel">
                  <LevaPanel store={tuning.store} collapsed fill titleBar={{ title: 'Hero', drag: false }} theme={PANEL} />
                </div>
              )}
            </>,
            document.body
          )
        : null}

      {/* A phosphor grid and a bloom, the same voice the project screen is
          lit in — nothing three-dimensional, just the two layers that read
          as a panel lit from behind. See `.v3-scifi-bg` in V3.css. */}
      <div className="v3-scifi-bg" aria-hidden>
        <div className="v3-scifi-grid" />
        <div className="v3-scifi-bloom" />
      </div>

      {/* The gun works here too. Same three components the project screen
          mounts, same `quarry` plumbing, and all three are still
          `pointer: fine` only — see `MechBird.tsx`. */}
      <MechCursor />
      <MechBird />
      <MechMoth />
      <MechLaser />

      <header className="v3-head v3-over">
        <span className="v3-wordmark">Tarlok Singh</span>
      </header>

      <div className="v3-enter v3-over">
        <button className="v3-chip v3-small" onClick={onBrowse}>
          index
        </button>
      </div>

      {/* The cast, all up at once. Five slots, five subjects, each its own
          stage rather than five things sharing a camera — a mini `HeroStage`
          per subject (the face is `MechModel`, same reasoning as before: it
          is the one subject with a lighting rig built around it, and a
          second one would be a second face). Ringed in light while the
          project it belongs to is picked below; dimmed when something else
          is, so the ring reads as an answer rather than as one more light on
          the panel. */}
      <div className="v3-hero-row" data-focused={Boolean(selected)}>
        {HEROES.map((hero) => (
          <div key={hero.id} className="v3-hero-slot" data-selected={hero.id === selectedHeroId}>
            {hero.kind === 'face' ? (
              <Suspense fallback={null}>
                <MechModel src={hero.src as string} tuning={face} live />
              </Suspense>
            ) : (
              <HeroStage
                heroes={[hero]}
                shownId={hero.id}
                seen={new Set([hero.id])}
                studio={tuning.studio}
                pose={hero.id === tuneId ? tuning.pose : poseFor(hero.id)}
                live
              />
            )}
          </div>
        ))}
      </div>

      {/* Fills in for whichever project is picked. Held at a fixed name so
          nothing above the projects grid jumps when there is nothing picked
          at all. */}
      <section className="v3-readout" aria-live="polite">
        {entry ? (
          <div className="v3-readout-body" key={entry.project.id}>
            <span className="v3-readout-name">
              <SplitReveal text={entry.project.title} run={entry.project.id} />
            </span>
            <span className="v3-readout-role">
              <SplitReveal text={entry.project.tagline} run={entry.project.id} delay={0.3} />
            </span>
            <p className="v3-readout-brief">{briefOf(entry.project.intro)}</p>
            <button
              className="v3-readout-open"
              onClick={() => {
                sound.select()
                onOpen(entry.project.id)
              }}
            >
              open the case study →
            </button>
          </div>
        ) : (
          <span className="v3-readout-empty">choose a project below</span>
        )}
      </section>

      {/* Every project worth showing, not the five on the stage above — the
          stage is a sample of the *kinds* of work, this is all of it. */}
      <nav className="v3-projects" aria-label="Every project">
        {entries.map((item, i) => (
          <button
            key={item.project.id}
            className="v3-project-box"
            aria-pressed={item.project.id === selected}
            style={{ ['--i' as string]: i }}
            onPointerEnter={() => sound.tick()}
            onClick={() => pick(item.project.id)}
          >
            <span className="v3-project-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="v3-project-title">{item.project.title}</span>
            <span className="v3-project-year">{item.year}</span>
          </button>
        ))}
      </nav>

      <Tally />

      <footer className="v3-foot v3-over">
        {/* The same address it always was, given the shape the rest of the
            instrument panel has — a strip that names what it is and the value
            beside it. Still a `mailto:`; there is no backend here. */}
        <a className="v3-comms" href="mailto:hello@tarloksingh.com">
          <span className="v3-comms-tag">comms</span>
          <span className="v3-comms-to">hello@tarloksingh.com</span>
        </a>
      </footer>
    </div>
  )
}

/** The kill counter, wherever it is. Its own component so the number changing
 *  does not re-render the stage under it. See `kills.ts`. */
function Tally() {
  const count = useSyncExternalStore(kills.subscribe, kills.snapshot, kills.snapshot)
  if (count === 0) return null
  return (
    <div className="v3-tally" aria-label="Downed">
      <span>downed</span>
      <span>{String(count).padStart(3, '0')}</span>
    </div>
  )
}
