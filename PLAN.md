# v3 build plan

Rewritten 2026-08-24, after the first pass through it. The version this
replaces was written the same day by a model that had read the code but not
run it; several of its claims were wrong in ways that cost real time, and
those are called out below under **What the last plan got wrong** rather than
quietly corrected — the point of that section is that the next model reading
this knows which kinds of claim in a document like this are worth re-checking.

Everything in the phase list below is now either **done** and describing what
shipped, or **open** and describing something that still needs a decision or
an asset. There is no "todo" left that is only waiting on someone typing.

**How to use this doc.** Read "Ground truth" — it applies to everything and is
the three or four things about this codebase that are easy to get wrong on a
first pass. Then read whichever phase you are touching. `README.md` is the
real documentation and explains *why* each of these is the way it is; this
file is the map and the ledger.

---

## Ground truth (read this before touching anything)

### There are ten projects in v3, not fourteen

`entries` in `src/v3/model.ts` drops any project with no media, and four have
none: **`a-game`, `mr-grocery`, `visa`, `3d-printing`.** They exist in
`src/data/projects.ts` with full write-ups and they are invisible everywhere
in v3 — not on the home wall, not in the index, not reachable at
`/v3/p/<id>`. The ten that are real are block-builder, capsule-c1,
grand-theft-auto-v, mecha-station, mr-takahashi, openup,
red-dead-redemption-2, slider-engine, stitchfam, wyte-card.

This matters more than it sounds. Anything sized against "fourteen projects"
is sized wrong, and any plan to give `visa` or `3d-printing` a 3D piece is a
plan to build something nobody can navigate to. **They need media first.**

### The frame-coordinate system, and its one hole

`src/v3/Mech.css` lays out in a 1920×1080 frame. `--px` is one of those
coordinates in real pixels — `min(0.0749rem, 0.0520833vw, 0.0925926vh)`, so
whichever term is smallest wins and the composition scales as one rigid thing.
`--type` is the same idea with a `max()`, floored at a rem so text never
shrinks below readable. Every non-text size is `calc(<N> * var(--px))`; every
text size is `calc(<N> * var(--type))`. Full writeup: **README.md → "One
frame, scaled."**

The hole, and it is the whole of what was wrong with the first mobile pass:
**on a phone the `vw` term wins at about a fifth of a pixel.** A 28-unit
gutter comes out at five real pixels while `--type` holds at full size off the
rem floor. So type at desktop size lands on a layout with no space left in
it — which is what "hideous" meant: a title split in half, three leader
labels stacked on each other over a subject the size of a thumbnail.

Below 700px (`narrow.ts`) the unit is **re-based** to a 500-unit frame and
`--type` gets a lower floor of its own. Every ratio in the file lands back
where it was drawn. See **README.md → "Narrow viewports"** for the full
column order and the three behaviours that branch on the flag.

### Mr. Takahashi's lighting and rig are off-limits

`src/v3/MechModel.tsx` is not a generic model viewer — it is built for one
face. `MODEL_DEFAULTS` (`src/v3/modelTuning.ts`) carries the camera framing
*and* the lighting rig that both Mr. Takahashi and Capsule C1 render under.
**Do not edit `MODEL_DEFAULTS`, the Leva controls in `modelTuning.ts`, or the
camera/lighting code in `MechModel.tsx`** short of the user asking to retune
Takahashi specifically.

Two things now depend on this holding:

