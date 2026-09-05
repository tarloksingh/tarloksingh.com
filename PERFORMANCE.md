# Performance: what has been done, and what is next

**This file is a handoff.** It is written for whoever picks the work up next,
human or model, and it assumes you have not seen any of it before. Everything
below is either **done** and says what it bought, **ruled out** and says why
not to spend it again, or **open** and says exactly what to change.

**Read this before anything else.** Every "after" number on this page was
taken off `dist/` through `scripts/perf/serve.mjs` on the machine it was
written on, and **not one of them has been confirmed on a handset**. Vercel
builds this repo's `main`, so a phone is only ever looking at what has been
*pushed* — and for three commits it was not, which is the whole of why the
intro work "changed nothing" on a device. Check it before believing anything a
phone tells you:

```bash
git log --oneline origin/main..main    # not empty = not deployed
```

Last worked 2026-09-04, against `main`. `README.md` explains *why* the code is
the shape it is; this file says how fast it runs and what is left.

**The one instruction: re-measure before you change anything.** The scripts in
`scripts/perf/` are the whole apparatus. This page has been wrong repeatedly,
always the same way — *the most conspicuous thing on the screen is not the
expensive thing on the screen.* The boot ripple has now been blamed and
cleared **seven** times — most recently as the desktop stagger, which turned
out to be two blurred `text-shadow`s and a rasterizer Chrome switched on
overnight (item 12). **And check the browser before the build**: that fault
arrived with a Chrome update while this repo sat still, and the first day of
it was spent bisecting commits that were all identical.

---

## Start here

```bash
npm install
npm run build
node scripts/perf/serve.mjs &          # dist on :8100, with vercel.json's rewrite

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/perf --no-first-run --disable-extensions &

node scripts/perf/boot.mjs   phone 4          # cold first load, staged
node scripts/perf/frames.mjs phone 4          # frame durations, banded
node scripts/perf/canvas.mjs phone            # backing store + sample counts
node scripts/perf/nav.mjs    desktop 4        # what a crossing costs
node scripts/perf/intro.mjs  phone 4 5        # long tasks and gaps, medianed
node scripts/perf/models.mjs                  # no browser needed
node scripts/perf/headed.mjs                  # frames lost vs main-thread time

node scripts/compress-models.mjs --dry        # what the GLBs weigh
```

`phone` is 390×844 at dpr 3, under `narrow`'s 700px breakpoint; `desktop` is
1512×900 at dpr 2. The second argument is the CPU throttle. Each script's
header says what question it answers and what its trap is.

**`headed.mjs` is the one to reach for when a fault is *seen* rather than
measured.** Everything else in this folder reads the main thread through
`--headless=new`; it reports **lost-ms** — how much animation did not happen —
out of a real Chrome window, beside the long-task total that would explain it.
When the two are close the fault is script; when lost-ms dwarfs it the fault is
paint or raster, and nothing else in this folder can see it. It runs unattended
because `--disable-features=CalculateNativeWinOcclusion` stops Chrome
suspending `requestAnimationFrame` on a covered window. **This is the
instrument that found item 1b**, after six main-thread investigations had each
come back clean. `--css` injects a suppression before app code, so a candidate
can be bisected without a rebuild.

**For item 5, none of the above can see the fault — use `src/v3/diag.ts` on a
real, focused, non-headless tab instead**, because it is on Safari, which
nothing here can click. `?diag=fps` on any page — a rolling frame-gap window
plus real `longtask` entries, written to a small fixed on-page panel rather
than the console. `?diag=leaders` on a project page — every
`fitCards`/`aimLeader` correction, tagged with source and flagged `JUMP` on a
re-placement.

`?bank=off` and `?skip=<id>[,<id>...]` in `MechSlots.tsx` were built for item
1b and are kept: they isolate a bank subject's build cost, which is real, is
about 150ms, and turned out **not** to be that fault — see item 12 in
**Done**. `?diag=fps` needed a person watching the glass; `headed.mjs` does
not, and that is the difference that closed it.

---

## Four traps that have each cost a day

Read these before measuring anything. Every one of them makes a measurement
lie rather than fail, which is why they cost what they cost.

### 1. A browser profile's scratchpad beats your source edit

Every tuning hook merges `localStorage` **over** the `_DEFAULTS` in source. A
headless run with a persistent `--user-data-dir` renders whatever was last
stored there, not what is in the file you just edited.

This invalidated an afternoon of work: a run of phone screenshots checking a
change to the revolver's `focalLength` were **all rendered at the stored 18**,
and the conclusion drawn from them — that neither the lens, the narrow scale
nor the yaw did anything — was wrong three times over. Clear it, and check:

```js
localStorage.clear()
Object.keys(localStorage)   // v3.model.tuning.v3.rigs, v3.narrow.tuning.v2, …
```

`TUNING_KEYS` in `src/v3/tuningStore.ts` is the full list; **Reset** on any
panel tab clears all of them. **It applies to a real phone over the tailnet
too** — a device that has ever had a panel open goes on showing stored numbers
until it is reset, so "the deploy did not change anything" is usually this.

### 2. `npm run dev` is not what to measure

Vite serves unbundled ES modules and every one is a request; the boot is
visibly worse there and always will be. Every number in this file was taken
off `dist/` served by `scripts/perf/serve.mjs`. If a measurement disagrees with
one here by more than ~15%, check that first.

Dev is still where the **tuning panels** live (a build aliases `leva` to
`src/v3/leva-prod.tsx`), so it is the right tool for placing things by eye and
the wrong one for timing them.

### 3. The GPU under these numbers is the wrong GPU

`--headless=new` on a Mac gets the real GPU, which is what makes the raster
figures worth quoting — but it is an M-series GPU, ten to thirty times a
handset's. **Resolutions, sample counts, bytes and main-thread milliseconds
transfer to a phone. Fill rate and raster do not.** Anything that turns on how
expensive a fragment is has to be checked on the device over the tailnet.

### 4. Frame *counts* out of headless Chrome are junk

The gaps come back as `STEP_BUFFER_SWAP_POST_SUBMIT` on `CrGpuMain`, a
presentation artifact. Quote frame *durations* off the main thread.

---

## Done — and what each was worth

Cold load, phone at 4× throttle. *Before* is one run; *after* is a median,
re-taken against the current build (`intro.mjs phone 4 7`), which spreads
1570–1710ms at the cover.

```
             before        after
  mounts       411ms         227ms
  ripple       632ms         440ms
  COVER       3382ms        1643ms
  intro       4080ms        2280ms
  INTRO-DONE  6080ms        3903ms   ← home settles 2.2s sooner

  long tasks  6 / 2029ms    1 /   50ms     ← main thread busy, −98%
  worst task     1531ms         50ms
  models         12.0 MB       2.6 MB
```

