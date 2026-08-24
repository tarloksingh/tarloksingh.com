# v3 build plan

Written 2026-08-24, for whichever model picks up each phase — Opus, Sonnet, or
otherwise. Every claim in here (file names, functions, what already exists,
what doesn't) was verified against the actual code and filesystem that day,
not guessed from the file layout. Where something might have moved by the
time you read this, re-grep before trusting the line number.

**How to use this doc:** each phase below is meant to be executable on its
own, by a model with no memory of this conversation. Read "Ground truth"
first — it applies to every phase and explains the two or three things about
this codebase that are easy to get wrong on a first pass. Then read the one
phase you're doing. Update its **Status** line when you start and when you
finish, and leave a one-line note if you stopped partway through — the next
model to open this file needs to know where you left off, not just that you
touched it.

Status legend: `todo` · `in progress` · `done` · `blocked (needs: ...)`

---

## Ground truth (read this before touching anything)

### The frame-coordinate system

`src/v3/Mech.css` — the project screen — lays out in a 1920×1080 Figma frame.
`--px` is one frame-unit in real pixels: `min(0.0749rem, 0.0520833vw,
0.0925926vh)`. Whichever term is smallest wins, so the composition scales as
one rigid thing and never crops. `--type` is the same idea with a `max()`
instead, floored at a rem so text never shrinks below a readable size and
still grows with browser zoom. Every non-text size in the file is
`calc(<N> * var(--px))`; every text size is `calc(<N> * var(--type))`. Full
writeup: **README.md → "One frame, scaled."**

The one thing the README doesn't spell out, because it wasn't true until a
phone was involved: **`.mech-frame` is always 100% of the viewport's height**
(it's a child of `.mech`, which is `position: fixed; inset: 0`) **and its
width is `calc(1920 * var(--px))`, capped at ~2300px, pillarboxed on anything
narrower or wider than ~16:9.** On a portrait phone the vw term binds, so the
frame is exactly viewport-width wide but still full viewport-height tall —
e.g. 390×844. Everything inside it — header, the title/folds column
(`.mech-side`), the stage (`.mech-stage`), the thumbnail rail
(`.mech-rail-wrap`), the deck, the footer — is `position: absolute` with
frame-unit insets from that box's edges, not laid out side by side. On
desktop this works because `.mech-stage` is a centred 16:9 island in the
middle of the frame and `.mech-side`/`.mech-rail-wrap` sit in the margins
either side of it, at insets tuned so they never touch. On a portrait phone
those margins collapse toward zero while `.mech-side` and `.mech-rail-wrap`
keep their full frame height (their `top`/`bottom` insets are tiny at phone
`--px`) — so both become ~77px-wide, ~800px-tall text columns sitting on top
of a horizontally-centred, vertically-tiny 16:9 stage. That is the actual
mobile bug: not "too small," but two absolutely-positioned columns colliding
with the stage because the layout was never given a narrow-viewport case.
**Phase 1 below is this fix**, and it's the one this session implemented —
read it before assuming the bug is still open.

### Mr. Takahashi's lighting and rig are off-limits

`src/v3/MechModel.tsx` is not a generic model viewer — it's built for one
face. `MODEL_DEFAULTS` (in `src/v3/modelTuning.ts`) carries the camera
framing *and* the lighting rig (`exposure`, `envIntensity`, `keyIntensity`,
`fillIntensity`, `envMapIntensity`, `roughnessBoost`, `metalnessScale`) that
both Mr. Takahashi and Capsule C1 currently render under — see
`src/v3/model.ts`'s `MODELS` record, which is only those two entries. The
morph-driving code in `MechModel.tsx` (`IDLE`, `THINK`, `HURT`, blink,
mouse-follow) only does anything on a mesh that has those morph targets
(Takahashi's), so it's a harmless no-op on anything else — but the lighting
numbers are shared, and Capsule C1 is already tuned to look right under them.
**Do not edit `MODEL_DEFAULTS`, the Leva controls in `modelTuning.ts`, or the
camera/lighting code in `MechModel.tsx`** for any reason short of the user
asking to retune Takahashi specifically. Full lineage, including why there
are three GLBs on disk and which one is real, is in this repo's Claude memory
under `takahashi-model-lineage` if you have access to it; the short version
is `public/models/adam-face.glb` is what's actually wired up today (not the
21MB textured export the memory mentions — that one never landed in
`public/models/`, only `adam-face.glb` is there).

**New 3D pieces for other projects (Phase 6) must not go through
`MechModel.tsx` at all.** Give them their own small mount (Phase 6 spells out
why and how) so nothing about them can leak into Takahashi's rig by accident.

### The tuning-panel convention

Every hand-set number that isn't structural gets a Leva panel, in development
only (`hidden={!import.meta.env.DEV}`), reading from a `_DEFAULTS` constant
that is the actual shipped value. The panel is for finding the next number by
eye — **nothing it sets reaches a visitor until someone pastes the panel's
copy-button output back into the `_DEFAULTS` constant in source**. Three
existing examples to copy the shape of: `modelTuning.ts` (the subject),
`wallTuning.ts` (the old wall — see Phase 3 on whether it's still needed),
`labelTuning.ts` (the leader-label editor). All three use `useControls` from
`leva`, a `localStorage` scratchpad so a session survives a reload, and a
`button()` control that calls `copyText()` from `clipboard.ts` (not
`navigator.clipboard` directly — the dev server is reached over Tailscale by
IP, which isn't a secure context, so the direct API silently doesn't exist;
`clipboard.ts` already handles the fallback). Any new tunable surface (Phase
6's per-project pieces, Phase 3's home-hero framing, Phase 9's creature
spawn/hit tuning) should get a folder in one of the existing panels or its own
`useXTuning.ts` file in the same shape — not a one-off `useState` with magic
numbers.

### Verifying changes

**Do not use the Chrome MCP / browser automation tools on this repo** — the
user has said this explicitly and it costs real money in tokens for no
benefit here. Verify with:

```bash
npx tsc -p tsconfig.app.json --noEmit   # NOT `-p .` — the root tsconfig has an empty `files: []` and silently checks nothing
npm run build                            # tsc -b && vite build; catches what --noEmit alone can't
```

If a change is genuinely visual (a layout reflow, an animation, a Leva panel)
and those two commands can't tell you whether it looks right, say so
explicitly rather than skipping verification or reaching for Chrome MCP
anyway. There is one narrow exception that has been used before without
objection: serving `dist/` with `python3 -m http.server <port>` and driving a
**headless** Chrome instance over the raw DevTools protocol from a throwaway
Node script (new process, not the extension) — a handful of
`Page.captureScreenshot` calls, no MCP round-trip. If you do this: launch
with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`
(plain `--disable-gpu` throws inside the WebGL context and unmounts the whole
React app, which then looks like a CSS bug), wait in real time rather than
using `--virtual-time-budget` (it doesn't work here), and throw the whole
thing away when you're done — it's a debugging aid, not something to leave
running.

### Never touch the dev server

If `npm run dev` is already running, leave it running — don't `pkill` it,
even after using it to check something. The user reaches it over Tailscale
from another machine, and killing it reads as the site being broken.

### Preserve custom work

Several projects' 3D pieces already exist and are already tuned — see the
asset inventory below and Phase 6. When a phase's honest best move is to
reuse something rather than build it fresh, reuse it. If something genuinely
doesn't fit the new direction, say so in this file rather than silently
dropping it.

### Commit policy (this repo only)

Commit after any significant checkpoint without waiting for approval — this
overrides the normal "ask before committing" default, per this repo's
`CLAUDE.md`. Run `npm run build` first. Don't force-push or rewrite history.
Match the existing commit voice: short, lower-case-first-word-fine, plain
sentences about what changed and sometimes why (`git log --oneline -20` shows
the pattern) — not conventional-commit prefixes, not a bullet-point body.

---

## Asset inventory

Grounded against the filesystem on 2026-08-24. Paths are relative to the
repo root unless marked otherwise.

| What | Where | Notes |
|---|---|---|
| Mr. Takahashi (rigged, wired) | `public/models/adam-face.glb` | 2.3MB, no textures, carries the morph targets `MechModel.tsx` drives live. This is the one that's actually on screen today. |
| Capsule C1 | `public/models/capsule-c1.glb` | 66KB, already wired into both `src/v3/model.ts` and `src/site/products.tsx`. |
| Akira rider (motorcycle) | `~/Documents/GitHub/solomon-game/game-3d/models/akira-rider.glb` | **Outside this repo** — a sibling checkout at `~/Documents/GitHub/solomon-game`. 4.5MB glTF-binary. Copying it into `public/models/` is a pure read from that repo; nothing about it is touched. **Carries zero baked animations** (`gltf.animations` is an empty array) — "riding at max speed" has to be built procedurally here, not played back. Its node graph does have separate `wheel`, `wheel_wheel_0`, `wheel_wheel_0.001` nodes and a `CC_Base_*` rig under `RL_BoneRoot` for the rider, plus `Akira_Guy_500k[.001]` and `node_0[.001]` for the body meshes — so a real wheel-spin is possible, just not a baked one. See Phase 4. |
| StitchFam loop | `public/videos/stitchfam-hero.mp4` | **Already in this repo**, already small. The user's "grab it from the Desktop Assets folder" isn't necessary — it's the same footage, already framed for the web. Currently mounted (in the *old* `src/site/` gallery, not v3) via `src/three/VideoFrame.tsx`, a hand-built 3D picture frame with the video inset as a texture. Reuse `VideoFrame` as-is for the home hero (Phase 4) rather than writing a flat `<video>` — it's proven and it's more in the spirit of "a piece standing for the project" than a raw tag would be. |
| Slider Engine fish | `public/sprites/fish-man-idle/Fish_Man_Idle_000{00..13}.png` | 14-frame PNG flipbook, already in this repo. Reuse `SpriteFlipbook` exported from `src/three/CapsuleStage.tsx` (`<SpriteFlipbook frames={...} fps={12} scale={...} />`) — it's a camera-facing `Billboard`, already proven in `src/site/products.tsx`'s `slider-engine` entry. |
| Every other project's 3D/2D piece | `src/site/products.tsx` | The *current, live* (not archived) registry the old site's gallery reads. 12 of the 14 v3 projects already have a hand-built piece here — see Phase 6's table. Only `a-game` and `mr-grocery` have nothing. |
| Audio | `src/assets/audio/` | Empty except its own README. `src/data/tracks.ts` globs this folder — drop a file in, it appears in the deck, nothing else to wire. See Phase 11. |

---

## Phase 1 — Mobile layout for the project screen

**Status: done** (this session, 2026-08-24 — see commit "Give the project
screen a narrow layout" or nearby).

**Goal.** `/v3/p/<project-id>` (`Mech.tsx` + `Mech.css`) reflows correctly on
a phone-width viewport without changing anything about the desktop layout.

**What was actually wrong.** See "The frame-coordinate system" above — not a
sizing problem, a collision problem. `.mech-side` (title/tagline/folds) and
`.mech-rail-wrap` (thumbnail rail) are absolutely positioned at frame-unit
insets that assume a wide frame with room either side of the centred 16:9
stage. On a narrow frame both columns keep the full frame height and shrink
to ~77px wide, sitting on top of the stage instead of beside it.

**Approach taken.** A single new breakpoint, `700px` (`NARROW` in
`Mech.tsx`, `@media (max-width: 700px)` in `Mech.css`), chosen because it
comfortably covers phones in portrait (most are 360–430px wide) and small
tablets without also firing on a narrow *desktop* window, which the
letterbox/pillarbox behaviour already handles fine down to a real minimum. A
small reactive hook (`useNarrow()`, next to `useTypeScale` in `Mech.tsx`)
tracks `matchMedia('(max-width: 700px)')` and sets `data-narrow` on the root
`.mech` div, the same pattern as the existing `data-boot`/`data-pins`
attributes.

Below the breakpoint, the chrome stacks in normal document flow instead of
overlapping via absolute positioning: header (compact), stage (kept at 16:9
— touching its aspect ratio would mean touching the leader-line math in
`leaders.ts`, which reads the stage's live `getBoundingClientRect()` and was
left alone on purpose), title/tagline/folds, then the rail, then deck + foot.
The thumbnail rail switches from a vertical list to a horizontal swipe strip
on narrow layouts — the natural mobile pattern, and it frees up vertical
space the folds need. That meant branching the two places in `Mech.tsx` that
assumed a vertical rail: the arrow-key `scrollIntoView` call
(`{ block: 'nearest' }` → `{ inline: 'nearest' }` when narrow) and the
scrubber's `update()` function (`scrollHeight`/`clientHeight`/`scrollTop` →
`scrollWidth`/`clientWidth`/`scrollLeft`, and the CSS custom properties it
writes go from `--thumb-h`/`--thumb-top` to `--thumb-w`/`--thumb-left`).

All of this is additive: every existing selector, every desktop rule, every
piece of `Mech.tsx`'s state machine is untouched. The narrow rules live in
one new section near the end of `Mech.css` (search `narrow viewports`)
rather than scattered per-section, which doesn't match how the
`prefers-reduced-motion` overrides are scattered through the file — flagged
here as a deliberate deviation, not a miss: this is a whole new layout mode,
not a one-off override, and one place to find "the mobile styles" seemed more
useful than four.

**Files touched.** `src/v3/Mech.tsx`, `src/v3/Mech.css`.

**Definition of done.** `npx tsc -p tsconfig.app.json --noEmit` and
`npm run build` both clean. Desktop (`≥701px`) renders byte-identical to
before — every new rule is scoped to `[data-narrow='true']` or the `700px`
media query, so this should be true by construction, but re-check the diff
if you're picking this up mid-stream. On a narrow viewport: header doesn't
overlap the stage, title and folds are full-width and legible (not a
77px-wide ribbon), the rail scrolls horizontally and its scrubber tracks the
right axis, deck and footer are reachable without covering anything.

**What Phase 1 deliberately did not do.** The bird, reticle, laser and HUD's
pointer-tracking stay desktop-only (`matchMedia('(pointer: fine)')`-gated) —
that's an existing, consistent, deliberate choice across `MechBird.tsx`,
`MechCursor.tsx`, `MechLaser.tsx` and part of `MechHud.tsx`, not something
this phase's brief ("make it fit") covers. If a later phase (9) wants
shooting to work on touch, that's a separate, bigger decision — see Phase 9.
`MechHud`'s compass strip still renders on mobile (unconditionally in JSX)
but sits static at "000"/"0000/0000" since its tracking effect never starts
without a fine pointer; cosmetic, left as-is.

---

## Phase 2 — Project navigation in the header

**Status: todo.**

**Goal.** From a project screen, reach any of the other 13 projects without
it feeling like "push a button to push another button" (the user's words) —
and without the header filling up with 14 names.

**Current state.** `Mech.tsx`'s `<nav className="mech-nav">` (search
`TAGS.filter`) does not list projects — it lists *tags* (`visual design`,
`3d`, `branding`, etc. — see `TAGS` in `src/data/projects.ts`), each one a
button that jumps to "the next project carrying this tag" in a round-robin.
There is no way, from the header, to see or jump straight to a specific named
project. `MechHud.tsx` is not this — it's the decorative compass/coordinate
readout, unrelated to navigation.

**Constraint from the user:** no menu-behind-a-button (a control that opens a
second control). It should read as part of the instrument panel, not as a UI
affordance bolted on.

**Suggested approach — a second, always-visible strip, not a menu.** The
existing `.mech-rail-wrap` (thumbnail strip, right edge) is already "browse
by clicking a small tile," just scoped to the current project's frames. The
same visual language — small square/rect tiles, a scroll strip, a lit
`aria-pressed` state — reads naturally as *the same kind of control* one
level up: a second, thinner strip (project *tiles*, not frame tiles) that's
part of the permanent chrome, not a click-to-reveal panel. Candidates, roughly
best-fit first:

1. **A compact always-on strip along the header itself**, replacing or
   sitting alongside `.mech-nav`'s tag pills: 14 short labels (or single-
   letter/initial chips with the full title as `title=`/on-hover, mirroring
   how `.mech-tile` already does `aria-label`+`title` for frames without a
   thumbnail) that wrap or scroll horizontally rather than needing a second
   interaction to appear. At `15.5 * var(--type)` (the current nav font
   size) 14 full titles won't fit even on a wide desktop window — worth
   trying abbreviated forms (first word of each title, or a 2–3 letter
   monogram in the same voice as the compass HUD's digit readouts) with the
   full title as a tooltip, and the *current* project always spelled out in
   full the way `.mech-nav-here` already does.
2. **Keep the tag pills, add project jumps as a second always-visible row**
   directly under the header (not inside it, so it doesn't have to fight the
   tag row for width) — e.g. a thin horizontal strip of 14 small ticks/chips
   docked under `.mech-head`, always rendered, using the same
   `entries`/`shownId` data `Mech.tsx` already has in scope.
3. If neither reads as small enough: cut the *tag* pills down to only the
   tags the *current* project carries (removing the ones that read as
   "disabled" today — `along.length === 0` — since a permanently-greyed-out,
   permanently-unreachable pill is worse chrome than not showing it) and use
   the freed width for a compact project strip.

Whichever shape, wire it the same way the tag pills already are:
`onProject(next.project.id)` (the prop `Mech.tsx` receives from `V3.tsx`),
`sound.select()` on click, and reuse `entries` from `model.ts` (already
imported) for the full ordered project list rather than re-deriving it.

**Files likely touched.** `src/v3/Mech.tsx` (the `<nav>` markup),
`src/v3/Mech.css` (`.mech-nav` and neighbours). If Phase 1 isn't done yet
when you start this, be aware `.mech-head`/`.mech-nav` also need to survive
the narrow breakpoint — check Phase 1's status before assuming the header
is only ever laid out one way.

**Definition of done.** Every project reachable in one click/tap from any
other project's screen, with no click that only opens another click. Current
project always distinguishable from the rest (as it is today via
`.mech-nav-here`). `tsc`/`build` clean.

---

## Phase 3 — Home screen: hero-select structure

**Status: todo.** Depends on nothing else in this list, but Phase 4 (the
actual heroes) and Phase 5 (the transition between them) are what make this
worth doing — do them together if you can.

**Goal.** Rebuild `/v3` (`src/v3/Home.tsx`) into the layout the user
attached a reference image for: an Overwatch-style hero-select screen. A
small number of large, prominent subjects rendered up front — not one, and
not the current wall of ~200 small drifting tiles — with a bottom panel to
step through them, a name/role readout top-right, and the site's own chrome
(wordmark, index link, contact) around the edges.

**Current state.** `Home.tsx` renders `<DriftWall items={wallItems} />` —
every clip and still across every project, drifting continuously in a
"React Bits"-derived CSS3D wall (`DriftWall.tsx`/`DriftWall.css`, ~200 tiles
once the columns loop). It's fully built, tuned (`wallTuning.ts`), and has
its own README-documented drift/parallax logic. **Don't delete it** — see
"Preserve custom work." The natural role for it in the new layout is exactly
what the reference image's background is doing: a dim, slow, blurred field
behind the hero, giving the same "body of work" sense the wall always had
without competing with the thing in front. Concretely: keep `<DriftWall>`
mounted, drop its opacity/contrast and slow it further (both already exposed
on `wallTuning.ts`'s panel — check whether an `intensity`/`blur`-style knob
exists there already before adding one), and let it sit *behind* the new
hero layer via `z-index` rather than being removed.

**New layout, front to back:**

1. **Background:** the existing `DriftWall`, dimmed.
2. **Hero stage, centred:** whichever of the 5 pieces (Phase 4) is currently
   selected, large. This needs a new mount — see Phase 4 for what it holds
   and how it differs from `MechModel.tsx`.
3. **Top-right readout:** the selected piece's project title / a short role
   line, echoing the reference image's "SHION / DAMAGE / FLANKER" block —
   this repo already has the exact typographic voice for this
   (`.mech-nav-here`'s glow, `.mech-title`'s flicker) so reuse those tokens
   rather than inventing new ones.
4. **Bottom roster panel:** 5 selectable tiles (Phase 4's pieces), always
   visible, no menu — same "don't hide navigation behind navigation"
   constraint as Phase 2. `.mech-rail`'s tile styling (`.mech-tile` in
   `Mech.css`) is the right visual reference even though this is a different
   component; a home-specific version doesn't need to import from `Mech.css`
   (keep `Home`/`Mech` decoupled) but should look like it belongs to the same
   instrument panel.
5. **Existing chrome, kept:** `.v3-wordmark`, the `index` link to `/v3/index`
   (`Browse.tsx` — the timeline screen, untouched by this phase), and the
   footer contact link (see Phase 7 — it's already there, just plain).

**Definition of done.** `/v3` shows the dimmed wall behind a large centred
subject and a 5-tile bottom roster; picking a roster tile changes the centred
subject (transition itself is Phase 5); `/v3/index` and `/v3/p/<id>` both
still reachable and unaffected; `tsc`/`build` clean.

---

## Phase 4 — Home screen: the five heroes

**Status: todo.** Depends on Phase 3 having a mount point to render into.

**Goal.** Five selectable subjects up front, per the user's explicit list:
Mr. Takahashi, Capsule Calling (= Capsule C1), the Solomon game's motorcycle
rider "doing his riding at max speed," the StitchFam loop, and the Slider
Engine fish.

**What each one actually is, and where it comes from** — see the asset
inventory above for full paths. Summary:

| Hero | Source | Render as |
|---|---|---|
| Mr. Takahashi | `public/models/adam-face.glb` | **Do not build a new mount for this one.** Either reuse `MechModel.tsx` directly (it already accepts `src`/`tuning`/`live` props and needs nothing home-specific) or, if the home stage's camera/composition genuinely can't share it, copy only the *loading and framing* logic into the new hero mount — never the lighting constants. Either way `MODEL_DEFAULTS` stays untouched, per "Ground truth." |
| Capsule Calling | `public/models/capsule-c1.glb` | New lightweight GLB mount (see below) — this one has no morph targets and no face logic, so it doesn't need `MechModel.tsx`'s machinery at all. |
| Solomon rider | Copy `~/Documents/GitHub/solomon-game/game-3d/models/akira-rider.glb` → `public/models/akira-rider.glb` first. | Same lightweight GLB mount. **No baked animation exists on this file** — build "max speed" procedurally: spin the `wheel`/`wheel_wheel_0`/`wheel_wheel_0.001` nodes continuously (find them via `useGLTF`'s returned `nodes` map, same pattern `MechModel.tsx` uses for its own mesh lookups), add a small constant engine-vibration jitter to the whole group (a couple of frame-units of high-frequency, low-amplitude positional noise — conceptually the same "engine shake" the source repo's own `game-3d/3D-NOTES.md` describes for this asset, just re-derived here rather than imported, since that code lives in a different app), and consider a subtle forward lean. Don't promise more motion than this without checking with the user — there is no run-cycle, no lean-into-corner clip, nothing baked to fall back on. |
| StitchFam | `public/videos/stitchfam-hero.mp4` (already in this repo) | Mount `src/three/VideoFrame.tsx` as-is (`<VideoFrame videoUrl="/videos/stitchfam-hero.mp4" scale={...} />`) inside whatever Canvas the hero stage uses. It's a self-contained R3F component with its own frame/mat/screen geometry — nothing to build. |
| Slider Engine fish | `public/sprites/fish-man-idle/*.png` (already in this repo) | Mount `SpriteFlipbook` exported from `src/three/CapsuleStage.tsx` (`<SpriteFlipbook frames={FISH_MAN_FRAMES} fps={12} scale={...} />` — `FISH_MAN_FRAMES` is already built as a glob in `src/site/products.tsx`, copy that glob rather than re-listing 14 filenames by hand). |

**The lightweight GLB mount (for Capsule Calling and the Solomon rider).**
Write one new small component (a natural name: `HeroModel.tsx`, next to
`Home.tsx`) that: loads a GLB with `useGLTF`, normalises it to a target
height the same way `MechModel.tsx` does (`TARGET_HEIGHT`,
`distanceFor`/`fovForFocalLength` — this math is generic camera geometry, not
Takahashi-specific, so it's fine to reuse the *formula*, just not the
`MODEL_DEFAULTS` values it's currently fed with), gives it its own neutral
studio lighting rather than reaching for `MODEL_DEFAULTS` — `CapsuleStage.tsx`
already has a proven, self-contained studio rig (environment + key/fill) used
for exactly this kind of "product on a stage" shot; start from that rather
than from Takahashi's face-specific numbers, and give it its own small Leva
folder (per "the tuning-panel convention") so the two new pieces can be lit to
taste independently of both Takahashi and each other.

**One Canvas or five?** Likely one shared `<Canvas>` for the hero stage, with
the five pieces as siblings toggled by visibility/opacity (matching how
`MechModel.tsx`'s own "hidden and stopped rather than unmounted" comment
explains the cost of tearing down and rebuilding a WebGL context, shader
compile, and env map on every switch) — five simultaneous live contexts would
be wasteful and a single teardown/rebuild per switch would reintroduce the
exact hitch `MechModel.tsx` already solved once. `MechModel.tsx`'s `live`
prop is the precedent to copy.

**Definition of done.** All 5 heroes render at the centre of the home stage,
selectable from the Phase 3 roster, each recognisable and reasonably framed;
the rider visibly "moves" (wheels + shake) even without a baked clip; nothing
about `MODEL_DEFAULTS` or `MechModel.tsx`'s lighting changed; `tsc`/`build`
clean.

---

## Phase 5 — The sci-fi swap transition, on the home hero

**Status: todo.** Depends on Phase 3/4 existing to have something to
transition between.

**Goal.** Switching which hero is centred does something that "fits the
aesthetic and vibe" already established — the user's phrase — rather than a
plain cross-fade.

**Don't invent a new transition language.** `Mech.tsx`/`Mech.css` already
settled this exact problem for frame-to-frame and project-to-project swaps,
after explicitly rejecting several more literal "sci-fi" treatments — see
`README.md`'s **"Where this is up to"** section and this repo's
`CLAUDE.md`: a field-of-cells dissolve, a CRT collapse, a scanline sweep, an
ordered dither, and a slat flip were all tried and called "somewhat ugly" or
"more cover." What shipped instead is a plain four-beat sequence: the
outgoing picture fades out, its labels retract, the incoming picture fades
in, its labels draw themselves in — timed in `Mech.css` next to the rules
that use them (search `EXIT_MS` in `Mech.tsx`, and the keyframes
`mech-unpop`, `mech-undraw`, `mech-out` — note there is no `mech-in`-reversed;
**every exit has its own keyframes**, because CSS only restarts an animation
when `animation-name` itself changes, so reusing an entry animation with
`animation-direction: reverse` silently doesn't replay).

The home hero should use **the same four-beat shape**, scaled to what the
hero stage actually has (a subject, not a subject-plus-leader-lines): subject
fades/dissolves out → a beat of empty stage (the "hold," matching
`HOLD_CAP`) → next subject fades/dissolves in → its own small flourish on
arrival (a HUD-style bracket snap, a label draw-in for its title/role
readout — reusing the leader-mark "ring, dot, ping" language from
`Mech.css`'s `.mech-leader-mark` if the top-right readout gets its own
pointer line, or simpler, just the existing `mech-flicker`/glow treatment
`.mech-title` already has). Reuse `sound.dissolve()`/`sound.select()` from
`sound.ts` for the audio cue, matching what every other swap on the site
already does — don't add a new sound for this alone without checking the
existing palette in `sound.ts` first.

**Files likely touched.** Whatever new component/CSS Phase 3/4 introduced
for the hero stage (not `Mech.tsx`/`Mech.css` themselves — copy the *timing
and keyframe shape*, don't import from a different screen's stylesheet).

**Definition of done.** Selecting a different roster tile plays a genuine
four-beat swap (out → hold → in → settle), not a cross-fade; the timing feels
of a piece with the project-screen swap without being a literal copy-paste;
`tsc`/`build` clean.

---

## Phase 6 — Every other project's 3D/2D piece

**Status: todo.**

**Goal.** Each project screen shows something built for it — a 3D piece or a
2D animation — the way `src/site/` (the *old*, currently-live site) already
does for most of them, rather than only flat photos/clips.

**The good news: this is mostly already built.** `src/site/products.tsx` is
the live registry the *current* site's gallery (`Gallery3D.tsx`) reads to
decide what stands in for each project. 12 of the 14 v3 project ids already
have a hand-built, tuned entry there:

| Project id | Component | Notes |
|---|---|---|
| `capsule-c1` | `CapsuleC1` | Already wired into v3 too (`model.ts`). |
| `mr-takahashi` | `AdamFace` | v3 has its **own**, more advanced version of this (`MechModel.tsx`'s live morph-driving) — don't port the old one over it. |
| `slider-engine` | `SpriteFlipbook` (fish) | |
| `mecha-station` | `PosStation` (video-texture monitor) | |
| `openup` | `Phone3D` (video-texture phone) | |
| `stitchfam` | `VideoFrame` | Same component as the home hero (Phase 4) — same import, different mount. |
| `red-dead-redemption-2` | `DiscHolder` | Shared component with GTA V (cover art not yet supplied for either — see the component's own comment). |
| `grand-theft-auto-v` | `DiscHolder` | |
| `wyte-card` | `WyteCard` | |
| `block-builder` | `BlockBuilder` | Six-piece flying/stacking loop. |
| `visa` | `VisaKiosk3D` (extruded real Visa SVG) | |
| `3d-printing` | `Printer3D` | Animated print head. |
| `a-game` | *none* | No entry in `products.tsx`. This is the user's own in-progress game — flag it back to them rather than inventing a placeholder. |
| `mr-grocery` | *none* | Same — flag it, don't invent. |

**Architecture — do not route these through `MechModel.tsx`.** That
component is Takahashi's face rig; feeding it a `PosStation` or a
`WyteCard` would mean either forking its lighting logic per-piece (fragile)
or quietly changing shared defaults (forbidden — see "Ground truth"). Instead:
add a new small sibling, e.g. `MechProduct.tsx`, that `Mech.tsx` mounts
instead of `MechModel` when a project's frame is a "product" rather than a
"model" (extend `model.ts`'s `Frame` union with a third kind, or a second
registry next to `MODELS` — `PRODUCTS: Record<string, (scale: number) =>
ReactNode>`, built by literally re-pointing at the same components
`products.tsx` already imports). Give `MechProduct.tsx` its own neutral
lighting — start from `CapsuleStage.tsx`'s studio rig or from
`products.tsx`'s own `ROOM_LIGHT`/`lift`/`turn` numbers (they're already
calibrated per piece, against a documented baseline — read the comment block
at the top of `products.tsx` before reusing them, it explains exactly what
`lift` and `turn` replaced and why) rather than inventing fresh numbers per
piece from scratch. This mirrors exactly what Phase 4 already has to do for
Capsule Calling and the Solomon rider — if Phase 4 lands first, its
`HeroModel.tsx`/studio-rig work and this phase's `MechProduct.tsx` may want
to share code; use judgement, but don't force a shared abstraction before
there are at least two real call sites proving what they have in common.

**Definition of done.** Every project in the table above that has a
`products.tsx` entry shows that piece on its `/v3/p/<id>` screen, correctly
scaled and lit, without touching `MechModel.tsx` or `MODEL_DEFAULTS`. `a-game`
and `mr-grocery` explicitly reported back to the user as needing assets, not
silently left blank or filled with a guess. `tsc`/`build` clean.

---

## Phase 7 — Contact section

**Status: mostly done already — verify and lightly polish, don't rebuild.**

**Current state.** Both `Home.tsx` (`<footer className="v3-foot v3-over">`)
and `Mech.tsx` (`<footer className="mech-foot">`) already render
`mailto:hello@tarloksingh.com` — the exact address the user asked for. This
predates this plan; it isn't new work.

**What's arguably missing:** it reads as a footer credit line ("designed by
Tarlok Singh" on the project screen) rather than a "contact section" with any
visual weight of its own. If the user wants more than a link — a dedicated
moment, matching the HUD/instrument-panel voice the rest of the site has
(imagine it as a small "COMMS" or "TRANSMIT" panel rather than a plain
`<a>`) — that's a small, contained CSS/markup enhancement to the existing
footer, not a new feature. Don't build a contact *form* (this is a static
site with no backend) unless the user explicitly asks for one.

**Definition of done.** Confirm both footers still resolve correctly after
Phases 1–6 touch their surrounding layout (the narrow breakpoint in Phase 1
in particular — check `.mech-foot` still reads on a phone width). Any visual
upgrade stays a `mailto:` link, no backend.

---

## Phase 8 — Tuning-panel coverage

**Status: ongoing — not a one-time task, a standing check.**

The user was explicit: *"you don't need to verify if every 2d and 3d image
is set properly in each project, i will handle that later but what I do need
is controls like we had in v2 to where i can adjust them properly."* Read
literally: don't spend time hand-tuning Phase 6's per-project scale/position/
lighting to look perfect — but every number that *could* need adjusting must
land on a Leva panel with a copy-to-source button, so the user can tune it
themselves afterward. Concretely, by the time Phases 4 and 6 are done, there
should be Leva folders (in an existing panel or a new `useXTuning.ts`) for:
the home hero stage (per-piece scale/position/rotation for all 5, plus
`HeroModel.tsx`'s studio lighting), and `MechProduct.tsx`'s per-project
scale/turn/lift. Follow the exact shape in "The tuning-panel convention"
above — `_DEFAULTS` constant, `useControls`, localStorage scratchpad, copy
button via `clipboard.ts`. A new number added without a panel is the one
thing this phase should be checked for before calling any other phase done.

---

## Phase 9 — Shootable creatures on every page

**Status: todo.**

**Goal.** The user: *"every page can have a bird that you can shoot or can
have some other animals as well? see if you can do something interesting."*

**Current state.** `MechBird.tsx` already exists and already works, but only
on `/v3/p/<id>` (it's mounted directly in `Mech.tsx`) and only for
`pointer: fine` (real mouse) — see Phase 1's "what this deliberately did not
do." The hit-test plumbing it uses (`quarry`/`gaze`/`flinch` in
`src/v3/subject.ts`) is already written to be shooter-agnostic: anything can
register `quarry.hit = () => boolean` and anything that fires (`MechLaser.tsx`
is the only one today) doesn't need to know what it's shooting at.

**Two separable pieces of work:**

1. **Put a creature on the home screen too**, not just project screens —
   mount `MechBird` (or a variant) in whatever Phase 3 builds for `/v3`. It's
   already `memo`'d and self-contained; check it doesn't assume `Mech.css`
   classes it won't find on the home screen (`.mech-sky` etc. — it brings its
   own CSS-in-JS-adjacent class names, verify they're either shared or
   duplicated into the home screen's stylesheet).
2. **"Some other animals" — genuinely new, and left to your judgement on
   what's interesting.** `MechBird.tsx`'s flight-path math (quadratic bezier
   crossing, nose-follows-tangent, a `hit`/`fall`/gravity state machine) is
   general enough to reskin: same rig, different SVG and a different
   flight/behaviour pattern (something that scurries along the ground instead
   of crossing the sky, something that lurks and has to be startled first,
   whatever reads as "worth a second creature" rather than a recolour of the
   first). This is genuinely creative scope, not a spec to follow — use
   `MechBird.tsx` as the mechanical template (timing ranges, the
   `quarry.hit`/`gaze` registration pattern, `sound.hit()`) and design the
   rest.

**Should shooting work on touch?** Not decided — flag it rather than
guessing. The whole reticle/laser/bird trio is desktop-only by deliberate,
consistent choice today (three separate files independently check
`pointer: fine`). Making it work on touch is a real design problem (there's
no cursor to aim with — tapping the creature directly is the only sane
touch equivalent, which changes "aim and lead a moving target" into "tap the
thing," a different game) worth a short explicit check-in with the user
before building, not an assumption either way.

**Definition of done.** At least one creature shootable on the home screen in
addition to project screens; at least one new creature type beyond the bird,
built on the same `quarry`/`gaze` plumbing; touch behaviour either matches an
explicit user decision or is explicitly left desktop-only with that noted
here.

---

## Phase 10 — Cross-page kill counter

**Status: todo.** Natural follow-on to Phase 9, not before it — there's
nothing to count until more than one creature/page can be hit.

**Goal.** *"a counter that goes across pages that tells you how many
animals you've killed."*

**Current state: no counter exists anywhere.** `quarry.hit()` today just
returns `true`/`false` to tell the shooter whether the shot landed — nothing
tallies it. There's also nowhere for an in-memory count to live *across*
pages: `V3.tsx` swaps `Home`/`Browse`/`Mech` as sibling components on
navigation (unmounting whichever screen you're leaving), so any counter kept
in React state on one of those screens resets the moment you navigate away
from it. **This has to be `localStorage`-backed**, not component state — the
same pattern `MechDeck.tsx` already uses for its own persisted volume/track
index (`STORE_KEY`, a `read()` that tolerates a missing/corrupt value, a
`try { localStorage.setItem } catch {}` write) is the one to copy.

**Suggested shape.** A tiny new module, e.g. `src/v3/kills.ts`: a
`localStorage`-backed counter (own key, e.g. `v3.kills.v1`) with an
`increment()` and a way to subscribe to changes (mirror how `pins.subscribe`/
`pins.snapshot` in `labelTuning.ts`/wherever `pins` lives works with
`useSyncExternalStore` — `Mech.tsx` already uses that exact hook for the
label-pin store, so the pattern is proven in this codebase). Call
`kills.increment()` from wherever a creature's hit actually lands — today
that's inside each creature's own `quarry.hit = () => { ...; return true }`
closure (see `MechBird.tsx`'s `quarry.hit`), so Phase 9's new creature(s)
should call it too. Render the count somewhere in the permanent chrome — the
compass HUD's coordinate readout (`.mech-coords` in `MechHud.tsx`) is the
most visually-native slot (it's already an always-on instrument-panel digit
readout), but it could equally be a small standing element in the header.

**Definition of done.** A kill anywhere (home screen or any project screen,
any creature type) increments one number; that number survives navigating
between screens and surviving a full page reload; it's visible somewhere
that reads as part of the instrument panel, not a debug overlay.

---

## Phase 11 — Audio player color and a demo track

**Status: track — done (this session, 2026-08-24). Visual "more color" pass — todo.**

**Goal, part one (done this session).** *"add some fake audio in it so I can
see how it plays"* — `src/assets/audio/` was empty (confirmed: only its own
README), so `MechDeck.tsx` had never been seen actually playing anything.
Fixed by procedurally synthesizing a short instrumental loop with `ffmpeg`
(layered oscillators, no sampled/copyrighted material at all, so there's no
licensing question) and dropping it in following the folder's own naming
convention (`NN - Title.mp3`). Check `src/assets/audio/` for the resulting
filename and confirm it still appears in the deck (`tracks.ts` picks it up
automatically — nothing else needed).

**Goal, part two (not done — genuine design work, left for you).**
*"make the audio player way more color"* — `MechDeck.tsx`/its CSS
(`.mech-deck*` in `Mech.css`) currently follows the same restrained
green-phosphor palette as the rest of the HUD (`--accent`, `--dim`, `--mid`).
The user wants it to stand out more. Read `MechDeck.tsx`'s existing level
meter (`BARS = 16`, driven off a live `AnalyserNode`) before touching
anything — it's already reactive to the actual audio, not decorative, so
"more color" should mean better use of *that real signal* (e.g. bar height or
hue keyed to frequency/amplitude bands) rather than a flat palette swap that
throws away what's already reactive. Stay inside the existing accent/warn/
shot palette tokens defined on `.mech` (`--accent-rgb`, `--warn-rgb`,
`--shot-rgb`) rather than inventing new colours outside the site's system,
unless the brief is specifically "the deck gets its own colour identity" —
check with the user if it's ambiguous which of those two they mean.

**Definition of done (part two).** The deck reads as more visually alive
than the rest of the instrument panel without breaking from the site's
established colour system; still driven by the real `AnalyserNode` signal,
not replaced with a canned animation; `tsc`/`build` clean.

---

## Suggested order

Phases 1, 2, 7 (verify), 8, 11-track are small and mostly independent — good
for a fast pass. Phases 3 → 4 → 5 are one continuous arc and should land
together or not at all (a hero-select screen with only structure and no
transition, or heroes with nowhere to be selected from, isn't shippable
halfway). Phase 6 is independent of the home-screen arc but shares real code
with Phase 4 (the lightweight GLB mount / studio lighting) — worth doing
whichever of the two lands second with the first one's code open alongside
it. Phase 9 before Phase 10, always — there's nothing to count otherwise.
