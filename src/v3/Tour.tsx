import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BIRD_BODY, BIRD_WING_DOWN, BIRD_WING_UP } from '../site/frames'
import { sound } from './sound'
import { kills } from './kills'
import { markTourSeen, type Flow } from './tourState'
import './Tour.css'

/* ---- showing a visitor around ----

   A short spotlight run: the rest of the screen dims, a rounded hole opens
   over one thing at a time, and a card beside it says what that thing is.
   Two runs — `home` points at the rail of work and at the range; `project`
   points at the write-up and at the media strip — one card each on home's
   second step doubles as a demonstration: a bird flies in and the panel
   shoots it down on its own, so "click anything to fire" is shown rather
   than only said.

   Portalled to `body`, above the readout and below the dev panel, with its
   own colours — the accent tokens live on `.mech` and this is not inside it,
   the same reason `.mech-source` carries its own. Every target is found by
   selector at the moment its step opens; one missing (a project with no
   media) is skipped rather than fatal. */

type Step = {
  target: string
  title: string
  body: string
  /** Home's range step: run the scripted bird. */
  demo?: boolean
}

const STEPS: Record<Flow, Step[]> = {
  home: [
    {
      target: '.mech-work-rail',
      title: 'The work',
      body: 'Every project on this site is a slot on this rail — on every screen, not just here. Press one to open it.'
    },
    {
      target: '.mech-alarm',
      title: 'The range',
      body: 'There is always a bird or a moth crossing the panel. Click it — or anywhere on the screen — to shoot. This counter keeps the tally. Watch:',
      demo: true
    }
  ],
  project: [
    {
      target: '.mech-folds',
      title: 'The details',
      body: 'What the project is, the part I played, and the stack it was built on. Press a heading to open it.'
    },
    {
      target: '.mech-rail-wrap',
      title: 'The material',
      body: 'Stills and video from the project. Drag along the strip to move through them; press one to bring it onto the stage.'
    }
  ]
}

const PAD = 12
const CARD_W = 320
const GAP = 18

const near = (a: number, b: number) => Math.abs(a - b) < 0.5