Crossings (`nav.mjs`, desktop 4×): the rail's freeze of 1211ms project-to-
project and 1145ms going home are both **never**; `lose 1` on going home is
**0**.

Samples per CSS px² (`canvas.mjs phone`): project stage **2.25 → 16**, the
bank **1.00 → 4.00**.

### 1. Four of the seven models had never been compressed

`capsule-c1.glb` carried 81,000 triangles in 439 KB; `akira-rider.glb` carried
136,000 in 4.4 MB. Four files shipped straight out of Sketchfab — float32
positions, normals and tangents, uncompressed PNG for every surface.

`scripts/compress-models.mjs` puts them through Draco + WebP: **22.7 MB → 6 MB**
across the set, home's phone fetch **12.0 MB → 4.4 MB**. Triangle counts are
identical; all four were checked on screen.

- **No `simplify` and no resize**, on purpose. Draco compresses the vertices
  that are there, so a bay and a project screen share one file with no second
  pipeline. Textures were already 1024².
- **`adam-face.glb` is excluded** — meshopt + quantized already, and 47 morph
  targets. It is now the heaviest thing home fetches (2.2 of 3.3 MB).
- The script skips anything already Draco, and works in `os.tmpdir()` because
  `public/` is copied verbatim into `dist`.

### 2. The rail froze and re-dealt on every crossing

`up` in `Mech.tsx` gates `frameloop` in `MechSlots` as well as the deal, so a
choreography reasoned entirely about *appearance* was switching off the one
canvas holding all eleven subjects for the length of every crossing.

`up` is `!booting` now. The bank's whole handover block in `MechCluster.css` is
one entrance hung on `data-booting`, and there is no exit. **Do not key it on
`data-transiting`** — that flips on every crossing, and an animation restarts
whenever its `animation-name` changes, which is what re-played the deal.

### 3. Going home destroyed the stage's renderer

`.mech-stage` sat inside `{!home && …}`, so home threw away the renderer, 19
compiled programs, the PMREM room and the face's morph-target texture. It is
kept mounted behind the `stageOpened` latch in `Mech.tsx`.

- **The latch is not a plain `true`**: `MechStage` is lazy and drags ~110KB
  behind it, so a *first* load of home must not pay for it.
- **`visibility: hidden`, not `display: none`** — a hidden element is not
  hit-tested either (which is why home had no stage box), and it keeps the box
  laid out, which a canvas needs to have a size to come back to.
- **And `position: absolute` on narrow.** This was missed first time and
  shipped a bug: narrow makes `.mech-stage` `position: relative` with a real
  height, so a hidden stage held its own `min(56vh, …)` and home came back from
  a project with an empty half-screen in it.

### 4. A phone got a fraction of the samples a desktop did

It was not merely undersampled: at ratio 1.5 on a dpr-3 screen every rendered
pixel was magnified over **four** device pixels, and the bank at ratio 1.0 over
**nine** — which is why it read as crisp-jagged rather than soft.

- **The stage** is a 390×410 box on a phone, not the window, and MSAA is cheap
  on the tile-based GPUs handsets use. `dpr={[1, 2]}`, `antialias: true`.
- **The bank** went to `dpr` 2 but keeps MSAA **off**. `View` scissors what it
  *draws*, but the *allocation* is the whole 343×1494 canvas; 4× MSAA on a
  686×2988 buffer is ~65 MB, which is how a context is lost on iOS Safari.

### 5. Home preloaded a model nothing could draw

`MechRider.tsx` called `useGLTF.preload` at **module scope** and `MechBank.tsx`
imports `RiderSlot` statically, so every page fetched `akira-rider.glb` — while
Solomon being `locked: true` meant neither render site would mount it. Gated on
that same flag rather than deleted, so unlocking Solomon restores both. Home's
fetch **4.4 → 3.3 MB**.

*A module-scope `preload` is unconditional by construction and will outlive
whatever made it reasonable. The others are worth an audit.*

### 6. `Typed` ran on `setInterval`

`speed` is milliseconds per character, so the intro paragraph at `speed={9}`
asked for ~111 ticks a second against a 60Hz display — two `textContent` writes
on most frames, ~40% never painted. Both directions are on `requestAnimationFrame`
now with the count computed from **elapsed time**, which is what keeps the
authored pace instead of re-timing every line to the display.

### 7. The intro stall: forty-seven morph targets in a seventy-five-pixel bay

The last thing on this page that read as *broken* rather than slow — the intro
animation stopping dead partway across a phone and then completing. One 184ms
long task in the entrance band, and it was one bay: `adam-face.glb`'s 47 morph
targets, packed into a `DataArrayTexture` by three on the frame the mesh first
renders and then walked vertex-by-vertex twice more by drei's `Center` and
`Resize`. `stripMorphs` in `MechSlots.tsx` gives the bay's clone a geometry
with the morph attributes left off; nothing in a bay drives one.

Phone, 4×, median of nine: entrance long tasks **184ms → 0**, whole-load long
tasks **244ms → 50ms**, worst frame in the band **192ms → 43ms**, frames drawn
in the band 60–75 → **84–88**.

Two smaller things shipped with it, and **neither is worth anything on a
phone** — a handset has one or two bays on screen and the cost there is the
face. On a 1512×900 desktop, where seven build, together they take the
entrance's remaining 65ms to none:

- **`Precise`** in `src/three/detail.tsx`. drei's `Center` and `Resize` both
  default to walking every vertex; a bay reads the geometry's cached bounding
  box instead. 49ms of the baseline task.
- **`BAY_DETAIL` 0.5 → 0.25.** Checked on screen against the old one and
  indistinguishable at bay size.

Five candidates were built behind a `?intro=` URL flag first, and the two this
file predicted would win did nothing at all. That comparison is the reason the
entry in **ruled out** below is as long as it is; read it before proposing any
of them again.

**The flag was never committed, and that was a mistake.** This page asked for
one deployment with `?intro=a` … `?intro=e` on it so the variants could be
compared on a real phone by editing the address bar, and said in as many words
that measuring picks the fastest and only looking picks the acceptable one.
What actually happened is that the variants were built, measured headless,
compared as desktop screenshots, decided, and deleted in the same working tree
— so **there is nothing in git to go back and look at**. The numbers in the
table above are real and reproducible; the *looking* half of the process was
skipped. If any of this needs revisiting, the variants have to be rebuilt from
the description in **ruled out** below, which is why that entry names each one
precisely enough to redo.

### 8. The load gate got a voice, and home stopped switching on twice

