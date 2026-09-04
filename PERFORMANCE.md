# Where the performance work is up to

Written 2026-09-03, against `main` at the point v3 went live. This is a
**ledger**, in the same spirit as `PLAN.md`: everything below is either
*measured* and says so, *ruled out* and says why, or *open* and says what to
change. `README.md` explains why the code is the shape it is; this file says
what is known to be wrong with how fast it runs.

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
```

`phone` is 390×844 at dpr 3, which is under `narrow`'s 700px breakpoint;
`desktop` is 1512×900 at dpr 2. The second argument is the CPU throttle. Each
script's header says what question it answers and what its trap is.

`serve.mjs` **does not compress**, so JS reads about 3.5× its real transfer
size. Models and video are already-compressed formats and transfer honestly,
which is the half these are usually pointed at.

---

## Measured: the cold first load, on a phone

390×844 dpr 3, 4× CPU throttle, cold cache, `boot.mjs`:

```
  289ms  app mounts
  701ms  ripple starts        ← primed: fonts resolved + the 3D chunk parsed
 1903ms  cover lifts          ← primed + BOOT_MS
 2600ms  intro begins typing
 4599ms  intro finishes       ← home is not settled for four and a half seconds
```

12.0 MB of GLB is fetched behind that, and every byte of it starts *after*
the cover lifts, because the bank's subjects are gated on `up`.

## Measured: what a crossing costs

`nav.mjs`, desktop, 4×:

```
  deep-link a project     contexts 2  lose 0  links 19  longtasks 5/722ms
  project -> project      contexts 0  lose 0  links  1  bank stopped 1211ms
  project -> home         contexts 0  lose 1  links  0  bank stopped 1145ms
