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

## Two home pages

There are two, and `src/App.tsx` picks between them:

| URL | Page | |
|---|---|---|
| `/` | `CapsuleHome.tsx` | The product on a stage, its name turning around it |
| `/?v=cards` | `Home.tsx` | The original shuffling card cluster, untouched |

Neither is live yet — `main` still holds the old Vue site, and the domain is
served from a **different repo** (`tarloksingh/my-portfolio`, private) via
Vercel. Pushing this branch does not deploy anything.

## The product page

`src/components/CapsuleHome.tsx`, built to a 2048x1080 frame: a fixed 405px
stone sidebar carrying the identity, and a gradient stage holding the product.

**On load the page is sealed by the ring itself.** Before the cut, the ring is
a banner: the same per-glyph engine, printed on a strip of film leader — black
stock, sprocket notches punched top and bottom, the name set pale in the
rebate, an ink wash across. It hangs between the two edges of the screen,
sagging under its own weight and moving in the wind. There is no tape graphic
and nothing is layered over the page. It is the ring before it has closed.

Clicking cuts it where you clicked. The cut ends swing down about their
supports under gravity, and the same glyphs are then drawn up into the ring,
reading the product's name. One run of type carries the whole opening.

Four things hold that together, and undoing any of them breaks it back into
two events — a banner leaving and a different line arriving:

- **The slot count is fixed**, taken from whichever label is longer with the
  shorter padded, so the glyphs are the *same DOM elements* before and after
  and the text changes on them mid-flight. Sizing the run to the current label
  re-mounts every glyph at the swap.
- **Nothing leaves the screen.** The ends fall about their supports and are
  gathered in from wherever they got to. Throwing them off and bringing them
  back is the same problem wearing a different hat.
- **Every position is one blend.** `banner -> ring` is a single lerp per glyph
  with the fall folded into the banner side, so the transformation is
  continuous by construction rather than a sequence timed to look continuous.
- **The animation clock lives outside the draw effect.** That effect re-runs
  whenever the glyph characters change — which is exactly what the text swap
  does, halfway through — and a clock started inside it resets there, playing
  the whole cut a second time.

The banner hangs from the *screen's* edges, not the stage's. Glyph positions
are measured from the stage's centre, and the stage is the content column,
which sits right of centre by the width of the sidebar. Normalising the span
against half the viewport without accounting for that puts one support inside
the frame and leaves everything past it clamped flat — no sag, no wind, a dead
stretch down one edge.

Wind is not one sine. That reads as decoration, because real wind arrives in
gusts with a finer flutter inside them: two slow waves beat against each other
to set the strength, a second higher-frequency ripple rides inside, and the
span lifts slightly while a gust passes. All of it pinned to zero at the
supports, since a banner does not move where it is tied.

The strip is drawn as short segments laid end to end along the same curve —
one long box cannot follow a bend. They overlap by a fraction of their height
rather than butting: neighbours sit at slightly different angles, so an
exact-width segment opens a wedge at every join, invisible on a thin strip and
a pale seam down a tall one. The sprocket pattern is offset per segment so it
runs unbroken across them. The strip rides the banner and the fall, never the
wrap, and fades as the type lifts off it.

The move from cutting to open is a **timer**, not something the draw loop
decides when its progress reaches 1. Frames are not guaranteed — a backgrounded
tab stops them outright, and decoding the model can starve them — and hanging
that state change off one leaves the line stuck mid-cut, still reading the
seal, with no way forward.

The content column sits above the sidebar while the banner is up, since the
banner has to cross the whole screen. It drops back under once the opening has
finished, so the closed ring stays in its own section — on a narrow window the
ring is wider than the column, and left above the sidebar it runs straight
across the name. The drop waits for the wrap to finish rather than happening
at the cut, or the falling ends would be clipped at the column edge mid-flight.

