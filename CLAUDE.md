# CLAUDE.md

Portfolio site. React + TypeScript + Vite, three.js, GSAP. **`README.md` is the
real documentation** — this file is the map for finding things in it.

## Where you are

- Work happens on **`redesign-v3`** (this branch). `redesign-v2` is the
  previous pass; `main` still holds the old Vue site.
- Nothing here is live. The domain is served from a **different, private
  repo** (`tarloksingh/my-portfolio`) via Vercel. Pushing this deploys nothing.
- `git fetch` first if a branch seems missing — the local clone can be behind.

## Running it

```bash
npm install
npm run dev      # vite, bound to 0.0.0.0 on :5173
npm run build    # tsc -b && vite build — run this before committing
node scripts/check-media.mjs   # every filename the project data quotes exists
```

**The browser may not be on this machine.** The dev server binds `0.0.0.0` and
`vite.config.ts` allow-lists `.ts.net`, because the browser used to look at
this is often on another machine over the tailnet. If `localhost:5173` shows
stale or unrelated content, you are looking at *that* machine's server — use
the tailnet address vite prints instead (`http://100.x.x.x:5173`). Two symptoms
of this: content that does not match the file on disk, and `isSecureContext`
being false (which is why `navigator.clipboard` does not exist — see
`src/v3/clipboard.ts`).

## Layout

| Path | What it is |
|---|---|
| `src/v3/` | **The current work.** The next version of the site — `/v3` routes |
| `src/site/` | v2: the working site at `/` and `/work/<id>` |
| `src/data/` | Projects, media resolution, generated dimensions, tracks |
| `src/three/` | Product models and the v2 face |
| `src/archive/` | Previous versions, unmounted but intact |
| `scripts/` | The media pipeline — see below |

### `src/v3/`, in one line each

| File | What it does |
|---|---|
| `V3.tsx` | Two screens and fifty lines of routing |
| `model.ts` | Projects flattened into what the panes draw; `MENU` is the index |
| `Browse.tsx`, `Detail.tsx`, `Stage.tsx` | The timeline screen |
| `Mech.tsx` | **Home and a project both** — layout, the swap, transit |
| `MechCluster.tsx`, `MechCluster.css` | **Home**: the instrument cluster — the display run, the tachometer, the name and the counts. The bank is `MechBank.tsx` |
| `MechSlots.tsx` | Every project's own 3D subject, one per slot, one canvas |
| `Segment.tsx`, `Segment.css` | The fourteen-segment display, drawn in SVG |
| `clusterTuning.ts` | Home's four knobs, the **Cluster** tab |
| `leaders.ts`, `notes.ts` | Where the label lines go, and what they say |
| `MechFacts.tsx`, `MechFacts.css` | **Narrow only**: the notes as a swipeable deck under the picture |
| `MechPins.tsx`, `labelTuning.ts` | Placing a picture's labels (**P**) and copying them out |
| `MechModel.tsx` | The subject: one GLB, lit, drifting, watching, shootable |
| `MechHud.tsx`, `MechCursor.tsx` | The dashboard, and the reticle |
| `MechBank.tsx`, `bank.ts` | **The rail of work, on every screen** — the slots, and the roster they are built from |
| `MechTiles.tsx` | The boot: the grid's cells struck in a ring from the middle |
| `MechBird.tsx`, `MechLaser.tsx` | The bird, and the gun |
| `MechDeck.tsx`, `sound.ts` | The music deck, and every synthesised sound |
| `SplitReveal.tsx` | The tagline and fold titles, drawn in a character at a time |
| `subject.ts` | Live facts shared across the Canvas boundary |
| `modelTuning.ts`, `wallTuning.ts` | Leva panels, and the source they paste back |
| `clipboard.ts` | Copying that works off localhost |

**Still here, not mounted.** `MechCast.tsx`, `MechWave.tsx`,
`MechCastPins.tsx`, `castTuning.ts`, `castTags.ts`, `nameTuning.ts` and
`tint.ts` were the old home screen — a line-up of five 3D subjects over a
shader horizon, with the name behind it. Nothing was deleted and all of it
still works; putting it back is one block in `Mech.tsx`. Don't "tidy up" the
unreferenced files, and don't re-mount them without reading **Home is a
cluster** in `README.md` — the reasons it came off are design reasons, not
technical ones.

