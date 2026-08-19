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
| `Intro.tsx` | The opening — the name written in, then the black lifts off the stage |
| `nameGlyphs.ts` | The signature's outline and its hand-authored pen strokes |
| `Wordmark.tsx` | That same signature standing still — the one mark on the site |
| `useScrollEngine.ts` | The one clock — wheel/touch/keyboard into a single damped number |
| `Home.tsx` | The stage: the signature walking between the middle of the screen and the menu bar, the chrome, composes the field and the gallery |
| `Helix.tsx` | The vortex of media, in CSS 3D |
| `Gallery.tsx` | The row of vitrines, and each project's wall label |
| `ProjectFrame.tsx` | The drawn frame — around whichever project you are standing at, and around the name |
| `frames.ts` | The drawings themselves: a corner and a crest per variant flipped four ways, the vine, and the sprig |
| `Sprig.tsx` | The two small vines that grow out of anything you can press |
| `pattern.ts` | The background wallpaper's drift, driven by whichever screen is mounted |
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
0        the signature in the middle of the screen
0 → 1    it walks to the menu bar while the first project drives in from the wing
1        the first project, square-on
n        the nth project
```

That stretch from 0 to 1 is short on purpose — `entranceGain` in
`useScrollEngine` multiplies input there and only there, so the entrance costs
about one gesture while a step through the work still costs a deliberate one.

Everything visible is a pure function of it — the signature's position and
size, the row's position, how far each project's frame is drawn, which project
is named. That is why
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

**The rule across the foot is a date line, and you can travel on it.** The
longer line is the client work and fills as you move through it; the dot and the
shorter line after it are the side projects. Running along either one puts the
year at that point under your cursor, and pressing it goes there — the work line
turns the row to the piece standing at that point, and the side line opens that
case study, since those are not places on this scroll and there is nowhere on it
to send you. It answers from the name too: a readout can afford to sit dead
until you are already in the work, and a control cannot.

**One year, not the masthead's date.** A project's `timeline` is written for the
top of its case study — `Jan — Jul 2026`, `2024 — 2025`, `2015 — Present` — and
a date line carries a date. `oneYear` in `Home.tsx` takes the last four figures
in the string, which reads right in every shape the field takes: the year a
finished piece finished, and the year an ongoing one started, there being no
second year in it to take.

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

**`IDLE_SPEED` is zero.** The field used to keep turning on its own, even
sitting untouched at the name — a vortex the moment you arrived and every time
you scrolled back up to it, which is exactly the read `Intro.tsx`'s entrance
exists to get away from. Now `travel` only advances from `state.speed` and
`state.velocity`: no scroll, no motion, in either direction.

---

## The mark

One drawing does the whole job of identity on this site: the signature in
`nameGlyphs.ts`. The opening writes it out stroke by stroke; `Wordmark.tsx`
stands it still; `Home.tsx` walks it from the middle of the screen to its slot
in the menu bar as you scroll, and straight back when you scroll up.

It replaced two things. One was a wall of seven disciplines set enormous behind
the name — 3D design, product design, engineering, cinematography, musician,
motion, AI — and the typeset TARLOK / SINGH standing in front of it. Words that
large stop being a list and become ground, which was the idea, but they were
ground under a name that is already a drawing, and the page was arguing with
itself about which of the two you were meant to look at.

The other was a second, smaller copy of the mark in the corner. The big name
used to recede through the viewer while that one faded up where it landed,
which works as an exit and reads as two marks. One that travels reads as the
same mark finding its place — and because its position is a pure function of
scroll rather than an animation fired at a threshold, it walks back to the
middle on the way up with nothing to reverse.

**Only the parked pose is measured.** The element is laid out where it belongs
in the menu bar, pinned to the same two edges as every other piece of chrome,
and the middle-of-the-screen pose is expressed as a transform away from it,
with every position in between that transform scaled down. So the docked
landing is exact at every width instead of approximately right, and nothing can
disagree about where the big pose is because nothing measures it. `--sig-hero-*`
on `.hm-sig` is the one size involved, and it is deliberately the same clamp as
`--sig-w` on `.in-stack` in `Intro.css`: the handover from the film to the page
has to be the black lifting off the mark, not the mark resizing under it. For
the same reason the rubric above it hangs out of flow on both screens — in flow
it makes the column centre the *pair*, which puts the signature half a rubric
below where the other screen puts it.

That also took the name out of the field's `preserve-3d` space, which it had to
leave: the journey is across the window, and it cannot be made from inside a
perspective space with its own idea of where the middle is.

### The stack, and what grows around it

Three lines sit on the middle of the screen: `artist` above the signature, the
signature, and `scroll` below it. The two words are the same size and hang the
same distance off the mark's ink box — `0.056` of its width, at `0.0406` — so
the spacing above and below is even by construction rather than by having been
eyeballed at one window size. Both screens compute them the same way from the
same `--sig-w`, because the film hands this exact picture to the page and a word
that resizes or steps across that handover is the one thing the whole
arrangement exists to prevent.

**A vine grows around them.** It is `ProjectFrame.tsx` again — the same drawing
machinery the exhibits' frames are made of, given a different ornament
(`VINE_FRAME`) around a very much smaller box. The exhibits' frames are hung off
the window and stand a whole exhibit tall; this is a close ring around the name,
about a third of the width and drawn in a finer pen.

It is deliberately slower than anything else on the site: **thirteen seconds to
grow, and `--pf-hold` down at a sixth.** That variable is the share of the whole
draw one stroke takes. At the default half, a frame's lines overlap and the
thing arrives as one movement, which is right for something drawn in three
seconds; at a sixth the starts spread right across the draw and one leaf, or one
flower, opens at a time — about every half second, for the whole of it. Most
visitors will scroll a few seconds in and see a third of a vine, which is the
intended picture. `VINE_FRAME` is written in the order it grows for that reason:
the stem first, then the ornaments working from the ends of the arms in toward
the turn, so a vine caught early is a young vine rather than a finished one with
pieces missing.

**Leaving un-draws it.** Not a fade — the strokes go back the way they came,
last one first, over `VINE_UNDRAW`. The signature beside it dims on the way to
the menu bar and this does not, because they are two different statements: the
rubric is a caption being taken off something that is no longer caption-sized,
and the vine is a plant being taken back.

**The stroke that says which way to go comes out of the plant.** It used to be a
line under the word, which is a line under a word; it hangs off the flower at
the middle of the vine's bottom edge now, so the invitation is one thing the
page is doing rather than two. Where that flower's tip lands is solved in
`Home.css` from the same two fractions `ProjectFrame` uses, because the frame
writes its ornament size onto a child and cannot be asked for it. It is two
elements for one stroke: a running animation beats an inline style, so the box
takes the scroll's opacity and the stroke inside it takes the keyframes'.

The cue is **a pure function of scroll**, like everything else here. It used to
latch off on the first input and never return, which is right if you read it as
an onboarding hint and wrong if you read it as part of this screen — scroll back
up to the name and the invitation under it is there again, the same way the
rubric above it and the vine around it are.

### Sprigs

`Sprig.tsx`. Two small vines that grow out of the sides of anything you can
press — the three menu items, the button on a wall label, the parked mark, and
the year on the date line — and pull back off when you are not on it. Same hand
as the frames, at the size of a word: a runner, a leaf either side, and a closed
bud. A bud rather than the frames' open flower, because five petals a couple of
centimetres wide come out as a blot.

**No JavaScript.** The paths are normalised to `pathLength="1"` and the dash
offset is a CSS transition, so growing is a `:hover` and retracting is the
absence of one. There can be a dozen of these on the page and every one of them
is idle almost all of the time; a `requestAnimationFrame` loop each, the way
`ProjectFrame` has one, would be a dozen loops running to draw nothing. The
delays run forwards on the way in and backwards on the way out, so the bud goes
first and the runner it stands on goes last.

Two things are less obvious than they look. **An undrawn stroke is not
invisible** — the pen is round-capped, so a dash offset of the whole path length
still paints the cap where the pen would have started, which is five full stops
hanging in mid-air beside every word on the page until the sprig carries its own
opacity. And **the mark's sprigs can only ever be seen parked**: `placeSign`
hands `.hm-sig` its pointer events back at the end of the journey and takes them
away on the way out, because at the hero pose it is a foot wide and already
standing inside a drawn frame.

The trigger class `u-vine` goes on the host, not on the sprig: a sprig sits
outside its host's box and cannot be hovered itself, and should not be — a
flourish is not a hit target. `data-on` grows them too, which is the same
attribute the menu marks its current item with, so a sprig and the rule under a
link can never disagree about whether something is current.

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

**A frame is drawn around it.** `ProjectFrame.tsx`, with the flourishes
themselves in `frames.ts`. Two drawings shown six times: a corner, written for
the top-left and flipped onto the other three, and a crest, written for the top
edge and flipped onto the bottom — written once and mirrored so a frame can
never disagree with itself edge to edge. The corners run a long way down each
arm on purpose; kept short they read as crop marks, which is a printer's
instruction rather than an ornament, and it is the length of the sweep meeting
the crest that makes the six of them read as one frame around the piece rather
than six decorations near it.

**There is one per project and it travels with it**, on the same step along the
row that its wall label rides. A single frame fixed to the window hung over
everything as the row passed underneath, which belongs to the page rather than
to any of the work on it.

The strokes are normalised with `pathLength="1"`, so the dash pattern is in
fractions of each stroke's own length and nothing has to be measured to animate
it. Each takes `--pf-hold` of the draw to put itself down and their starts are
spread across whatever is left, solved from the variant's own stroke count —
fixed, the sparse variants would finish long before the visitor arrived and the
ornate ones would still be drawing after they had. `--pf-hold` is half here,
which is what makes a frame arrive as one movement; the vine around the name
turns it down to a sixth so that one thing happens at a time.

**The pen is written in each drawing's own units, not in pixels.** That is not a
preference. The draw is a dash walked along a path normalised to a length of 1,
and `vector-effect: non-scaling-stroke` is measured *after* the drawing has been
scaled — so the dash and the path it is walking stop agreeing about how long the
path is the moment that scale is not 1, and the line comes apart into ticks,
worse the larger the frame is drawn. It looked fine on a phone and wrong on a
monitor for exactly that reason.

**The component is not only for projects.** `variant` overrides whichever
drawing an index would land on, and `drawIn`/`drawOut` override the pace — which
is the whole of what the vine around the name needed to be the same machinery
rather than a second copy of it.

**Both of its clocks are wall-clock, quantised to 12fps**, which is what makes
the line lay itself down in bites and the drawing wobble as though redrawn. Its
own `rAF`, not the scroll engine's: it is at its most visible when the visitor
is doing nothing, which is exactly when that engine has stopped ticking and
there are no frames to hang it on. 12 rather than the opening's 24 on purpose —
a frame is a held drawing, and at 24 the wobble reads as a shiver. The
amplitude is well under a pixel for the same reason: anything you can measure
by eye reads as the page shaking.

The drawing used to be a readout of scroll position, on the reasoning that a
pure function of the scroll answers a reversal with nothing to cancel. True,
and still wrong: **past the first project the track is detented, so there is no
slow approach to read from.** One gesture sends the target a whole project and
`value` eases after it in a few hundred milliseconds, so the frame was drawing
during the flight and was finished before the piece had settled — it was never
actually seen being drawn.

So the cue is **arriving, not having arrived**. `near` in Gallery.tsx is the
list of projects within `NEAR` of the front — the one you are standing at, and
whichever is coming in beside it — so the drawing and the piece travel onto the
screen together, which is the whole of what a frame is for. Keyed to the row
having come to *rest* instead, the line could only ever start at a piece already
sitting square-on in front of you, and so arrived at a settled picture rather
than coming in with it. It is a list and not an index because two are on screen
through a move, and React state rather than a per-frame write because it changes
twice a project and everything downstream of it wants to be told, not polled.

From there the frame times itself: **3.2s to draw in, 0.4s to pull off.** It
advances at a steady rate rather than easing, because a pen travels at one
speed and an exponential spends the whole back half creeping through the last
stroke. It stays interruptible — leaving halfway retracts from where it had got
to.

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
stage shift, the width at which the layout goes to phone, and the wall label's
own **Panel width** and **Panel min-height** — the width because where a
two-column layout actually gives out is something you find by dragging a window
edge, not by reasoning; the panel size because `.gl-panel`'s footprint used to
be two numbers baked into `Gallery.css` (`min(25ch, 22vw)`, height left to its
content) and is now something to drag rather than edit and rebuild for. All of
it is reported *up* to `Gallery.tsx`, which owns the proportions, rather than
applied where it is set; that is what makes spacing move the labels and not
just the cases. `panelW`/`panelH` land on `.gl-panel` as the `--panel-w` /
`--panel-h` custom properties, and only the wide (beside-the-case) layout reads
them — the narrow, stacked-under-the-case layout keeps its own fixed measure.

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

## The opening

`Intro.tsx`, home route only. A dark room; the name writes itself in, in a
cursive that follows an actual pen trajectory rather than wiping across a mask;
`artist` fades in above it once it is done. It also stands in for the loading
screen on the way to the stage — it is already covering the page while the
field's posters decode, and making someone watch a progress bar and *then* an
entrance is two waits where the design only has room for one.

**There is no cue to scroll**, because there is nothing to ask for: the black
starts fading off by itself the moment `artist` starts arriving over the
finished signature (`ARTIST_AT`, `AUTO_FADE`) — the rubric fading up and the
room fading off are one beat, rather than the opening saying its last word and
then waiting to be let out. The film keeps running on its 24ths the whole
way down, so the black and the crackle go together as one picture dimming. The
page it hands to raises its own cue — that is the first screen where scrolling
is a choice.

`artist` is set here from the same two fractions of `--sig-w` the page sets it
from, and hangs off the middle of the screen rather than sitting in the column,
so what the middle holds is the signature alone. Both of those exist for one
reason: this word and this mark have to be in the same place, at the same size,
on both sides of the handover.

**It runs at 24fps, for real.** Every visible value is sampled from a clock
quantised to `1/24s`; nothing moves between samples. That is the whole reason it
reads as film rather than as a web page with a grain overlay on it — the strobe
on a moving edge, the flicker holding for two display frames and then jumping,
the pen advancing in discrete bites. The quantiser drops the instant the burn
is committed to, because a curtain that stutters just looks broken.

**The signature is geometry, not a webfont.** `scripts/name-path.mjs` walks
Great Vibes with `opentype.js` and writes `nameGlyphs.ts`: the filled outline,
and thirteen separate hand-authored bezier strokes — one pen-down each — used as
an SVG mask with `stroke-dasharray`/`stroke-dashoffset` driven off the film
clock. Thirteen separate `<path>` elements, not thirteen subpaths of one: a dash
pattern restarts at every subpath boundary, so one path would draw all thirteen
strokes at once instead of one at a time with a pause where the pen lifts.

**Scrolling burns through instead of fading.** The veil is not faded away, it
is eaten: a hole grows out of a `mask-image`, sized by how far the wheel has
travelled (`progress`, `SCROLL_RANGE`), with a glow at its edge and a
turbulence filter reseeding every few frames so the burning line is uneven the
way a real one is. Everything on top of it lifts bottom to top as the hole
opens. Being a readout of scroll rather than a tween, it burns backwards if you
scroll back.

The two exits are deliberately different gestures. A burn answers the wheel and
wants a hand on it; run off a timer it reads as a rip, which is why the
automatic way out is the plain fade above. Taking the burn over mid-fade hands
the veil back to full opacity first — a hole cannot be eaten through something
already half see-through.

Only the scrolled exit calls `onCommit`, which is what tells the shell to put
the stage on the first project. On the timer nobody asked to go anywhere, so
the page underneath is its own opening frame with the signature still in the
middle of the screen.

The page is interactive the instant the veil is gone, on `onReveal`, which
fires before the sequence finishes unmounting.

**`onLeaving` fires a good deal earlier** — the moment the room *starts* to go,
on whichever of the two exits happens first. It is the cue for the page
underneath to begin its own entrance, so that what you see is the film coming
off something already growing rather than a settled page appearing behind it.
The vine around the name starts there, which is why it is already a second and a
bit into itself by the time the last of the black has gone.

---

## The loading screen

For a direct link to a case study — the one path that skips the stage and its
entrance. It measures something real: the stills the field paints with, and the
fonts the page is set in. A fake timer bar would be easier and would also clear
*before* the images it was pretending to count, so the first thing anyone saw
would be a field of empty rectangles.

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