**The sidebar is absent until the cut.** It keeps its box the whole time and
only fades: collapsing it would move the stage's centre and drag the ring
sideways mid-transform. The page gradient lives on `.capsule-home` rather than
the content column so there is no flat panel sitting where it will be.

**Once it opens**, the copy reveals block by block, each clipped to its own box
so the characters climb into view from under the cut, while the product turns
into place and hands that motion over to the idle float.

`.ch-stage` spans the whole content area rather than sitting as a flex row
between menu and credit. As a row its bottom edge fell above the credit line
and the canvas ended there, so a product entering from below was cut off in
mid-air rather than coming in off the bottom of the screen.

## The name ring

A band of type standing up around the product, not lying flat on a turntable.
Each glyph faces the camera, so the front of the ring reads square on.

**The cylinder is projected in JS, not handed to CSS 3D.** That is a
performance decision. The 3D version needed every glyph duplicated across two
`preserve-3d` layers, one either side of the model, because a 3D rendering
context sorts by depth and *ignores z-index* — so no single layer could
straddle the model, and the model is a WebGL canvas that cannot join that
context at all. At the tuned settings that came to ~590 spans, each
re-rasterised every frame, since a rotated 3D transform is not something the
compositor can reuse. That was the jank.

Projecting by hand gives one set of glyphs, plain 2D transforms and z-index
working normally against the canvas. `.ch-stage` carries `isolation: isolate`
so the far arc's `-1` stays inside the stage instead of dropping behind the
page gradient. Spaces still occupy their slot but are hidden once rather than
re-hidden every frame.

Four things are easy to undo by accident:

- **It is a cylinder, not a flattened ellipse.** Upright glyphs on a 2D ellipse
  look right at the top and bottom and fall apart at the sides, where the path
  runs vertical on screen, the horizontal gap between neighbours collapses and
  the letters pile into an unreadable clump. Rotation spends that spacing
  evenly the whole way round.
- **The roll has to reach the glyph, not just its position.** Rotating only the
  placement leaves every letter bolt upright while the baseline runs
  diagonally, which reads as a staircase rather than as tilted type.
- **Glyphs foreshorten with the wall they sit on.** They are drawn flat, so
  nothing rotates them out of plane — instead their width is scaled by how
  squarely they face the camera: full at the front, nothing at the sides,
  mirrored at the back. Left at full width they pile into a blob where the
  ring turns, because screen position barely moves between neighbours there
  (`dx/dθ` goes to zero) and letters that never narrow land on top of one
  another. It also gives the backface mirroring for free.
- **Glyphs are placed one at a time, not one word at a time.** Perspective
  scale across a word is what gives it its taper. Whole words would cut the
  node count by an order of magnitude and flatten that out.

The banner's type size is reached through `scale` rather than `font-size`, so
no frame triggers a re-layout on the way to the ring's size.

There was a depth blur on the far arc. It is gone: a CSS blur re-rasterises its
element, and ~200 of those a frame is well past what compositing absorbs. The
far arc fades instead, and the loop skips any glyph whose bucket has not
changed.

## Project carousel

Scroll or drag cycles the stage through every project in `work.ts`. The ring
and the model spin faster the harder you scroll and coast back down when you
stop, the ring's name swaps at each project boundary, and the incoming model
rises and crossfades in over the outgoing one.

**One continuous number drives all of it.** `progressRef` in
`CapsuleHome.tsx` accumulates wheel/touch delta directly — one unit is one
full project. `Math.floor` of it (wrapped to the project count) is the
current project; the fractional part is how far into the crossfade to the
next one. Nothing here is React state: it moves on every wheel tick and,
mid-fling, every frame, and routing that through a render would mean a
render per pixel scrolled. State only changes at the two moments that
actually need a re-render — which project is current, and whether the
carousel has been touched at all yet.