Two design calls off the old open list, done in the same pass. Neither is
worth milliseconds and both are what "the boot feels bad" also meant.

- **`MechWarming.tsx`.** The ~1.9s the gate already holds was black behind a
  bare grid. It now names the outstanding gate on a `Segment` — `TYPE`,
  `SYSTEM`, `ASSETS`, then `READY` — over a bar filling by how many of the
  three have cleared. **It adds no time and it is not a second gate**: mounted
  while the existing one is open, removed 420ms after `primed`, its own fade
  playing under a ripple that is already running. And there is no honest
  percentage to draw — `import()` reports no progress and `useProgress` does
  not exist until the chunk it is inside has landed — so the bar moves in
  thirds, which is three real readings rather than one smooth fiction.
- **`ignition.ts`.** `MechCluster` is home-only and a fresh mount every
  arrival, so every beat in `IN` ran again from zero. Second and later
  arrivals now play the same sequence at about a third — `AGAIN` for the
  timers, `--in-k` for the keyframes. Desktop 4×, from the cover: intro
  complete **2310ms → 277ms**, name **~2400ms → 512ms**. Module scope, so a
  reload is still a cold start, which is what a reload is.

  **The two typed lines were `speed={0}` here too and are not any more** — see
  item 12. Placing them meant coming home to a name that was simply *there*,
  which read as the effect having broken rather than as the machine being
  warm, and the typing is what people come back to look at. It costs what it
  costs now that the halos are off the typed text: the crossing home is
  ~200ms of dropped frames with both lines spelling out, against 583–751ms
  before any of this.

Full account in **The gate had no voice, and home switched itself on twice**
in `README.md`.

### 9. `mr-takahashi.glb` no longer ships

556KB, tracked, referenced only from `src/archive/`, which `App.tsx` does not
render — but `public/` is copied verbatim into `dist`, so Rollup dropping the
code did not drop the asset. It is `.gitignore`d now and untracked, alongside
`public/models/dance/` and `medieval-door.glb`, which were already handled
exactly this way and for exactly this reason. (This file used to say
`medieval-door.glb` was gitignored *and* that only a local `dist` was fat —
the first half was right and it is the whole mechanism.) The file stays on disk locally;
Vercel builds from a clone that does not contain it. `src/archive/` itself is
untouched — see `CLAUDE.md`.

### 10. The audit found a second unconditional preload

`Phone17.tsx` had `useGLTF.preload(SRC)` at module scope and `MechProduct.tsx`
imports it statically, so **724KB of handset was fetched on every page the 3D
chunk landed on** — Capsule C1's project screen, Mr. Takahashi's, and a phone's
home, where that bay is eight slots down a rail and may never be built at all.
Exactly the shape of item 5, found by running the audit item 5 asked for.

It also worked directly against the mechanism the bank is built on: a bay's
subject waits for an `IntersectionObserver` (`useNear`) so eleven models are
not requested at once, and a module-scope preload skips that gate by
construction. Deleted rather than gated — `useGLTF` inside the component
fetches on mount, which is when the thing is wanted, and is what every other
piece on this site does. Plus One's own screen is unaffected.

| phone, 4× | before | after |
|---|---|---|
| home | 3.3 MB / 3 files | **2.6 MB / 2** |
| `/p/capsule-c1` | 1.4 MB / 3 files | **0.7 MB / 2** |
| `/p/openup` | unchanged | unchanged |

`AdamFace.tsx` has the third and it is inert: nothing in the v3 build imports
it — only `src/site/products.tsx` does, and `App.tsx` renders `V3` alone, so
the module never evaluates. Worth knowing rather than changing.

```bash
grep -rn "preload(" src/    # the audit, in full
```

### 12. The halo and the typewriter — and Chrome's new rasterizer

**The fault reported as "it was fine yesterday", and it was.** Nothing in this
repo changed. **Chrome 152.0.7977.76 turned on Skia Graphite**, its
Metal/Dawn rasterizer, and a blurred `text-shadow` that had been free on the
old one is not free on the new one. Proved by flag, not by argument — same
binary, same build, same window:

```
  skia_graphite enabled_on    lost:2316ms   frames:160/300
  --disable-features=SkiaGraphite   lost:   0ms   frames:300/300
```

That is also why Safari was fine (never used Graphite), why a phone was fine
(a different GPU path entirely), why it appeared on a second machine the same
week (Chrome updates everywhere), and why resetting the Mac did nothing.

**What it costs, and why six investigations missed it.** A blurred shadow is
re-rastered whenever anything under it moves — the text changing, or the block
it sits in animating. Home's entrance lost **2116ms** to dropped frames against
**148ms** of long tasks: a **14:1 ratio**, so the main thread was idle for
almost all of it. Every earlier hunt measured the main thread and came back
clean, which is exactly what a GPU-side fault looks like from there.

**It was two elements.** `--g` is **5**, so the name's third term is a **779px**
blur radius and the intro paragraph's second is **120px** — and both lines are
*typed*, so each halo was redrawn once per character, 189 times for the
paragraph. Bisected with `headed.mjs --css`:

```
  baseline                        lost:2116ms  frames:172
  every shadow on the page off    lost:   0ms  frames:300
  .mech-profile halo off          lost: 284ms  frames:280
  both halos down to one term     lost:  67ms  frames:293
  the ripple (?ripple=b/c/d)      lost:2149-2250ms — unchanged, cleared a 7th time
  .mech-tach-col + gauges off     lost:1966ms  — 85 shadows, worth nothing
```

**The fix is not a glow budget.** A *settled* halo costs nothing at all — the
same window measured after everything lands is 0ms lost with every halo on. So
the halos simply wait for their line to stand still: `data-typing` in
`Typed.tsx` while characters are moving, `data-lit` on `.mech-cluster` until
the entrance's last beat, and the full stack the moment both are done. The
finished screen is pixel-identical to what it was.

```
  home load        2233-2482ms / 149-172 frames  ->  200ms / 287 frames
  home -> project  1350/1117ms / 188-203 frames  ->    0ms / 270 frames
  project -> home    583/751ms / 223-232 frames  ->  183/200ms / 257 frames

  and the return leg now *types* both lines, where before it placed them.
```

**The bloom: stepped for the paragraph, and a promoted layer for the name.**
Snapping three halos on at the frame the last character lands reads as a slap,
so they grow in — but a *transitioning* shadow is a moving shadow, which is the
whole cost. Animating the shadow itself is linear in redraws and never cheap:
steps(3) 301ms, steps(6) 417ms, steps(10) 949ms, steps(16) 1000ms, smooth
1083ms — against 318ms for no bloom at all.

