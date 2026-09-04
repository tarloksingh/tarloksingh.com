/* ---- diagnostics behind a `?diag=` flag ----

   Same convention as `?ripple=` in MechTiles.tsx — query-string gated,
   committed rather than built-and-deleted (see PERFORMANCE.md's note on the
   `?intro=` flag that wasn't, and cost the write-up its own evidence).

   Both open faults on PERFORMANCE.md's ledger share a shape: the machine
   that shows one is a machine this session cannot drive. Item 1b (the
   desktop entrance stagger) only shows up on a real Chrome window that is
   actually frontmost — a background tab has `requestAnimationFrame`
   suspended outright by the browser, which silently reads as a perfect
   60fps of nothing if you are not watching for it. Item 5 (the Safari label
   jump) is on a browser nothing here can click at all. Both need a person
   looking at the glass, which means the read-out has to be *on* the glass —
   a fixed on-page panel, not the console.

   `?diag=fps` — a frame-gap watch. `?diag=leaders` — every `fitCards` /
   `aimLeader` correction on a project screen, logged with what triggered it
   and whether the card had already been revealed when it moved. */

const flags = (() => {
  try {
    return new Set((new URLSearchParams(window.location.search).get('diag') ?? '').split(',').filter(Boolean))
  } catch {
    return new Set<string>()
  }
})()

export const diagOn = (name: string): boolean => flags.has(name)

let panel: HTMLDivElement | null = null
const rows = new Map<string, HTMLDivElement>()

const ensurePanel = (): HTMLDivElement => {
  if (panel) return panel
  const el = document.createElement('div')
  el.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:2147483647;background:rgba(0,0,0,.82);' +
    'color:#8f8;font:11px/1.45 ui-monospace,monospace;padding:8px 10px;max-width:48vw;' +
    'max-height:42vh;overflow:auto;white-space:pre-wrap;pointer-events:none'
  document.body.appendChild(el)
  panel = el
  return el
}

/** One line, replaced in place by `key` — for a value that changes every
 *  frame (fps, gap counts) rather than logged as a fresh event each time. */
export const diagSet = (key: string, text: string): void => {
  const p = ensurePanel()
  let row = rows.get(key)
  if (!row) {
    row = document.createElement('div')
    rows.set(key, row)
    p.appendChild(row)
  }
  row.textContent = text
}

const LOG_CAP = 60

/** A fresh line every call, capped — for a discrete event (a correction, a
 *  jump), timestamped against the page's own clock. */
export const diagLog = (text: string): void => {
  const p = ensurePanel()
  const line = document.createElement('div')
  line.textContent = `${(performance.now() / 1000).toFixed(2)}s  ${text}`
  p.appendChild(line)
  while (p.childNodes.length > LOG_CAP) p.removeChild(p.firstChild as ChildNode)
  p.scrollTop = p.scrollHeight
}

/** Long tasks (>50ms of unbroken main-thread work) during the fps watch.
 *  Distinguishes "the main thread is busy" from "the main thread is idle and
 *  something else is slow" — the earlier investigation of this same fault
 *  found zero long tasks under a *different* measurement window (headless,
 *  4x throttle, the entrance's first ~2s); this reports whatever actually
 *  happens for as long as `?diag=fps` runs, throttle-free, on a real tab. */
const startLongTaskWatch = (): void => {
  if (typeof PerformanceObserver === 'undefined') return
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        diagLog(`longtask ${entry.duration.toFixed(0)}ms  start=${entry.startTime.toFixed(0)}ms`)
      }
    }).observe({ entryTypes: ['longtask'] })
  } catch {
    // longtask isn't observable in every browser; the fps panel still works.
  }
}

/** `?diag=fps` — item 1b in PERFORMANCE.md. Reports a rolling one-second
 *  window rather than raw gaps, and says outright when the tab is hidden
 *  instead of letting a suspended rAF loop read as a smooth one. Started
 *  once; the flag check makes every call after the first a no-op. */
let started = false
export const startFrameWatch = (): void => {
  if (started || !diagOn('fps') || typeof window === 'undefined') return
  started = true
  startLongTaskWatch()

  let last = performance.now()
  let frames = 0
  let over33 = 0
  let over50 = 0
  let worst = 0
  let windowStart = last

  const tick = (t: number) => {
    if (document.hidden) {
      diagSet('fps', 'tab hidden — rAF suspended, nothing measured')
    } else {
      const gap = t - last
      frames++
      if (gap > 33.3) over33++
      if (gap > 50) over50++
      if (gap > worst) worst = gap
      if (t - windowStart > 1000) {
        diagSet('fps', `${frames}fps  gaps>33ms:${over33}  >50ms:${over50}  worst:${worst.toFixed(0)}ms`)
        frames = 0
        over33 = 0
        over50 = 0
        worst = 0
        windowStart = t
      }
    }
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