**Spin is a ref, not a prop that changes every frame**, for the same reason.
`ProductRing` takes `extraSpinRef` and adds it straight into its own spin
calculation each tick — CapsuleHome integrates the angle itself and hands
over a plain number to read, so scrolling never pushes a render through the
ring's ~200 glyphs. `CapsuleStage` takes the parallel `spinRef` and adds it
to `rpm` inside `Spin`'s own `useFrame`, so the model side needs no
integration at all — R3F's `delta` does it.

**The crossfade is two whole stages, not two materials.** `CapsuleStage` is
`forwardRef` so `CapsuleHome` can write `.style.opacity` on the two mounted
instances directly, every frame, the same ref-and-DOM-write pattern the ring
already uses rather than a second React state channel. Blending the actual
glTF materials was ruled out — making a gloss PBR material transparent mid-
render is its own fight, and two full canvases is simple by comparison.

**The "next" stage only mounts once you've scrolled once.** Its entrance is
the same rise-from-below every model uses on arrival, timed from its own
mount — mounted at page load like the others, it would have long since
settled by the time a slow scroller actually reaches it. Keyed on the
project id, so each new "next" gets a fresh rise instead of replaying the
last one's already-finished state.

**Every project currently shows `capsule-c1.glb.`** `CAROUSEL_PROJECTS` in
`CapsuleHome.tsx` maps `work.ts` to the one real model as a placeholder, so
the mechanics — speed, timing, crossfade, name change — can be judged before
the other nine exist. Give a project its own `modelUrl` there once it does;
nothing else needs to change.

Tunable behind `?tune`, group **Carousel**: how many px of scroll make up one
project, the spin's ceiling, how directly velocity maps to it, and how long
the spin takes to catch up to a new speed rather than snapping to it.

## The card page

`src/components/Home.tsx`: name and nav up top, a cluster of
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
| `src/components/CapsuleHome.tsx` | The product page: layout, copy reveals, both control groups, the scroll carousel |
| `src/components/ProductRing.tsx` | The banner and the ring: film strip, wind, cut, unwrap, spin, scroll-driven extra spin |
| `src/three/CapsuleStage.tsx` | Canvas, camera rig, environment, entrance, float, model load — `forwardRef` so the carousel can crossfade two instances by opacity |
| `src/components/Home.tsx` | The card page: intro, shuffle, swipe/scroll, controls |
| `src/components/BlurText.tsx` | Per-character reveal, forward and reverse |
| `src/data/projectMedia.ts` | Resolves each project's assets, plus per-project overrides |
| `src/data/work.ts` | Project list (id, title, description) |
| `src/hooks/persistControls.ts` | localStorage persistence + JSON export for Leva |

Everything from the previous build — the three-scene track, the dance floor, the
gravity drop, the crawl-off, the option wheel — is still on disk and untouched,
just no longer mounted.

## The model

`public/models/capsule-c1.glb`, exported from Blender and already
Draco-compressed (64KB). The decoder is served from `public/draco/` rather than
Google's CDN, so the page makes no third-party request.

Three things about glTF that the page has to work around, all of which look
like rendering bugs and are not:

- **Nothing about lighting survives the export.** No lights, no world, no HDRI,
  no view transform. That matters most for a gloss-white object, which shows
  *reflection* rather than diffuse colour and renders as a flat silhouette with
  nothing to reflect. `StudioEnvironment` builds one procedurally with
  `RoomEnvironment`, and the canvas tone-maps through ACES to approximate
  Blender's view transform.
- **A material exported without a `pbrMetallicRoughness` block takes the spec
  default** — white, but *fully metallic and fully rough*, which has no diffuse
  colour and no sharp reflection and lands on near black. Blender draws the same
  material as light grey. Both logos in this export come through that way, so
  `LoadedModel` restores a dielectric; the test is the exact 1.0/1.0/white
  triple only the glTF default produces, so real materials fall through
  untouched.
- **Flat decals z-fight.** The logos are coplanar with the case to within a
  rounding error. `near`/`far` are pulled tight around the subject (the default
  0.1–1000 leaves almost no depth precision near the model) and the decal
  materials carry a polygon offset.