## Two things to know before editing

**Frame coordinates.** Every number in `Mech.css` is a coordinate in a
1920×1080 frame, and `--px` is what one of those is worth in real pixels. Write
`calc(24 * var(--px))`, not `24px`. Tokens at the top of the file
(`--round`, `--label-gap`, `--label-inset`) are the ones meant to be moved.

**Tuning panels, not magic numbers.** Anything worth adjusting by eye belongs
on a Leva panel with a copy button that hands back source to paste into the
defaults — see `modelTuning.ts`. Nothing set on a panel reaches a visitor until
it has been pasted. Folders open collapsed.

## Adding media

Masters go in `src/assets/<project-id>/`. Then, in this order:

```bash
bash scripts/posters.sh          # a still out of every clip
bash scripts/field-clips.sh      # 400px silent proxies of every clip
node scripts/stills.mjs          # 1600px and 400px copies of every still
node scripts/media-manifest.mjs  # regenerates src/data/dimensions.ts
```

`scripts/stills.mjs` is not optional. A master is two to twelve megapixels and
costs ~140ms of main thread to decode; nothing on the site ever shows one
larger than about 1600. Use `MediaItem.still` and `MediaItem.thumb`, never
`src`, for anything an image is *displayed* from.

## Dev-only tools

- **P** opens the pin editor on a project screen — the picture's labels
  (`MechPins.tsx`). Placing and dragging on the overlay; copying and reverting
  on the **Labels** panel tab. Home has no pin editor: the tag editor belonged
  to the cast.
- **One dev panel, top right, with tabs** — `MechPanel.tsx`. The tabs are
  whatever the current screen can actually change: home gets **Cluster** (four
  numbers — where the cluster sits, how large the name is, how far it bleeds,
  how tall a slot stands); a project gets **Subject** / **Piece** / **Labels**
  as they apply; narrow gets **Scale**. Every tuning hook makes its own store
  with `useCreateStore`, and `MechPanel` renders one `<Leva hidden />` — not a
  second panel but the absence of one. Home mounts the pieces built for eight
  projects and several of those register controls on Leva's *default* store,
  which makes Leva inject its own floating root over the top right unless it
  is told not to.
- **Every 3D subject has its own lighting.** There is no shared rig left
  anywhere. On home, each cast member owns two lights on its own three.js
  layer (`castTuning.ts`). On a project screen, each *piece* owns its
  exposure, its environment, both lights with positions, and a **Surface**
  folder — Gloss, Metal, Reflects (`productTuning.ts`), and each *model* owns
  a full `ModelTuning` in `MODEL_RIGS` (`modelTuning.ts`), so Capsule C1 is no
  longer lit by the rig built around Takahashi's face. Stills and clips have
  no lighting and need none.
- **Surface offsets are added, never multiplied.** Most pieces are authored at
  `metalness: 0`, and no multiplier can lift a zero — a scaling Metal slider
  runs its whole range without anything turning metal. `gloss` comes off
  roughness, `metal` goes onto metalness, both relative to what the piece was
  built with so its material variety survives. `Sheen` in `MechProduct.tsx`
  keeps the originals and re-applies from them, because boosting an
  already-boosted roughness every frame walks it to 1 in a second.
- **A panel's scratchpad beats source.** Every tuning hook keeps its values in
  `localStorage`, and those are merged *over* the `_DEFAULTS` constants. So
  pasting a fresh set of numbers into source and reloading changes nothing
  until you press **Reset** on any tab (it clears the whole key and reloads).
  This is the single most confusing thing about the panels — if a tab looks
  dead, it is almost always a stale scratchpad, not a broken control.
- **Leva's `set()` throws on a key with no input, and that unmounts the app.**
  Reseeding a per-item folder passes a whole tuning object, so every field on
  it must exist in the schema — and the schema is now conditional (no Eyes
  folder unless it is the face). Both `modelTuning.ts` and `productTuning.ts`
  filter the reseed against the keys Leva actually declared, read off its own
  values so the list cannot drift. Without that filter the page renders as a
  **blank paper gradient**, which reads as a CSS bug rather than a crash.
  Check the console first.
