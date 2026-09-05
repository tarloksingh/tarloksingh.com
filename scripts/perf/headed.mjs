/* ---- frames lost against main-thread time, in a real Chrome window ----

   **This is the instrument the rest of this folder was missing**, and the
   reason `PERFORMANCE.md` cleared the boot ripple six times while the fault
   was still there. Everything else here reads the *main thread* — long tasks,
   style recalculation, script — through `--headless=new`. This fault has
   almost no main thread in it: home's entrance lost **2116ms** to dropped
   frames against **148ms** of long tasks, a 14:1 ratio, because the cost was
   in the GPU process rasterizing blurred shadows. A main-thread reading of
   that comes back clean and confident and wrong.

   Two things make it work where headless does not:

   - **Headed.** `--headless=new` gets a real GPU but never presents to a real
     display, so the compositor path this fault lives in is not exercised.
   - **`--disable-features=CalculateNativeWinOcclusion`.** Chrome suspends
     `requestAnimationFrame` outright on a window it thinks is covered, which
     is what forced every earlier attempt at this to be driven by a person
     watching the glass. With occlusion detection off, the window can sit
     behind a terminal and still animate, so this runs unattended.

   The number it reports is **lost-ms**: for every frame gap over 33.3ms, how
   far past a 16.7ms budget it ran. That is "how much animation did not
   happen", which is what a stagger actually is. `longtask` beside it says how
   much of that the main thread can account for — when the two are close the
   fault is script, and when lost-ms dwarfs it the fault is paint or raster.

   ```bash
   node scripts/perf/serve.mjs &
   node scripts/perf/headed.mjs                 # baseline, 3 runs
   node scripts/perf/headed.mjs --css '*{box-shadow:none;text-shadow:none}'
   node scripts/perf/headed.mjs --runs 5 --window 2000,7000 --size 2560,1440
   ```

   `--css` is the bisect: it is injected before any app code and re-applied
   until the document has a head, so a suppression can be measured without a
   rebuild. **Put the recorder in before the suppression, never after** — an
   injected stylesheet that throws at document-start takes the measurement
   down with it and reports a serene zero frames, which is how this script's
   first three readings were junk. */

import { spawn } from 'node:child_process'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = Number(process.env.HEADED_PORT || 9333)
const BASE = process.env.BASE || 'http://127.0.0.1:8100'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const path = arg('path', '/')
const runs = Number(arg('runs', 3))
const css = arg('css', '')
const [w, h] = arg('size', '2560,1440').split(',').map(Number)
const [t0, t1] = arg('window', '2000,7000').split(',').map(Number)
const dwell = Number(arg('dwell', t1 + 1500))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** A window that is allowed to keep animating while something else has focus.
 *  Reuses one already on `--headed-port` if it is there. */
async function browser() {
  try {
    await fetch(`http://127.0.0.1:${PORT}/json/version`)
    return null
  } catch {
    /* not up yet */
  }
  const child = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      '--user-data-dir=/tmp/perf-headed',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      /* The whole reason this can run unattended — see the header. */
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--window-position=0,0',
      `--window-size=${w},${h}`,
      'about:blank'
    ],
    { stdio: 'ignore', detached: true }
  )
  child.unref()
  for (let i = 0; i < 40; i++) {
    await sleep(250)
    try {
      await fetch(`http://127.0.0.1:${PORT}/json/version`)
      return child
    } catch {
      /* still coming up */
    }
  }
  throw new Error(`Chrome did not open a debugging port on ${PORT}`)
}

async function attach() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const waits = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && waits.has(msg.id)) {
      waits.get(msg.id)(msg.result)
      waits.delete(msg.id)
    }
  }
  await new Promise((r) => (ws.onopen = r))
  const send = (method, params = {}) =>
    new Promise((res) => {
      const n = ++id
      waits.set(n, res)
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
  return { send, evaluate, close: () => ws.close() }
}

/* The recorder is first and the suppression second, and that order is load
   bearing — see the header. `--css` also reports whether it actually landed,
   so a selector that matches nothing cannot read as a clean result. */
const recorder = (sheet) => `
window.__rec = { frames: [], tasks: [], css: 0 };
(function () {
  let last = performance.now();
  const tick = (t) => {
    window.__rec.frames.push([+t.toFixed(0), +(t - last).toFixed(1)]);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__rec.tasks.push({ s: +e.startTime.toFixed(0), d: +e.duration.toFixed(0) });
    }).observe({ entryTypes: ['longtask'] });
  } catch (e) {}
})();
${
  sheet
    ? `try { (function () {
  var add = function () {
    if (!document.documentElement || document.getElementById('__sup')) return !!document.getElementById('__sup');
    var s = document.createElement('style');
    s.id = '__sup';
    s.textContent = ${JSON.stringify(sheet)};
    (document.head || document.documentElement).appendChild(s);
    window.__rec.css = 1;
    return true;
  };
  if (!add()) { var iv = setInterval(function () { if (add()) clearInterval(iv) }, 5) }
  document.addEventListener('DOMContentLoaded', add);
})() } catch (e) {}`
    : ''
}`

await browser()
const out = []
for (let i = 0; i < runs; i++) {
  const c = await attach()
  await c.send('Page.enable')
  await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false })
  await c.send('Page.navigate', { url: 'about:blank' })
  await sleep(400)
  const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: recorder(css) })
  await c.send('Page.navigate', { url: BASE + path })
  await sleep(dwell)
  const hidden = await c.evaluate('document.visibilityState')
  const rec = JSON.parse(await c.evaluate('JSON.stringify(window.__rec)'))
  await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier })
  const band = rec.frames.filter(([t]) => t >= t0 && t <= t1)
  const lost = band.filter(([, g]) => g > 33.3).reduce((a, [, g]) => a + (g - 16.7), 0)
  const task = rec.tasks.filter((t) => t.s >= t0 && t.s <= t1).reduce((a, t) => a + t.d, 0)
  const worst = band.length ? Math.max(...band.map((x) => x[1])) : 0
  out.push({ lost, task, worst, n: band.length, css: rec.css, vis: hidden })
  c.close()
}

const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const frames = med(out.map((o) => o.n))
console.log(
  `${(css ? 'css' : 'baseline').padEnd(9)} lost:${med(out.map((o) => o.lost)).toFixed(0).padStart(5)}ms  ` +
    `longtask:${med(out.map((o) => o.task)).toFixed(0).padStart(4)}ms  ` +
    `worst:${med(out.map((o) => o.worst)).toFixed(0).padStart(4)}ms  ` +
    `frames:${String(frames).padStart(4)}/${Math.round((t1 - t0) / 16.7)}  ` +
    `runs=[${out.map((o) => o.lost.toFixed(0)).join(',')}]`
)
/* Both of these have produced a confident wrong number on this page before. */
if (out.some((o) => o.vis !== 'visible')) console.log('  !! tab was not visible — rAF suspended, the reading is fiction')
if (css && out.some((o) => !o.css)) console.log('  !! --css never landed — the suppression was not applied')
if (frames < 40) console.log('  !! almost no frames in the window — the recorder probably threw')