Framing is derived from the model's own bounding box, normalised to
`TARGET_SIZE`, so the next export lands correctly whatever scale its scene
happened to use — this one arrives 0.3 units on its longest edge.

An earlier export was 9.9MB with **89% of its triangles carrying no material at
all** and the whole Blender staging scene included — a backdrop plane and two
2-unit sheets that dominated every bounding-box measurement. If a future export
suddenly renders black, or shrinks to a speck, check for those two things first.

## Tuning panel

**`?open`** starts on the closed ring, skipping the banner — cutting it open on
every reload gets old fast when the thing being tuned is the ring itself.

Open the page with **`?tune`** on the end for a Leva panel. It is absent without
the flag, and works on a phone over the tailnet — it docks to the bottom edge on
small screens, opts back into touch (the page sets `touch-action: none` for the
swipe gesture), and stops its own touch and wheel events reaching the swipe
handlers so dragging a slider does not change project.

On the product page:

| Group | Control | What it does |
|---|---|---|
| Ring | Text | The product's name, carried round the ring once it is open |
| | Seal text | What the banner reads before it is cut |
| | Separator / Gap | What sits between repeats, and the spaces setting their spacing. Separator is empty by default |
| | How many | Repeats in one full turn |
| | Text size | Glyph size once it is the ring |
| | Banner text size | Glyph size while it is still the banner; blends to Text size as it wraps |
| | Ring size | The cylinder's radius in px |
| | Spin (s/turn) | Seconds per revolution; negative runs it anticlockwise |
| | Tip / Roll | Tilt toward the viewer, and in the screen plane |
| | Nudge X/Y | Moves the ring off the stage's centre |
| | Depth | Viewing distance. Low values magnify the near arc hard |
| Intro | Cut time | Seconds the cut ends take to fall |
| | Delay / Time | When the wrap starts after the cut, and how long it runs |
| | Line spacing | Px between glyphs along the banner |
| | Ring unwind | Extra degrees the ring turns through as it closes |
| | Banner sag | How far it hangs at the centre of the screen |
| | Wind / Wind speed | Strength of the gusts, and how fast they travel along it |
| | Strip height | The film leader's height. 0 leaves the type bare |
| | Strip ink | The wash across the strip |
| | Cut drop | Degrees the cut ends swing down through |
| | Product from / turn | How far below it starts and how far it rotates in |
| Product | Lens (mm) | Real focal length against a full-frame back, not a raw fov |
| | Size | Multiplies the auto-fit |
| | Camera back / height / around | Distance, elevation and orbit. The camera always aims at the model |
| | Spin (rpm) | Turntable rotation |
| | Float rise / loll / speed | Idle drift, usable *instead* of the spin — set one to 0 |
| | Exposure / Environment / Key light / Ambient | Tone-mapping exposure and the three light sources |
| | Untyped material | Colour for materials that arrived without a PBR block |
| Carousel | Scroll per project (px) | How much cumulative wheel/touch delta advances one project |
| | Max spin (rpm) | Ceiling on how fast scrolling can spin the ring and model |
| | Speed sensitivity | How directly scroll velocity maps to spin speed |
| | Spin smoothing (s) | How long the spin takes to catch up to a new speed rather than snapping |

On the card page:

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
`value:` fields — `src/components/CapsuleHome.tsx` for the product page,
`src/components/Home.tsx` for the cards. Saved values in `localStorage` take
priority over the coded defaults, so **Reset all settings** is how you check
what a first-time visitor actually sees.

## Working offline

`npm run dev` needs no network. Everything the page loads is local: Inter is
self-hosted through `@fontsource-variable/inter` (imported in `src/main.tsx`, so
type metrics are identical on a plane and in production), and the Draco decoder
is served from `public/draco/` rather than the gstatic CDN. Keep it that way —
a `https://` in a new `<link>` or asset URL is the one thing that will quietly
degrade the layout when there is no connection.

What does *not* work offline: `npm install`. Install before you leave; if a
package is missing mid-flight there is no recovering it.

