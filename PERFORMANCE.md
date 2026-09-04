# Where the performance work is up to

Written 2026-09-03, against `main` at the point v3 went live, and worked
through the same day. This is a **ledger**, in the same spirit as `PLAN.md`:
everything below is either *measured* and says so, *ruled out* and says why,
*done* and says what it bought, or *open* and says what to change.
`README.md` explains why the code is the shape it is; this file says what is
known to be wrong with how fast it runs.

**Items 1 to 4 are done and re-measured**; their sections below now record
what changed and what it was worth, and they stay here rather than being
deleted because the reasoning is the part worth keeping. **Items 5 and 6 are
still open**, and item 6 is deliberately only half-done — see its note.

**The one instruction.** Three of the items below are worth more than the
other three combined, and the ordering at the bottom is not a suggestion. But
before changing any of it: **re-measure first, with the scripts in
`scripts/perf/`.** This page has already been wrong twice — the boot ripple
has been blamed for the boot's cost three separate times and found innocent
three separate times — and the reason it keeps happening is that the most
conspicuous thing on the screen is not the expensive thing on the screen.

---

## Ground truth

### `npm run dev` is not what to measure

Vite serves unbundled ES modules and every one of them is a request; the boot
is visibly worse there than in a build and always will be. Every number in
this file was taken off `dist/` served by `scripts/perf/serve.mjs`. If a
measurement disagrees with one here by more than about 15%, check that first.

### The GPU under these numbers is the wrong GPU

`--headless=new` on a Mac gets the real GPU, which is what makes the raster
figures worth quoting at all — but it is an M-series GPU, ten to thirty times
a handset's. **Resolutions, sample counts, bytes and main-thread
milliseconds transfer to a phone. Fill rate and raster do not.** Anything
that turns on how expensive a fragment is has to be checked on the actual
device over the tailnet (`npm run dev`, then the `.ts.net` address vite
prints — see `README.md`).

### Frame *counts* out of headless Chrome are junk

The gaps come back as `STEP_BUFFER_SWAP_POST_SUBMIT` on `CrGpuMain`, a
presentation artifact. Quote frame *durations* off the main thread. This was
established earlier by comparing dsf 1 against dsf 2 and finding the
difference inside the noise.

---

## How to run any of this

```bash
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
node scripts/compress-models.mjs              # Draco + WebP, in place
```

`phone` is 390×844 at dpr 3, which is under `narrow`'s 700px breakpoint;
`desktop` is 1512×900 at dpr 2. The second argument is the CPU throttle. Each
script's header says what question it answers and what its trap is.

`serve.mjs` **does not compress**, so JS reads about 3.5× its real transfer
size. Models and video are already-compressed formats and transfer honestly,
which is the half these are usually pointed at.

---

## Measured: the cold first load, on a phone

390×844 dpr 3, 4× CPU throttle, cold cache, `boot.mjs`. Before, and after
items 1 to 4:

```
             before        after
  mounts       411ms         227ms
  ripple       632ms         440ms
  COVER       3382ms        1643ms
  intro       4080ms        2280ms
  INTRO-DONE  6080ms        3903ms   ← home settles 2.2s sooner

  long tasks  6 / 2029ms    2 /  271ms     ← main thread busy, −87%
  worst task     1531ms        214ms
  models         12.0 MB       3.3 MB      ← 4.4 after item 1, 3.3 after item 7
```

*Before* is a single run; *after* is the median of four consecutive ones,
which spread 1603–1675ms at the cover and 2–3 long tasks. A run taken while
the machine is busy with something else lands nearer 2075ms and 6 tasks — the
gap to *before* is an order larger than either spread, so the shape holds, but
do not read the last digit.

The single 1531ms task is gone. It was the 3D chunk parsing *and* four
uncompressed models decoding into the same window; item 1 took the models out
of it. What is left of home's 4.4 MB is 2.2 MB of `adam-face.glb`, which is
the one model item 1 deliberately did not touch.

## Measured: what a crossing costs

`nav.mjs`, desktop, 4×:

```
                          before                      after
  deep-link a project     lose 0  links 19            lose 0  links 19
  project -> project      lose 0  bank stopped 1211ms lose 0  bank stopped never
  project -> home         lose 1  bank stopped 1145ms lose 0  bank stopped never
```

