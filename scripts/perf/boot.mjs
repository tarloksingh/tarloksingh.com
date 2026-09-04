/* ---- what a cold first load costs, and when each stage of it lands ----
 *
 *  `node scripts/perf/boot.mjs [phone|desktop] [cpu] [path]`
 *
 *  The timeline is the point. `primed` in `Mech.tsx` holds the boot until the
 *  fonts and the 3D chunk arrive, `BOOT_MS` runs the cover, and then `IN` in
 *  `MechCluster.tsx` stages a dozen readouts over the next two and a half
 *  seconds — so "how long does home take" has about six different answers and
 *  only the breakdown is actionable. */
import { attach, emulate, DEVICES, PROBE, read, fetches, wait } from './cdp.mjs'

const [, , which = 'phone', cpuArg = '4', path = '/'] = process.argv
const device = DEVICES[which] ?? DEVICES.phone
const cpu = Number(cpuArg)
const base = `http://127.0.0.1:${process.env.PERF_PORT || 8100}`

const cdp = await attach()
await emulate(cdp, device, cpu, Boolean(process.env.NET))
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE })
await cdp.send('Page.navigate', { url: base + path })
await wait(Number(process.env.WAIT || 20000))

const P = await read(cdp)
console.log(`\n=== ${path}  ${which} ${device.width}x${device.height} dpr${device.dsf}  cpu ${cpu}x  ${process.env.NET ? 'net 10Mbps' : 'net local'} ===`)
console.log('--- timeline, ms from navigation ---')
for (const m of P.marks) console.log(String(m.t).padStart(7), m.n)

const busy = P.long.reduce((a, b) => a + b.dur, 0)
console.log(`--- long tasks: ${P.long.length}, ${busy}ms total, worst ${Math.max(0, ...P.long.map((l) => l.dur))}ms ---`)
for (const l of P.long.slice(0, 12)) console.log(String(l.start).padStart(7), `${l.dur}ms`)

const all = fetches(cdp.events)
const heavy = all.filter((r) => /\.(glb|mp4|bin)(\?|$)/.test(r.url) && r.bytes > 50000).sort((a, b) => b.bytes - a.bytes)
console.log('--- models and video actually fetched ---')
let total = 0
for (const r of heavy) {
  total += r.bytes
  console.log(String(Math.round(r.bytes / 1024)).padStart(7) + 'KB', r.url.replace(base, ''))
}
console.log(`  ${Math.round((total / 1024 / 1024) * 10) / 10} MB over ${heavy.length} files`)
const js = all.filter((r) => /\.js(\?|$)/.test(r.url))
console.log(`--- js: ${js.length} files, ${Math.round(js.reduce((a, b) => a + (b.bytes || 0), 0) / 1024)}KB uncompressed (~3.5x its real transfer) ---`)
cdp.close()