**The name escapes that entirely by not animating a shadow.** Its two wide
terms moved onto `.mech-ident-full` — the full-name copy that was already in
the markup as the heading's sizer — which is `will-change: opacity` and faded
in. The blur is rastered **once** and the compositor does the rest, so a
*smooth* fade there costs **216ms, less than the 283ms of a three-step bloom on
the text and less than the 318ms of no bloom at all**. Promotion is worth 82ms
of that (216 vs 283 without `will-change`).

The intro paragraph has no such copy in the markup and keeps `steps(3, end)`;
its widest term is 120px against the name's 779px, so the stepping is far less
visible. Giving *it* a smooth transition instead costs 700ms — don't.

And the bloom is cut on `data-leaving`: letting the halos step *down* over the
exit took the crossing to a project from 35ms back to 966ms.

**The name's bloom came back out.** The 216ms opacity fade above measured
clean, but visually it read as overshooting past its final brightness before
settling — a look problem, not a cost one, and not one this harness measures.
Pulled as an experiment rather than chased further: the name now carries only
its 9px hot edge, no wide halo at all, and the page reads fine without one.
The numbers above stay accurate for if it comes back — don't re-measure the
same bisection to reinvent them.

### 11. Tooling fixed along the way

- **`serve.mjs` now answers Range requests.** It returned 200 with the whole
  body and ignored `Range`. Desktop Chrome tolerates that for `<video>`; **iOS
  Safari does not**. And because `mecha-station`, `openup` and `stitchfam` are
  pieces whose material *is* a video texture, a clip that never decoded was a
  **project subject that never appeared** — it read as three broken models.
  A bug in the harness impersonated a bug in the app.
- **`nav.mjs` counts draw calls** on the bank's context instead of reading DOM
  flags. It used to call itself "measured, not inferred" and was not: once `up`
  stopped carrying the crossing, the flags kept flipping and it kept reporting
  a freeze that had stopped happening. Note the class is on r3f's *wrapper*,
  not the canvas.
- **`npm run dev` starts again.** esbuild's dep pre-bundler cannot resolve the
  root-absolute `hls.js` alias and died before the server listened. Only bites
  on a cold dep cache, so it worked for weeks and then did not after an
  unrelated install. `optimizeDeps.exclude` in `vite.config.ts`.
- **The revolver is on an 85mm lens** instead of 18, which was a fisheye and
  read worst on a phone where the subject is largest.
- **`intro.mjs` reads long tasks as well as frame gaps**, medianed over N
  loads, banded, and reporting the **whole load** beside the band. That last
  column is what separated a fix from a relocation: three candidates emptied
  the entrance band and every one of them had simply put the stall somewhere
  else. A single load of this page spreads about two to one on the worst
  frame, so nothing here should be read off one run.
- **`frames.mjs` takes a path**, so a variant on a query string can be
  measured without editing the script.

---

## Ruled out — do not spend these again

### The boot ripple is not the boot's cost. Four findings.

`frames.mjs`, phone, 4×: 512 cells and the main thread holds a 17ms median
across all of it, with **one** frame over 33ms. Traced bucketed by thread with
the cells' `box-shadow` removed as a control: raster 1539ms → 1498ms, 2.7%,
inside noise. Three more attempts are in the history and all were reverted:
the `mask-image` (~3%), the cell count on narrow (the pitch *is* the effect —
a bigger cell reads as slower while taking exactly as long), and the two in the
next entry.

**The ripple is what is on screen when the entrance lands on top of it.** That
is the whole illusion, and it is why it keeps getting blamed.

### The entrance's worst frame — solved, and not by any of the five candidates

**This entry used to be open work and it is now done.** It is kept because
three of the five things proposed against it are still wrong, and two of them
look right in a measurement that only reads the entrance band.

The frame was one bay's first build, and the bay was Mr. Takahashi's. It was
**not** geometry: 47 morph targets over 113,502 vertices, packed into a
`DataArrayTexture` by three the frame the mesh first renders, and walked
vertex-by-vertex twice more by drei's `Center` and `Resize`, both of which
default to `precise` and apply every morph influence per vertex. `stripMorphs`
in `MechSlots.tsx` gives the bay's clone a geometry with the morph attributes
left off. Phone, 4×, median of nine: entrance long tasks **184ms → 0**, whole
load **244ms → 50ms**, worst frame in the band **192ms → 43ms**.

Full account, including the profile and the trap in cloning the geometry, in
**The intro stall was forty-seven faces nobody could see** in `README.md`.

**What was ruled out along the way, so nobody spends it again:**