- **Never put a `.` in a Leva key or folder label.** Leva reads it as a folder
  separator: `wave.on` silently nests a phantom `wave` folder, and a subject
  titled "Mr. Takahashi" becomes `Mr` containing `Takahashi`. `castTuning.ts`
  namespaces with `__` and strips dots out of labels.

## Home is a cluster now

The line-up is gone from home. What is there instead is an instrument cluster,
five parts:

- **Two lamps and a count** at the top of the frame (`Alarm`) — a green square,
  the tally, a red square; one lamp lit at a time, reporting whether there is a
  bird or a moth in the air to shoot at. It asks `quarry.creatures` once a
  frame rather than being wired to either. The words `SHOOT` / `STOP` are gone
  and the count shows at `000` rather than mounting on the first kill, so the
  row is a fixed-width block that never reflows — see **The warning pair** in
  `README.md`, sixth pass.
- **A run of lamp cells** across the top of the panel (`.mech-run`): the left
  display cycles my titles, or — with a project selected — the jobs I did on
  *that* project one at a time; the right one names the selection. Three dark
  cell groups between them make it one run rather than two boxes.
- **The tachometer** (`Tach`), the largest instrument, filling the middle. It
  reports on nothing: revs sweeping up a fixed power curve and falling back,
  with the red zone painted on the x axis. One property (`--rev`) on the face
  drives all thirty-four columns, and the cells in them are graded — tall at
  the foot, tapering to ticks at the top (`cellH` / `ladder`). The face's
  height *is* that ladder's sum, handed to the panel as `--face`; `--panel-h`
  (the middle column's height, and the rail's) and the counts' bar height are
  both derived from it. Wide and shallow, ~2.5:1.
- **`INTRO` and the profile** on the tachometer's head row, above the left end
  of the bank — handed to `Tach` as children, short and wide, on no background
  at all. Fixed height, so typing them in moves nothing under them.
- **The counts** (years active, roles worn, orgs shipped) pulled in against
  the instrument rather than bled off the frame, bars the graph's own height,
  no numbers over them and no captions under them — the reel of what I do
  stands where the digits were, centred on `--count-w`. And the **rail of
  twelve slots** down the right — as tall as the instrument and no taller —
  each holding that project's own 3D subject, live. Press one and it opens.
  Under the bank, the five fields as **rings of even blocks** that sweep round
  from twelve o'clock on selection and drop all at once on release.

Every block has its own entrance *and* its own exit, both hung off
`data-covered` — see **Coming up, and going down** in `README.md`.

**Warm is what the pointer changes; green is what the machine reports.** The
name, the rail's project names and the field dials are `--warn`; every reading
is phosphor.

**Bloom belongs to the room, not to home.** `--g` is declared on `.mech` and
`--cluster-glow` is written onto that root from `Mech.tsx`, so a project screen
is lit exactly as home is — see **One room, both screens** in `README.md` for
the bug that came of having it on `.mech-cluster`.

Six traps in that, all written up in `README.md` → **Home is a cluster**, and
all of them look like something other than what they are:

- **drei's `View` ignores `track` outside a Canvas.** It makes its own element
  and silently drops the prop, so every subject renders wherever drei's div
  landed. `.mech-slot-shot` *is* a `<View>`.
- **The canvas must really be the viewport.** Any transform on any ancestor —
  including the identity matrix an unfinished `transform` animation leaves —
  makes it the containing block for `position: fixed`, and the scissor boxes go
  wrong. `.mech-cluster`, `.mech-body` and `.mech-work-rail` all carry no
  transform — the cluster centres by offsetting `top`/`bottom`, and the rail is
  the one block that arrives and leaves by fading.
- **`mix-blend-mode` blends against the nearest stacking context, and a
  `z-index` makes one.** The duotone over the bays carries no `z-index` and
  paints above the canvas by document order alone.
- **The bay is `flex: none`.** A name wrapping to two lines otherwise shrinks
  the picture out from under its own tint.
- **`.mech-run` is not `.mech-strip`.** The compass along the bottom of every
  screen (`MechHud.tsx`) already owns `.mech-strip`, and giving the display
  run the same class put it across the foot of the window at full width.
