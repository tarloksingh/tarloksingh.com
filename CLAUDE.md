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
| `MechCast.tsx`, `castTuning.ts` | The home line-up, and where each one stands |
| `MechWave.tsx` | The ground it stands over — a shader, not a picture |
| `nameTuning.ts` | The name behind the cast — `.mech-hero-name` in Mech.tsx |
| `leaders.ts`, `notes.ts` | Where the label lines go, and what they say |
| `MechPins.tsx`, `labelTuning.ts` | Placing a picture's labels (**P**) and copying them out |
| `MechCastPins.tsx`, `castTags.ts` | The same, for the tags on the cast (**P** on home) |
| `tint.ts` | The panel's green, turning with the wave — home only |
| `MechModel.tsx` | The subject: one GLB, lit, drifting, watching, shootable |
| `MechHud.tsx`, `MechCursor.tsx` | The dashboard, and the reticle |
| `MechBird.tsx`, `MechLaser.tsx` | The bird, and the gun |
| `MechDeck.tsx`, `sound.ts` | The music deck, and every synthesised sound |
| `SplitReveal.tsx` | The tagline and fold titles, drawn in a character at a time |
| `subject.ts` | Live facts shared across the Canvas boundary |
| `modelTuning.ts`, `wallTuning.ts` | Leva panels, and the source they paste back |
| `clipboard.ts` | Copying that works off localhost |

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

- **P** opens a pin editor on either screen, and they are never both up: on a
  project it is the picture's labels (`MechPins.tsx`), on home it is the five
  cast tags (`MechCastPins.tsx`). Placing and dragging on the overlay; copying
  and reverting on the **Labels** / **Tags** panel tab.
- **One dev panel, top right, with tabs** — `MechPanel.tsx`. The tabs are
  whatever the current screen can actually change: home gets **Cast** (every
  subject's placement and its own rig, plus the camera and whole-stage
  handles, including `dim`, the not-yet-working hover spotlight), **Tags**
  (the cast's own labels, **P** to place them), **Wave** (the ground, the flat
  `.mech-grid`'s own on/off alongside the 3D one's) and **Name** (the big name
  behind the cast); a project gets **Subject** / **Piece** / **Labels** as
  they apply; narrow gets **Scale**. Mr. Takahashi has no tab of his own any
  more — he stands in the cast's scene now, so his rig is the folder with his
  name on it under **Cast**, alongside everyone else's. Every tuning hook
  makes its own store with `useCreateStore` — nothing writes into Leva's
  default store, and there is no `<Leva>` element.
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

## Where this is up to

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
`.mech-wordmark`, the corner signature, moved the other way in the same
change — it only mounts when `!home` now, so home is not saying the name
twice.

**A second grid, a second toggle.** `.mech-grid` in `MechHud.tsx` — the flat
phosphor lines behind the whole readout, every screen — is unrelated to the
wave's own 3D one beyond sharing a word. Its control lives on the Wave tab
anyway as `grid` on `CastWave`, next to the wave's `on`, because that tab is
already "is the ground on" and a second tab for one checkbox would cost more
than it explains.

**The hover spotlight is unfinished — known broken, not yet reverted.**
Canvas-wide `toneMappingExposure` breathing on hover brightened all five
subjects at once (one tone map, one canvas, no way to scope it). Replaced
with `dim` on `CastStudio`: multiplies a subject's own `keyIntensity`/
`fillIntensity` toward `1` (full) when `focus === true` and toward `dim`
otherwise, lerped in `Placed`'s own per-frame loop, on refs attached to that
subject's own two `directionalLight`s. Reported live as still lighting every
subject slightly, together — despite each subject owning its lights on its
own three.js layer and its own `focus` prop, which is the part that does not
yet add up. `exposure` on the Stage folder is a static canvas baseline again;
`dim` is the only thing answering the pointer, and it is not answering it
right. Next session: find where the isolation actually breaks before trying a
third mechanism.

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
