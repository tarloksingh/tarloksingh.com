# tarloksingh.com

Portfolio site. React + TypeScript + Vite, GSAP for the page transition,
three.js for the products.

```bash
npm install
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
node scripts/check-media.mjs   # every file the project data quotes exists
```

Adding media is three scripts, in this order: `bash scripts/posters.sh`,
`bash scripts/field-clips.sh`, `node scripts/media-manifest.mjs`.

The dev server binds to `0.0.0.0` and `vite.config.ts` allow-lists `.ts.net`,
so the site is reachable over the tailnet while `npm run dev` is running —
`http://tarloks-mac-mini.tail795683.ts.net:5173`. That is how to check the
phone layout on an actual phone.

> Not live yet. `main` still holds the old Vue site, and the domain is served
> from a **different repo** (`tarloksingh/my-portfolio`, private) via Vercel.
> Pushing this branch does not deploy anything.

---

## The shape of it

Two routes, and one continuous scroll.

| URL | What it is |
|---|---|
| `/` | The stage: the name inside a field of work, which opens out into a gallery of projects |
| `/work/<project-id>` | That project's case study |

```
src/
  site/          the site — everything below is in here
  data/          projects, media resolution, generated dimensions, tracks
  three/         the products: glTF loaders and hand-built objects
  components/    BlurText, the per-character reveal everything arrives on
  archive/       previous versions, unmounted but intact — see its README
  assets/        per-project media, generated posters and field clips, audio
```

### `src/site/`

| File | What it does |
|---|---|
| `Site.tsx` | The shell: route, page transition, index overlay, music, grain |
| `useScrollEngine.ts` | The one clock — wheel/touch/keyboard into a single damped number |
| `Home.tsx` | The stage: the name, the wall of disciplines, the chrome, composes the field and the gallery |
| `Helix.tsx` | The vortex of media, in CSS 3D |
| `Gallery.tsx` | The row of vitrines, and each project's wall label |
| `room.ts` | The gallery's proportions — the one copy both sides of the chunk boundary read |
| `ProductStage.tsx` | The only door to three.js — a lazy chunk boundary |
| `products.tsx` | Which piece stands for which project, how it is lit, and where it sits |
| `ProjectPage.tsx` | A case study |
| `MediaFigure.tsx` | One clip or still, and when it is worth decoding |
| `Loader.tsx` | The wait, measuring the stills the field paints with |
| `Index.tsx` | The contents page |
| `MusicPlayer.tsx` | The record player |
| `Reveal.tsx` | Reveal-on-scroll, one shared observer |
| `router.ts` | Two routes, forty lines |
| `tokens.css` | Every colour, size and easing on the site |

---

## One number

`engine.value` in `useScrollEngine` is the entire navigation state of the home
page:

```
0        the name, the field turning slowly around it
0 → 1    the field opens outward and streams past; the gallery arrives
1        the first project, square-on
n        the nth project
```

Everything visible is a pure function of it — the field's speed and radius, the
name's depth and opacity, the row's position, which project is named. That is why
the two halves never disagree about where the page is: there is no phase flag to
get out of step, and scrolling back up genuinely reverses rather than playing an
exit animation.

**Two values, not one.** `target` is where input has pushed things; `value`
chases it with an exponential ease. That gap is the whole reason the page feels
heavy rather than twitchy — a flick sends `target` a long way at once and
`value` takes most of a second to arrive, gliding the entire time.

**None of it is React state.** It moves on every wheel tick and, mid-fling, every
frame. Subscribers read the mutable object directly inside one shared `rAF`.
State is touched only at the two moments that need a render: which project is
current, and whether the gallery has woken.

**Past 1 it is a list, not a scrubber.** `detentFrom` makes every whole unit at
and above 1 a **detent**: one gesture moves exactly one project, and the track
never comes to rest between two of them. Below 1 it stays a free scrub, because
that stretch is one continuous move through the field where every position is a
real picture — while the work is a list of separate things, and every position
between two of them is two projects' labels drawn across each other.

A gesture is ended by **quiet, not by an event**: a trackpad keeps firing wheel
events for most of a second after the finger has left it, so anything that
counted events would step four projects on one flick. Arriving at 1 is itself a
detent, so a long flick out of the field stops at the first project instead of
overshooting into the middle of the work.