- **Every exit has its own keyframes.** Reusing the entrance with
  `animation-direction: reverse` never plays: an animation only restarts when
  its `animation-name` changes. Same rule as the frame swap.

## Where this is up to

**The bank is on every screen.** It was one of home's blocks and vanished the
moment you opened a project, which made the list of what is on this site the
one thing that disappeared when you used it. `MechBank.tsx` is mounted from two
places now — home's right flank and a project's right-hand margin
(`.mech-bank-col`) — and the media strip took the foot of the frame in
exchange, horizontal on both layouts. `bank.ts` holds the roster both
`MechBank` and `MechCluster` read, because a const in one component's file that
another imports is a circular import waiting to happen. **Only ever one bank is
mounted**: `MechSlots` is inside it, and that is the single WebGL canvas all
eleven subjects are scissored into. One prop decides everything that differs —
`onPick` is passed on home and omitted on a project, which makes the head a
sign rather than a readout, makes a press open directly, and turns on the
scroll-the-lit-slot-into-view. `.mech-bank-col` has to re-declare the cluster's
tokens *and its `--accent`*, and take `--cluster-slot` from JS. See **The bank
is on every screen** in `README.md`.

**The bank hands over on a project screen too.** `.mech-bank-col` stands at a
fixed `--panel-h` centred with `margin: auto 0` (never a transform — the
canvas has to stay the viewport), so it is the same size and place as home's,
and its boot-length entrance delay is gone. Project to project it plays home's
own exit and entrance, keyed on `data-transiting` with a shorter `--out`, and
`up` is `!booting && !transiting` so the WebGL subjects undeal on the same
beats the boxes do. Exits have their own keyframes. See **The bank is on every
screen** in `README.md`.

**The media strip drags, and two things about that bite.** The click/drag
threshold is ten pixels, not four — under that an ordinary press reads as a
drag and no tile is selectable. And `setPointerCapture` is taken in
`pointermove` once the drag is real, **never on `pointerdown`**: a captured
pointer retargets its own `click` to the capture element, which made tiles
selectable with a finger and not with a mouse.

**Per-frame cost is a standing concern, not a one-off.** A property written to
a node invalidates style whether or not the value changed, so a loop that
reports an unchanged reading is a full recalc a frame for nothing — the deck's
meter and the compass both did. Guard sentinels must not be `NaN` (every
comparison against it is false, so the first write never happens either). The
stage canvases take `useNarrow()` for their `dpr`/antialias the way the bank's
always has. And the boot ripple's cells sit inside a `mask-image`, which means
the layer re-rasters whole on any change — hence no blur and half the pitch on
narrow. Full account in **What the page pays for every frame** in `README.md`.

**The overview puts itself down.** A project arrives with its first fold
opening 900ms after the cover lifts — not open on arrival, which is the whole
distinction: `setOpen(null)` still runs under the cover and `OVERVIEW_MS` puts
it down where it can be seen. Once per project, on a ref, because `covered` is
also true for a tile-rail step.

**The bank's canvas scrolls with the bank on a phone.** `.mech-bank-gl` is
`position: absolute` over `.mech-bank` on narrow rather than fixed over the
window, because drei's `View` computes a scissor box as the *difference*
between two viewport rects and only the compositor is fast enough to keep them
aligned during a touch fling. That arrangement then requires `Track` in
`MechSlots.tsx` to re-read the canvas's rect once a frame (r3f measures its own
container on a 50ms debounce, which never fires during a continuous scroll) and
`useNear` to put back the offscreen culling `View`'s own test can no longer do
once the canvas is taller than the window. Two earlier attempts are in the
history and both are written up: cutting per-frame cost (helps, cannot fix it)
and hiding the canvas while scrolling (fixes it, reads badly). Full account in
**The bank, on a phone** in `README.md`.

**The note before the boot is gone, and the files with it.**
`MechGreeting.tsx`, `TextType.tsx` and `TextType.css` are **deleted**, not
unmounted — the card between the reader and the site did not earn the screen
it took. `sound.boot()` went back onto the load; `Typed.tsx` is what every
readout is drawn with, as it always was. The argument the note was answering
(the gun is undiscoverable) is still open and is written up in **The note
before the boot, and why it is gone** in `README.md`.