```

`MechStage.tsx` did its job — project to project is **zero** contexts built
and zero thrown away, where it used to be one of each. The two numbers still
wrong are on the rail and on going home, and both are items below.

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

## Open, in the order worth doing

### 1. Four of the seven models have never been compressed

`models.mjs`:

| model | size | tris | **bytes/tri** | textures | compression |
|---|---|---|---|---|---|
| `gta-v-rifle.glb` | 7.9 MB | 76k | **106** | 3.0 MB, 3/3 png | **none** |
| `iphone-17-pro-max.glb` | 5.2 MB | 76k | **70** | 2.0 MB, 14/17 png | **none** |
| `akira-rider.glb` | 4.4 MB | 136k | **33** | 0.5 MB webp | **none** |
| `rdr2-revolver.glb` | 3.1 MB | 20k | **154** | 2.0 MB, 3/3 png | **none** |
| `adam-face.glb` | 2.2 MB | 57k | 40 | — | meshopt + quantized |
| `capsule-c1.glb` | **0.44 MB** | **81k** | **6** | — | **Draco** |
| `wyte-card.glb` | 3 KB | 84 | 36 | — | Draco |

**Capsule C1 carries 81,000 triangles in 439 KB. Akira's rider carries
136,000 in 4.4 MB.** Four files have raw float32 geometry, and half the
weight of three of them is uncompressed PNG for surfaces seen at 75 pixels in
a bay and at maybe 900 on a project screen.

Put the four through what `capsule-c1.glb` already went through — Draco or
meshopt for geometry, WebP for the textures:

- **22.7 MB → ~6 MB** across the set
- **home's phone fetch: 12.0 MB → ~3 MB**

**It does not need to be bay-specific, and it should not be.** The
compression is lossless to the vertex, so one file serves both the bay and
the project screen and there is no second pipeline to keep in step. A
separate bay LOD would only be worth building if *decode* were the
bottleneck, and 81k triangles arriving in 439 KB says it is not — Draco
decodes in a worker pool. The heaviest single item is the 5.2 MB iPhone,
which is Plus One's bay via `Phone17.tsx`: 43% of home's model traffic for
one thumbnail.

`/draco/` is already served locally (see **the Draco decoder was being
fetched from Google's CDN** in `README.md`) and `useGLTF(src, DRACO_PATH)` is
already wired in `MechSlots.tsx`, `MechModel.tsx` and `ModelFrame.tsx`, so
nothing in the app has to change for a Draco file to load.

### 2. The rail freezes and re-deals on every crossing

Measured at **1211ms** stopped, project to project. `MechSlots` runs
`frameloop={up ? 'always' : 'never'}` and on a project screen `up` is
`!booting && !transiting`, so a retarget stops the canvas dead for the whole
`EXIT_MS`; `.mech-bank-col[data-transiting='true']` in `MechCluster.css`
simultaneously undeals every slot and deals it back in.

This is ironic rather than merely slow. The rail was hoisted to **one** mount
site in `Mech.tsx` precisely so it would survive the crossing with its WebGL
context intact — and then it is told to freeze and re-deal on every crossing
anyway. It is the one element on the page that is genuinely continuous: the
same list of the same work, before and after. Freezing it is what makes the
site feel like it reloads.

**Drop the `transiting` term from `up`, and drop the exit/entrance rules for
`[data-where='project']`.** Highest value per line changed on this list, and
it fixes half of item 3 for free.

The reason those rules exist is real but narrower than it looks: the comment
in `Mech.tsx` says that without it "the bays kept their pictures while the
boxes around them left". That applies to a column that is *leaving*. On a
project-to-project step the column is not leaving — only the picture on the
stage is.

### 3. Going home destroys the stage's renderer and replays the whole entrance

Three separate things, all measured:

1. **The rail freezes 1145ms** — item 2, same cause.
2. **`lose 1`.** `MechStage` sits inside `{!home && <div className="mech-stage">}`,
   so home throws away the renderer, its compiled programs, the PMREM
   environment and the face's morph-target texture — and the next project pays
   the rebuild `MechStage.tsx` was written to eliminate (19 program links,
   722ms of long tasks on a cold open). That file's argument for outliving a
   *project* applies just as well to outliving *home*. Keep it mounted and
   stopped, hidden with `display: none` — **not** merely transparent: the
   README's reason home has no stage box is that an empty 16:9 box eats the
   pointer, and `display: none` answers that where `opacity: 0` does not.
   Costs one idle context on home; a project screen already carries two.
3. **The entrance replays in full.** `MechCluster` is home-only, so returning
   home is a fresh mount and every beat in `IN` runs again from zero — the
   dials sweep their whole range, the name types, the intro types all 190
   characters. A machine that has already been switched on should not switch
   on again. A session flag giving second and later arrivals a compressed
   entrance (beats at about a third, text placed rather than typed) is the
   fix.

### 4. A phone gets a fraction of the samples a desktop does

`canvas.mjs`, both devices, `/p/mr-takahashi`:

| canvas | phone (dpr 3) | desktop (dpr 2) |
|---|---|---|
| project stage | ratio **1.5**, `antialias false`, **0 samples** | ratio 2.0, `antialias true`, 4 samples |
| the bank | ratio **1.0**, `antialias false`, **0 samples** | ratio 1.75, `antialias true`, 4 samples |

As samples per CSS pixel²: **stage 2.25 against 16 — 7× fewer. Bank 1
against 12.25 — 12× fewer.** And it is worse than under-sampling: at ratio
1.5 on a dpr-3 screen every rendered pixel is *magnified over four device
pixels*, and the bank at ratio 1.0 over nine. That is why it reads as
crisp-jagged rather than soft. Both canvases say why they made the trade in a
comment, so this is a decision to revisit and not a bug to find.

The two halves want different answers:

- **The stage** is a 390×410 box — small in fill and in memory. `dpr` to
  `[1, 2]` and `antialias` on. MSAA is comparatively cheap on tile-based
  mobile GPUs (Apple, Mali, Adreno resolve it in tile memory), which is the
  opposite of the desktop intuition the current setting was reasoned from.
- **The bank** wants `dpr` 2 with MSAA left **off**. Two things make it
  asymmetric: drei's `View` scissors, so fill cost is only the bays actually
  visible rather than the whole 343×1494 canvas — but the *allocation* is
  that whole canvas, and 4× MSAA on a 686×2988 buffer is ~65 MB, which is how
  a context gets lost on iOS Safari.

`antialias` is a context-creation attribute and `dpr` is reactive, so
crossing the breakpoint leaves the sample count as it was until a reload.
That was true of both canvases before `MechStage` and is still not worth a
context rebuild to fix.

**This is the one item on the list whose cost these scripts cannot
measure** — see *the GPU is the wrong GPU* above. Check it on the handset.

### 5. Give the existing load gate something to say

See *ruled out*, second entry. 1.9s is already being spent on black behind a
bare grid. A progress readout in the machine's own idiom — a percentage on a
segment display, a filling bar — dresses time that is already going by. The
inputs are all there: `Warmth.tsx` already subscribes to drei's `useProgress`
and reports upward, and `heavy` / `fonts` / `quiet` in `Mech.tsx` are the
three gates. Nothing new has to be waited on.

### 6. Re-time the entrance, and get `Typed` off `setInterval`

The 2.7s between the cover lifting and home settling is choreography, not a
stall — it is four constants, and changing them is a **design** call, not a
fix to apply unasked:

| what | where | lands at |
|---|---|---|
| tachometer sweep | `IN.tach: 680` | cover + 0.7s |
| field dials' ignition sweep | `IN.arcFull/Zero/Live: 1040/1700/1960` | cover + 2.0s |
| the name | `Typed delay={1.25} speed={96}` | cover + 2.4s |
| the intro paragraph | `Typed delay={0.6} speed={9}`, ~190 chars | cover + **2.7s** |

Two genuine defects underneath it, both safe to fix without touching the
timing:

- **`Typed` runs on `setInterval`, and `speed={9}` is ~111 ticks a second
  against a 60Hz display.** Two `textContent` writes per frame, each a layout
  invalidation on a paragraph, ~40% of them discarded unseen. Drive it off
  `requestAnimationFrame` with the character count computed from elapsed
  time: frame-aligned, one write a frame, visually identical.
- **Everything lands in the same 1.2s window.** At cover+700ms the intro is
  typing at 111Hz, the tach is moving `--rev` across 34 columns, twelve dial
  blocks are transitioning, and the bank is dealing 11 slots at 55ms apart
  *and building their geometry*. The 225ms frame is not any one of those —
  it is five things scheduled on top of each other. Moving the bank's deal to
  after the typing settles de-collides it at no visual cost.

---

## Two loose ends

**`dist` ships ~10.5 MB of models nothing can reach.**
`public/models/dance/*` (9.3 MB), `medieval-door.glb` and `mr-takahashi.glb`
are referenced only from `src/archive/`, which is out of the build — but
`public/` is copied verbatim, so Rollup dropping the code does not drop the
assets. No visitor fetches them; it is deploy weight only. Note that
`src/archive/` itself must stay (see `CLAUDE.md`); this is about `public/`.

**`adam-face.glb` stores its normals as `i8 normalized`** — 8 bits per axis,
base mesh plus all 47 morph targets, from a `gltfpack -vn 8` default. It is
the only model in the set with quantized normals, which is why the artifact
is on Mr. Takahashi and nowhere else, and it shows as **faceted specular on
the cheeks** — a different defect from the jagged edges in item 4, and easy
to confuse with them. The precision is gone from the file, so it needs a
re-export at `-vn 16`. `computeVertexNormals()` was tried: it fixes the hair,
facets the cheeks and hardens the UV seams. Reverted. `mr-takahashi.glb` is
not a drop-in replacement — 2,781 verts against 113,502, and differently
named morphs (`LookUp`/`LookDown` where the code writes `HorizontalLook`/
`VerticalLook`).