Quiet alone is not enough, though, and assuming it was is what made the page
feel broken to use. A hard flick coasts for the better part of two seconds and
`DETENT_REST` is a fifth of one, so a **second swipe landing anywhere in that
tail used to be swallowed whole** — the latch that stops one gesture stepping
four projects had simply never been released. It failed worst exactly when the
page should have felt best: swiping briskly through the work. So the tail is
read as well as the silence, using the two things momentum does that a finger
does not — it never reverses, and it only ever fades:

- **Reversing** is unambiguous, and releases the latch outright.
- **A rise** only counts once the tail has fallen well below its own peak
  (`MOMENTUM_FADED`). Without that condition the opening ramp of a single
  flick, where each event is legitimately bigger than the last, reads as a
  second gesture and steps two projects on one swipe.
- **A long hold** with real input still arriving (`DETENT_HOLD_MAX`) releases
  it too, because a slow steady drag neither reverses nor surges and nothing
  else would ever let go of it.

Touch needs none of this: `touchstart` *is* the beginning of a gesture, so the
latch is released there outright rather than inferred.

**When it is locked, it takes its hands off.** The engine calls
`preventDefault()` on every wheel event, because the home page is `position:
fixed` and the browser would otherwise scroll a zero-height document and fire
the trackpad's back-navigation gesture on any horizontal drift. But a global
listener doing that also kills native scrolling inside anything laid *over* the
stage — which is why the index overlay's list would not scroll, and why the
answer was not in `Index.css`. Locked, the engine now returns before
`preventDefault()` rather than after it: it is ignoring the input anyway, so
whatever is on top should get it.

**The menu marks a position on it, not a link.** Home and Work are the two
halves of this one scroll — either side of `IN_WORK_AT` — so the item you are
standing in is at full ink and carries the rule, and the other is held back.
Contact is never marked: it leaves the page rather than being a third place on
it. Work does double duty, because at three items the index overlay would
otherwise have no way in from this page: from the name it turns the row to the
first project, and once you are already in the work it opens the contents.

---

## The field

`Helix.tsx`. Every project's work turning around the name in a vortex — a
funnel of cards on two intertwined strands, seen from inside it.

**It is CSS 3D and not WebGL**, for one reason that decides everything else: the
name has to sit *inside* the same space, with near cards passing in front of it
and far cards behind. A `preserve-3d` context sorts its children by depth and
gives that for free. A WebGL canvas is one flat element that text can only ever
be entirely above or entirely below.

**Cards lie on the funnel wall; they do not face the camera.** That one fact is
what makes this read as a vortex rather than as pictures drifting on a plane. A
card's normal points away from the axis, so it turns edge-on as it comes round
the side and shows you its mirrored reverse — veiled dark — once it has gone
behind. The mirroring is free: it is the browser drawing the element's own
backface, not a sign flipped by hand. Billboarding the cards at the viewer
instead (an earlier version tilted them a token 17°) flattens the whole thing,
because then nothing about a card ever changes as it travels and scale is the
only depth cue left.

Three smaller things follow from that:

- **The wall leans.** Radius tapers from `FUNNEL_BOTTOM` to `FUNNEL_TOP` along
  the loop, so a card spirals inward as it climbs. A cylinder and a vortex
  differ by exactly this taper.
- **The dark side is an opacity, not a filter.** A `filter: brightness()` on a
  turned-away card re-rasterises its whole subtree — video included — every
  frame it changes. A veil element inside the card, written the same
  compositor-only `opacity` as everything else, costs nothing.
- **No drop shadow, and square corners.** A shadow is drawn in the card's own
  plane, so it keeps pointing the wrong way as the card turns; it was a lie the
  moment the cards started lying on a wall. The hairline stays, as an `outline`.

Cost is kept where CSS 3D is cheap:

- Cards only ever get `transform` and `opacity` written to them. Both are
  compositor properties, so no frame does layout or paint.
- Sizes are written once per resize, never in the loop — width and height are
  layout properties and setting them per frame would reflow two dozen elements.
- **No blur anywhere near this.** A CSS blur re-rasterises its element every
  frame; that is what made an earlier version of this site janky. Depth reads
  through scale, fade and overlap instead.
- Nothing is measured in the loop.

**Cards are laid out from a generated manifest**, not measured. `scripts/media-manifest.mjs`
writes `src/data/dimensions.ts` with the pixel size of all 96 assets, so a card
is laid out at its true shape before anything has been fetched and never resizes
as its image decodes. Re-run it after adding media.