export default function Tour({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  /* Only the steps whose target is actually on the screen when the run
     starts — a locked project has no media strip and sometimes no folds, and
     a card that points at nothing is worse than one step fewer. The run
     starts after the screen has settled, so a missing target here is a
     genuinely absent one. */
  const [steps] = useState(() =>
    STEPS[flow].filter((s) => {
      const el = document.querySelector<HTMLElement>(s.target)
      return el !== null && el.getBoundingClientRect().height > 20
    })
  )
  const [i, setI] = useState(0)
  const [box, setBox] = useState<DOMRect | null>(null)
  const step = steps[i]
  const last = i >= steps.length - 1

  const finish = useCallback(() => {
    markTourSeen(flow)
    onClose()
  }, [flow, onClose])

  /* Nothing on this screen to point at — a locked project with no folds and
     no strip. Mark it seen and get out rather than sit on an empty card. */
  useEffect(() => {
    if (steps.length === 0) finish()
  }, [steps, finish])

  /* One rAF loop for the whole run rather than one per step: `Mech` above
     re-renders often enough that a per-step effect kept being torn down before
     its frame landed, and the hole never opened. It reads the current step
     off a ref, brings a fresh target into view once, then follows its rect —
     a cheap read a frame, affordable for something this short-lived and
     modal. A target that never resolves is a step with nothing to point at,
     so move past it. */
  const stepRef = useRef(step)
  stepRef.current = step
  const lastRef = useRef(last)
  lastRef.current = last
  const finishRef = useRef(finish)
  finishRef.current = finish

  useEffect(() => {
    let raf = 0
    let tries = 0
    let shown = ''
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!stepRef.current) return
      const target = stepRef.current.target
      if (target !== shown) {
        shown = target
        tries = 0
        document
          .querySelector<HTMLElement>(target)
          ?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
      }
      const node = document.querySelector<HTMLElement>(target)
      if (!node) {
        tries += 1
        if (tries > 40) {
          tries = 0
          if (lastRef.current) finishRef.current()
          else setI((n) => n + 1)
        }
        return
      }
      tries = 0
      const r = node.getBoundingClientRect()
      setBox((was) =>
        was && near(was.left, r.left) && near(was.top, r.top) && near(was.width, r.width) && near(was.height, r.height)
          ? was
          : r
      )
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'Enter' || e.key === 'ArrowRight') last ? finish() : setI((n) => n + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, finish])

  const hole = box
    ? {
        left: box.left - PAD,
        top: box.top - PAD,
        width: box.width + PAD * 2,
        height: box.height + PAD * 2
      }
    : null

  /* Card below the hole if it fits, otherwise above; clamped to the window
     with a small margin and centred on the target. */
  const card = useMemo(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!hole) return { left: vw / 2 - CARD_W / 2, top: vh / 2, place: 'below' as const }
    const below = hole.top + hole.height + GAP
    const fitsBelow = below + 150 < vh
    const cx = hole.left + hole.width / 2
    let left = cx - CARD_W / 2
    left = Math.max(GAP, Math.min(left, vw - CARD_W - GAP))
    return {
      left,
      top: fitsBelow ? below : Math.max(GAP, hole.top - GAP - 150),
      place: fitsBelow ? ('below' as const) : ('above' as const)
    }
  }, [hole])

  if (!step) return null

  return createPortal(
    <div className="mech-tour" role="dialog" aria-label="A quick tour">
      <div className="mech-tour-veil" onClick={(e) => e.stopPropagation()} />

      {hole && (
        <div
          className="mech-tour-hole"
          style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }}
        />
      )}

      {step.demo && <Demo />}

      <div
        className="mech-tour-card"
        data-place={card.place}
        style={{ left: card.left, top: card.top, width: CARD_W }}
      >
        <span className="mech-tour-count">
          {i + 1} / {steps.length}
        </span>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="mech-tour-row">
          <button className="mech-tour-skip" onClick={finish}>
            {last ? 'Close' : 'Skip'}
          </button>
          {!last && (
            <button className="mech-tour-next" onClick={() => setI((n) => n + 1)}>
              Next
            </button>
          )}
          {last && (
            <button className="mech-tour-next" onClick={finish}>
              Got it
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* The scripted kill. A bird crosses the top of the window and a bolt leaves
   the bottom edge to meet it — the real `sound.shot()` / `sound.hit()` and
   the real `kills.add()`, so the tally in the header actually ticks. Pure
   CSS motion; the bolt is one element placed by transform and removed. */
function Demo() {
  const layer = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'wait' | 'fly' | 'hit'>('wait')

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t: number[] = []
    t.push(window.setTimeout(() => setPhase('fly'), 400))

    t.push(
      window.setTimeout(
        () => {
          // Bolt from the muzzle to roughly where the bird is now.
          const host = layer.current
          if (host) {
            const from = { x: window.innerWidth / 2, y: window.innerHeight - 2 }
            const to = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 }
            const dx = to.x - from.x
            const dy = to.y - from.y
            const len = Math.hypot(dx, dy)
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI
            const bolt = document.createElement('i')
            bolt.className = 'mech-tour-bolt'
            bolt.style.left = `${from.x}px`
            bolt.style.top = `${from.y}px`
            bolt.style.width = `${len}px`
            bolt.style.transform = `rotate(${angle}deg)`
            host.appendChild(bolt)
            window.setTimeout(() => bolt.remove(), 320)
          }
          sound.shot()
        },
        calm ? 500 : 1500
      )
    )

    t.push(
      window.setTimeout(
        () => {
          sound.hit()
          kills.add()
          setPhase('hit')
        },
        calm ? 650 : 1680
      )
    )

    return () => t.forEach((id) => window.clearTimeout(id))
  }, [])

  return (
    <div className="mech-tour-demo" ref={layer} data-phase={phase} aria-hidden>
      <div className="mech-tour-bird">
        <svg viewBox="0 0 44 30" fill="none" focusable="false">
          {BIRD_BODY.map((d) => (
            <path key={d} d={d} />
          ))}
          {BIRD_WING_UP.map((d) => (
            <path key={d} className="mech-wing-up" d={d} />
          ))}
          {BIRD_WING_DOWN.map((d) => (
            <path key={d} className="mech-wing-down" d={d} />
          ))}
        </svg>
        <span className="mech-tour-burst" />
      </div>
    </div>
  )
}
