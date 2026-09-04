# Performance: what has been done, and what is next

**This file is a handoff.** It is written for whoever picks the work up next,
human or model, and it assumes you have not seen any of it before. Everything
below is either **done** and says what it bought, **ruled out** and says why
not to spend it again, or **open** and says exactly what to change.

Last worked 2026-09-04, against `main`. `README.md` explains *why* the code is
the shape it is; this file says how fast it runs and what is left.

**The one instruction: re-measure before you change anything.** The scripts in
`scripts/perf/` are the whole apparatus. This page has been wrong repeatedly,
always the same way — *the most conspicuous thing on the screen is not the
expensive thing on the screen.* The boot ripple has now been blamed and
cleared **five** times — the last one was the intro stall, which turned out to
be forty-seven morph targets on a face seventy-five pixels tall.

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

node scripts/compress-models.mjs --dry        # what the GLBs weigh
```

`phone` is 390×844 at dpr 3, under `narrow`'s 700px breakpoint; `desktop` is
1512×900 at dpr 2. The second argument is the CPU throttle. Each script's
header says what question it answers and what its trap is.

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

Cold load, phone at 4× throttle. *Before* is one run; *after* is the median of
four, which spread 1603–1675ms at the cover.

```
             before        after
  mounts       411ms         227ms
  ripple       632ms         440ms
  COVER       3382ms        1643ms
  intro       4080ms        2280ms
  INTRO-DONE  6080ms        3903ms   ← home settles 2.2s sooner

  long tasks  6 / 2029ms    1 /   50ms     ← main thread busy, −98%
  worst task     1531ms         50ms
  models         12.0 MB       3.3 MB
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

### 8. Tooling fixed along the way

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

### There is already a loading gate. Do not add a second one.

`primed` in `Mech.tsx` holds the boot until `document.fonts` resolves and the
3D chunk is fetched and parsed, capped by `WARM_CAP` / `CHUNK_CAP`, so the
ripple gets an idle thread. What it lacks is a *voice* — see item 3.

---

# Open work

## 1. Give the existing load gate something to say

1.9s is already being spent on black behind a bare grid, which reads as a
broken site rather than a loading one. A progress readout in the machine's own
idiom — a percentage on a segment display, a filling bar — dresses time that is
already going by. The inputs exist: `Warmth.tsx` subscribes to drei's
`useProgress`, and `heavy` / `fonts` / `quiet` in `Mech.tsx` are the gates.
**Do not add a second gate in front of the existing one**; that makes the site
strictly slower.

## 2. Home replays its entrance in full on every arrival

`MechCluster` is home-only, so returning home is a fresh mount and every beat in
`IN` runs again from zero — the dials sweep their whole range, the name types,
the intro types all 190 characters. A machine that has already been switched on
should not switch on again. A session flag giving second and later arrivals a
compressed entrance (beats at about a third, text placed rather than typed) is
the fix. Design call; worth doing alongside item 1 so both can be looked at once.

## 3. `adam-face.glb` has 8-bit normals

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

It is also now the single heaviest thing home fetches, 2.2 MB of 3.3, so a
re-export is worth pairing with a meshopt pass.

## 4. Loose end: `mr-takahashi.glb` ships and is unreachable

556 KB, tracked, referenced only from `src/archive/`, which is out of the build
— but `public/` is copied verbatim, so Rollup dropping the code does not drop
the asset. `public/models/dance/` (9.3 MB) and `medieval-door.glb` are the same
shape of problem but are **gitignored**, so Vercel builds from a clone that does
not contain them and only a local `dist` is fat. Deploy weight only, and not
much of it. `src/archive/` itself must stay — see `CLAUDE.md`.
