/* ---- the intro-stall comparison: every variant, side by side ----
 *
 *  `node scripts/perf/intro.mjs [phone|desktop] [cpu] [runs] [a,b,ab,…]`
 *
 *  One navigation per run, `?intro=<v>` on the address (see `src/v3/intro.ts`),
 *  and the three numbers `PERFORMANCE.md` asks each candidate to report: the
 *  worst frame in the entrance band, how many frames in it went over 33ms, and
 *  when COVER and INTRO-DONE landed.
 *
 *  **Medians, not runs.** A single load of this page spreads about two to one
 *  on the worst frame — the baseline alone came back 193, 203, 310 and 428ms
 *  on four consecutive loads of the same build. Anything read off one run of
 *  one variant is noise, and the whole reason the candidates ship together is
 *  so they can be compared without re-measuring the harness each time.
 *
 *  The entrance band is `ripple-gone` → +1500ms, exactly as `frames.mjs` bands
 *  it, because that is the window the stall was reported in. Two variants move
 *  work *out* of that window rather than removing it (D and E), so read the
 *  `settled` column too — a candidate that empties the entrance and fills the
 *  second after it has not fixed anything, it has moved it somewhere the
 *  reader is still looking. */
import { attach, emulate, DEVICES, PROBE, read, wait } from './cdp.mjs'

const [, , which = 'phone', cpuArg = '4', runsArg = '3', only] = process.argv
const device = DEVICES[which] ?? DEVICES.phone
const cpu = Number(cpuArg)
const runs = Number(runsArg)
const base = `http://127.0.0.1:${process.env.PERF_PORT || 8100}`
const variants = (only ?? 'base').split(',')

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN
}
const worstIn = (gaps, from, to) =>
  Math.max(0, ...gaps.filter(([t]) => t >= from && t <= to).map(([, d]) => d))
const overIn = (gaps, from, to) =>
  gaps.filter(([t, d]) => t >= from && t <= to && d > 33).length
/* **Long tasks, not frame gaps, are the honest half of this.** A profile of
   the worst gap in the entrance came back 46ms `(program)` and 29ms `(idle)`
   — three quarters of a "frame" in which the main thread had nothing to do
   and the compositor simply had not presented. That is the headless
   presentation artifact `cdp.mjs` warns about, and it means a gap can move
   twenty per cent on a change that did nothing at all. A long task is main
   thread by definition. Read both: the gap is what a person would see, the
   long task is what was actually spent. */
const longIn = (long, from, to) => long.filter((l) => l.start >= from && l.start <= to)
const busyIn = (long, from, to) => longIn(long, from, to).reduce((a, b) => a + b.dur, 0)
const worstLongIn = (long, from, to) => Math.max(0, ...longIn(long, from, to).map((l) => l.dur))

const cdp = await attach()
await emulate(cdp, device, cpu)
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE })

const table = []
for (const v of variants) {
  const url = base + (v === 'base' ? '/' : `/?intro=${v}`)
  const got = []
  for (let i = 0; i < runs; i++) {
    await cdp.send('Page.navigate', { url })
    await wait(9000)
    const P = await read(cdp)
    const at = (n) => (P.marks.find((m) => m.n === n) || {}).t ?? NaN
    const gone = at('ripple-gone')
    const rip = at('ripple-starts')
    got.push({
      /* C builds the bays *here*, under the cover. This column is the whole
         risk of it: a stall moved onto the ripple is a stall you can still
         see, and the ripple is the one sequence on the page whose entire job
         is to be smooth. */
      ripWorst: worstIn(P.gaps, rip, gone),
      /* **The whole load, not only the band.** Two of these candidates move
         the work rather than removing it, and a band-only reading cannot tell
         the two apart. If `load busy` holds while `entrance busy` falls, the
         stall was relocated; if both fall, it is gone. */
      loadBusy: busyIn(P.long, 0, 1e9),
      busy: busyIn(P.long, gone, gone + 1500),
      worstLong: worstLongIn(P.long, gone, gone + 1500),
      worst: worstIn(P.gaps, gone, gone + 1500),
      over: overIn(P.gaps, gone, gone + 1500),
      settledWorst: worstIn(P.gaps, gone + 1500, gone + 3500),
      cover: at('COVER-LIFTS'),
      done: at('INTRO-DONE')
    })
    process.stdout.write('.')
  }
  const col = (k) => median(got.map((g) => g[k]))
  table.push({ v, ...Object.fromEntries(['ripWorst', 'worst', 'over', 'busy', 'worstLong', 'loadBusy', 'settledWorst', 'cover', 'done'].map((k) => [k, col(k)])) })
  process.stdout.write(` ${v}\n`)
}

console.log(`\n=== intro variants — ${which} ${device.width}x${device.height} cpu ${cpu}x, median of ${runs} ===`)
console.log(
  '  variant   ripple worst   entrance worst   >33ms   entrance busy   worst task   load busy   next 2s worst    COVER   INTRO-DONE'
)
for (const r of table) {
  console.log(
    '  ' + r.v.padEnd(9) +
      String(r.ripWorst).padStart(8) + 'ms' +
      String(r.worst).padStart(10) + 'ms' +
      String(r.over).padStart(8) +
      String(r.busy).padStart(14) + 'ms' +
      String(r.worstLong).padStart(11) + 'ms' +
      String(r.loadBusy).padStart(10) + 'ms' +
      String(r.settledWorst).padStart(14) + 'ms' +
      String(r.cover).padStart(9) +
      String(r.done).padStart(13)
  )
}
cdp.close()
