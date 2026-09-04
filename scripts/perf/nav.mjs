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
 *  **`bank stopped`** is the longest run of frames in which the bank's canvas
 *  issued no draw call at all. `MechSlots` runs `frameloop='never'` whenever
 *  `up` is false, and the rail was hoisted to a single mount site precisely so
 *  it would survive a crossing intact; this is how long it spends frozen
 *  instead.
 *
 *  It used to read `.mech-bank-col`'s `data-transiting` / `data-covered`
 *  instead and call that "measured, not inferred". It was not: those flags
 *  are set for several things that have nothing to do with the canvas — the
 *  head display backspacing its word is one — so once `up` stopped carrying
 *  the crossing, the flags went on flipping and the script went on reporting
 *  a 1200ms freeze that was no longer happening. Counting `drawElements` and
 *  `drawArrays` on the actual context is the thing itself.
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
  window.__N = { ctx: 0, lose: 0, link: 0, long: [], frames: [], t0: 0, draws: 0 }
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
    /* Every draw, tallied for the bank's context only. **The class is on the
       wrapper, not on the canvas** — r3f passes \`className\` to the div it
       puts around the element — so this walks up rather than reading
       \`canvas.className\`, which is empty on both canvases and silently
       counts nothing. The lookup is cached on the context: this runs on every
       draw call of every frame. */
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced']) {
      const d = proto.prototype[fn]
      if (!d) continue
      proto.prototype[fn] = function (...a) {
        if (this.__bank === undefined)
          this.__bank = Boolean(this.canvas && this.canvas.closest('.mech-bank-gl'))
        if (this.__bank) window.__N.draws++
        return d.apply(this, a) }
    }
  }
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    window.__N.long.push({ dur: Math.round(e.duration) }) }).observe({ entryTypes: ['longtask'] })
  window.__watch = () => {
    window.__N.t0 = performance.now(); window.__N.frames = []
    const tick = () => {
      window.__N.frames.push({ t: Math.round(performance.now() - window.__N.t0),
        d: window.__N.draws })
      if (performance.now() - window.__N.t0 < 4000) requestAnimationFrame(tick) }
    requestAnimationFrame(tick) }
`
})

const reset = () => cdp.evaluate('window.__N.long = []; __N.ctx = 0; __N.lose = 0; __N.link = 0; 1')
const report = async (label) => {
  const d = JSON.parse(await cdp.evaluate('JSON.stringify({ctx:__N.ctx,lose:__N.lose,link:__N.link,long:__N.long,frames:__N.frames})'))
  const busy = d.long.reduce((a, b) => a + b.dur, 0)
  /* The longest stretch between two frames that each drew something. A single
     idle frame is ordinary scheduling; a canvas that has been switched off
     shows up as one gap the length of the whole crossing. */
  let span = 'never'
  let gap = 0
  let last = null
  for (const f of d.frames) {
    if (last === null || f.d > last.d) { last = f; continue }
    gap = Math.max(gap, f.t - last.t)
  }
  if (gap > 100) span = `${gap}ms`
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