`MechStage.tsx` had already done its job project to project. The two numbers
still wrong were the rail freezing on every crossing (item 2) and home
destroying the stage's renderer (item 3); both are now zero.

**`bank stopped` means something different from what it used to, and the old
meaning was wrong.** It read `.mech-bank-col`'s `data-transiting` /
`data-covered` and called itself "measured, not inferred". It was not: those
flags are set for several things that have nothing to do with the canvas, so
after item 2 the script went on reporting a 1200ms freeze that was no longer
happening. It counts `drawElements` / `drawArrays` on the bank's own context
now and reports the longest run of frames that drew nothing. Note the class is
on r3f's wrapper div and not on the canvas, which is the trap that made the
first version of that instrument silently count zero.

---

## Ruled out — do not spend time here again

### The boot ripple is not the boot's cost. Third finding.

`frames.mjs`, phone, 4× throttle:

| window | frames | median | p90 | worst | >33ms |
|---|---|---|---|---|---|
| before the ripple | 16 | 19ms | 56ms | 74ms | 5 |
| **during the ripple** | 114 | **17ms** | **18ms** | 54ms | **1** |
| the entrance after it | 73 | 17ms | 22ms | **225ms** | 5 |

512 cells and the main thread holds 17ms across all of it. In case the cost
was raster the main thread cannot see, the boot was also traced bucketed by
thread with the cells' `box-shadow` removed as a control — their most
expensive-looking property, an inset stroke plus a 10px blur:

```
  as shipped              raster threads 1539ms
  box-shadow removed      raster threads 1498ms     (2.7%, inside noise)
```

Two earlier attempts are already written up in `Mech.css` and `README.md`:
the `mask-image` (measured, ~3%, reverted) and the cell count on narrow
(reverted — the pitch *is* the effect, and a bigger cell reads as slower
while taking exactly as long). **The stall people see is the 225ms frame
immediately after the ripple**, where the bank builds its geometry; the
ripple is simply what is on screen when it lands, and it wears the blame.

### There is already a loading gate. Do not add a second one.

`primed` in `Mech.tsx` deliberately holds the boot until `document.fonts`
resolves and the 3D chunk is fetched and parsed, capped by `WARM_CAP` /
`CHUNK_CAP`, so the ripple gets an idle thread — that is the 1.9s above and
it is load-bearing (see **load first, then play** in `README.md`). What it
lacks is a *voice*: it shows a bare grid on black, which reads as a broken
site rather than a loading one. Putting a second gate in front of it makes
the site strictly slower. Item 5 below is the right version of this.

---

## Done, and what each was worth

### 1. Four of the seven models had never been compressed — **done**

`models.mjs`, before:

| model | size | tris | **bytes/tri** | textures | compression |
|---|---|---|---|---|---|
| `gta-v-rifle.glb` | 7.9 MB | 76k | **106** | 3.0 MB, 3/3 png | **none** |
| `iphone-17-pro-max.glb` | 5.2 MB | 76k | **70** | 2.0 MB, 14/17 png | **none** |
| `akira-rider.glb` | 4.4 MB | 136k | **33** | 0.5 MB webp | **none** |
| `rdr2-revolver.glb` | 3.1 MB | 20k | **154** | 2.0 MB, 3/3 png | **none** |
| `adam-face.glb` | 2.2 MB | 57k | 40 | — | meshopt + quantized |
| `capsule-c1.glb` | **0.44 MB** | **81k** | **6** | — | **Draco** |
| `wyte-card.glb` | 3 KB | 84 | 36 | — | Draco |

**Capsule C1 carried 81,000 triangles in 439 KB. Akira's rider carried
136,000 in 4.4 MB.** Four files had raw float32 geometry, and half the weight
of three of them was uncompressed PNG for surfaces seen at 75 pixels in a bay
and at maybe 900 on a project screen.

`scripts/compress-models.mjs` puts those four through what `capsule-c1.glb`
had already been through — Draco for the geometry, WebP for the textures:

```
  gta-v-rifle.glb              7.68 MB →   1.07 MB   −86%
  iphone-17-pro-max.glb        5.07 MB →   0.71 MB   −86%
  rdr2-revolver.glb            2.98 MB →   0.51 MB   −83%
  akira-rider.glb              4.34 MB →   1.12 MB   −74%

  the set        22.7 MB → 6.0 MB
  home's phone fetch  12.0 MB → 4.4 MB
```

Triangle counts are identical before and after — checked with `models.mjs`,
and all four subjects checked on screen, the iPhone included, which is the
hardest of them because its 17 maps include the app running on its glass.

**It is not bay-specific, and should not be.** One file serves the bay and the
project screen and there is no second pipeline to keep in step. A separate bay
LOD would only be worth building if *decode* were the bottleneck, and 81k
triangles arriving in 439 KB says it is not.

Three things worth knowing before running that script again:

- **`adam-face.glb` is not in it**, on purpose. It is already meshopt +
  quantized, and it carries 47 morph targets — Draco and morph targets are not
  a combination worth discovering on a face. It is now the single heaviest
  thing home fetches, and its own defect is under *two loose ends* below.
- **Akira's rider skips the WebP pass**, because its textures already are
  WebP and re-encoding would be a second lossy pass for no bytes. Its 4.4 MB
  was float32 geometry, not surface.
- **Every temp filename has to end in `.glb`**, and no temp may live in
  `public/`. gltf-transform picks its container off the extension, so a `.tmp`
  output is written as glTF JSON with its buffers as siblings it never writes
  — a 30 KB model, reported as −100%, which is total data loss wearing a
  compression ratio. The first run of this did exactly that, and left a `.bin`
  and thirty loose PNG/WebP sidecars in `public/models/` that
  `git checkout` did not clean up because they were untracked. `public/` is
  copied verbatim into `dist`, so that debris ships.
- **The re-run guard reads the whole JSON chunk**, off the GLB header. Both
  passes are lossy; a second run quantizes the quantized for no error and a
  slightly smaller file. Sniffing the first 8 KB is not enough —
  `extensionsUsed` is written after the accessor and mesh tables.

The masters are in git at `3cd5482`, which is the commit before the script
ran: `git show 3cd5482:public/models/gta-v-rifle.glb > /tmp/master.glb`.

### 2. The rail froze and re-dealt on every crossing — **done**

Measured at **1211ms** stopped project to project, **1145ms** going home; both
are `never` now.

`up` in `Mech.tsx` is `!booting`, and nothing else. It used to be
`!booting && !transiting` on a project and `!covered` on home, and it gates
`frameloop` in `MechSlots` as well as the deal — so a retarget stopped the
canvas dead for the whole `EXIT_MS` while
`.mech-bank-col[data-transiting='true']` undealt every slot and dealt it back
in.

That was ironic rather than merely slow. The rail was hoisted to **one** mount
site precisely so it would survive the crossing with its WebGL context intact,
and was then told to freeze and re-deal across it anyway. It is the one
element on the page that is genuinely continuous: the same list of the same
work, before and after. Freezing it is a large part of what made the site feel
like it reloaded on every press.

So the bank's whole handover block in `MechCluster.css` is one entrance now,
hung on **`data-booting`**, and there is no exit. `data-transiting` cannot be
used for it — it flips on every crossing, and an animation restarts whenever
its `animation-name` changes, which is exactly what re-played the deal.

The exit that was removed was answering something real: without it "the bays
kept their pictures while the boxes around them left". That only applies to a
column that is *leaving*, and on a crossing this column does not leave. Only
the picture on the stage does.

### 3. Going home destroyed the stage's renderer — **done**

`.mech-stage` sat inside `{!home && ...}`, so home threw away the renderer, its
19 compiled programs, the PMREM environment and the face's morph-target
texture — and the next project paid the rebuild `MechStage.tsx` was written to
eliminate. That file's argument for outliving a *project* applies just as well
to outliving *home*. `lose 1` → `lose 0`.

It is kept mounted and stopped now, gated on `stageOpened` in `Mech.tsx`.

- **`stageOpened` is a latch, not a plain `true`.** `MechStage` is lazy and
  drags `ModelFrame` and `MechProduct` behind it, so mounting it on a *first*
  load of home would put ~110KB of chunk in front of a boot that currently
  never asks for it — paying on the load to save on a crossing, which is the
  wrong way round. Nothing is held until you open something.
