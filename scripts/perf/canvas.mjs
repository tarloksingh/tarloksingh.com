/* ---- what resolution each canvas is really drawn at, and with how many
        samples ----
 *
 *  `node scripts/perf/canvas.mjs [phone|desktop] [path]`
 *
 *  The one measurement that settles "the models look jagged on my phone".
 *  Both canvases take `dpr` and `antialias` off `useNarrow()`, so a handset
 *  gets a fraction of the samples a desktop does — and because the backing
 *  store is *smaller* than the device pixel grid, each rendered pixel is then
 *  magnified across several real ones. Read `ratio` against the window's dpr,
 *  not against 1. */
import { attach, emulate, DEVICES, wait } from './cdp.mjs'

const [, , which = 'phone', path = '/p/mr-takahashi'] = process.argv
const device = DEVICES[which] ?? DEVICES.phone
const cdp = await attach()
await emulate(cdp, device, 1)
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${process.env.PERF_PORT || 8100}${path}` })
await wait(12000)

const rows = JSON.parse(
  await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('canvas')].map((c) => {
    const r = c.getBoundingClientRect()
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    const a = gl && gl.getContextAttributes ? gl.getContextAttributes() : null
    return { cls: c.className || '(stage)', css: Math.round(r.width) + 'x' + Math.round(r.height),
      backing: c.width + 'x' + c.height, ratio: r.width ? +(c.width / r.width).toFixed(2) : 0,
      aa: a ? a.antialias : '?', samples: gl ? gl.getParameter(gl.SAMPLES) : '?' }
  }).concat([{ cls: '(window)', css: innerWidth + 'x' + innerHeight, backing: 'dpr ' + devicePixelRatio, ratio: '', aa: '', samples: '' }]))`)
)
console.log(`\n=== ${path}  ${which} ${device.width} dpr${device.dsf} ===`)
for (const c of rows) {
  // 0 samples means no MSAA, which is one sample per pixel, not none.
  const per = c.ratio ? (c.ratio * c.ratio * Math.max(1, c.samples)).toFixed(2) : ''
  console.log(
    c.cls.padEnd(16), 'css', c.css.padEnd(11), 'backing', String(c.backing).padEnd(12),
    'ratio', String(c.ratio).padEnd(5), 'aa', String(c.aa).padEnd(6),
    'samples', String(c.samples).padEnd(3), per && `→ ${per} samples per css px²`
  )
}
cdp.close()
