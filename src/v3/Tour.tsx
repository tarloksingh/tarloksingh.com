import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BIRD_BODY, BIRD_WING_DOWN, BIRD_WING_UP } from '../site/frames'
import { sound } from './sound'
import { kills } from './kills'
import { markTourSeen, type Flow } from './tourState'
import './Tour.css'

/* ---- pointing a few things out ----

   Not a modal and nothing to click through — the same idea as the subject's
   leader labels, one at a time: a dot lands on a thing, a short line draws out
   to a word, it holds for a breath, and it leaves. The whole layer is
   `pointer-events: none`, so a visitor is never boxed in; if they ignore it
   and start pressing things, that is the point.

   Two runs. `home` points at the rail of work and then at the range — where a
   bird flies in and the panel shoots it down on its own, so "shoot anything"
   is shown rather than only said. `project` points at the write-up and then
   at the media strip. Each label's target is found by selector when its turn
   comes; a missing one (a locked project with no strip) is skipped, and a run
   with nothing left to point at marks itself seen and ends.

   Portalled to `body` with its own colours — the accent tokens live on
   `.mech` and none of this is inside it, the same reason `.mech-source`
   carries its own. It starts only once `Mech.tsx` says the boot and the
   opening animations are done. */

type Step = {
  target: string
  label: string
  /** Home's range label: run the scripted bird alongside it. */
  demo?: boolean
}

const STEPS: Record<Flow, Step[]> = {
  home: [
    { target: '.mech-work-rail', label: 'Projects — press one' },
    { target: '.mech-alarm', label: 'Shoot anything', demo: true }
  ],
  project: [
    { target: '.mech-folds', label: 'Project details' },
    { target: '.mech-rail-wrap', label: 'Stills & video' }
  ]
}

const HOLD = 1650
const HOLD_DEMO = 2800
const ENTER = 340
const LEAVE = 240

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const near = (a: number, b: number) => Math.abs(a - b) < 0.5

export default function Tour({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  /* Only the labels whose target is on the screen when the run starts. It
     starts after everything has settled, so a missing target here is a
     genuinely absent one — a locked project with no folds and no strip. */
  const [steps] = useState(() =>
    STEPS[flow].filter((s) => {
      const el = document.querySelector<HTMLElement>(s.target)
      return el !== null && el.getBoundingClientRect().height > 12
    })
  )
  const [i, setI] = useState(0)
  const [vis, setVis] = useState<'enter' | 'show' | 'leave'>('enter')
  const [box, setBox] = useState<DOMRect | null>(null)
  const step = steps[i]
  const last = i >= steps.length - 1

  const finish = useCallback(() => {
    markTourSeen(flow)
    onClose()
  }, [flow, onClose])

  const finishRef = useRef(finish)
  finishRef.current = finish
  const stepRef = useRef(step)
  stepRef.current = step
  const lastRef = useRef(last)
  lastRef.current = last

  useEffect(() => {
    if (steps.length === 0) finish()
  }, [steps, finish])

  /* Each label: settle onto its mark, draw in, hold, draw out, hand over. No
     buttons — the sequence runs itself. */
  useEffect(() => {
    if (!step) return
    setBox(null)
    setVis('enter')
    document
      .querySelector<HTMLElement>(step.target)
      ?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })

    const hold = step.demo ? HOLD_DEMO : HOLD
    const raf = requestAnimationFrame(() => setVis('show'))
    const toLeave = window.setTimeout(() => setVis('leave'), ENTER + hold)
    const toNext = window.setTimeout(() => {
      if (lastRef.current) finishRef.current()
      else setI((n) => n + 1)
    }, ENTER + hold + LEAVE)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(toLeave)
      window.clearTimeout(toNext)
    }
  }, [i, step])

  /* One rAF loop for the run, following the current target's rect — `Mech`
     re-renders often enough that a per-label effect was torn down before its
     frame landed. A target that vanishes mid-label is dropped. */
  useEffect(() => {
    let raf = 0
    let misses = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const current = stepRef.current
      if (!current) return
      const node = document.querySelector<HTMLElement>(current.target)
      if (!node) {
        misses += 1
        if (misses > 30) {
          misses = 0
          if (lastRef.current) finishRef.current()
          else setI((n) => n + 1)
        }
        return
      }
      misses = 0
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  /* Which edge of the target the label hangs off — whichever side has the
     most room — and the point the line runs out from. */
  const pointer = useMemo(() => {
    if (!box) return null
    const vw = window.innerWidth
    const vh = window.innerHeight
    const room: Record<'left' | 'right' | 'top' | 'bottom', number> = {
      left: box.left,
      right: vw - box.right,
      top: box.top,
      bottom: vh - box.bottom
    }
    const side = (['left', 'right', 'top', 'bottom'] as const).reduce((best, s) =>
      room[s] > room[best] ? s : best
    )
    let x = box.left + box.width / 2
    let y = box.top + box.height / 2
    if (side === 'left') x = box.left
    if (side === 'right') x = box.right
    if (side === 'top') y = box.top
    if (side === 'bottom') y = box.bottom
    return { side, x: clamp(x, 26, vw - 26), y: clamp(y, 48, vh - 48) }
  }, [box])

  if (!step) return null

  return createPortal(
    <div className="mech-tour" data-anim={vis} aria-hidden>
      {step.demo && <Demo />}
      {pointer && (
        <div
          className="mech-tour-tag"
          data-side={pointer.side}
          style={{ left: pointer.x, top: pointer.y }}
        >
          <span className="mech-tour-dot" />
          <span className="mech-tour-line" />
          <span className="mech-tour-chip">{step.label}</span>
        </div>
      )}
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
          const host = layer.current
          if (host) {
            const from = { x: window.innerWidth / 2, y: window.innerHeight - 2 }
            const to = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 }
            const len = Math.hypot(to.x - from.x, to.y - from.y)
            const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
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
