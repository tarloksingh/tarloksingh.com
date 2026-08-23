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
| `Mech.tsx` | The project screen: layout, disintegration, transit |
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

The last thing on the table is **the frame transition** on the project screen.
It works and it is cheap — `Disintegration` in `Mech.tsx` draws it on a canvas,
so the cell count and the colours cost nothing to change — but the look is not
settled: a field of squares was called "somewhat ugly", and the open question
is what replaces it. Four directions were on the table and none was chosen:

- **CRT collapse** — the picture squashes to one hot horizontal line, holds and
  flickers, and the next frame opens back out of it
- **Scanline sweep** — a bright bar travels down, old above and new below, with
  the image tearing sideways either side of it
- **Ordered dither** — the same digital-decay idea on a 4×4 Bayer matrix, so it
  thins to single pixels rather than blocks
- **Slat flip** — horizontal slats turning edge-on, mechanical rather than
  digital

Whatever it becomes, the canvas is the place to build it: one component, one
`paint(now)` loop, no DOM. `EXIT_MS` has to match however long the new cover
takes, and the picture's own fade is in `.mech-stage[data-covered]`.

Worth offering rather than guessing: two of them behind a Leva toggle, so the
choice is made by looking at real pictures.

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