**Home's narrow layout is reordered around the name.** One tap opens a project
instead of two, and the field dials are hidden (they reported on a selection
that no longer exists down there). The column reads tachometer → role reel →
**name** → `INTRO` → paragraph → counts → `PROJECTS` → bank, which is
`order: 1` on `.mech-intro` and `order: 2` on `.mech-flank`; the markup is
untouched because the wide layout wants the opposite. The three segment signs
(reel, `INTRO`, `PROJECTS`) are boxed to one shared `--sign` width, because
`Segment` scales by width and equal boxes is the only way to get equal type —
the first two centred, `PROJECTS` left-set with `align="left"`. `roleSize` /
`roleTop` / `roleGap` on the Cluster tab, which is open on narrow home for
exactly that reason. The bank also gave back the fourteen units of padding
that had it inset further than every other block on the page. See **Home, on a
phone** in `README.md`.

**Everything on the stage keys off `shownId`, never `id`.** `id` is the URL
and changes a full `EXIT_MS` before the screen does, so a tuning hook keyed on
it re-frames the *outgoing* subject with the *incoming* project's rig for the
length of its own fade — Capsule C1 leaving for home grew four times over and
past the edges of the window. `useModelTuning` and `useNarrowTuning` both had
it; `useProductTuning` never did, which is why only the GLB subjects flinched.
`shownId` is declared above all three now. See **Home is the project screen**
in `README.md`.

**Four subjects changed.** Red Dead Redemption 2 and Grand Theft Auto V both
stood on the same `DiscHolder` — one disc case, twice — and are `MODELS` now:
`rdr2-revolver.glb` and `gta-v-rifle.glb`, the two files `PENDING_MODELS` had
been holding names for. Plus One's rounded-box `Phone3D` is a modelled iPhone
17 Pro Max with the app running on its glass (`src/three/Phone17.tsx`), and
StitchFam's picture mount is gone so the loop runs the whole face of the frame.
Three traps came with them, all written up in `README.md` — the `Plane` strip
was a *prefix* test and hid three real parts of the revolver; the two guns are
exported down different axes so neither `turn` transfers; and the Plus One
capture is horizontally squeezed on purpose, so correcting its aspect breaks
it. Every clip a piece wears is served from `public/videos/`, never resolved
out of `src/assets/` — an asset a project quotes becomes a step in the tile
rail, and a texture is not a frame.

**A phone has no leader lines.** Below the breakpoint the picture keeps the
marks — the ring, the dot, the ping, plus a number beside each — and every
sentence moves into a deck under the stage: one card, swiped, with pips and a
count (`MechFacts.tsx`). Press a mark and its card comes up; swipe to a card
and its mark lights. It is not a smaller fan, and it cannot be: a card's box is
in frame units while its type is on `--type`, which has a rem floor and stops
shrinking with the window, so a readable sentence needs about seventy per cent
of a phone's width and three of them cannot be arranged around a subject on the
same screen. Every symptom of that — cards clipped mid-word, printed over each
other, running off the edge — looks like a placement bug and is one sum. The
full arithmetic is in **The leaders, on a phone** in `README.md` and at the top
of `leaders.ts`. Two consequences worth knowing: `toNarrow` is gone (a phone
places one point, not two), and `tipsFor` clamps a *reused* wide tip onto the
picture while leaving a genuinely narrow-placed one alone.

**The frame transition is settled.** It is not the field of cells any more —
that was called "somewhat ugly", and the four replacements on the table (CRT
collapse, scanline sweep, ordered dither, slat flip) were all more cover. What
it is instead is a sequence: the picture fades out, the labels pointing at it
follow it out, the next picture fades in, and its labels draw themselves in.
Four beats, timed in `Mech.css` beside the rules that use them, with `EXIT_MS`
in `Mech.tsx` covering the first two. Every exit has **its own keyframes** —
`mech-unpop`, `mech-undraw`, `mech-out` — never the entry with
`animation-direction: reverse`: an animation is only restarted when its
`animation-name` changes, so reusing the name leaves the finished entry running
and the exit never plays. The canvas and its grid are gone; see
**The swap** in `README.md`, and `50629fd` for the dissolve if it is wanted.