- **`visibility: hidden`, not `display: none`.** This ledger originally said
  `display: none`, reasoning that an empty 16:9 box in the middle of the
  cluster eats the pointer where `opacity: 0` would not. True, but a hidden
  element is not hit-tested either, so `visibility` answers that just as well
  — and it keeps the box laid out, which `display: none` does not. That is
  load-bearing here for the same reason it is on
  `.mech-model-layer[data-on='false']` a few rules above it in `Mech.css`: a
  canvas in a box with no layout has no size to come back to.

**The third part of this item is still open** and is now item 6 below: home
still replays its entrance in full on every arrival.

### 4. A phone got a fraction of the samples a desktop did — **done**

`canvas.mjs`, `/p/mr-takahashi`, as samples per CSS pixel²:

```
                   before          after      desktop
  project stage    2.25            16.00      16.00
  the bank         1.00             4.00      12.25
```

It was not merely under-sampled. At ratio 1.5 on a dpr-3 screen every rendered
pixel was *magnified over four device pixels*, and the bank at ratio 1.0 over
nine — which is why it read as crisp-jagged rather than soft, and it is a
different defect from having no MSAA.

The two halves got different answers, and the asymmetry is deliberate:

- **The stage** is a 390×410 box on a phone — small in fill and in memory, and
  the one thing on the screen being looked at. `dpr` `[1, 2]` and `antialias`
  on, the same as the desktop. The original setting was reasoned from the
  desktop intuition that a full-window multisampled canvas is the most
  expensive thing on screen; MSAA is comparatively cheap on the tile-based
  GPUs handsets use (Apple, Mali, Adreno resolve it in tile memory rather than
  round-tripping a resolve target through bandwidth).
- **The bank** got `dpr` 2 with MSAA left **off**. drei's `View` scissors, so
  fill cost is only the bays actually visible — but the *allocation* is the
  whole 343×1494 canvas, and 4× MSAA on a 686×2988 buffer is ~65 MB, which is
  how a context gets lost on iOS Safari. A lost context there takes all eleven
  subjects with it.

`antialias` is a context-creation attribute and `dpr` is reactive, so crossing
the breakpoint leaves the sample count as it was until a reload. Still not
worth a context rebuild to fix.

**This is the one item these scripts cannot fully settle** — see *the GPU is
the wrong GPU* above. The resolutions and sample counts transfer to a handset;
the fill rate does not. Check it on the device over the tailnet.

### 7. Home was preloading a model nothing could draw — **done**

Not on the original list, and found while checking that item 1 had not broken
anything: `/p/a-game` renders the lock card rather than the rider, and the
rail's bay for it says `no signal`. Both are correct — Solomon is
`locked: true` in `projects.ts`, so `slot.solid` (`hasSubject(id) && !locked`)
is false and `riderStage` in `Mech.tsx` is false. Nothing on the site can put
that subject on screen.

`MechRider.tsx` called `useGLTF.preload(SRC, DRACO_PATH)` at **module scope**
anyway, and `MechBank.tsx` imports `RiderSlot` statically — so it ran on every
page that mounts the bank, which is every page. Home was fetching
`akira-rider.glb` on every cold load for a model it could not render: 4.4 MB
of the original 12, and still 1.1 MB after item 1 packed it.

It is gated on the same flag both render sites read, rather than deleted, so
unlocking Solomon brings the preload back along with the rendering. Home's
cold fetch on a phone: **4.4 MB → 3.3 MB**, and what is left is
`adam-face.glb` (2.2), the iPhone (0.7) and Capsule C1 (0.4) — three models
that are all actually drawn.

The general lesson is the one worth keeping: **a module-scope `preload` is
unconditional by construction**, and it will outlive whatever condition made
it reasonable. Worth a look at the others.

---

## Open, in the order worth doing

### 5. Give the existing load gate something to say

See *ruled out*, second entry. 1.9s is already being spent on black behind a
bare grid. A progress readout in the machine's own idiom — a percentage on a
segment display, a filling bar — dresses time that is already going by. The
inputs are all there: `Warmth.tsx` already subscribes to drei's `useProgress`
and reports upward, and `heavy` / `fonts` / `quiet` in `Mech.tsx` are the
three gates. Nothing new has to be waited on.