- **`MechProduct.tsx`** (the other eight projects' pieces) has its own studio,
  its own exposure and its own panel — `productTuning.ts`. The two files do
  not read each other.
- **`HeroStage.tsx`** (the home screen) likewise, in `heroTuning.ts` — except
  for the face, which is `MechModel` mounted as a second layer. Reusing the
  component wholesale was the only way to keep his rig his; a second lighting
  setup for the same head is a second face.

`public/models/` holds four files: `adam-face.glb` (2.3MB, the one that is
wired up — morph targets, no textures), `mr-takahashi.glb` (556KB, **not**
wired to anything), `capsule-c1.glb` (66KB, Draco-compressed), and
`akira-rider.glb` (4.5MB, copied in this pass), plus `medieval-door.glb` and a
`dance/` folder that nothing in v3 touches.

### v3 cannot import `src/site/products.tsx`

There is an import cycle, and entering it from the wrong end throws:
`products.tsx` imports `AdamFace`, `CapsuleC1` and `BlockBuilder`; all three
import `EXTRA_CONTROLS` from `Gallery3D`; and `Gallery3D` calls
`specDefaults()` from `products.tsx` **at module scope**. That resolves when
`Gallery3D` starts the chain, which is the only way it was ever entered — but
starting from `products.tsx` reaches that top-level call while `SPECS` is in
its temporal dead zone, and the module throws before it finishes loading. What
you see is a blank white page and
`ReferenceError: Cannot access 'SPECS' before initialization`.

**Point at the components directly** (`../three/PosStation`, `../three/Phone3D`
and so on) — `MechProduct.tsx` and `HeroStage.tsx` both do. There is nothing
left to reuse from `products.tsx` anyway: `exhibitFor` hands back a piece
already scaled, lit for a case and turned for a room, and both v3 stages
normalise, light and turn their own.

### The tuning-panel convention

Every hand-set number that is not structural gets a Leva panel, in development
only, reading from a `_DEFAULTS` constant that is the shipped value. The panel
is for finding the next number by eye — **nothing it sets reaches a visitor
until someone pastes the copy button's output back into the constant.** Eight
files now follow this shape: `modelTuning.ts`, `wallTuning.ts`,
`labelTuning.ts`, `productTuning.ts`, `narrowTuning.ts`, `castTags.ts`,
`nameTuning.ts`, and `castTuning.ts` — which is where `heroTuning.ts` went
when the five hero stages became one canvas. All
use `useControls`, a `localStorage` scratchpad, and `copyText()` from
`clipboard.ts` (not `navigator.clipboard` — the dev server is reached by IP
over Tailscale, which is not a secure context, so the direct API is silently
absent).

A panel whose contents change with what is on screen (`productTuning`,
`heroTuning`) has to **reseed rather than rebuild**: Leva reads a schema once,
so a folder built for Mecha Station is still showing Mecha Station's numbers
after the readout swings to OpenUp. Use the `useControls(() => ({…}))` form
and `set(…)` in an effect keyed on the id.

**Panels are off below 700px**, on both screens. Leva's own minimum width is
most of a 390-point window and two of them stacked cover the subject they are
for — which was one of the specific complaints that started this pass. What a
phone gets instead is `narrowTuning.ts`: two knobs, subject scale and picture
scale, and nothing else.

### Verifying changes

**Do not use the Chrome MCP / browser automation tools on this repo.** Verify
with:

```bash
npx tsc -p tsconfig.app.json --noEmit   # NOT `-p .` — the root tsconfig has an empty `files: []` and checks nothing
npm run build                            # tsc -b && vite build
```

For anything genuinely visual, the narrow exception that has been used
repeatedly without objection: drive a **headless** Chrome over the raw
DevTools protocol from a throwaway Node script — a new process, not the
extension, and thrown away when you are done. Node 23 has a global
`WebSocket`, so this needs no dependencies at all:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/throwaway \
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader about:blank &
# then: fetch http://127.0.0.1:9333/json/list, open the page's
# webSocketDebuggerUrl, and send Emulation.setDeviceMetricsOverride,
# Page.navigate, Page.captureScreenshot.
```

Three things learned doing this, all of which cost a cycle:

- **Wait in real time, generously.** `--virtual-time-budget` does not work
  here. Under SwiftShader this app takes **15–20 seconds** to mount, boot and
  paint a subject; a screenshot at 8s catches an empty page and reads exactly
  like a layout bug.
- Plain `--disable-gpu` throws inside the WebGL context and unmounts the whole
  React app, which also looks like a CSS bug. Use the ANGLE flags above.
- Enable `Runtime`/`Log` and read `Runtime.exceptionThrown` before believing a
  blank screenshot. That is how the `SPECS` cycle above was found in one pass
  instead of five.

### Never touch the dev server, and commit as you go

If `npm run dev` is running, leave it running — the user reaches it over
Tailscale from another machine and killing it reads as the site being broken.

Commit after any significant checkpoint without waiting for approval (this
repo overrides the usual default). Run `npm run build` first. Don't force-push
or rewrite history. Match the existing commit voice: short subject, plain
sentences about what changed and why, no conventional-commit prefixes and no
bullet lists.

---

## What the last plan got wrong

Not a scoreboard — a list of the *kinds* of claim that turned out to need
checking, so the next reader knows where to be suspicious.

| It said | Actually |
|---|---|
| "the 14 v3 projects" | Ten. `entries` filters out anything with no media, and four projects have none. Any table in a plan that lists projects should be checked against `entries`, not against `projects.ts`. |
| Phase 1's diagnosis: "not a sizing problem, a collision problem" | Half right, and the missing half was the whole bug. The boxes did collide, and moving them left the *unit* untouched — at 390 points `--px` is a fifth of a pixel while `--type` holds at a rem, so the fixed layout was still unusable. |
| "reuse `SpriteFlipbook` / `VideoFrame` from `products.tsx`" | Reuse the components; do **not** import that module from v3. It throws — see the cycle above. |
| "spin the `wheel` / `wheel_wheel_0` / `wheel_wheel_0.001` nodes" | Spinning `wheel` orbits the rear wheel around the front one and sails it off the top of the frame — it is a *group* holding the other two, and the second sits 25 local units from the first. Only the leaves turn. |
| Nothing said about the rider's skinning | It has to be cloned with `SkeletonUtils.clone`, not `Object3D.clone`, or the legs hang in the air a foot above the bike. |
| "only `adam-face.glb` is in `public/models/`" | `mr-takahashi.glb` is there too (556KB). It is still wired to nothing, but the file exists. |
| Phase 4: "write `HeroModel.tsx` for Takahashi's loading and framing" | Unnecessary. `MechModel` is mounted as a second layer on the home stage, unchanged — two WebGL contexts, one running at a time, and his rig stays exactly one file. |
| Nothing said about Draco | `capsule-c1.glb` is Draco-compressed; `useGLTF` needs `'/draco/'` passed or it reaches for Google's CDN. |
| "verify with a handful of `Page.captureScreenshot` calls" | Correct, but it did not say how long to wait. Under SwiftShader this app needs 15–20 seconds before it has painted anything. |
| Nothing said about the two stylesheets sharing a namespace | `src/site/base.css` claims `[data-reveal]` globally and both stylesheets are in one bundle, so a v3 element marked `data-reveal` picks up v2's hidden-until-scrolled styling — on *desktop*, where v3 has no scroll reveal at all. Any bare `data-*` selector is shared; namespace them. |

---

## Phase 1 — The narrow layout for the project screen · **done**

Rebuilt this pass, not merely fixed. `--px` is re-based below 700px, the
column is reordered around the subject (stage → the notes set out flat → the
tile strip → title and every section open → contact, with the deck floating),
the leaders are off at that width, the title is capped against the width it
actually has, the header folds into `MechMenu.tsx`, and the two big Leva
panels give way to `narrowTuning.ts`.

Full writeup: **README.md → "Narrow viewports"**. Every rule is scoped under
`.mech[data-narrow='true']` or the 700px query, so desktop is untouched by
construction.

A second pass on it went further, and the notes behind it are worth keeping
because none of them were guesses about phones in general — they were things
looked at on a real screen:

- **The reading order is not the markup order.** The frame is a flex column
  below the breakpoint and `.mech-side` is dissolved with `display: contents`,
  so the name sits above the picture and the write-up below the tile strip.
- **The leaders are back**, in a canvas with the stage's own proportions. They
  were never too small — they were being stretched two to one by a 1920×1080
  viewBox on a 390×409 box. See README.md → "The leaders, on a phone".
- **One section open on arrival**, the rest on tap, the same accordion the
  wide layout has.
- **Everything arrives as it is reached**: `SplitReveal` holds its cascade
  until a line is in view, blocks fade up on `data-arrive`, and the grid moves
  with the scroll.

The one thing worth repeating here because it is a trap: `scrollIntoView`
must name **both** axes. `block` defaults to `'start'` when left out, and
narrow the page itself is the vertical scroller — asking only for
`inline: 'nearest'` scrolls the whole window down to put the tile strip at the
top and takes the subject off the screen entirely.

## Phase 2 — Getting to another project · **done, then redone**

First pass: `.mech-projects`, every project named along the bottom edge, and a
tag row in the header that stepped to the next project carrying whichever tag
was pressed. That held up to about ten projects and then read as clutter —
neither one told you where you actually were, and the tag row wrapped onto the
title at the frame's own larger sizes.

**Both are gone now.** `.mech-menu-key` is the only route, on both layouts:
the same three-line control that already opened `MechMenu.tsx` on a phone
opens it on a desktop window too. The "no menu behind a button" constraint
that held on desktop and was explicitly overridden on a phone ("just stick the
stuff into a menu come on") turned out to be the right call for any window
once there are enough projects that a row can't hold them — it just took a
second round to see that ten was that number on *every* layout, not only a
narrow one. **README.md → "Getting to another project"**.

## Phase 3/4/5 — The home hero select · **done, then redone**

First pass: a character select over the dimmed wall, one subject up at a time,
a roster of five along the bottom swapping which was shown. Said explicitly to
read as "switching characters" rather than a cast, and the wall — good at *how
much of this there is*, bad at *what this is* — was still competing with it.

**What's there now:** all five subjects up together, each on its own
`HeroStage` rather than sharing a camera; a grid of every project underneath,
standing in for the roster; and a readout between the two that fills in on a
press rather than a swap. Picking a project box *selects* — the matching
subject, if it has one, rings with light, the readout draws in its name, line,
a brief overview and an obvious way in — and pressing the box again is the way
in. The wall is gone; `.v3-scifi-bg` (a phosphor grid and a bloom, the project
screen's own voice, plain CSS) is what the stage sits in front of now.
`DriftWall.tsx`/`wallTuning.ts` are untouched, just unmounted.

Full writeup: **README.md → "The hero select"**, including the five-stages
trade, why `.v3-home` is the one screen that overrides "`.v3` does not
scroll" (a cast this size and a ten-box grid do not fit one viewport the way
five small tiles did), and everything the rider needed.

## Phase 6 — Every project's own piece · **done**

Eight of the ten had a photograph where the subject should be.
`MechProduct.tsx` stands their existing v2 pieces on the stage, as a third
`Frame` kind (`piece`) beside `model` and `flat`. Its own studio, its own
panel, and it points at the components directly for the cycle reason above.

**README.md → "The subject, when there is no model"** has the rest.

Open, and it is an asset problem rather than a code one: `DiscHolder` (Red
Dead and GTA) has **no cover art** — both cases render blank. See the
component's own comment.

## Phase 7 — Contact · **done**

`hello@tarloksingh.com` on both screens, given the shape the rest of the
instrument panel has rather than reading as a credit line. Still a `mailto:`
on both; this is a static site and a contact *form* would need a backend
nobody asked for.

## Phase 8 — Tuning coverage · **done, with one deliberate gap**

Every number this pass introduced is on a panel with a copy-to-source button:
`heroTuning.ts` (the five subjects' size/turn/lift, the studio, the rider's
wheels and shake), `productTuning.ts` (each piece's size/turn/lift, the
studio), `narrowTuning.ts` (the phone's two).

**The gap, on purpose:** the creatures' timings (`MechBird.tsx`'s flight gaps,
`MechMoth.tsx`'s startle radius and dash speeds) are plain constants. The bird
never had a panel and nobody has wanted one; giving the moth one and not the
bird would be worse than either. If these ever want tuning, they should get
*one* folder covering both, not one each.

The per-piece and per-subject sizes in `PIECE_DEFAULTS` and `HERO_POSES` are
**starting points, set by eye against a real render, not settled numbers.**
That is exactly the split the user asked for — don't hand-tune them, do make
sure they can be.

## Phase 9 — Creatures · **done, one decision still open**

Two animals now, on the home screen and every project screen: the bird
(crosses on an arc, can be led) and the moth (sits still on the panel until
the reticle comes near, then panics). Two different shots rather than a
recolour. **README.md → "Two animals, and a tally"**.

Adding the second meant generalising the gun: `quarry.hit` was a single slot
one creature claimed on mount, so a second would have silently replaced the
first. It is `quarry.creatures`, a `Set`, now.

**Shooting works on touch now** — asked for explicitly, and it turned out not
to be the compromise it looked like. A tap fires a bolt *at* the point you
touched, so it is still a shot rather than a swat; the bolt still has to reach
the creature; and the moth, which cannot be approached by a finger, is
startled by the page moving instead. The one thing that stayed desktop-only is
the reticle, because there is nothing to draw a reticle around.

Three details that are easy to get wrong and are written up in
**README.md → "Two animals, and a tally"**: a mouse fires on `pointerdown`
and a finger on `pointerup` (every scroll starts with a `pointerdown`, so
firing there is a bolt per flick); creatures are named exceptions in the gun's
`allowed` check so a press on one is a shot rather than a swat; and both get
an invisible hit area on a coarse pointer, because they are drawn at the size
they should look.

## Phase 10 — The tally · **done**

`kills.ts`, `localStorage`-backed, read through `useSyncExternalStore`. Counts
across every screen and across a reload; renders as one more digit readout on
the instrument panel, and not at all at zero.

## Phase 11 — The deck · **done**

The colour pass is in: the meter is a real spectrum keyed to each bar's own
analyser bin, the housing's glow is keyed to the average of the band, and all
of it is the palette already defined on `.mech`. **README.md → "The deck has
colour"**.

**Open, and it needs the user:** `src/assets/audio/` still holds one
procedurally-synthesised placeholder loop, generated with `ffmpeg` so there is
no licensing question. It exists so the deck could be seen playing at all.
Real tracks drop into that folder and appear with nothing else to wire.

## Phase 12 — A third round of mobile and creature fixes · **done**

- **Mr. Takahashi's hit box was wrong on narrow.** `quarry.subject.rect()` in
  `Mech.tsx` scaled off a hardcoded `MODEL_BOX` and `box.width / 1920`
  regardless of layout — correct on the wide frame, but the narrow stage is
  its own `space` (see `leaders.ts`), and the model's actual box there is
  `boxOf(current, space)` centred at a different fraction of it entirely. The
  hit box and the drawn face disagreed enough that a bolt low on the stage —
  the bottom half of the face — never registered. Fixed to use `boxOf` and
  `space.w`, the same sum the leaders already draw against.
- **The moth was too fast to hit.** `DASH` (its panic speed) was 340–620px/s;
  slowed to 150–280. Recoloured off `--accent` (the panel's own green, which
  is what "the green bug thing" was) onto its own `--moth`/`--moth-rgb` token,
  red, so it reads as a different kind of target from the bird at a glance
  rather than reusing the panel's colour for something you're meant to be
  annoyed at.
- **The bird was "dumb slow" on a phone.** `CROSS` was a fixed 7.5–13 seconds
  regardless of window width — fine on a 1920px monitor, but the same
  crossing on a 390px phone is four or five times slower in actual pixels.
  Replaced with a `SPEED` in px/s (the same units the moth's `DASH` already
  uses) and a `took` derived from the crossing distance, so the bird covers
  ground at the same pace on any screen.
- **The mobile menu's tag row trimmed.** `video games`, `hardware`, `3d` and
  `film` dropped from `MechMenu.tsx`'s shortcut row, leaving `tools`, `motion`
  and `music` — the ones actually worth a shortcut above a list that already
  names every project by title.

---

## What is actually left

Everything below needs either an asset or a decision. None of it is blocked on
code.

1. **`a-game`, `mr-grocery`, `visa`, `3d-printing` have no media**, so they do
   not exist anywhere in v3 — including the home screen's project grid, which
   like the index draws only from projects with something to show. Add stills
   or clips to `src/assets/<id>/` and run the pipeline (see CLAUDE.md →
   "Adding media") and they appear on the home grid, the index and their own
   screen with nothing else to do. `visa` and `3d-printing` already have
   pieces built in `src/site/products.tsx` that could then be wired the same
   way the other eight are. It is also why the home screen's tag shortcuts
   (`tools`, `motion`) can come up empty for some projects: the only projects
   carrying those tags are among the four with no media yet.
2. **Cover art for `DiscHolder`** — Red Dead and GTA both render a blank case.
3. **Real audio.**
4. **The per-piece and per-subject sizes** want the user's eye. Every one is a
   slider with a copy button; nothing is baked.
5. **The audio deck's design** — the user has one coming. The colour pass in
   Phase 11 is in and driven by the real analyser signal, but the *shape* of
   the thing (a strip on the wide layout, a floating key with a sheet on a
   phone) is this pass's guess and is expected to be replaced. Nothing else
   depends on it: `MechDeck.tsx` owns its own markup on both layouts and the
   only thing outside it is `.mech-deck*` in Mech.css.
6. **The five heroes are a choice, not a fact.** The roster is `HEROES` in
   `heroes.ts` and reordering or replacing an entry is a few lines. The
   Solomon rider is the only one with no case study behind it, and its readout
   says so rather than pretending there is somewhere to go.
