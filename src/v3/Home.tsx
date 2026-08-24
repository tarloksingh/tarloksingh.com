import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Leva, LevaPanel } from 'leva'
import DriftWall from './DriftWall'
import HeroStage from './HeroStage'
import MechBird from './MechBird'
import MechCursor from './MechCursor'
import MechMoth from './MechMoth'
import MechLaser from './MechLaser'
import SplitReveal from './SplitReveal'
import { HEROES } from './heroes'
import { useHeroTuning } from './heroTuning'
import { useModelTuning } from './modelTuning'
import { kills } from './kills'
import { wallItems } from './model'
import { sound } from './sound'
import { useWallTuning } from './wallTuning'

const MechModel = lazy(() => import('./MechModel'))

/* The v3 home screen: five subjects, one at a time, and the whole body of
   work drifting past behind them.

   What this replaces is the wall on its own — two hundred small tiles, every
   clip playing, and two words of chrome over the top. The wall is still here
   and still doing what it was always good at, which is saying *how much of
   this there is*; it is behind the subject now and dimmed, the way the
   reference for this screen has a crowd behind a character. What it stopped
   doing is being the only thing on the page, because two hundred thumbnails
   is a contact sheet and this is meant to be a front door.

   The arrangement is a character select: the roster along the bottom, the
   subject in the middle, its name and class in the corner. That is a shape
   everybody already knows how to read, which is the entire reason for
   borrowing it — nothing on this screen needs explaining.

   Every number is on a panel in development. Nothing a panel sets reaches a
   visitor until it is pasted back into source — see `heroTuning.ts` and
   `wallTuning.ts`. */

/** How long the subject on the stage takes to leave: its own fade, and then a
 *  beat of empty stage before the next one is asked for. Timed in V3.css
 *  beside the rules that use it, the same arrangement `Mech.css` has. */
const EXIT_MS = 340

/** How long the stage will wait, empty, before bringing the next subject in.
 *  Short — this is the hold, not a loading screen: a subject is already
 *  mounted by the time it is asked for a second time, and the first time is
 *  covered by its own `Suspense`. */
const HOLD_MS = 220

const PANEL = {
  colors: { elevation1: '#161616', elevation2: '#1d1d1d', elevation3: '#292929' },
  sizes: { rootWidth: 'min(340px, calc(100vw - 20px))' }
}

interface Props {
  onOpen: (projectId: string) => void
  onBrowse: () => void
}

export default function Home({ onOpen, onBrowse }: Props) {
  const wall = useWallTuning()

  /* Two indices, not one. `pick` is what has been chosen and `shown` is what
     is on the stage — the second trails the first by the swap, which is what
     makes the swap a sequence rather than a cut. Same arrangement as the
     project screen's frame stepping. */
  const [pick, setPick] = useState(0)
  const [shown, setShown] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out' | 'hold'>('in')

  const hero = HEROES[shown]
  const tuning = useHeroTuning(hero.id)
  const face = useModelTuning()

  /* Which subjects have ever been on the stage. A 4.5MB motorcycle and a
     2.3MB head arriving on first paint for two subjects nobody has looked at
     yet is most of a home screen's budget; a subject mounts the first time it
     is picked and is never unmounted after. See `HeroStage.tsx`. */
  const seen = useRef(new Set<string>([HEROES[0].id]))
  seen.current.add(hero.id)

  useEffect(() => {
    if (pick === shown) return
    sound.dissolve()
    setPhase('out')
    const timer = window.setTimeout(() => {
      setShown(pick)
      setPhase('hold')
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [pick, shown])

  useEffect(() => {
    if (phase !== 'hold') return
    const timer = window.setTimeout(() => setPhase('in'), HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  const covered = phase !== 'in'

  return (
    <div className="v3 v3-home">
      {typeof document !== 'undefined'
        ? createPortal(
            <>
              <Leva collapsed hidden={!import.meta.env.DEV} titleBar={{ title: 'Wall tuning' }} theme={PANEL} />
              {import.meta.env.DEV && (
                <div className="v3-hero-panel">
                  <LevaPanel store={tuning.store} collapsed fill titleBar={{ title: 'Hero', drag: false }} theme={PANEL} />
                </div>
              )}
            </>,
            document.body
          )
        : null}

      {/* Behind everything, dimmed. `dim` is already on the wall's own panel,
          so how far back it sits is a number somebody can move rather than a
          decision baked in here. */}
      <div className="v3-wall v3-wall-back">
        <DriftWall items={wallItems} {...wall} onSelect={(item) => item.id && onOpen(item.id)} />
      </div>

      {/* The gun works here too now. Same three components the project screen
          mounts, same `quarry` plumbing, and all three are still
          `pointer: fine` only — see `MechBird.tsx`. */}
      <MechCursor />
      <MechBird />
      <MechMoth />
      <MechLaser />

      <div className="v3-hero" data-covered={covered}>
        <div className="v3-hero-stage">
          <HeroStage
            heroes={HEROES}
            shownId={hero.id}
            seen={seen.current}
            studio={tuning.studio}
            pose={tuning.pose}
            live={!covered}
          />
          {/* The face keeps his own rig. `MechModel` is a Canvas of its own,
              so he cannot be a sibling inside the hero stage — he is a second
              layer over it, stopped rather than unmounted when he is not the
              one up. Two contexts, one running. */}
          <div className="v3-hero-face" data-on={hero.kind === 'face'}>
            <Suspense fallback={null}>
              <MechModel src="/models/adam-face.glb" tuning={face} live={hero.kind === 'face' && !covered} />
            </Suspense>
          </div>
        </div>

        {/* The name and the class, drawn in a character at a time when the
            subject arrives — the flourish at the end of the swap, and the
            same `SplitReveal` every other title on this site is written
            with. Keyed on the subject so it runs again on each arrival. */}
        <div className="v3-hero-read" key={hero.id}>
          <span className="v3-hero-name">
            <SplitReveal text={hero.title} run={hero.id} delay={0.05} />
          </span>
          <span className="v3-hero-role">
            <SplitReveal text={hero.role} run={hero.id} delay={0.35} />
          </span>
          {hero.project ? (
            <button
              className="v3-hero-open"
              onClick={() => {
                sound.select()
                onOpen(hero.project as string)
              }}
            >
              open the readout
            </button>
          ) : (
            <span className="v3-hero-note">from Solomon — no readout yet</span>
          )}
        </div>
      </div>

      <header className="v3-head v3-over">
        <span className="v3-wordmark">Tarlok Singh</span>
      </header>

      <div className="v3-enter v3-over">
        <button className="v3-chip v3-small" onClick={onBrowse}>
          index
        </button>
      </div>

      {/* The roster. Always there, nothing behind anything — the same rule
          the project screen's header follows. */}
      <nav className="v3-roster" aria-label="Subjects">
        {HEROES.map((item, i) => (
          <button
            key={item.id}
            className="v3-roster-tile"
            aria-pressed={i === pick}
            onPointerEnter={() => sound.tick()}
            onClick={() => {
              if (i === pick) return
              sound.select()
              setPick(i)
            }}
          >
            <span className="v3-roster-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="v3-roster-name">{item.title}</span>
          </button>
        ))}
      </nav>

      <footer className="v3-foot v3-over">
        {/* The same address it always was, given the shape the rest of the
            instrument panel has — a strip that names what it is and the value
            beside it. Still a `mailto:`; there is no backend here. */}
        <a className="v3-comms" href="mailto:hello@tarloksingh.com">
          <span className="v3-comms-tag">comms</span>
          <span className="v3-comms-to">hello@tarloksingh.com</span>
        </a>
      </footer>

      <Tally />
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