**One reveal, and it is typing.** There used to be two — `Typed` on the title
and a GSAP `SplitText` fade-per-character (`SplitReveal`) on taglines, fold
titles and the index sheet. `SplitReveal.tsx` is deleted; `Typed.tsx` takes
`delay`, `speed` and `caret` so short labels can be quick and caret-less. SVG
text cannot use it (the leaders are drawn in user units), so `useTypedSvg` in
`Mech.tsx` does the same thing straight onto the node.

**The cast fades, it does not scale.** Every material under a subject is
switched to `transparent` for the length of the fade and back to opaque once
it settles, so transparent-material sorting is only paid for while something
is moving.

**Home is not a separate screen.** `/v3` and `/v3/p/<id>` are the same
component: `Mech` with `id` either a project or `null`. Three slots swap — the
stage, the side column, the bottom strip — and everything else is never
remounted, which is why the background does not flicker when you open a
project. Do not reintroduce a second root component for home; the flash that
used to be there was the second one painting over the first. See **Home is the
project screen** in `README.md`.

**Leva's `set()` throws if you hand it a key with no input.** Reseeding a
per-item folder (`productTuning.ts`, `modelTuning.ts`) passes the whole tuning
object, so every field on that object must exist in the schema. Add a field to
`PieceTuning` without adding its control and the whole app unmounts to a blank
paper gradient — which looks like a CSS bug, not a crash. Check the console.

**The home canvas wears Mr. Takahashi's lens and exposure.** Focal length is
free to copy across subjects — `fill` sets the framing and the camera backs
off to hold it — but exposure is one number for the whole canvas and ACES is
not linear, so his `28.5 @ 0.05` cannot be rewritten as `1.43 @ 1`. The cast
runs at his 0.05 and the other four are scaled to suit; the wave has a lens of
its own. Don't "tidy" the exposure back to 1.

**Home's green drifts, and nothing else's does.** The wave already turned its
own hue; `tint.ts` applies the same rotation to `--accent`/`--accent-rgb` on
`.mech`, so the grid, the title, the index and every lit edge turn with it.
One knob — **Panel swing** on the Wave tab, degrees of hue, 0 off and 360 a
full turn at the field's own rate. Off on a project screen by construction.
Written thirty times a second rather than sixty: a custom property on `.mech`
invalidates style for the whole readout under it.

**The name moved behind the cast.** It used to be the first two things in
`.mech-side` — small, typed in next to whichever project the pointer was on,
and swapped over to that project's own title on hover. Both were wrong for
the one thing on the page that says whose site this is: `.mech-hero-name` in
Mech.tsx is a new full-bleed layer, home only, drawn before `.mech-stage` so
it sits behind the line-up without needing a z-index of its own — `.mech-lede`
now stays empty on home and only ever fills in for a project. `nameTuning.ts`
is its panel, the **Name** tab: Size nudges the width-fitted size, Vertical
moves it off centre, Opacity is how much shows through the cast standing in
front of it. The long intro paragraph that used to sit under the old title is
gone outright, not hidden — `.mech-brief` was never a project screen's, only
home's fallback state, and there is no fallback state left to have one.
`.mech-wordmark`, the corner signature, only mounts when `!home`, so home is
not saying the name twice — and the two hand the name to each other rather
than one fading as the other appears. Opening a project backspaces the big
one out; a beat later the corner one types itself in. `Typed` grew `back` for
it, deleting from wherever the line actually got to. The flag is `transiting`
in Mech.tsx, set only in the retarget effect and cleared on the same beat
`shownId` changes — deliberately **not** `phase`, which is also `'out'` for
an ordinary tile-rail step, and the name has no business reacting to a
picture changing. Both hero lines are Clash Display now; the kicker was the
page's Helvetica, which made one block read as a caption on a title.

**A second grid, a second toggle.** `.mech-grid` in `MechHud.tsx` — the flat
phosphor lines behind the whole readout, every screen — is unrelated to the
wave's own 3D one beyond sharing a word. Its control lives on the Wave tab
anyway as `grid` on `CastWave`, next to the wave's `on`, because that tab is
already "is the ground on" and a second tab for one checkbox would cost more
than it explains.