- **Cheaper bay geometry** (`BAY_DETAIL` 0.5 → 0.25 → the floor) and **shared
  geometry** (memoising `RoundedBox`'s `ExtrudeGeometry` by its arguments) were
  the two this file predicted would win. On a phone they measured as **nothing
  at all** — 184ms against a 184ms baseline. `BAY_DETAIL` did ship at 0.25
  because on a *desktop*, where seven bays build instead of one, it is worth
  the last 65ms; the shared-geometry copy of drei's internals was deleted,
  because with the detail change in place it bought nothing.
- **Building behind the cover, building after the entrance, and dealing the
  bank later** all take the entrance band to zero and none of them removes any
  work. Whole-load long tasks: 254ms, 380ms and 380ms against a 244ms
  baseline. The first puts a 190ms frame into the ripple; the other two put a
  bigger one into the two seconds after the entrance. **A band-only reading
  cannot tell a fix from a relocation** — which is why `intro.mjs` reports the
  whole load next to the band.
- **One geometry build per animation frame** (a module-level rAF queue) and
  **gating `Track`'s per-frame `getBoundingClientRect`**: 264/188/198ms and
  256/230/284ms against a 243ms baseline. Both reverted, before any of the
  above.

**And frame gaps out of headless are half fiction.** A profile of the worst gap
in the entrance came back 46ms `(program)` and 29ms `(idle)` — three quarters
of a "frame" in which the main thread had nothing to do. Long tasks are main
thread by definition. `intro.mjs` prints both.

### The desktop crossings did not get worse — but see open item 1b

**Superseded in part.** The comparison below is sound and the conclusion —
nothing in the three commits moved the crossings — was confirmed later by
building four revisions and looking at them. What is wrong here is the
reasoning about `getBoundingClientRect`, which is corrected in item 1b: it is
not merely "not it", it is *nothing*, and the ceiling test that proves it is
recorded there.


Reported after the deploy: *"on desktop the performance has degraded going
from page to page — home to project is bad, project to home is bad, project to
project is fine."* The second half of that is a real and useful observation.
The first half is not what happened.

**Both builds were served side by side** — the deployed one (`2398cb5`) on
:8101 out of a second worktree, the new one on :8100 — and driven through the
same four crossings. Desktop, unthrottled, frames over 33ms:

```
                        old (2398cb5)   new
  project -> project         0            0
  project -> home            3            4
  home -> project            7            7
  project -> home (2)        4            2
```

Identical within the run-to-run spread, at 4× as well. **The crossings that
touch home have always been the expensive ones** — they are the two that mount
or unmount the instrument cluster, which is the largest block of DOM on the
site — and nothing in the three commits moved them.

Two things were ruled out chasing it, and both are worth not repeating:

- **`getBoundingClientRect` is not it, at 600 calls a second.** A profile of a
  crossing put it top of the JS list — 315ms of a 4.5s leg, doubling from the
  156ms an idle screen pays. It is drei's `<View>`: each of the ten mounted
  bays reads its own `.mech-slot-shot` rect once a frame to compute its scissor
  box. Patching a per-element per-frame cache in at the page level — the
  ceiling of any fix — changed **nothing at all** (6 frames over 50ms before
  and after). The reads are cheap because nothing between two views writes to
  layout; only the first of the ten forces anything.
- **`Track` was already once a frame.** It looked like it must be running ten
  times for the same reason `<View>` does, and a `document.timeline.currentTime`
  guard was written for it. Counted: 300 canvas reads over 300 frames, in both
  builds. The change was reverted — it bought a guard against a thing that was
  not happening.

**And the frame gaps themselves are headless artifacts.** Tracing the dropped
frames on both home legs shows 2–4ms of `UpdateLayoutTree` inside a 58–70ms
gap and nothing else: the main thread is *idle* for the whole of it. That is
trap 4, and it is the second time this page has been fooled by it. Whatever a
real machine is doing on those two crossings, this harness cannot see it — the
next step is a Performance recording taken on the machine that feels it, not
another candidate from here.

### There is already a loading gate. Do not add a second one.

`primed` in `Mech.tsx` holds the boot until `document.fonts` resolves and the
3D chunk is fetched and parsed, capped by `WARM_CAP` / `CHUNK_CAP`, so the
ripple gets an idle thread. It has a voice now (`MechWarming.tsx`, item 8) and
that voice **waits for nothing** — it is mounted alongside the existing gate
and removed 420ms after it opens. Anything put in *front* of that gate makes
the site strictly slower, whatever it looks like while it is doing it.

---

# Open work

## 1. Two open faults, and the desktop one is unexplained

Everything below was reported off a **deployed** build on the reporter's own
machines, and the harness in this folder reproduces **neither**. Read the
apparatus section at the end of this item before measuring anything: three of
the instruments used on 2026-09-04 were wrong, and two of them were wrong in
the direction of a confident false positive.

### 1a. A phone: the pixel intro, and nothing else

*"Everything runs smooth on mobile but the pixel intro effect, before any text
of my name and stuff comes in."* So the morph-target work (item 7) and the
crossings are **confirmed good on a device**, and what is left on a handset is
the boot ripple and only the boot ripple.

**Fill rate is ruled out, on the device, by looking.** `?ripple=a|b|c|d` was
shipped for exactly this (the four variants are still in `MechTiles.tsx` and
`Mech.css`): `a` is what ships, `b` drops the per-cell blurred `box-shadow`,
`c` drops the `mask-image` so the subtree can composite, `d` drops both.
Verdict after loading all four on the handset: **"all 4 perform about the same
on mobile."**

That is the sixth clearing of the ripple, and the first one that tested paint
rather than the main thread. The remaining candidates are what the ripple is
*on top of* — it is the only thing on screen while the 3D chunk parses and the
loading manager drains — which is the reading **the ripple is what is on
screen when the entrance lands on top of it** has always pointed at. The flag
can now be deleted; it did its job.

### 1b. A desktop: home's entrance staggers, and nothing here explains it

*"Home page with my name all big and stuff staggers, only when I load in the
home screen initially or go back to it. Only for desktop."* Mobile is smooth
on the same routes.

**It is not a regression.** Four builds were served side by side on the
reporter's own machine and compared by eye — `fd93bc2` (the last one
remembered as good), `8b7d960` (the first commit after it that touches any
code at all — `d77e77c`, `536c261` and `3cd5482` are documentation only),
`2398cb5`, and current `main`. **All four stagger identically.** The servers
were verified to be serving four distinct builds (four distinct entry hashes;
only `main`'s carries `data-ripple` and `MechWarming`), so this is a real
comparison and not four copies of one thing.

So the fault predates every commit on this page's **Done** list, and "it
started yesterday" is not what happened.

**What it is not, each measured on the machine that has the fault:**

| tried | result |
|---|---|
| `--in-k` forced from 0.35 back to 1 (undo `ignition`'s compressed entrance) | 51.2fps vs 49.5 baseline — **no** |
| name's third halo 130 → 45 units | 54.4 vs 50 — partial, and see below |
| name's third halo removed outright | 54.1 — partial |
| `will-change: opacity` on the entrance's four blocks | 48.3 — **no** |
| `will-change: opacity, transform` on the same four | 54.6 — partial |
| **blur cap + promotion together, built and looked at** | **still staggers** |
| `--g: 0`, every glow on the site off | **59.8 / 60.2fps, zero frames over 33ms** |

**And the glow is not the answer, however that last row reads.** A phone
renders the same glows and is smooth. Removing the largest paint on the page
buys back enough budget to hide the fault; it does not identify it. The one
change built from that reading — the 130 → 45 blur cap plus the four promoted
blocks — was served alongside the baseline and **staggers exactly the same**.
Do not re-derive the glow from the `--g: 0` number; it is a real number and a
false lead, and this entry exists to stop it being found a third time.

**Zero long tasks in every condition above — superseded below.** True under
the conditions tested (headless/CDP profiling of specific CSS changes on the
reporter's machine). Not true in general: see the next section, where the
same fault, measured with a real `PerformanceObserver` on a real focused tab,
shows real long tasks. The difference was the instrument, not the machine.

**Solved, 2026-09-04 (second pass). It is not render count, not the ripple,
and it is not glow-adjacent at all — it is model-build cost, landing in a
burst.**

The reasoning above ("eight scene renders a frame against two") was never
actually tested — the `display: none` control that was supposed to test it
was invalid (see the paragraph this replaces). Retested properly this time,
plus two things nobody had tried yet: watching real `longtask` entries on a
genuinely focused tab, and skipping individual bank subjects to see which one
the cost belongs to.

**New tooling, committed, because headless cannot see this fault at all (see
above) and the reporter's own machine is the only thing that can.**
`src/v3/diag.ts` is a `?diag=` flag family that writes to a small fixed
on-page panel instead of the console, because a fixed panel is the one thing
that survives being screenshotted or watched live without a devtools pane
open:
- `?diag=fps` — a rolling one-second frame-gap window, plus a
  `PerformanceObserver` on `longtask` entries, each logged with its duration
  and start time. Says `tab hidden — rAF suspended` outright rather than
  reading a background tab as a smooth 60fps — **Chrome fully suspends
  `requestAnimationFrame` on a backgrounded tab**, confirmed live while
  building this: an automated browser session driving the tab through the
  extension is backgrounded by definition, so this fault (and item 5's) can
  only ever be measured on a tab a person is actually looking at.
- `?diag=leaders` — instruments `fitCards`/`aimLeader` for item 5, unrelated
  to this item; see its own section.
- `?bank=off` in `MechSlots.tsx` — forces the bank canvas's `frameloop` to
  `'never'` without hiding or unmounting it, which is the control the
  `display: none` attempt above should have been.
- `?skip=<slot id>[,<slot id>...]` in `MechSlots.tsx` — keeps one or more bank
  subjects from ever building (their GLB is never fetched, their `Slot` never
  renders), to find out which subject's build cost a long task belongs to.

**Measured live, real Chrome, real focus, both on `localhost` and on the
deployed site — same shape both places:**

```
  baseline              3 long tasks, 62–197ms, clustered ~t=2.6–3.6s
  skip mr-takahashi      2 long tasks, similar total — smaller, not gone
  skip capsule-c1        2 long tasks, similar total — smaller, not gone
  skip both together      1 long task, ~130ms — smaller again, not gone
  skip all 3 (+mecha-station)   0 long tasks in the window — clean
```

`mr-takahashi`, `capsule-c1` and `mecha-station` are the three bank subjects
that sit in the initial (unscrolled) view of the rail. `mr-takahashi`
(`adam-face.glb`) and `capsule-c1` (`capsule-c1.glb`, Draco) each cost a real
GLB decode; `mecha-station` is a primitive piece and pays `RoundedBox`'s
`toCreasedNormals` instead (the same mechanism PERFORMANCE.md's item 7 fixed
for the *bay*-sized version of this exact cost — this is that cost's sibling,
on the three subjects that happen to be near on first paint, not on one
subject with 47 morph targets). `useNear`'s `IntersectionObserver` fires for
all three within the same short window because they are all visible at once,
so their build costs land together instead of spread out — that is the
"burst," and it is what a long, unbroken 350ms-ish main-thread block actually
is: three separate ~60–200ms jobs with no idle time between them.

**Two things were tested and directly ruled out, at the user's own request,
because the ripple was the standing suspicion:**

- `?ripple=d` (an existing flag from item 1a — strips the ripple's blur *and*
  its mask, the two paint costs that flag family was built to isolate) —
  long tasks unchanged, same window, same count.
- The ripple (`MechTiles`) *and* the loading readout (`MechWarming`)
  **removed from the code entirely** — both imports and both render calls
  commented out, rebuilt, reserved on `localhost`, watched live. Long tasks
  still present in the same window, just smaller in total (2 tasks instead of
  3) because there is genuinely less on the page competing for the thread.
  **The ripple is not the cause of this fault either** — it is, again (see
  the "what is on screen when the entrance lands on top of it" framing
  earlier on this page), the thing that is visibly happening at the same
  moment, which is why it keeps getting blamed. `MechWarming` is not new
  enough to be a "since yesterday" regression either — it predates this
  investigation and the four-build regression check above already covered it.

**Viewport width is also ruled out, which matters because it is the
difference between "desktop" and "the reporter's own report."** Chrome
resized to 420×900 (phone width) on the reporter's own machine staggers just
as badly — worse, in one run (583ms worst frame against 317ms at desktop
width). So it is not "eight bays near vs one or two"; at narrow width the
same three subjects are still near (the rail scrolls, but the initial view is
similar), and the same build cost still lands.

**So why is Safari fine and Chrome is not, on the same machine, the same
subjects, the same code?** Not measured directly yet — the working theory is
that this is a GLB-decode/geometry-build cost running through WASM
(Draco for `capsule-c1`, meshopt for `adam-face.glb`) plus JS
(`toCreasedNormals` for the piece), and V8's and JavaScriptCore's WASM/JS
performance for this specific work are not identical. Worth confirming with
a real profile on both engines before assuming it; not done here.

**Superseded, 2026-09-04 (third pass) — the model builds were real and were
not the fault.** See item 12 in **Done**. Measured with `headed.mjs`, the
entrance loses ~2100ms of frames against ~150ms of long tasks; the model
builds are most of that 150ms and none of the other 1950ms. `?skip=` did shrink
the long tasks, which is why it read as the answer — it was measuring the
tenth of the problem the main thread can see.

**Do not build the staggered `useNear`.** It was the next step proposed here
and it would have bought about 150ms of a 2100ms fault, at the cost of
complicating the one mechanism the bank's whole memory story rests on. The
fault was two blurred `text-shadow`s and Chrome's new rasterizer.

### The apparatus was wrong three times on 2026-09-04

Written down because all three produced clean, confident, wrong numbers.

- **A leak that was not there, twice.** Home was measured as gaining six and
  then eight live `requestAnimationFrame` loops per visit — 8 → 16 → 24 → 32.
  The first counter counted *requests minus runs*, so every **cancelled**
  frame (a callback that by definition never fires) read as a leak. The second
  counted fires but the tally was never reset between windows, so it counted
  its own accumulation. Correctly instrumented: **8.0 loops a frame, flat over
  six round trips**, with listeners, nodes and contexts all stable. There is
  no leak.
- **A control that controlled nothing.** `display: none` on a WebGL canvas,
  above.
- **`getBoundingClientRect`, 600 calls a second, worth nothing.** It profiled
  top of the JS list on any crossing (315ms of a 4.5s leg). It is drei's
  `<View>`: each mounted bay reads its own `.mech-slot-shot` rect once a frame.
  A per-element per-frame cache was patched in at the page level — the ceiling
  of any possible fix — and changed **nothing at all**. Only the first read of
  the ten forces a layout; the rest are cheap because nothing between two
  views writes to layout. A `Track` guard was written for the same suspicion,
  measured (`Track` was already once a frame, in every build), and reverted.

### And headless cannot see this fault at all

`scripts/perf/` holds 59fps through every crossing, at 4× throttle and at
none, at 1512×900 **and at the reporter's own 2560×1262 at dpr 2**. The
machine that has the fault reports **46–50fps on home with four stalls over
100ms**. Everything in this folder is still right about main-thread
milliseconds and bytes; it is blind to whatever this is.

Measuring in the reporter's own Chrome works and is worth the trouble
(`mcp__claude-in-chrome__javascript_tool`, a `requestAnimationFrame` gap
recorder), with one hard constraint: **Chrome does not animate a background
tab**, so every reading taken while the tab was not frontmost came back as
zero frames or as nonsense. A probe there must wait on
`document.visibilityState` rather than assume it, and the person has to be
looking at the tab. Four builds on four ports, compared **by eye**, produced
the single most useful result of the day.

## 2. The subject's hitbox on a phone — **found, fixed, and it is a route**

*Was: reported, not diagnosed.* "Shooting Mr. Takahashi only registers on his
forehead." It reproduced on **one route only** — home first, then open the
project. A direct load of `/p/mr-takahashi` was always correct, which is why
the arithmetic looked right every time it was checked.

`useStageSpace` in `Mech.tsx` reads `stage.current` in an effect whose deps are
`[stage, probe, narrow]`. **A ref is not a dependency.** Home does not mount
`.mech-stage` until something has been opened (`stageOpened`), so on that route
the effect ran once against `null` and never again, and `space` stayed at the
wide `FRAME_SPACE`. `boxOf` then returns the wide `MODEL_BOX` (769, 269,
403×529) scaled by 390/1920 — a 98×123 box over the top centre of a 390×410
stage. That is the forehead, to the pixel. It was placing the picture's marks
as well as the hitbox.

`stageUp` is passed in and added to the deps, so the measurement runs on the
commit that puts the stage in the tree.

Measured with a tap grid dispatched through CDP (`Input.dispatchTouchEvent`,
phone, 9×9 over the stage, hit counted off the `.mech-impact` node the gun
appends):

```
  home → Takahashi        direct load of /p/mr-takahashi
  before      after       before = after
  mmmHHHmHm   mHHHHHHHH   mHHHHHHHH
  mmmHHHmmm   mHHHHHHHm   mHHHHHHHm
  mmmHHHmHm   mHHHHHHHH   mHHHHHHHH
  mmmHHHmmm   mHHHHHHHm   mHHHHHHHm
  mmmmmmmmm   mHHHHHHHm   mHHHHHHHm
  mmmmmmmmm   mHHHHHHHm   mHHHHHHHm
  …           …           …
```

**The lesson is the route, not the box.** Every check this page had already
done — logging `rect()` against the stage's rect, overlaying the computed box
on a screenshot — was done on a direct load, where nothing is wrong. A bug that
only exists on the way *in* from another screen cannot be found by loading the
screen it shows up on. Full account in **The gun** in `README.md`.

## 3. `adam-face.glb` has 8-bit normals — **blocked on a re-export**

It stores normals as `i8 normalized` — 8 bits per axis, base mesh plus all 47
morph targets, from a `gltfpack -vn 8` default. It is the only model in the set
with quantized normals, which is why the artifact is on Mr. Takahashi and
nowhere else, and it shows as **faceted specular on the cheeks** — a different
defect from the jagged edges item 4 fixed, and easy to confuse with them.

The precision is gone from the file, so it needs a **re-export at `-vn 16`**,
not a re-pack. `computeVertexNormals()` was tried: it fixes the hair, facets the
cheeks and hardens the UV seams. Reverted. `mr-takahashi.glb` is not a drop-in
replacement — 2,781 verts against 113,502, and differently named morphs
(`LookUp`/`LookDown` where the code writes `HorizontalLook`/`VerticalLook`).

It is also the single heaviest thing home fetches — **2.2 MB of the 2.6 that
is left**, now the phone preload above is gone — so a re-export is worth
pairing with a meshopt pass.

**Confirmed against the file, so nobody has to look again.** Every accessor,
counted out of the glTF JSON:

```
  NORMAL          i8  normalized  × 16 primitives
  POSITION        i16 normalized  × 16
  TARGET NORMAL   i8  normalized  × 47
  TARGET POSITION i16 normalized  × 47
```

There is nothing in the file to recover — eight bits per axis is what was
written. This is **blocked on the Blender source**, not on anything in this
repo, and it is the only item on this list that is.

## 4. A project's leader lines, unpainted in Safari — **found, fixed, and unrelated to item 1b**

*Reported as: "labels are all old looking like the lines don't connect,"
alongside item 1b's desktop stagger.* **These are two different faults on two
different browsers, and only this one is closed.** Chrome was never wrong
here. Safari was, and only Safari.

On a first, cold Safari load — confirmed independently on an unrelated
machine, first visit, nothing cached — roughly a third of a project screen's
leader lines never reached their card: the mark on the picture drew, a short
stub of line drew next to it, and the card sat with nothing connecting to it.
The other leaders on the same screen were fine. Reloading sometimes cleared
it, sometimes didn't.

**Every plausible cheap explanation was checked and ruled out first,** because
a bug reported alongside a real, unrelated one (item 1b) is exactly how two
faults get diagnosed as one: not a stale CDN or service worker (this app has
none, and `curl` with a Chrome and a Safari user-agent returned byte-identical
HTML from the edge); not a leftover browser extension (reproduced on a
completely different machine with none installed); not `localStorage` tuning
overrides (reproduced on a first-ever visit, nothing stored yet).

**The measurement trap this cost a first wrong answer to.** `fitCards` in
`Mech.tsx` corrects a leader's line after the card's real size is known —
see **The leaders** in `README.md` — and the first read said the correction
was landing fine: `card.getBoundingClientRect()` and the line's own
`getBoundingClientRect()` agreed to within a few pixels, matching Chrome.
That check was wrong in a specific way: a `<line>`'s bounding box reports
whichever end has the smaller x/y, which for a short, broken line is the
*mark* end, not the corrected end — so the check was quietly comparing
mark-to-card distance and calling it fine. Redone by transforming the line's
actual `x1,y1` through the SVG's own `getScreenCTM()` into real screen
coordinates, the gap was real: correct immediately after mount, then
measurably wrong by the time everything had settled.

**Root cause, found by killing one variable at a time** — each of these five
was tried and measured, and none of the first four changed anything:
reordering `fitCards`'s passes, killing the per-frame ancestor `transform`
mutation the labels ride on (`useRide`), bypassing the `--l` custom property
that drives the line's `stroke-dasharray`/`dashoffset` and setting those
properties directly, forcing a layout flush right after the correction. The
fifth did: forcing a *hard* repaint (toggling the card's containing element
out of and back into `display` to make Safari tear down and rebuild
whatever layer it had) still did nothing — but removing the card's own CSS
`animation` entirely made every leader connect, every time. Isolating further:
it was never the `scale()` in `mech-card` specifically — a plain opacity fade
with no transform at all reproduced the same broken lines. **Any active CSS
animation on the card, regardless of what it animates, is enough.**

The working theory: an active animation promotes `.mech-leader-card` to its
own compositing layer in Safari. `fitCards`'s correction can land after that
layer already exists — the animation has its own delay, and on a slow first
load fonts and the correction can resolve after that delay has elapsed — and
once the layer exists, the *sibling* `<line>` in the same SVG `<g>` stops
painting the corrected position, even though its own attributes and computed
`stroke-dasharray`/`dashoffset` read back correctly the entire time. That last
part is inference, not something proven line by line inside WebKit — what is
proven, repeatedly, is that removing the animation removes the symptom and
nothing short of that does.

**The fix is Safari-only.** `LEADER_CARD_INSTANT` in `Mech.tsx` skips
`mech-card`'s open-from-corner entrance on Safari specifically — the card
still arrives with the rest of its leader's cascade, just without the pop —
and leaves Chrome's animation untouched, confirmed by reading
`getComputedStyle(card).animationName` back on both. There was no cost found
to imitating this more broadly; it wasn't tried, because Chrome was never
broken and the entrance is worth keeping wherever it isn't.

**That fix traded the disconnected line for a visible jump on a switch, and
item 5 below is that fault, still open.**

## 5. A label jumps on switch, in Safari — **reported, one fix tried, confirmed not to work**

*Reported after item 4 landed: "labels are fixed and connect now, but when I
change from project to project or image to image (or video or model) the
label jumps to another part of the screen."* Safari only, every reload
tried, and **never on a first load** — the fault in item 4 was closed by
checking exactly that. This is a switch-only fault the fix above does not
reach.

**One fix was tried and the report says plainly it did not work — do not
re-try it as if it were new.** The reasoning was specific: item 4's fix
(`LEADER_CARD_INSTANT`) reveals the Safari card at `opacity: 1` the moment
`fitCards` mounts, in place of `mech-card`'s animation, which is what
removed the stale compositing layer that broke the line. But that also means
the card is visible from the very first frame, at whatever position
`fitCards` has computed *by then* — normally already right, but if a later
pass (most often `fonts.ready`, correcting a metrics guess taken before a
font had actually loaded) corrects it afterward, that correction now has a
fully visible card to move, with nothing left to hide the move inside — a
theory that fit the symptom (worse on a switch, when more is competing for
the main thread than on a quiet first load) and fit why Chrome never showed
it (its card is usually still mid-fade at the point a correction lands).

The fix that reasoning implied — `aimLeader` in `Mech.tsx` now sets
`card.style.opacity = '1'` itself, directly, the first time it has actually
corrected that card's position, instead of `mech-card`'s timer revealing it
on a schedule blind to whether the position is right yet — is **already in
the tree** (see the `LEADER_CARD_INSTANT` comment and `aimLeader`'s last
line). It did not fix the jump. Reported back after testing: still jumps.

**So the theory above is wrong, or incomplete, and that is the real
starting point here — not a fresh guess.** Two things worth knowing before
re-diagnosing:

- **It was never click-verified while it was being written.** The Chrome
  extension used for item 4's whole investigation disconnected partway
  through (repeated reloads across many tabs — see item 1b's own apparatus
  notes for the same class of problem), and this tool has only screenshot
  access to Safari, never the ability to click or drive it. The fix shipped
  on the strength of the mechanism reasoning above, not on watching a
  switch happen and confirming the jump was gone. That gap is very likely
  *why* it turned out wrong — a click-verified iteration loop would have
  caught this before it was called done.
- **The tooling from item 4 is the fastest way back in**, and none of it is
  Safari-specific: a disposable `git worktree` (`git worktree add --detach
  <path> HEAD`, symlink `node_modules` in, `npm run build`, serve `dist/`
  with `PERF_PORT=<port> node scripts/perf/serve.mjs`) keeps experiments off
  the working tree; an on-page diagnostic panel (plain DOM element, styled
  fixed-position, written to with `element.textContent`) reports state as
  *readable text* rather than requiring a live console, which is what makes
  it checkable from a screenshot when Safari can't be driven. Item 4's
  biggest wasted round-trip was trusting `getBoundingClientRect()` compared
  against a bbox corner instead of the line's own transformed `x1,y1` (via
  `svg.getScreenCTM()`) — re-read that section before building a new
  measurement, the same mistake is easy to repeat.
- **A real interaction is required to reproduce this one.** Item 4's fault
  showed on a first load, reachable by a plain URL. This one is switch-only,
  which means either a live person clicking through it in Safari with the
  diagnostic panel on screen, or getting the Chrome extension reconnected
  and using it to drive Chrome through the same switch while comparing
  against what Safari does — Chrome not reproducing the jump is itself
  data, not a reason to skip instrumenting it there too.

---

**One fault is understood now and one is still open, on two different
browsers.** Everything under **Done**, plus item 4, is measured and closed.

**Item 1b**: **closed, 2026-09-04 (third pass) — see item 12 in Done.** It is
two blurred `text-shadow`s being redrawn once per typed character, under a
rasterizer Chrome switched on the day before it was reported. The account
below is the second pass and is kept because its *method* was right and its
conclusion was not: it isolated real model-build cost with `?skip=` and then
read a tenth of the fault as the whole of it, because every instrument it had
watched the main thread. Superseded, not deleted.

**Item 1b, second pass**: **found, 2026-09-04.** Not a regression, not
render count, not the ripple, not `MechWarming`, not glow, not viewport
width. It is three bank subjects (`mr-takahashi`, `capsule-c1`,
`mecha-station`) all becoming "near" and building — a real GLB decode or a
real `toCreasedNormals` pass each — inside the same second, on a real
focused tab with real `longtask` entries proving it (`?diag=fps`), confirmed
by isolation (`?skip=`): remove all three and the fault is gone; remove any
one or two and it only shrinks. Reported as Chrome-only (Safari's fine on
the same machine); not yet confirmed why, but likely V8 vs JavaScriptCore on
the WASM/JS decode work rather than anything about desktop vs phone as
such — a resized narrow Chrome window staggers too. **Not yet done: the
actual fix** — stagger when each near bay's build fires instead of letting
`IntersectionObserver` release all three at once.

**Item 5**: a Safari label jumping on a project or media switch, closed line
connection notwithstanding. One fix tried against a specific, reasoned
mechanism; reported back as not working. Needs a live, click-driven
reproduction — in Safari by a person, or in Chrome by the extension — before
the next fix is anything more than another guess.

A page of green numbers next to a machine that still feels wrong is the exact
failure this file was written to stop. It happened again on 2026-09-04, three
times in one day, and the three bad instruments are written up in item 1b so
the next round starts by distrusting the apparatus rather than the report.
