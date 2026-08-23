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
| `V3.tsx` | Three screens and fifty lines of routing |
| `model.ts` | Projects flattened into what the panes draw |
| `Home.tsx`, `DriftWall.tsx` | The wall |
| `Browse.tsx`, `Detail.tsx`, `Stage.tsx` | The timeline screen |
| `Mech.tsx` | The project screen: layout, the swap, transit |
| `leaders.ts`, `notes.ts` | Where the label lines go, and what they say |
| `MechPins.tsx`, `labelTuning.ts` | Placing labels (**P**) and copying them out |
| `MechModel.tsx` | The subject: one GLB, lit, drifting, watching, shootable |
| `MechHud.tsx`, `MechCursor.tsx` | The dashboard, and the reticle |
| `MechBird.tsx`, `MechLaser.tsx` | The bird, and the gun |
| `MechDeck.tsx`, `sound.ts` | The music deck, and every synthesised sound |
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

- **P** on a project screen opens the label pin editor (placing and dragging).
- Two Leva panels, top right, both opening collapsed: **Subject tuning** (the
  model's lens, lighting and eyes) and **Labels** (copies pinned labels out as
  source). A second panel is `useCreateStore` + `<LevaPanel store>`.

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