**Every clip plays.** The field is a field of *footage*, and a card holding a
frozen frame reads as a picture of the work rather than the work. That is
affordable only because what plays here is not the case-study master but the
400px silent proxy from `scripts/field-clips.sh` — two dozen of those cost less
than the four masters this used to ration. Each card's clip is fetched as the
card itself arrives, so the entrance's stagger spreads the requests over a
second and a half instead of putting them all in front of the stills the loader
is still waiting on. The clip fades in over the poster once it can play, rather
than replacing it — swapping the elements blinks a hole in the card.

A phone still rations, to six, and not for bandwidth: iOS caps how many hardware
decoders a page may hold, and past it videos simply refuse to play. The
scoring-and-hysteresis machinery that picks which six is unchanged; on a desktop
it is skipped entirely rather than run to a foregone conclusion.

**The keep-clear around the name** is weighted by depth. A card genuinely near
the camera is *allowed* to cross the name — that overlap is the single strongest
thing selling the depth, and removing it flattens the field to a ring of
pictures. What gets veiled is a card at the name's own depth sitting on the
words, which reads as clutter rather than foreground.

Hovering a card eases the whole field to about a tenth speed and dims the rest.
Clicking one walks the gallery to that project. Only cards facing the camera take
the pointer — an edge-on sliver must not swallow a click meant for what is
behind it.

---

## The wall

`DISCIPLINES` in `Home.tsx`. Seven words — 3D design, product design,
engineering, cinematography, musician, motion, AI — set enormous in Times,
tracked wide, stacked up the whole page and pulled back almost to the paper.

They used to be one line under the name reading "Product · 3D · Motion · Film ·
Music · AI", which is a caption: it tells you the list and asks you to read it.
At this size the same words stop being a list and become the ground the name
stands on — taken in without ever deciding to read them.

**Each line is specified by the fraction of the window it should span, and the
size is measured, not calculated.** A wall this size is only right when its
ragged edges are composed, and one line running off both sides while the next
stops short is the difference between a set page and an accident. No `vw` size
can hold a line to a given width, because how wide a word sets depends on which
letters are in it — MUSICIAN and MOTION are eight characters and six, and at the
same size the six-character one is nearly as wide. A per-character metric is no
better: it would be a property of whichever serif the machine actually resolved
`--font-times` to. So `fitWall` sets every line to a probe size, reads its true
width, and scales — two layout flushes, on mount and on resize only.

---

## The gallery

`Gallery.tsx` and `three/Gallery3D.tsx`. A row of museum vitrines you walk
along: the project's object standing where the case would put it, and the wall
label — client, year, title, role, one paragraph, one button — beside it. One
project at a time, the next one just off the frame.

**The glass is currently off.** `SHOW_CASE` in `Gallery3D.tsx` is `false`, and
the pieces stand in the open at a little over half again the size the case
allowed (`PIECE_FIT`). The vitrine is not deleted, and the flag is not a
shortcut for deleting it: `Vitrine` still places the piece at exactly the
height its `HANG` puts it at inside the case, so turning the glass back on
moves nothing. See below for what the case is for and why it took three
attempts to make one read as acrylic.

**It was a drum before**, and both reasons it stopped being one are worth
keeping written down, because a cylinder is a tempting shape to come back to.

*A turning wall and a flat canvas cannot both be right.* The products are WebGL
and the labels are DOM, and a canvas standing in for a cell on a turning wall
stops matching that cell the instant it turns. The drum's answer was to fade
the canvas out for the length of every turn, which meant **the piece vanished
every single time you moved**. A row that only slides has no such moment:
nothing rotates, so nothing ever stops matching.

*A drum has no rest.* You could stop it anywhere, and anywhere but square-on is
two projects' titles drawn across each other. Detents fix that — and once the
track has detents, the perspective a drum buys is being paid for at every
position except the ones anybody ever sees.

### The case

`three/Vitrine.tsx`. An acrylic box standing on a plain plinth, with the piece
inside it. That is the whole difference between a product shot and an exhibit:
an object floating on a lit background is a render of a thing, and the same
object behind glass on a pedestal is a piece someone chose to put there.

The first version of it was one hollow box at 5% opacity with a wireframe laid
over the edges, and it read as a *drawing* of a case. Three things fixed that,
and they are the three things that make the real object legible in a
photograph:

