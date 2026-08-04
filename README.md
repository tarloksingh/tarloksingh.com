# tarloksingh.com

Portfolio site. React + TypeScript + Vite, with GSAP for choreography.

> The previous site was Vue. `COMPLETE_DATA_DRIVEN_GUIDE.md`,
> `LAYOUT_CONTROL_GUIDE.md`, `LINKS_FEATURE_GUIDE.md`, `MEDIA_ORDERING_GUIDE.md`
> and `PROJECT_STRUCTURE_GUIDE.md` all describe **that** site and do not apply to
> the current codebase. They are kept for reference to the old project data.

```bash
npm install
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
```

The dev server binds to `0.0.0.0` and `vite.config.ts` allow-lists `.ts.net`, so
the site is reachable over the tailnet while `npm run dev` is running —
`http://tarloks-mac-mini.tail795683.ts.net:5173`.

## The page

One screen (`src/components/Home.tsx`): name and nav up top, a cluster of
overlapping project cards in the middle with the project title over them, and
passion/focus copy along the bottom.

**On load**, the text reveals first — name, eyebrow, nav, then the footer blocks,
each cascading after the last. Only once that has had time to read do the cards
bubble in one at a time, and the project title arrives last. This intro runs once.

**On scroll or swipe**, the cluster shuffles: every card slides along a bowed arc
onto the spot its neighbour was using, like a hand pushing cards round a circle
on a table. Nothing fades and nothing resizes — the media inside each card is
swapped part-way through the sweep, so it reads as the *contents* changing rather
than one set of cards leaving and another arriving. The title hands off at the
same time: the outgoing word leaves while the incoming one is already arriving,
both travelling the same direction.

A swipe registers after 12px of finger travel rather than on release, so easing
into a drag starts the motion straight away.

## Cards and media

Card media is resolved per project straight from `src/assets/<project-id>/`
(`src/data/projectMedia.ts`) — images first, then videos, no hand-maintained
import list. `MEDIA_OVERRIDES` in that file narrows a project to specific files;
`capsule-c1` uses it to show only its four `Branding_*.mp4` clips.

Two invariants keep the shuffle stable, both easy to break:

- **The card count must not change between projects.** A card that mounts or
  unmounts partway through a sweep pops in from nothing. If a project has fewer
  distinct assets than the current card count, `padToCount` repeats its media
  rather than letting it render fewer cards.
- **Something must always sit under the title.** With no text shadow, white type
  needs artwork behind it or it vanishes into the page. `CARD_SIZES` and
  `POSITIONS` are chosen so that at every rotation, and at every card count from
  2 to 7, at least one card covers the title anchor and no card is ever fully
  buried inside another. Changing either array means re-checking that.

Sizes are per-slot rather than a repeating run, because a repeating run put a
large card and a small one on neighbouring spots and the small one disappeared
inside it. `z` runs smallest-on-top for the same reason.

The projects either side of the current one are rendered into a hidden
`.home-preload` container so their media is already fetched and decoded before
you get there — without it the swap stalls mid-sweep while the browser fetches a
video it has never seen.

## Key modules

| Path | What it does |
|---|---|
| `src/components/Home.tsx` | The whole page: intro, shuffle, swipe/scroll, controls |
| `src/components/BlurText.tsx` | Per-character reveal, forward and reverse |
| `src/data/projectMedia.ts` | Resolves each project's assets, plus per-project overrides |
| `src/data/work.ts` | Project list (id, title, description) |
| `src/hooks/persistControls.ts` | localStorage persistence + JSON export for Leva |

Everything from the previous build — the three-scene track, the dance floor, the
gravity drop, the crawl-off, the option wheel — is still on disk and untouched,
just no longer mounted. `src/App.tsx` renders `Home` and nothing else.

## Tuning panel

Open the page with **`?tune`** on the end for a Leva panel. It is absent without
the flag, and works on a phone over the tailnet — it docks to the bottom edge on
small screens, opts back into touch (the page sets `touch-action: none` for the
swipe gesture), and stops its own touch and wheel events reaching the swipe
handlers so dragging a slider does not change project.

| Group | Control | What it does |
|---|---|---|
| Shuffle | Sweep time | Seconds for one full shuffle |
| | Travel (spots) | How many resting spots the cluster moves past — turn up to send them further round |
| | Arc bow | How far the path bows out; 0 slides straight across |
| | Swap point | How far into the sweep the media and title change |
| | Press-in scale | Dip in scale as the cards travel |
| Cards | How many | 2–7 cards |
| | Size | Scales every card about its own centre. Above ~1.2 the cluster spills outside the frame |
| | Float | Multiplies the idle drift; 0 stops it |
| Export | Copy all settings | Every saved group as one JSON blob |
| | Reset all settings | Clears storage and reloads |

Values persist to `localStorage` under `intro-effects-controls`. Saved values are
patched into each schema as its *default*, so ranges and labels stay intact and
untouched keys keep the coded default.

Copy falls back to `console.log` when `navigator.clipboard` is unavailable —
which it is over plain http on the tailnet, so on a phone read it from the
console rather than expecting the clipboard to fill.

To promote tuned values into the code, copy them out and edit the matching
`value:` fields in `src/components/Home.tsx`.

## Outstanding

- **Asset weight.** ~126MB under `src/assets`, uncompressed — `mr-takahashi`
  23MB, `openup` 21MB, `capsule-c1` 17MB. Preloading neighbours hides the
  latency but the bytes are still real on a phone. Compressing these is the
  durable fix.
- **Clicking a card** logs the project id; there is no project detail view yet.
- **Nav links** — "Home" is inert, "Contact" is a `mailto:`.
