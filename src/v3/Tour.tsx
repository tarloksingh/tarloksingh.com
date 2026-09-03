import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BIRD_BODY, BIRD_WING_DOWN, BIRD_WING_UP } from '../site/frames'
import { sound } from './sound'
import { kills } from './kills'
import { quarry, type Creature } from './subject'
import { markTourSeen, type Flow } from './tourState'
import './Tour.css'

/* ---- pointing a few things out ----

   Not a modal and nothing to click through — the same idea as the subject's
   leader labels, one at a time: a dot lands on a thing, a line draws out at a
   slight angle to a word, the word folds in, it holds a breath, it folds out.
   The whole layer is `pointer-events: none`, so a visitor is never boxed in;
   if they ignore it and start pressing things, that is the point. Wide only —
   `Mech.tsx` does not start a run on a phone.

   Two runs. `home` points at the rail of work and then at the range — where a
   bird flies in and the real gun shoots it down (a dispatched `pointerdown`
   on `.mech`, so it is the same bolt the visitor would fire, not a lookalike
   drawn here). `project` points at the write-up and then at the media strip.

   Portalled to `body` with its own colours — the accent tokens live on
   `.mech` and none of this is inside it, the same reason `.mech-source`
   carries its own. It starts four seconds after the boot, so it lands well
   clear of the opening animations. */

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

const HOLD = 1900
const HOLD_DEMO = 3000
const ENTER = 460
const LEAVE = 320

/** How far the line runs out from the mark, and how far it leans along the
 *  edge — the lean is what keeps it from being a plain perpendicular tick. */
const OUT = 40
const LEAN = 24

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const near = (a: number, b: number) => Math.abs(a - b) < 0.5

export default function Tour({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  /* Only the labels whose target is on the screen when the run starts. It
     starts well after everything has settled, so a missing target here is a
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

  /* Each label: settle onto its mark, draw in, hold, fold out, hand over. */
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

  /* The mark on the target's roomiest edge, and the angled line running from
     it to where the chip anchors. */
  const geom = useMemo(() => {
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
    const dot = { x: clamp(x, 24, vw - 24), y: clamp(y, 46, vh - 46) }

    const offset =
      side === 'left'
        ? { x: -OUT, y: -LEAN }
        : side === 'right'
          ? { x: OUT, y: -LEAN }
          : side === 'top'
            ? { x: LEAN, y: -OUT }
            : { x: LEAN, y: OUT }
    const anchor = {
      x: clamp(dot.x + offset.x, 140, vw - 140),
      y: clamp(dot.y + offset.y, 58, vh - 58)
    }
    const len = Math.hypot(anchor.x - dot.x, anchor.y - dot.y)
    const angle = (Math.atan2(anchor.y - dot.y, anchor.x - dot.x) * 180) / Math.PI
    return { side, dot, anchor, len, angle }
  }, [box])

  if (!step) return null

  return createPortal(
    <div className="mech-tour" data-anim={vis} aria-hidden>
      {step.demo && <Demo />}
      {geom && (
        <>
          <span className="mech-tour-dot" style={{ left: geom.dot.x, top: geom.dot.y }} />
          <span
            className="mech-tour-line"
            style={{ left: geom.dot.x, top: geom.dot.y, width: geom.len, ['--a' as string]: `${geom.angle}deg` }}
          />
          <span
            className="mech-tour-chip"
            data-side={geom.side}
            style={{ left: geom.anchor.x, top: geom.anchor.y, ['--n' as string]: step.label.length }}
          >
            {step.label.split('').map((ch, n) => (
              <span key={n} className="mech-tour-glyph" style={{ ['--gi' as string]: n }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </>
      )}
    </div>,
    document.body
  )
}

/* The scripted kill. A bird crosses the top of the window under its own frame
   loop; the demo registers it with `quarry` like any other creature, then at
   the halfway mark it stalls and dispatches a real `pointerdown` on `.mech` at
   its position — so `MechLaser` fires its own bolt and its own hit test brings
   this bird down. The bolt that hits it is the same bolt the visitor would
   fire, not a second one drawn here. `kills.add()` / `sound.hit()` run from
   the creature's `hit`, exactly as `MechBird` does it. */
function Demo() {
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const vw = window.innerWidth
    const vh = window.innerHeight

    const pos = { x: -vw * 0.12, y: vh * 0.17 }
    const aimAt = vw * 0.6
    const cruise = (aimAt - pos.x) / (calm ? 0.5 : 1.35) // px/s to reach the stall point
    let vx = cruise
    let vy = 0
    let spin = 0
    let stage: 'fly' | 'brace' | 'fall' = 'fly'
    let shot = false
    let shotAt = 0
    let alive = true
    let elapsed = 0
    let last = performance.now()

    const self: Creature = {
      at: () => (alive ? { x: pos.x, y: pos.y } : null),
      hit: () => {
        if (!alive) return false
        alive = false
        sound.hit()
        kills.add()
        stage = 'fall'
        vx = (Math.random() - 0.3) * 120
        vy = -60
        return true
      }
    }
    quarry.creatures.add(self)

    const draw = () => {
      const el = wrap.current
      if (el) {
        el.dataset.stage = stage
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${spin}deg)`
      }
    }

    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      elapsed += dt

      if (stage === 'fly') {
        pos.x += vx * dt
        pos.y = vh * 0.17 + Math.sin(elapsed * 3) * 10
        if (!shot && pos.x >= aimAt) {
          shot = true
          shotAt = elapsed
          stage = 'brace'
          vx = 0
          document.querySelector('.mech')?.dispatchEvent(
            new PointerEvent('pointerdown', {
              pointerType: 'mouse',
              button: 0,
              clientX: pos.x,
              clientY: pos.y,
              bubbles: true
            })
          )
        }
      } else if (stage === 'brace') {
        pos.y = vh * 0.17 + Math.sin(elapsed * 3) * 10
        // If the real bolt has not connected by the time it would have
        // crossed the screen, bring the bird down anyway — the point is the
        // demonstration, not the ballistics.
        if (elapsed - shotAt > 0.6) self.hit()
      } else {
        vy += 1500 * dt
        pos.x += vx * dt
        pos.y += vy * dt
        spin += 520 * dt
      }
      draw()
    }
    raf = requestAnimationFrame(tick)

    return () => {
      alive = false
      quarry.creatures.delete(self)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="mech-tour-demo" aria-hidden>
      <div className="mech-tour-bird" ref={wrap} data-stage="fly">
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