**Thickness.** What you actually see of a vitrine is its edges, and an edge is
visible because you are looking through ten millimetres of acrylic end-on. A
pane with no thickness has no edge to see, so one has to be drawn in — and a
drawn line is a constant width that does not foreshorten, does not catch light,
and does not double where two panes meet. So the case is five real slabs.

**The edge is brighter than the face**, and this is the one that matters most.
A sheet of acrylic is nearly invisible face-on and glows along every cut edge,
because light entering the sheet is trapped by total internal reflection and
can only leave where the sheet was cut. One opacity across the whole pane gives
frosted glass; almost-clear faces with bright cut edges gives acrylic. Both
come off the same box, as a six-material array in `BoxGeometry`'s group order —
and which pair is a face differs between the walls and the lid, because they
are built on different axes. Get that wrong and the case has a slab of frosted
grey for a roof.

**Shadows.** The plinth, the walls and the piece all cast, onto a
`shadowMaterial` floor that draws nothing but the shadow, so the page's own
paper still shows through. The floor is placed from `VITRINE_TOTAL` rather than
guessed at — a shadow that starts half a pedestal away from its object is
exactly what "the case looks like it is floating" means. The lid alone does not
cast: shadow maps know nothing about transparency, so a horizontal slab lays
down a solid square at the same weight as the plinth's, which reads as a lid
made of stone.

It is deliberately **not** `transmission`, which is the physically right answer
and does not work here. Three renders the scene into a buffer for the
transmissive pass and clears it with the renderer's clear colour, which on a
transparent canvas premultiplies down to black — so every pane comes out a
sheet of dark grey. Feeding it a background means either an opaque canvas,
which would paint over the field it fades in on top of, or drei's own sampler
at one scene render per material, and there are fifteen panes in the row.
Thickness and a clearcoat get the same read for nothing.

### One scene, one camera

There is exactly one `<Canvas>` on the page and it holds **every case in the
row**, sliding inside the scene. The canvas itself never moves, so the WebGL
context is built once. (A browser keeps about sixteen contexts alive and drops
the oldest; a canvas per project fills that quota in one brisk scroll and the
older ones start coming back black with `Context Lost`.)

**The camera is orthographic**, and two things depend on it:

- It is what makes the row read as a row. Under perspective the case two steps
  away is seen from its side while the near one is seen head-on, so a filmstrip
  of identical cases arrives as a fan.
- World and screen become one linear scale. `RoomLens` sets the ortho zoom so
  the frustum is exactly **one viewport height tall**, which means every number
  in the scene is a fraction of the window and the DOM labels and the 3D cases
  can be laid out from the same fractions. Under perspective they agree at
  exactly one aspect ratio.

Two traps came out of that, both fixed and both easy to reintroduce:

- **Do not size the row from `viewport`.** R3F caches that value and recomputes
  it on its own resize and camera events; setting the zoom by mutating the
  camera in an effect is not one of them, so `viewport.width` still reports the
  pixel-scale frustum from before. Derive the step from `size` instead.
- **The row runs along the camera's right vector, not along world X.** The
  camera looks down the diagonal, so a case moved a unit in X moves partly
  *toward* the lens and only cos(45°) of a unit across the frame — the row
  comes out 1/root-2 too tight and drifts out of step with the labels beside it.

### Arriving

Three things happen when you reach a project, and all three are the arrival
rather than three separate animations:

**The piece rises into its case** and fades up, and sinks back out as you
leave. It is driven by an exponential ease toward 0 or 1 rather than by a clock
started on a change, which is what makes it survive interruption: scrolling
briskly reverses it a dozen times, and a timed tween restarted from zero either
snaps or plays a full entrance for something already most of the way there. The
fade is front-loaded into the first third (`FADE_OVER`) so that what you
actually perceive is the movement — a piece still translucent once it has
reached the middle of the frame reads as *not loaded*, not as arriving. The
fade costs a material traversal, so `transparent` — which recompiles the shader
— is toggled exactly twice per arrival and never left on; these pieces are
single objects with a screen inside a body, and a permanently transparent body
sorts its own screen behind it.

**The camera walks around the room.** A quarter turn of orbit per project
(`ORBIT`), which has to be a quarter turn: the cases are square, so at 90° every
detent shows an identical case — same silhouette, same place, and only what is
standing inside it has changed. At any other angle the furniture changes shape
from project to project, which reads as the room being unstable rather than as
you moving through it.

