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
cleared **four** times.

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

  long tasks  6 / 2029ms    2 /  271ms     ← main thread busy, −87%
  worst task     1531ms        214ms
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

### 7. Tooling fixed along the way

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

### The entrance's worst frame is one subject's build, not scheduling

Two mechanisms were tried against the ~240ms frame and **neither moved it**:

- **One geometry build per animation frame** (a module-level rAF queue in
  `MechSlots`): 264/188/198ms against a 243ms baseline. The note in that file
  says builds "queue up nose to tail", which reads like several landing
  together — but `arrive` *already* staggers them 55ms apart, so the queue
  rarely holds more than one. **It is one build that is itself a quarter of a
  second**, not several colliding.
- **Gating `Track`'s per-frame `getBoundingClientRect` on the ripple being
  gone**: 256/230/284ms. A whole-load CPU profile puts that call second in self
  time (354ms), which is what made it look promising.

Both are reverted. What the frame actually is, from a profile bucketed to the
busiest 300ms rather than averaged over the load:

```
  47ms  15.5%  r                     three.module  (toCreasedNormals)
  56ms  ~19%   getX / getY / getZ    three.module  (BufferAttribute reads)
  25ms   8.4%  fromBufferAttribute   three.module
  19ms   6.2%  getProgramInfoLog     (first shader link)
  16ms   5.3%  texSubImage3D         (first texture upload)
   9ms   2.9%  getVertexPosition     (Box3.expandByObject)
```

**Only making that work smaller or moving it off the entrance will help.**
Scheduling it differently will not. That is open work, and it is item 1 below.

### There is already a loading gate. Do not add a second one.

`primed` in `Mech.tsx` holds the boot until `document.fonts` resolves and the
3D chunk is fetched and parsed, capped by `WARM_CAP` / `CHUNK_CAP`, so the
ripple gets an idle thread. What it lacks is a *voice* — see item 3.

---

# Open work

## 1. The intro stall — **build several, deploy them, pick one**

**This is the priority, and the way it is to be done is not "pick the best fix
and ship it".** Build the candidates below so they can all be seen on a real
phone against each other, deploy that, and decide from what it looks like.
Measuring will tell you which is fastest; only looking will tell you which is
acceptable, and every one of these trades something visible.

### What the defect is

`frames.mjs` puts a **~240ms frame** in the entrance band on a phone. It lands
while the ripple is still on screen — the ripple runs to ~2320ms, the cover
lifts at ~1650ms — so what a person sees is *the intro animation stopping dead
partway across and then completing*. That is the reported symptom and it is
real; the ripple is the victim, not the cause.

The cost is one bay subject being built for the first time: `toCreasedNormals`
over a bevelled solid, `Box3` expansion, a first shader link, a first texture
upload. `arrive` already staggers builds 55ms apart, so this is a single item.

### How to ship the comparison

**One deployment, not four branches.** Put the variant behind a URL flag read
once at boot — `?intro=a`, `?intro=b`, … defaulting to today's behaviour — so
the same build can be compared on the same device by editing the address bar.
Branches would mean four Vercel URLs, four cold caches and no way to A/B on one
phone. Read it in `Mech.tsx`, thread it to `MechSlots`, and keep the whole thing
behind one exported const so it is one commit to delete afterwards.

Report, for each variant: `frames.mjs phone 4` entrance band (worst, >33ms
count), `boot.mjs` COVER and INTRO-DONE, and a screenshot of a bay at rest.

### The candidates

**A — cheaper bay geometry.** `BAY_DETAIL` in `MechSlots.tsx` is `0.5` and
multiplies drei `RoundedBox`'s `smoothness`/`bevelSegments` through
`src/three/detail.tsx`. Take it to `0.25`, and separately to `0`. At a
75-pixel bay the bevel is a few pixels; the question is only whether the
silhouette survives. **Cheapest to try, least visual risk, try it first.**

**B — share the geometry.** `toCreasedNormals` runs per instance, and the
bays repeat: `DiscHolder`, `PosStation`, `Phone3D`, `WyteCard` and
`VideoFrame` between them build 35 `RoundedBox`es. Memoise by
`args + smoothness + bevelSegments` in `detail.tsx` and hand the same
`BufferGeometry` to every box that matches. **Zero visual change if it works**,
which also makes it the one to verify hardest — check a bay is pixel-identical.

**C — build behind the cover.** The boot already holds ~1.6s with the cover
down and the thread mostly idle (`primed`). Build the bays' geometry *there*,
before the ripple starts, instead of after it. Extend the existing gate rather
than adding a second one — see *ruled out*. Risk: it lengthens the cover, so
measure COVER, not just the frame.

**D — do not build during the entrance at all.** Hold every bay subject until
the entrance has settled (the name finished typing), so the boxes deal in empty
and the subjects arrive after. Honest about the trade: it moves the cost
somewhere quieter rather than removing it, and the bank is visibly late.

**E — de-collide by timing.** Move the bank's deal to after the typing settles.
`PERFORMANCE.md` has proposed this twice and it has never been tried because it
is a choreography change and therefore a design call. It is on this list so it
can be *seen* alongside the others rather than argued about.

A and B are the two that could be strictly free. C, D and E all trade
something. Expect the answer to be A+B together.

## 2. Give the existing load gate something to say

1.9s is already being spent on black behind a bare grid, which reads as a
broken site rather than a loading one. A progress readout in the machine's own
idiom — a percentage on a segment display, a filling bar — dresses time that is
already going by. The inputs exist: `Warmth.tsx` subscribes to drei's
`useProgress`, and `heavy` / `fonts` / `quiet` in `Mech.tsx` are the gates.
**Do not add a second gate in front of the existing one**; that makes the site
strictly slower.

## 3. Home replays its entrance in full on every arrival

`MechCluster` is home-only, so returning home is a fresh mount and every beat in
`IN` runs again from zero — the dials sweep their whole range, the name types,
the intro types all 190 characters. A machine that has already been switched on
should not switch on again. A session flag giving second and later arrivals a
compressed entrance (beats at about a third, text placed rather than typed) is
the fix. Design call; worth doing alongside item 1's deployment so both can be
looked at once.

## 4. `adam-face.glb` has 8-bit normals

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

## 5. Loose end: `mr-takahashi.glb` ships and is unreachable

556 KB, tracked, referenced only from `src/archive/`, which is out of the build
— but `public/` is copied verbatim, so Rollup dropping the code does not drop
the asset. `public/models/dance/` (9.3 MB) and `medieval-door.glb` are the same
shape of problem but are **gitignored**, so Vercel builds from a clone that does
not contain them and only a local `dist` is fat. Deploy weight only, and not
much of it. `src/archive/` itself must stay — see `CLAUDE.md`.