### 6. Re-time the entrance, and give home a second-arrival entrance

The 2.7s between the cover lifting and home settling is choreography, not a
stall — it is four constants, and changing them is a **design** call, not a
fix to apply unasked:

| what | where | lands at |
|---|---|---|
| tachometer sweep | `IN.tach: 680` | cover + 0.7s |
| field dials' ignition sweep | `IN.arcFull/Zero/Live: 1040/1700/1960` | cover + 2.0s |
| the name | `Typed delay={1.25} speed={96}` | cover + 2.4s |
| the intro paragraph | `Typed delay={0.6} speed={9}`, ~190 chars | cover + **2.7s** |

**`Typed` is off `setInterval` — done.** It ran at `speed={9}`, which is
~111 ticks a second against a 60Hz display: two `textContent` writes on most
frames, each a layout invalidation on a paragraph, ~40% of them discarded
unseen. Both directions are on `requestAnimationFrame` now with the character
count computed from *elapsed time* rather than incremented per tick, which is
what makes it frame-aligned and one write a frame while still finishing at
exactly the same moment. It also skips the write on a frame where the count
has not moved — a text node written with the value it already had still
invalidates layout, the same trap the deck's meter and the compass were both
caught by.

**Everything still lands in the same 1.2s window, and that is the 224ms
frame.** At cover+700ms the intro is typing, the tach is moving `--rev` across
34 columns, twelve dial blocks are transitioning, and the bank is dealing 11
slots at 55ms apart *and building their geometry*. It is not any one of those;
it is five things scheduled on top of each other. Moving the bank's deal to
after the typing settles would de-collide it, and is the obvious next thing to
try — but it is a change to the choreography, so it is left here rather than
applied. The frame survives items 1 to 4 intact:

```
  the entrance after the ripple    worst 225ms → 224ms    >33ms 5 → 3
```

**Home also still replays its entrance in full on every arrival**, which was
the third part of item 3. `MechCluster` is home-only, so returning home is a
fresh mount and every beat in `IN` runs again from zero — the dials sweep
their whole range, the name types, the intro types all 190 characters. A
machine that has already been switched on should not switch on again. A
session flag giving second and later arrivals a compressed entrance (beats at
about a third, text placed rather than typed) is the fix, and it is a design
call about what a return home should feel like, not a defect.

---

## Two loose ends

**A local `dist` ships ~10.5 MB of models nothing can reach — but the
deployed one ships 0.5 MB of them.** `public/models/dance/*` (9.3 MB) and
`medieval-door.glb` are referenced only from `src/archive/`, which is out of
the build, and `public/` is copied verbatim, so Rollup dropping the code does
not drop the assets. That is what makes a local `dist` fat. **Both are in
`.gitignore`**, though, so Vercel builds from a clone that does not contain
them and no visitor could fetch them either way. What actually ships dead is
`mr-takahashi.glb` at 556 KB, which is tracked and unreachable. Deploy weight
only, and not much of it — this is a tidy-up, not a performance item. Note
that `src/archive/` itself must stay (see `CLAUDE.md`); this is about
`public/`.

**`adam-face.glb` stores its normals as `i8 normalized`**, and it is now the
single heaviest thing home fetches (2.2 MB of the 4.4) — 8 bits per axis,
base mesh plus all 47 morph targets, from a `gltfpack -vn 8` default. It is
the only model in the set with quantized normals — item 1 packed the other
four with Draco at 10-bit normals and left this one alone — which is why the
artifact is on Mr. Takahashi and nowhere else, and it shows as **faceted specular on
the cheeks** — a different defect from the jagged edges in item 4, and easy
to confuse with them. The precision is gone from the file, so it needs a
re-export at `-vn 16`. `computeVertexNormals()` was tried: it fixes the hair,
facets the cheeks and hardens the UV seams. Reverted. `mr-takahashi.glb` is
not a drop-in replacement — 2,781 verts against 113,502, and differently
named morphs (`LookUp`/`LookDown` where the code writes `HorizontalLook`/
`VerticalLook`).