**The key light does not come with it**, and that is the whole point. As you
scroll, the key sweeps across the case's faces, the plinth's lit and shaded
sides trade places, and the shadow swings. The piece itself is bolted to the
world and never turns — every bit of its apparent rotation is you walking around
it, and it lands just off face-on at its own detent (`REST_TURN`). Nothing spins
on its own: no turntable, and `Float`'s rotational wobble is off. A piece that
turns by itself is a thing being demonstrated to you. The positional drift
stays, because a piece hanging in a case should breathe.

Two things fall out of a camera that moves, and both were got wrong first:

- **The row has to be laid along the camera's live right vector.** Baked in as
  a constant it is correct at exactly one scroll position, and the whole row
  swings off the screen the moment the orbit starts.
- **The key has to be nearly overhead.** A vertical face takes the key at
  cos(incidence), so at eighty degrees of elevation it picks up about a sixth
  of the beam whichever way it is turned, and the difference between a face
  toward the light and one away is small next to what the environment is
  already giving it. Drop the light toward the horizon and the same orbit
  swings the plinth from white to mid-grey every other project. The plinth's
  *top* still takes the beam square-on, which is where the contrast belongs —
  and is what a photograph of a real vitrine does.

The piece's world angle is written each frame as "where the camera is now, plus
the angle this piece rests at, plus how far away from it you are". Those terms
cancel to a value that does not change as you scroll — so it genuinely never
turns — and expressing it that way rather than as a fixed world angle is what
keeps it right across the wrap at the end of the row, where a slot index and
the scroll position are a whole lap apart.

The **label does not animate**. It used to play the site's per-character reveal
on every arrival, and it read as busy rather than as arriving — the piece is
already rising and turning a foot to the right, and a second thing moving at
the same moment splits the arrival in two. A wall label is printed; it is
simply there when you get to it.

### The room's proportions

`WIDE`, `NARROW`, `NARROW_AT` and `STAGE_SHIFT` in `site/room.ts`, in fractions
of the window. It is a leaf module that imports nothing at all, and has to stay
one: both sides of the lazy chunk boundary need these numbers — `Gallery.tsx`
to place the labels, `Gallery3D` to place the cases — and a constant written
out in both places is a constant that will be changed in one. They could not
simply live in `Gallery3D` and be imported, because importing anything from
`../three/*` into `Gallery.tsx` pulls the entire 3D stack into the initial
bundle.

`Gallery.tsx` resolves them into one finished `RoomLayout` and hands that down.
Tuning is folded in *there*, once, rather than applied on each side — one side
working from a base number while the other works from a corrected one is
exactly how the label ends up a hand's width off its piece.

Narrow windows have no *beside*, so a project takes the whole window, the case
shrinks and rises into the top half, and the label goes underneath it. **That
switch is made in JS, not in a media query.** `Gallery.tsx` has to decide it
regardless — it writes the label's transform every frame and a stacked label
rests differently from one standing beside a case — so a media query would hold
a second opinion about the same breakpoint, and at any width between the two
the label would be laid out one way and placed the other. It writes
`data-narrow` instead, from the window's width on the very first render, and
the stylesheet follows that.

**The stage shift** (`shiftW`) moves the whole exhibit right. The case is at the
scene's own centre — world x = 0, screen 50% — and the label stands to its left,
so the pair, which is what you actually look at, sits left of the window's
centre. Both halves move by the same fraction of the window: the row in world
units inside the scene, the label through a `--stage-shift` custom property.

It must **not** be done by transforming the canvas, which is the obvious way and
is wrong: `.gl` clips to the window, so a translated canvas has its far edge cut
off and pieces visibly disappear a fraction early on their way out of frame. It
is zero on a narrow window, where the label is under the case and the pair is
already centred.

### Tuning it

Twelve pieces, all different shapes, in one room. "Centred in its slot" and
"sitting right" stop being the same thing the moment the objects stop being the
same object: a tall kiosk and a flat card, each centred on its own bounding
box, do not read as level with each other. So there is a leva panel — **dev
builds only**, `hidden` otherwise — with a folder per project carrying its own
**Turn °**, **Scale ×**, **X** and **Y**.

