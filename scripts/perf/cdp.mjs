/* ---- the shared half of every measurement in this folder ----

   One websocket to a headless Chrome, plus the three things every script here
   needs: a device to pretend to be, a CPU to be slow, and a script injected
   before any app code runs.

   **Why CDP and not a stopwatch.** Everything on this page is a staged
   sequence, and the numbers that matter are *when* each stage lands relative
   to the others. A page-load total averages all of that away — see **measure
   the entrance, not the load** in README.md.

   **`--headless=new` gets the real GPU on a Mac** (`ANGLE Metal Renderer`),
   which is what makes the raster numbers in `frames.mjs` worth anything at
   all. It also means frame *counts* are not trustworthy: the gaps show up as
   `STEP_BUFFER_SWAP_POST_SUBMIT` on `CrGpuMain`, a presentation artifact of
   headless. Quote frame *durations* off the main thread, not frames drawn.

   **And the GPU is the wrong GPU.** These scripts run on the machine you are
   sitting at. Resolutions, samples, bytes and main-thread milliseconds all
   transfer to a phone; fill rate and raster do not. Anything that turns on
   how expensive a fragment is has to be checked on the actual handset over
   the tailnet — see `npm run dev` in README.md. */

const PORT = Number(process.env.CDP_PORT || 9222)

export async function attach() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target — is Chrome running? see the header of PERFORMANCE.md')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const waits = new Map()
  /** Every `Method.event` that arrived, in order. `Network.*` and `Tracing.*`
   *  are read out of this after the run rather than handled live. */
  const events = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && waits.has(msg.id)) {
      waits.get(msg.id)(msg.result)
      waits.delete(msg.id)
    } else if (msg.method) events.push(msg)
  }
  await new Promise((r) => (ws.onopen = r))

  const send = (method, params = {}) =>
    new Promise((res) => {
      const n = ++id
      waits.set(n, res)
      ws.send(JSON.stringify({ id: n, method, params }))
    })

  /** In the page, with the result brought back by value. Throws rather than
   *  handing back `undefined`, because a silently-undefined read is how a
   *  measurement run looks exactly like a passing one. */
  const evaluate = async (expression) => {
    const out = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (!out || out.result?.type === 'undefined') {
      throw new Error(`evaluate returned undefined — the injected script did not run?\n  ${expression.slice(0, 120)}`)
    }
    return out.result.value
  }

  return { send, evaluate, events, close: () => ws.close() }
}

/** The handset these numbers are quoted on, and a desktop to compare against.
 *  390×844 at dpr 3 is an iPhone 14/15/16; `narrow` in `src/v3/narrow.ts`
 *  fires under 700px, so 390 is on the narrow layout and 1512 is not. */
export const DEVICES = {
  phone: { width: 390, height: 844, dsf: 3, mobile: true },
  desktop: { width: 1512, height: 900, dsf: 2, mobile: false }
}

export async function emulate({ send }, device, cpu = 1, net = false) {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.dsf,
    mobile: device.mobile
  })
  if (device.mobile) {
    await send('Emulation.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    })
  }
  /* Cold, always. A warm cache measures the second visit, and the complaint
     is about the first. */
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Emulation.setCPUThrottlingRate', { rate: cpu })
  if (net) {
    await send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (10 * 1024 * 1024) / 8,
      uploadThroughput: (2 * 1024 * 1024) / 8
    })
  }
}

/** Bytes on the wire, per file, read back out of the event log.
 *
 *  **`serve.mjs` does not compress.** Vercel serves brotli, so JavaScript
 *  here reads about 3.5× its real transfer size. Models and video are already
 *  compressed formats and do transfer honestly — which is the half these
 *  scripts are usually being pointed at. */
export function fetches(events) {
  const reqs = new Map()
  for (const e of events) {
    if (e.method === 'Network.requestWillBeSent') reqs.set(e.params.requestId, { url: e.params.request.url })
    if (e.method === 'Network.loadingFinished') {
      const r = reqs.get(e.params.requestId)
      if (r) r.bytes = e.params.encodedDataLength
    }
  }
  return [...reqs.values()]
}

/** Injected before any app code, so the boot's own landmarks are timed from
 *  navigation rather than from whenever the harness got around to asking.
 *  Every script here shares it: one list of marks, one long-task observer,
 *  one per-frame sampler. */
export const PROBE = `
  window.__P = { t0: performance.now(), marks: [], long: [], gaps: [], cells: 0 }
  const seen = new Set()
  const once = (n) => { if (seen.has(n)) return; seen.add(n)
    window.__P.marks.push({ n, t: Math.round(performance.now() - window.__P.t0) }) }
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    window.__P.long.push({ start: Math.round(e.startTime - window.__P.t0), dur: Math.round(e.duration) })
  }).observe({ entryTypes: ['longtask'] })

  let last = performance.now()
  const tick = () => {
    const now = performance.now()
    window.__P.gaps.push([Math.round(now - window.__P.t0), Math.round(now - last)])
    last = now

    const root = document.querySelector('.mech')
    if (root) { once('mounts'); if (root.dataset.boot === 'false') once('COVER-LIFTS') }
    const tiles = document.querySelector('.mech-tiles')
    if (tiles) { once('ripple-starts'); window.__P.cells = Math.max(window.__P.cells, tiles.children.length) }
    if (seen.has('ripple-starts') && !tiles) once('ripple-gone')
    if (document.querySelector('canvas.mech-bank-gl')) once('bank-canvas')
    if (document.querySelector('.mech-slot-shot')) once('bays-in-dom')
    // The two lines the reader is actually waiting on — see IN in MechCluster.tsx.
    const name = document.querySelector('.mech-ident-typed span')
    if (name?.textContent?.length > 2) once('name-types')
    const intro = document.querySelector('.mech-profile span')
    if (intro?.textContent?.length > 3) once('intro-types')
    if (intro?.textContent?.length > 180) once('INTRO-DONE')
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
`

export const read = ({ evaluate }) => evaluate('JSON.stringify(window.__P)').then(JSON.parse)

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Frame durations over a window, as a distribution. A mean hides exactly the
 *  thing being looked for: one 225ms frame in a second of 17ms ones. */
export function band(gaps, from, to, label) {
  const g = gaps.filter(([t]) => t >= from && t <= to).map(([, d]) => d).sort((a, b) => a - b)
  if (!g.length) return console.log('  ' + label.padEnd(24) + 'no frames')
  const pick = (q) => g[Math.min(g.length - 1, Math.floor(g.length * q))]
  console.log(
    '  ' + label.padEnd(24),
    `frames ${String(g.length).padStart(4)}  median ${String(pick(0.5)).padStart(3)}ms` +
      `  p90 ${String(pick(0.9)).padStart(4)}ms  worst ${String(g[g.length - 1]).padStart(4)}ms` +
      `  >33ms ${g.filter((d) => d > 33).length}`
  )
}
