/* ---- what a crossing costs once the page is already up ----
 *
 *  `node scripts/perf/nav.mjs [phone|desktop] [cpu]`
 *
 *  Two numbers come out of this and both are about things that are *supposed*
 *  to survive a navigation:
 *
 *  **`lose`** counts `WEBGL_lose_context`, which three asks for when it throws
 *  a renderer away. `MechStage.tsx` exists to make this zero between projects
 *  and it is — but `.mech-stage` is mounted only when `!home`, so going home
 *  still destroys the stage's context and the next project rebuilds it.
 *
 *  **`bank stopped`** is measured, not inferred: `.mech-bank-col`'s own flags
 *  are sampled every frame, and `MechSlots` runs `frameloop='never'` whenever
 *  `up` is false. The rail was hoisted to a single mount site so it would
 *  survive the crossing intact; this reports how long it spends frozen and
 *  re-dealing anyway.
 *
 *  **The last leg is not trustworthy and has not been made so.** `home ->
 *  project` reports zero contexts and zero program links, which cannot be
 *  right when the leg before it destroyed one — the synthetic press on a rail
 *  slot does not reliably open a project from home, where a slot's job is
 *  `onPick` before `onOpen`. Read the first three rows; check the fourth by
 *  hand before quoting it. */
import { attach, emulate, DEVICES, wait } from './cdp.mjs'

const [, , which = 'desktop', cpuArg = '4'] = process.argv
const device = DEVICES[which] ?? DEVICES.desktop
const base = `http://127.0.0.1:${process.env.PERF_PORT || 8100}`

const cdp = await attach()
await emulate(cdp, device, Number(cpuArg))
await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
  window.__N = { ctx: 0, lose: 0, link: 0, long: [], frames: [], t0: 0 }
  const gc = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (...a) {
    if (String(a[0]).startsWith('webgl')) window.__N.ctx++
    return gc.apply(this, a) }
  for (const proto of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const gx = proto.prototype.getExtension
    proto.prototype.getExtension = function (n) {
      if (n === 'WEBGL_lose_context') window.__N.lose++
      return gx.call(this, n) }
    const lp = proto.prototype.linkProgram
    proto.prototype.linkProgram = function (...a) { window.__N.link++; return lp.apply(this, a) }
  }
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    window.__N.long.push({ dur: Math.round(e.duration) }) }).observe({ entryTypes: ['longtask'] })
  window.__watch = () => {
    window.__N.t0 = performance.now(); window.__N.frames = []
    const tick = () => {
      const c = document.querySelector('.mech-bank-col')
      window.__N.frames.push({ t: Math.round(performance.now() - window.__N.t0),
        tr: c && c.dataset.transiting, cv: c && c.dataset.covered })
      if (performance.now() - window.__N.t0 < 4000) requestAnimationFrame(tick) }
    requestAnimationFrame(tick) }
`
})

const reset = () => cdp.evaluate('window.__N.long = []; __N.ctx = 0; __N.lose = 0; __N.link = 0; 1')
const report = async (label) => {
  const d = JSON.parse(await cdp.evaluate('JSON.stringify({ctx:__N.ctx,lose:__N.lose,link:__N.link,long:__N.long,frames:__N.frames})'))
  const busy = d.long.reduce((a, b) => a + b.dur, 0)
  const stopped = d.frames.filter((f) => f.tr === 'true' || f.cv === 'true')
  const span = stopped.length ? `${stopped[stopped.length - 1].t - stopped[0].t}ms` : 'never'
  let worst = 0
  for (let i = 1; i < d.frames.length; i++) worst = Math.max(worst, d.frames[i].t - d.frames[i - 1].t)
  console.log(
    `  ${label.padEnd(22)} contexts ${d.ctx}  lose ${d.lose}  links ${String(d.link).padStart(3)}` +
      `  longtasks ${d.long.length}/${busy}ms  worst frame ${worst}ms  bank stopped ${span}`
  )
}
const press = (re) =>
  cdp.evaluate(`window.__watch(); (() => { const s = [...document.querySelectorAll('.mech-slot')]
    .find((e) => /${re}/i.test(e.textContent)); s && s.click(); return !!s })()`)

console.log(`\n=== crossings, ${which} cpu ${cpuArg}x ===`)
await cdp.send('Page.navigate', { url: base + '/p/mr-takahashi' })
await wait(11000)
await report('deep-link a project')
await reset()

await press('capsule')
await wait(5000)
await report('project -> project')
await reset()

await cdp.evaluate(`window.__watch(); history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')); 1`)
await wait(5000)
await report('project -> home')
await reset()

await press('takahashi')
await wait(5000)
await report('home -> project')
cdp.close()