Per project, deliberately. One set of sliders moving all twelve at once can only
ever find the compromise that suits none of them. X and Y are both in viewport
heights so that a step of one moves a piece as far as a step of the other, and
both are applied in *screen* space — X multiplied into the camera's live right
vector, like everything else in the row, because a piece nudged along a world
axis would swing away from wherever it was set as soon as the orbit started.

A **Layout** folder holds what has no per-project meaning: case spacing, the
stage shift, and the width at which the layout goes to phone — that last one
because where a two-column layout actually gives out is something you find by
dragging a window edge, not by reasoning. All three are reported *up* to
`Gallery.tsx`, which owns the proportions, rather than applied where they are
set; that is what makes spacing move the labels and not just the cases.

Values survive a reload in `localStorage`, which is a scratchpad and not a
source of truth — a visitor's browser has an empty one and therefore sees
exactly what the source says. **Copy for source** writes the panel out in the
shape `products.tsx` and `room.ts` keep their numbers in, converting turn and
scale back on the way (the panel shows the angle actually on screen and a
multiplier on the piece's own size; the source stores the pre-`REST_TURN` angle
and the size itself). A tuning session is only worth having if it can be made
permanent, and transcribing forty-eight sliders by hand is how one gets lost.

### One exposure for the whole room

A shared scene has one exposure and one environment, and the products were
tuned back when each had its own canvas and could ask for whatever suited it.
Two things moved as a result, both documented in `products.tsx`:

- `exposure` × `envIntensity` became **`lift`** — the piece's own
  `envMapIntensity`, which is the one brightness control that belongs to a
  material rather than to the renderer. Each value is the old pair's product
  measured against the baseline the room is lit at, so they are the same
  numbers rewritten rather than new guesses.
- `azimuth` became **`turn`** — the angle a piece rests at inside its case. The
  camera can no longer orbit per project: it would orbit the whole gallery, and
  a room where every case is seen from a different angle is not a room. What
  the azimuth was choosing was which face of the piece you meet, so that choice
  is kept and `REST_TURN` pulls the amount in to something just off face-on.

The screens on the video-backed products are `meshBasicMaterial` with
`toneMapped={false}`, so they were never affected by exposure and did not need
converting.

A spec also carries **`offsetX`** and **`offsetY`** — where the piece sits
relative to the dead centre of its slot, in viewport heights. They are the
permanent home for what the tuning panel's X and Y sliders find, and they exist
because a bounding box is not an eye: twelve objects each centred on their own
do not read as level with one another.

---

## Projects

`src/data/projects.ts` is the single source of truth. The field, the gallery and
the case studies all read from that one array — **add an entry and it appears in
all three; delete one and it leaves all three.** Nothing else holds a project
list.

Copy is carried forward verbatim from the previous Vue site (`WorkDetail.vue` at
commit `ded65a6`), so nothing written about the work was lost in the rewrite.

**The array's order is the timeline**, newest first, and it has to stay strictly
monotonic. Nothing sorts it at read time — the gallery walks it by index and the
field lays it out in the same order — so a project slipped into the wrong place
shows up as the years counting down, jumping back a decade, and counting down
again. There is no error and nothing looks broken; it simply reads as though the
work were in no order at all.

To add a project:

1. Drop its media in `src/assets/<project-id>/`.
2. `bash scripts/posters.sh`, `bash scripts/field-clips.sh`, then
   `node scripts/media-manifest.mjs`.
3. Add a `Draft` to `projects.ts`, quoting filenames — in the right place in the
   array, see above.
4. `node scripts/check-media.mjs` — every reference must resolve.
5. Optionally give it a piece in `src/site/products.tsx`. Without one it still
   gets a case in the row; the case is simply empty, which is a truthful thing
   for a museum to do.

`visa` and `3d-printing` are placeholders carrying a `restricted` note instead
of sections; the case study renders that rather than an empty page. Fill in
`sections` and `hero` to promote either to a full study.

### Posters

`scripts/posters.sh` pulls one still from every clip into
`src/assets/posters/<project>/`. These are what the field paints with, what a
case-study figure shows before its video is worth decoding, and what a clip with
sound shows before anyone presses play — so a poster on a black frame is not
cosmetic, it is a card that looks broken.

A lot of this footage opens on a fade from black, so the frame is *chosen*, not
taken: seek partway in, let ffmpeg's `thumbnail` filter pick the most
representative frame of the following batch, then measure its average luma and
try progressively later offsets if it is still nearly black. Three clips are
genuinely dark throughout (one is called `Darkness.mp4`) and keep their last
attempt.