**A production build (`npm run build` + `npm run preview`), not `npm run
dev`, is what you want over a real tailnet connection** — a plane's wifi
routinely runs at 800ms+ round-trip latency, and Vite's dev server ships the
app as dozens of unbundled module files, each one costing a full round trip
regardless of bandwidth. A production build collapses that to a couple of
bundled files.

Two more things trim what has to arrive before the page is usable on a link
like that: `Home.tsx` (the card page) is lazy-loaded behind `?v=cards` in
`App.tsx` rather than a static import, so its code is not in the bundle
everyone downloads by default; and `index.html` preloads the glTF model and
its Draco decoder so they fetch in parallel with the JS bundle instead of
only being discovered — and requested — after it has parsed, which on a
high-latency link is several serial round trips stacked before the product
can render. If either regresses, check `App.tsx`'s import of `Home` is still
a `lazy()` and that the `<link rel="preload">`s in `index.html` still point
at real files.

### Seeing both widths at once

`http://localhost:5173/dev-preview.html` puts a phone and a desktop frame side
by side against the same dev server, both live-reloading. The frames are laid
out at true device pixel sizes and only visually scaled, so the app inside reads
the real viewport width and the media queries fire exactly as they would on the
device. It is a dev-only file at the repo root, so `vite build` never emits it.

Personal hotspot also works in airplane mode if you want the real thing in a
real browser: `npm run dev -- --host`, then open the printed LAN address on the
phone. That is a local network, no internet involved.

### Keeping the wider layout untouched

Mobile work is safe when it lives inside a `max-width` block rather than
changing a shared rule. The existing breakpoints are `700px` in `src/style.css`
and `src/components/CapsuleHome.css`, plus a single `900px` block in
`CapsuleHome.css`; adding to those is desktop-proof by construction. The risky
edits are the ones outside a media query, and the JS branches on
`window.innerWidth` in `src/hooks/useGravityDrop.ts`, `ProductRing.tsx` and
`src/animations/crawlOut.ts` — those run at every width, so gate any change on a
width test instead of retuning the constant.

`git diff` before each commit is the check: anything touching a rule outside a
media query, or a shared constant, wants a look at the desktop frame too.

**The ring, the product and the banner each need their own phone numbers —
nothing here scales down with CSS.** All three are laid out in real px by
JS (`CapsuleHome.tsx`'s `PHONE_RING` / `PHONE_PRODUCT` / `PHONE_INTRO`,
applied when `useIsPhone()` is true), so a value tuned for a ~1600px desktop
stage has to be restated, not scaled, for a 390px frame — the ring's radius
and the product's scale already were; the banner's `stripHeight`/`wind`
found this the hard way, piling into a fan on first phone load because nothing
had told it the screen was narrower. If a new geometry prop shows up in
`ProductRing` or `CapsuleStage`, assume it needs a phone entry too rather
than finding out from a screenshot.

## Outstanding

- **The remaining exports.** The scroll carousel cycles through all ten
  projects, but only Capsule C1 has a real model — the rest borrow it as a
  placeholder (`CAROUSEL_PROJECTS` in `CapsuleHome.tsx`). Judge the carousel's
  mechanics now; give the other nine projects their own `modelUrl` once they
  have one.
- **Two canvases during a crossfade** is genuinely heavier than one — worth
  revisiting if it turns out to be too much for a phone GPU mid-scroll.
- **Deployment.** The domain is served from `tarloksingh/my-portfolio`, a
  different repo. This one deploys nowhere.
- **Clicking a card** (card page) logs the project id; there is no detail view.
- **Nav links** — "Home" is inert, "Contact" is a `mailto:`.

Card video was ~112MB and is now ~61MB — re-encoded to a 1280px long edge, H.264
CRF 26, audio dropped (every card plays muted). SSIM against the originals is
0.989–1.000, so it is visually a wash. `src/assets` totals ~74MB.
