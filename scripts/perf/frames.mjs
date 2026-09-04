/* ---- frame durations, banded by which part of the boot they fall in ----
 *
 *  `node scripts/perf/frames.mjs [phone|desktop] [cpu]`
 *
 *  This is the script that keeps the boot ripple out of trouble. It is the
 *  most conspicuous thing on the screen and has now been suspected three
 *  times; every time, the frames *during* it come back at a clean median and
 *  the stall is in the window after it, where the bank builds its geometry.
 *  Band the windows separately or the one gets blamed for the other. */
import { attach, emulate, DEVICES, PROBE, read, wait, band } from './cdp.mjs'

const [, , which = 'phone', cpuArg = '4', path = '/'] = process.argv
const device = DEVICES[which] ?? DEVICES.phone
const cdp = await attach()
await emulate(cdp, device, Number(cpuArg))
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE })
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${process.env.PERF_PORT || 8100}${path}` })
await wait(9000)

const P = await read(cdp)
const at = (n) => (P.marks.find((m) => m.n === n) || {}).t
const rip = at('ripple-starts'), gone = at('ripple-gone'), cover = at('COVER-LIFTS')
console.log(`\n=== ${path} ${which} cpu ${cpuArg}x — ripple ${rip}→${gone}ms over ${P.cells} cells, cover lifts ${cover}ms ===`)
band(P.gaps, 0, rip, 'before the ripple')
band(P.gaps, rip, gone, 'DURING the ripple')
band(P.gaps, gone, gone + 1500, 'the entrance after it')
band(P.gaps, cover + 2500, 9000, 'settled')
cdp.close()