`--force` re-does existing posters.

### Field clips

`scripts/field-clips.sh` writes a 400px silent proxy of every clip into
`src/assets/clips/<project>/`, which is what the field plays — 15–100 KB against
the master's 1–8 MB, and indistinguishable on a card a couple of hundred pixels
wide. Encoded to `main` profile / yuv420p rather than passing through whatever
the master happened to be: a 10-bit or high-profile stream is exactly what a
phone refuses to decode, and a card that will not play is worse than one that is
slightly soft. `--force` re-encodes.

A clip with no proxy yet falls back to its master, so adding footage and
forgetting the script costs bandwidth rather than a blank card.

---

## The case study

An ordinary long document, deliberately. The stage is the place for spectacle,
and a page you are meant to *read* should not fight you for the scrollbar.

What carries the aesthetic through is the setting: the same paper, the same ink,
the same two typefaces, the same reveal on everything as it arrives, and a
masthead built like the opening spread of a printed article.

- Sections are a two-column field — a sticky number and title in the margin, the
  body in the measure. The lead paragraph uses the same grid with the head
  column empty, so it lands on exactly the same left edge as every paragraph
  below it. Centring it only happens to line up at one window width.
- Media sits on a twelve-column field with `grid-auto-flow: dense`, so a narrow
  figure backfills a gap a wide one left. Spans come from each item's real
  aspect ratio.
- On narrow screens everything takes the full measure **except portraits**,
  which keep pairing up: a phone capture given the whole width becomes taller
  than the screen.
- A figure creates its `<video>` only once it is within a screen of the fold,
  plays it only while visible, and drops the `src` on the way out — pausing
  alone leaves the decoder allocated for the rest of the visit.
- Clips carrying real audio get controls and wait to be asked. They also need
  their own `poster` attribute: a `controls` video is opaque from the moment it
  mounts, so the still underneath is never seen.

---

## Chrome that survives a navigation

The shell owns the two things that must not restart when the route changes.

**The page transition** is a sheet of ink drawn up over the page, carrying the
destination's name, which commits the route swap at the moment it covers
everything and then draws off the top.

Its resting pose is set in JS, not CSS, and that is load-bearing. GSAP animates
`yPercent` — a channel it keeps separate from the `y` px channel it parses an
existing declaration into. A `transform: translateY(100%)` in the stylesheet is
read as `y: 778px` and stays in the matrix underneath the tween, so the sheet
animates to "yPercent 0" while still sitting a whole viewport below the fold and
the page swap happens in full view with no curtain over it at all.

**The music** is in `src/assets/audio/` — drop files in and they are found,
ordered by filename and titled from it. Nothing to keep in sync. With the folder
empty the player returns `null`, so the site is complete before any music
exists. It never plays uninvited.

---

## The loading screen

It measures something real: the stills the field paints with, and the fonts the
page is set in. A fake timer bar would be easier and would also clear *before*
the images it was pretending to count, so the first thing anyone saw would be a
field of empty rectangles.

The name is printed twice on top of itself — a faint impression under, full ink
over, clipped to the progress. The type is not fading in, it is being *inked*.

**Finishing is driven by timers and load events; frames only smooth the number.**
A background tab gets no `requestAnimationFrame` at all, so a loader whose exit
condition lives in the draw loop never exits — open the site in a background
tab, come back a minute later, and you are staring at a half-drawn name. There is
also a floor (a warm cache would otherwise flash the loader for two frames, which
reads as a glitch) and a ceiling (one asset stalled behind a dead connection must
never hold the site hostage).

---

## Type, colour, motion

All of it is in `src/site/tokens.css`. Retuning the look is editing that file.

**Ink on parchment.** Warm off-white, black ink, and one chromatic note — a
rubric red, the colour a scribe used for the parts that mattered. Each project
overrides `--accent` with its own. Every large flat area carries a single tile of
value noise multiplied over it, which is what stops `--paper` reading as a blank
div; it is fixed and non-repainting, so it costs one rasterisation total.