**The hover spotlight is gone, after two attempts.** Canvas-wide
`toneMappingExposure` breathing on hover lifted all five subjects at once (one
tone map, one canvas, nothing to scope it to). `dim` on `CastStudio` replaced
it — each subject's own `keyIntensity`/`fillIntensity` scaled in `Placed`'s
per-frame loop, on refs to that subject's own two `directionalLight`s, each on
its own three.js layer with its own `focus` prop — and *still* read live as
every subject lifting slightly, together. Both are out rather than a third
mechanism stacked on a second that did not behave as reasoned. `exposure` is a
static canvas baseline, every subject sits at exactly what its `CastLight`
authored, and what answers the pointer is the tag being drawn and the subject
stepping forward. If a spotlight is ever wanted again, `git show 4a322c0` has
the second attempt intact — but read the note in the README first: the old
roster dimmed everything unselected and that was removed on purpose, and a
spotlight is the same idea in nicer clothes.

**Home's bottom row of project names is gone; the objects are the index.**
Twelve boxes named every project under a stage carrying five of them as
objects, so the page asked you to read a list and look at a line-up about the
same things — and the list won, which made the objects decoration. Pointing at
a subject now puts up *that same box* (name left, number right, same border,
same radius) on a leader drawn to it: `CastTag` in Mech.tsx, `.mech-cast-box`
in Mech.css. The box opens first, empty, and the name is typed into it after —
a label that arrives whole is a tooltip. It leaves the same way backwards.
The line is SVG in stage coordinates and the box is HTML, moved by the same
rAF off `aim`, so it rides the subject's float. The seven projects with no
object are behind the header's index key, which is now both layouts' way
through the work. The number comes from `MENU`, the same order the sheet uses.

**Everything arrives shut.** A project used to open on its overview (narrow:
whatever it led with). Both are `setOpen(null)` now — the subject is on the
stage and the title above it, and an open drawer is the one thing in that
column nobody opened.

**The boot deals the grid's cells in.** `MechTiles.tsx`, once per load, a ring
travelling out from the middle of the window at the grid's own 46-unit pitch,
then it takes itself down. No rAF — one delay per cell, computed from its
distance to the centre. Only `opacity` and `transform` animate, because the
main thread on that beat is compiling shaders. The ring spacing (`RING`) is
set against how long a cell stays lit, not against a total: get that ratio
wrong and it is a grid fading up rather than a wave crossing.

**The tally moved into the footer**, left end, opposite the contact address —
it used to be its own absolute box directly above that address with the whole
left half of the line empty. The footer stays `flex-start` with the address on
`margin-left: auto`, because the tally is hidden at zero and `space-between`
would put the address mid-screen on first load.

**The header is `flex-end`.** `space-between` with one child left in it — which
is what home is, now the wordmark only mounts on a project — put the index key
against the left edge. Both the wide and the narrow header rules changed.

**Mr. Takahashi floats with the cast on home, not with himself.** His own
`floatSpeed`/`floatRange`/`floatRotation` in `modelTuning.ts` are tuned for
filling his own project screen alone, and on the stage next to four other
subjects moving by the studio's numbers, his own read as barely moving. The
cast's `Placed` now overrides those three fields with the studio's when
building the tuning `FaceScene` gets — everything else about his rig (his
lean, his gaze) still travels with him unchanged.

**Type is on its own unit.** `--type: max(var(--px), 0.0651rem)` — the same rem
that caps `--px`, but a `max()`, so type has a floor on a small window and
browser zoom can move it. At the cap it renders identically to the frame
coordinates it replaced. Every font size, letter-spacing and leading uses it.
SVG text cannot: it is drawn in user units the viewBox scales, so the leaders
and the compass multiply by `--type-k`, the ratio between the two units as a
plain number, measured off a probe in `useTypeScale`.

## Commit policy

Commit after any significant change without waiting for approval: finishing a
feature, a working checkpoint, before switching tasks, or any point where
losing the work would hurt. This overrides the global "never commit unless
asked" rule — it applies to this repo. Run `npm run build` first. Don't
force-push or rewrite history without asking.

## Documentation

`README.md` explains *why* things are the way they are, in the same order the
code is in. Update it in the same commit as the change it describes — its
sections are the reference for the scroll engine, the leaders, the
disintegration, the face, the gun, and the media pipeline.