**Three faces.** Instrument Serif for anything that is a name, self-hosted from
`public/fonts/` under the OFL. Inter for everything you read as information.
And Times itself — `--font-times` — for the home page's chrome: the ARTIST
rubric over the name, the wall behind it, the menu. Instrument Serif is a
high-contrast display face and reads as *the name*, so setting the small type in
it too would make the whole page one voice; Times is the plain, unglamorous
serif underneath, and the contrast is the point. No webfont for it: it is on
every machine that will load this, and one that is missing it falls through to
its own system serif rather than to Arial.

Two of the three menu items are `<button>`s, and a form control does not inherit
`text-transform` or `letter-spacing` from its nav — `button { font: inherit }`
carries neither. Both are set on the items themselves, or the two buttons come
out mixed-case and untracked beside an uppercase link.

**Two easings.** One expo-out for anything arriving, one symmetric curve for
anything travelling between two places. Everything on the site uses these two,
which is why nothing ever reads as belonging to a different site.

### Working offline

`npm run dev` needs no network. Everything the page loads is local: Inter through
`@fontsource-variable/inter`, Instrument Serif from `public/fonts/`, the Draco
decoder from `public/draco/` rather than the gstatic CDN. Keep it that way — a
`https://` in a new `<link>` or asset URL is the one thing that will quietly
degrade the layout when there is no connection.

---

## What is in the bundle

| Chunk | gzip | When |
|---|---|---|
| `index` | ~106 KB | First paint: shell, field, gallery, loader |
| `ProductStage` | ~494 KB | First time the gallery wakes — three, R3F, drei, leva |
| `ProjectPage` | ~3 KB | First time a case study opens |

The 3D stack is more than a megabyte and none of it is needed to paint the name,
the field, or a case study, so it sits behind `ProductStage.tsx` on its own
chunk. **An import of `../three/*` or `./products` from anywhere outside that
file pulls the whole stack back into the initial bundle**, and nothing about the
page will look different when it happens.

The gallery's tuning panel is on the far side of that line for the same reason,
which is why the room's proportions live in `site/room.ts` and its values are
reported *up* rather than read *down*: leva is the 3D chunk's dependency and not
first paint's. `site/room.ts` imports nothing, and has to go on importing
nothing, or the same trap reopens by the back door. Type-only imports across the
boundary are fine — `verbatimModuleSyntax` guarantees they are erased — but they
must keep the `type` keyword to stay that way.

## The models

`public/models/*.glb`, exported from Blender and Draco-compressed. Four projects
have a real modelled asset; the rest are hand-built from primitives in
`src/three/`, because showing every project as the same borrowed capsule says
nothing about any of them.

Three things about glTF that look like rendering bugs and are not:

- **Nothing about lighting survives the export** — no lights, no world, no HDRI,
  no view transform. That matters most for a gloss-white object, which shows
  *reflection* rather than diffuse colour and renders as a flat silhouette with
  nothing to reflect. `StudioEnvironment` builds one procedurally with
  `RoomEnvironment`, and the canvas tone-maps through ACES to approximate
  Blender's view transform.
- **A material exported without a `pbrMetallicRoughness` block takes the spec
  default** — white, but fully metallic and fully rough, which has no diffuse
  colour and no sharp reflection and lands on near black. `LoadedModel` restores
  a dielectric; the test is the exact 1.0/1.0/white triple only the glTF default
  produces, so real materials fall through untouched.
- **Flat decals z-fight.** `near`/`far` are pulled tight around the subject and
  the decal materials carry a polygon offset.

Framing is derived from the model's own bounding box, so the next export lands
correctly whatever scale its scene happened to use. Staging geometry named
`Plane` is stripped — along with the animation tracks addressed to it, or the
mixer walks the hierarchy looking for a node that is no longer there and warns
once per track.

## The archive

`src/archive/` holds the previous versions of this site — including the **ribbon**,
the film-leader banner that hung across the screen, sagged under its own weight,
moved in the wind, and was cut open to unwrap into a ring of type. Nothing in
there is mounted, all of it still typechecks, and every relative import was
rewritten when it moved. See `src/archive/README.md`.

The legacy Vue guides (`COMPLETE_DATA_DRIVEN_GUIDE.md`, `LAYOUT_CONTROL_GUIDE.md`,
`LINKS_FEATURE_GUIDE.md`, `MEDIA_ORDERING_GUIDE.md`, `PROJECT_STRUCTURE_GUIDE.md`)
describe the site *before* the React rewrite and do not apply. They are kept only
as a reference to the old project data.
