# tarloksingh.com

Portfolio site. React + TypeScript + Vite, GSAP for the page transition,
three.js for the products.

```bash
npm install
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
node scripts/check-media.mjs   # every file the project data quotes exists
```

Adding media is four scripts, in this order: `bash scripts/posters.sh`,
`bash scripts/field-clips.sh`, `node scripts/stills.mjs`,
`node scripts/media-manifest.mjs`.

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
| `/v3`, `/v3/index`, `/v3/p/<project-id>` | The next version, being built alongside — see **v3** below |

```
src/
  site/          the site — everything below is in here
  v3/            the next version, standing beside this one rather than on top
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

## v3

Being built beside the current site rather than on top of it: `/` is still the
working site and `/v3` is the new one, both in the same bundle, with `App.tsx`
choosing on the path. Both read the same `src/data/projects.ts` — nothing about
the work is duplicated, and re-tagging a project re-cuts both.

| URL | What it is |
|---|---|
| `/v3` | Home: the cast on the stage, a readout, every project as an index |
| `/v3/index` | The timeline — one square per project, by year |
| `/v3/p/<project-id>` | A project, as a readout |

| File | What it does |
|---|---|
| `V3.tsx` | Two screens and fifty lines of routing |
| `model.ts` | The view model — projects flattened into what the panes draw |
| `Browse.tsx`, `Detail.tsx`, `Stage.tsx` | The timeline screen |
| `Mech.tsx` | **Home and a project both** — layout, the swap, transit |
| `MechCast.tsx` | The home line-up: every subject on one stage, placed |
| `MechWave.tsx` | The ground it stands over — a shader, not a picture |
| `castTuning.ts` | Where each stands, how each is lit, and the camera |
| `MechPanel.tsx` | One dev panel, tabbed, scoped to the screen you are on |
| `leaders.ts`, `notes.ts` | Where the lines go, and what they say |
| `MechPins.tsx` | Placing them by hand — press **P**, development only |
| `MechModel.tsx` | The subject — one GLB, lit, drifting, watching you |
| `MechHud.tsx` | The dashboard under everything: grid, bloom, sweep, compass |
| `MechCursor.tsx` | The reticle, and the lock box it hands to a target |
| `MechBird.tsx` | v2's bird, warm like the gun now, shootable |
| `MechLaser.tsx` | The gun the reticle was always for |
| `MechDeck.tsx` | The music deck |
| `SplitReveal.tsx` | The tagline and the fold titles, drawn in a character at a time |
| `sound.ts` | Every sound the page makes, synthesised |
| `subject.ts` | Two live facts about the thing on stage, shared across the Canvas |
| `modelTuning.ts`, `wallTuning.ts` | Leva panels, and the source they paste back into |

### Home is the project screen

`/v3` used to be the wall on its own: two hundred small tiles, every clip
playing, and two words of chrome over the top. It is a good answer to *how
much of this is there* and a bad one to *what is this*, because two hundred
thumbnails is a contact sheet and a home screen is a front door.

It then became a character select — five subjects up at once, a readout
between them and the work, and a grid of every project underneath. Which was
the right composition and the wrong construction, in two ways that only showed
up once you used it.

**It was a second screen.** `Home.tsx` and `Mech.tsx` were separate
components with separate DOM, so opening a project unmounted an entire page
and built another one. The dashboard, the phosphor grid, the compass and the
bloom all blinked out and came back; the boot sequence ran again; the bird
restarted. That flash between two screens was not a transition anybody
designed, it was the second component painting over the first, and no amount
of easing on either side could have hidden it.

So there is one component. `Mech` takes `id: string | null`, and `null` is
home. Three slots hold different things depending on which it is — the stage
holds the cast or a subject, the side column holds the readout or the
write-up, the bottom holds the index or the tile rail — and *everything else
never moves, because it is never remounted*. Opening a project is the same
retarget that moving between two projects already was: what is on the stage
leaves, `shownId` changes underneath it, what replaces it draws itself in.
Same `EXIT_MS`, same four beats, same code path. The background cannot flicker
because nothing repaints it.

**And the scroll survives it too, which it should not.** On the narrow layout
`.mech` is the scroll container, and it is exactly the element that is never
remounted — so pressing a slot from halfway down the bank landed you halfway
down the project, with the subject you opened it for off the top of the
window. It reads as the page having loaded wrong. The fix is one line in the
retarget effect, next to `setShownId`: `root.current?.scrollTo({ top: 0 })`.
It goes *there* and not in an effect on mount, because that timeout is the one
beat the screen is fully covered — a jump you can see is a jump, and this one
lands while there is nothing to see. Nothing had to change on the wide layout,
which does not scroll at all.

**Everything on the stage has to key off `shownId`, and one thing did not.**
`id` is the URL and it changes the instant you press a tile — a full
`EXIT_MS` before the screen does. `useModelTuning` was keyed on it, so for the
whole of its own fade the outgoing subject was being re-framed and re-lit with
the *incoming* project's rig. Leaving Capsule C1 (`fill: 0.15`) for home
retuned it to Mr. Takahashi's `0.56` and it swelled to four times its size and
past the edges of the window while dissolving; the two guns swap a focal
length as well (18mm against 200), so the framing jumped with the scale. It
read as the subject flinching on its way out, and it was on both layouts and
on every route out of a project — to another project or to home.

`useNarrowTuning` had it too, and compounded it: `model` multiplies the
subject's `fill`, so on a phone both numbers moved at once. `useProductTuning`
was always keyed on `shownId`, which is exactly why a *piece* never flinched
and only the four GLB subjects did — a good reminder that "it only happens on
some projects" is usually a difference in the code and not in the data.

All three key off `shownId` now, which meant declaring it above them rather
than below. Nothing about a subject moves after the cover starts coming down,
and the incoming one still arrives on its own rig because it mounts on the
`hold` beat, by which point `shownId` has already swung over.

The index and the rail take their exit from `data-covered` on the root, which
is already true for the whole length of a retarget — so whichever one is up
has faded before the swap and the other fades in after it, and neither is ever
caught mid-exchange. Hovering a box in the index fills the readout in with
that project *before* you press it, which is what makes the press feel like it
lands on something already open rather than like a question being answered.

### One room, both screens

The bloom is a property of the room, not of home, and it took a bug to notice.

`--cluster-glow` is the Bloom knob on the dev panel, and every glow radius and
glow alpha in `MechCluster.css` is a multiple of it. It used to be written
inline onto `.mech-cluster` — which only exists on home. So `--g` fell back to
1 the moment a project opened, the cluster's own pool of light went out with
the element that carried it, and the swap read as the room's lights changing
rather than as a page moving. Wound up, the two screens were lit differently.

Two moves fix it. `--g` is declared on `.mech`, and `Mech.tsx` writes
`--cluster-glow` onto that same root whichever screen is up. And the cluster's
haze — the accent pools and the warm one the reference's brake light throws —
moved onto `.mech-bloom` in `MechHud.tsx`, which is on every screen. One knob,
one room, and a project screen is now lit exactly as home is.

The wash bleeds two hundred units past the frame on every side: a wash that
stops at an edge is a rectangle, and the whole point of it is that the light
does not stop.

**One green in the middle, not two.** Wiring both pools into the same element
left two concentric accent ellipses there: the room's own wide
`55% 50% at 50% 52%` at a flat `0.075`, and the cluster's tighter
`44% 36% at 50% 48%` at `0.1 * --g` — which at the shipped Bloom of 2.8 is
`0.28`, nearly four times the wash it sat on. Home hid the problem, because the
cluster covers the middle of the frame and all you ever saw was the wide one
haloing the panel. A project screen has nothing over the middle, so both were
on view at once, concentric and centred on the subject, and that reads as a
glow with a second harder glow stacked on it rather than as one light. Only the
wide one is left, and it is the wash both screens already shared. The bottom
accent pool and the warm one are off-centre and stay.

A related one was on the stage itself: `.mech-stage::before` carried *another*
central `--accent` radial, drawn over `.mech-bloom` on a project screen and
nowhere else. Also gone. If the middle of a project screen ever looks doubly
lit again, count the centred `radial-gradient`s before reaching for opacity.

### Home is a cluster

The character select survived one more pass and then lost the argument.

Two hundred tiles was a contact sheet. A line-up of five 3D subjects was a
*showroom* — a stage with things standing on it — and every other screen on
this site is a readout, where something is on a stage and the panel around it
reports on it. Home was the one page not doing that, and once the two are next
to each other the mismatch is the whole problem: the front door was built out
of different material from the rest of the house.

Three smaller things went wrong underneath that, and each one is a reason a
graph beats a group portrait here:

**Seven of the twelve projects had no object standing there.** The line-up
could show five, so the index it was supposed to *be* could only reach five and
everything else lived behind the header key. The bank has a slot for every
project — and eleven of the twelve turn out to have a subject after all, once
the eight pieces built out of primitives are counted alongside the three GLBs.
Visa is the only one with nothing, and its slot says so.

**A shape is not scannable.** The row of twelve named boxes that the line-up
replaced lost to it for being a list beside a picture of the same twelve
things — but the list was winning for a reason, and taking it away did not
change the reason. The bank is both at once: the name and the number are on the
slot, and the subject is *in* it.

**The colour drifted.** `tint.ts` rotated `--accent` in step with the hue of
the wave under the cast, so the grid, the title, the index and every lit edge
turned together. The mechanism was right — one supply, everything lit off it —
and the effect was a screensaver. An instrument does not change colour.

So home is a panel now, laid out the way a car's instrument cluster is.
`MechCluster.tsx`, and `MechCluster.css` beside it — its own stylesheet
because this is a whole screen rather than a part of one. Six things now, and
the arrangement is the design:

- a **warning pair** at the top of the frame, `SHOOT` / `STOP` — the one lamp
  on the page that is about the page rather than about the work — with the
  tally of what has come down docked directly above it (see *Two animals, and
  a tally*);
- the **name**, red-orange rather than the panel's phosphor, on its own line
  between the warning pair and the instrument — not laid over it any more —
  and set in Audiowide, a display face built for exactly this register rather
  than the site's own Clash Display;
- the **tachometer**, the single largest instrument, filling the middle, with
  `INTRO` and the profile set in its quiet left corner where the name used to
  sit;
- the **left flank**: the counts bled off the edge of the frame, and under
  them the reel of what I do — what used to run in a strip across the top of
  the panel;
- the **rail of work** down the right — as tall as the instrument opposite and
  no taller — the project's own name above the bank now rather than in that
  same strip, and the five field dials under the bank rather than under the
  graph.

**Almost nothing on it is decoration.** The two displays and the five field
dials under the bank all report on whatever is selected in the rail. The
counts are derived from the work itself — years active, roles worn,
organisations shipped for — because a portfolio that states a number it does
not derive is a number to keep up to date. The rail is a bank of twelve
slots, each holding its project's own 3D subject, and it is the navigation.
The tachometer is the exception, and the argument for allowing exactly one is
under `#### The tachometer` below.

**The second pass took the strip apart.** The run of lamp cells that used to
sit across the top of the middle column — what I do on the left, what is
selected on the right, three dark groups between them — read as a caption for
the whole panel rather than as a reading off the block of facts either side of
it. Both halves moved to stand next to what they actually describe instead:
the job title under the counts it is a share of, the project's name above the
bank of slots it names. Neither carries a border any more either — see `####
The display` below for why nothing on this panel is boxed now.

**The body is pinned to the top of its own box, and the padding above it is the
gap.** It was bottom-aligned once, then centred, and centring is what put a
hand's width of empty frame between the name and the instrument: the body box
runs from the name to the bottom of the frame, and half of whatever the panel
does not use ends up *above* it. That is fine while the panel nearly fills the
box and absurd once it does not — and this panel got shorter twice over, once
for a shallower graph and once for a readout box replacing a stacked paragraph.
Pinned to the top, the gap is a number in `MechCluster.css` rather than a
consequence of one.

The counts' bars land on the same floor the tach's columns do, and now they are
also the same *height*: `--face` sizes both, so the two blocks climb from one
line to another. `.mech-flank` carries a small `margin-top` for the difference
in what sits above each of them — the readout box and the head row over the
graph, a two-cell number over a gauge. Measured off the built page, because it
is all type and type does not answer to `--px`.

**The two flanks are the same width, and that is what centres the middle.**
`.mech-body` hands whatever is left over to `.mech-main`, so a left flank
sizing itself to whatever the role reel happened to be left the instrument an
inch to the left of the name centred in the frame above it — close enough to
look like a mistake and not close enough to look like one on purpose.
`--flank-w` is one number for both the counts column and the rail, and the
tachometer lands under the middle of the name because of it.

And that number is `--count-w`, the counts' own width. The rail used to be half
again as wide as the block opposite it, which made the panel lopsided about the
axis its own name sits on — the rail is narrow enough to want a two-line project
name either way, and it already scrolls.

**Warm is what the pointer changes; green is what the machine reports.** The
rail's names and the field dials under it are `--warn` now, the same channel the
name over the whole panel is set in. Everything else stays phosphor. It is a
rule you can read off the screen without being told it, and it is why the name
went red in the first place — it is the one line on the page that is not a
reading.

**The name is fitted to its box, so the box is how it grows.** `.mech-ident` is
a container and the font size is a `cqw` sum over the character count — which
means widening `.mech-ident` is what makes the name larger, and
`--cluster-name` on the panel stays a nudge either side of that rather than
being wound up to carry the whole change. It sits lower than it did as well:
the padding above it is what drops it clear of the warning pair.

**It is centred with flex, not `text-align`, and that distinction is the whole
bug.** `text-align: center` only positions a line *inside* the space it has.
Wind `--cluster-name` up far enough and the line is wider than its box — and an
over-wide line does not centre, it starts at the box's left edge and runs off
the right. Which is exactly what it looked like: turn the name up and it stops
being centred and starts growing rightward. A flex item larger than its
container under `justify-content: center` overflows both ends equally instead,
so the name stays on the frame's centre line at any size and simply runs out of
room symmetrically.

**The rail is as tall as the instrument, and no taller.** It used to be
`align-self: stretch`, which is the full height of the body — and the body runs
the height of the frame, footer included. Twelve slots at a size worth pressing
filled all of it, so the bank ran down behind the compass along the bottom of
the window and the field scale under it landed on top of the contact address.
A rail that scrolls does not need to be tall; it needs to *end* somewhere, and
the obvious somewhere is level with the graph beside it. `--panel-h` is that
height and both columns take it — and it is derived from `--face`, the
tachometer's own cell ladder, so the two cannot drift apart. What that costs is
four slots visible instead of eight; the rail scrolls, and a bank you scroll is
still a bank, where a bank sitting on top of the footer is a bug.

**`INTRO` and the profile sit in the tachometer's head row, short and wide, and
drawn on nothing.** Four passes to get there, and each one was wrong in a way
worth writing down. Stacked above the graph, they were a caption on top of a
chart and the middle column read as two unrelated blocks. Laid *over* the
top-left of the face, they were furniture on the instrument — right idea — but
they cost the power curve its shape, because the only way to keep the columns
off a paragraph is to hold the graph at idle across half its own face. Set in a
filled black readout box, the shape the reference gives its own digits, they
became a *card* — this panel has no other solid on it, so one block of fill
turned the only piece of prose on the screen into something sitting on top of
the instrument rather than something the instrument had printed. Nothing here
is boxed; that rule does not have an exception for the paragraph either.

What is left is the position and the proportion: three lines across four
hundred and forty units, on the head row, directly above the left end of the
bank. `Tach` takes it as `children` and renders it into `.mech-tach-head`,
because the row is the instrument's furniture and the words on it are not.

**`OUTPUT × 1000` is gone with it.** It was a unit for a scale that measures
nothing — a label explaining how to read a number this instrument does not
have.

**Its height is fixed, and that is the point.** The paragraph types itself in a
character at a time, and while it was in the flow every character it added
pushed the graph, the axis and everything under it down — a page rearranging
itself for a second and a half on every load. The box is the size of the
finished paragraph from the first frame and the text arrives inside it. That
rule is worth generalising on this screen: anything typed, scrambled or
counted up wants its space reserved, because all three finish at a different
size from where they start.

**The counts are reactor dials now.** They were vertical cell strips, which
rhymed a little too well with the tachometer columns beside them — two
instruments built from the same part. Each is a 264° arc of sixteen segments
opening at the foot, a faint ring around it, and a core that brightens with the
reading. The top four segments burn `--warn` whatever the level: an over-limit
band painted on the face, the same idea as the tach's red zone. The drive
signal did not change — `--lit` is still a 0–16 count from the one rAF loop in
`Counts`, each `<i>` still decides for itself, `RISE`/`FALL`/`SWAY` are as they
were. `yrs / roles / recent` also became `mileage / range / pulse`.

**The counts lost `PROJ LISTED`.** It was counting the list that is on the
same screen — the rail's own head says "12 entries · pick one" a few hundred
units to the right of it. `ROLES WORN` took the slot because it is the one
number on this panel that is not already visible somewhere else on it, and
because it is what the display opposite is reading out: point at a project and
the left half of the run cycles that project's share of this count.

**The panel is its own colour, not the site's.** A first pass at this screen
used the root `--accent` everywhere on it, at more or less one brightness, and
it read as a wall of the same saturated green — lamps, borders, labels and
twelve slot names all lit at once, with almost nothing held back for contrast.
`.mech-cluster` now redefines `--accent`/`--accent-rgb` to a paler, less
saturated sage (`#a2e0cc`) that only this screen's descendants see — the grid,
the cursor, the gun and every project screen still read the root value and
none of them moved. Most of what used to sit at a bright, always-on opacity
(display housings, field labels, a slot's border and name) sits dimmer at rest
now too, so the accent — in either colour — only reads as *lit* where something
is actually selected, rather than as the resting colour of the whole panel.

#### The display

The one thing on the screen that is genuinely a *display*: fourteen segments a
cell, drawn in SVG (`Segment.tsx`).

There is no segment font in `public/fonts/` and adding one would not have
done the job. What makes a real VFD read as hardware is not the shape of the
lit segments, it is the **unlit** ones — sitting there faintly all the time,
so a word looks like it is being shown by a fixed grid of lamps rather than
set in a typeface that happens to look blocky. A font cannot draw what is
switched off. So every cell draws all fourteen of its segments, always, and
lighting a character is a question of which ones come up.

The lit ones are drawn twice: once sharp, and once through an `feGaussianBlur`
underneath. That is the bloom off the glass, and neither pass looks like a
display on its own. It is a filter over a strip of short lines that only
repaints when the word changes, which is why it is affordable.

**Two displays, apart rather than in one run of cells.** There used to be one,
changing channel: with nothing pointed at it cycled the titles, and pressing a
slot swapped it over to that project's name. Same position, same size — which
is what made the swap read as one instrument rather than two captions, and
which also meant the two facts could never be on screen at once. A cluster has
a window for the gear and a window for the speed — it turns out it does not
need them on the same line to have both.

**Left is what I do**, under the counts rather than across the top of the
panel: with nothing selected it cycles the titles — product designer,
engineer, filmmaker, game designer, design engineer — and the five field
meters under the bank mark which one the current title falls under. Select a
project and it cycles what I actually did *on that project*, one job at a
time: `role` in projects.ts is a single string, and "Founder & Product
Designer" is two jobs printed as one, so `rolesOf` splits it and the display
works through them on the same interval the titles use. **Right is what is
selected**, by name, over the bank rather than beside that first display — the
project's own title is above the products it names now, and pressing a slot
still changes what it reads. The field meters become every field that project
touches — usually two or three of the five at once, which is why it is a
scale and not a single needle.

**Right is twenty-one cells and centred; left is sixteen and set to the
edge.** Twenty-one is "Red Dead Redemption 2" — the one display whose job is
naming a project is not the place to abbreviate one, and a centred word inside
that width reads as a title with room to breathe either side. The role reel
never has to hold a project name; sixteen is exactly "Product Designer". A box
built for the longer word and left centred anyway is what "the block is really
wide" was — and the fix was the narrower box, not the alignment. The reel was
left-set for a pass while the box was still wider than the gauges above it and
drifting looked like the problem; once the box *is* the gauges' width, centring
is what puts the word under the middle of the three.

**And the box is the counts' own width, not a number of its own.** At three
hundred units against the gauges' two hundred and fifty-three the reel ran wider
than the block it belongs to, and the tail of `DESIGN ENGINEER` hung out past
the right edge of `ORGS` — a reading sliding off the thing it is a reading of.
`--count-w` is now one token: `.mech-counts` is that plus what it is bled and
padded by, `.mech-display-role` is that exactly, and the seventeenth cell went
because sixteen is all the longest word ever needs.

**Neither carries a border.** The first pass ran both in a strip with a
hairline box around each cell group — the "thin rectangular outline" that
turned out to be the wrong idea once the two displays stood apart: a border
drawn around a caption for the whole panel made sense in a strip, and drawn
around a reading sitting next to the thing it describes it just repeats the
edge that thing already has. What is left of the housing is the light a lit
display throws onto the panel behind it (`.mech-display::before`), on when
something is actually selected and off at rest — the glow says "lit", not a
box around it.

With nothing selected the right-hand display reads `SELECT`, held at label
brightness rather than lit. A dark box on arrival reads as broken, and a
display whose own name is in it is a display saying what it is for.

The field scale itself is drawn as five small **dials** — `FieldGauge` in
`MechCluster.tsx`. It was never five words with a tick above the lit ones: a
word that changes colour reads as a caption and a gauge that fills reads as an
instrument, and that part was right from the start. What was wrong was the
*shape*. It was five vertical meters, which is the same bar-and-label grammar
the counts, the tachometer and the displays are all already drawn in — by the
fourth block on one screen the shape had stopped carrying any meaning of its
own, and a reader had four rows of climbing cells to tell apart by position
alone. A dial is the one instrument grammar a dashboard has that this panel was not
using yet.

**Even blocks, and a sweep that lights them one after another.** There was a
pass where the blocks *ramped* — a C open at the bottom with each one reaching
further out than the last, the way a digital speedometer's arc is drawn. It
looks right on a speedometer and it was wrong here, because the wedge is a
shape doing a second job: it says how far round a reading has got, and there is
no reading. A field is on or it is off, so a ring of identical blocks tells the
truth and a fan draws a scale nothing is plotted against.

What survived the ramp is the *movement*, which was the good part. Each block
carries its own index as `--n` and the stylesheet turns that into a transition
delay, so switching a field on runs the ring round from twelve o'clock in about
a third of a second rather than lighting it whole. Switching it off drops the
lot at once, and that asymmetry is the point: a gauge sweeping up is a gauge
taking a reading, and a gauge sweeping down is a gauge pretending the reading
faded away.

`ARC_SEGS` is twelve straight spokes rather than twelve arc segments: at a gauge
thirty units across on a 1920 frame the curvature over one block is under a
pixel, and a spoke is a `<line>` with four numbers where an arc is a path with a
sweep flag per cell.

It sits under the bank rather than under the instrument: it is what a selection
is made of, next to the thing you selected, rather than a caption strung under
the graph across the whole panel.

A word does not cut to the next one. Each cell runs four frames of random
segments and then lands on what it should say, left to right, the way a
display that has just been told something new comes up. This is the one place
on the screen that fakes a machine doing work and it earns it: the alternative
for a readout changing is a cross-fade, and a cross-fade is a thing a *screen*
does, not a thing a panel does.

The same display draws the tally in the footer, which is on every screen — a
count of something should look the same wherever this panel prints one, and
tabular figures in Helvetica were not that. `Segment.css` is its own file for
that reason: a rule set living in the stylesheet of one screen and relied on by
another is a rule set waiting to be deleted by someone tidying up that screen.

#### The warning pair

The row of small lamps that used to run along the top of the panel is gone, and
what took the position is two keys in the middle of the frame: `SHOOT` and
`STOP`, one lit at a time.

That row went through two passes before it went. It started as `PWR`, `GRID`
and `SCAN` — three lamps that were simply on, which is what most of the lamps
on a real cluster are and which on a screen is three words pretending to be
instruments. A second pass made all six report on the selection: whether there
is one, whether the project has something built in three dimensions behind it,
whether it is film, whether it is a game, whether it is under an NDA. That was
honest, and it was also the third readout on the same screen saying the same
thing — the field meters mark what a project is made of, the display names it,
and the housing goes warm when it is restricted. Six lamps saying it again is
not a fourth instrument, it is redundancy with a border around it.

What was *not* being said anywhere is that the reticle is a gun. There is a
bird crossing the readout and a moth sitting on it, both shootable, and the
only sign of either was a tally in the footer counting what you had already
brought down — which appears strictly *after* you work it out on your own.

So: `STOP` while there is nothing in the air, `SHOOT` the moment there is. Two
states of one instruction, which is what a shift light is, and which is what
makes the pair read as an instruction rather than as a label. `Alarm` asks
`quarry.creatures` once a frame rather than being told — the gun already walks
that set several times a frame to find out what a bolt has hit, so a third
creature mounted tomorrow lights the lamp with nothing wired up. The state is
held in React and set through a functional updater that returns the same value
when nothing changed, which React bails out of without rendering; that is what
makes asking every frame affordable.

Both keys are **filled** when lit, which is the one place on this panel that
breaks the no-solids rule everything else follows. A shift light on a dash is a
block of colour, and an instruction set at the weight of a caption is an
instruction nobody follows.

**A lit warning key throws light on the housing around it**, the pool that
sells "a lamp behind glass" over "green text with a glow" — the single most
recognisable thing in the reference. The first pass drew that pool the same
shape as the lamp itself, a short wide ellipse with almost no room to fall off
before it hit the edge of its own box, and it rendered as a hard-edged
rectangle rather than a soft one — a lamp that looked broken rather than lit.
`.mech-alarm-key[data-warn][data-on='true']::after` is round, several times the
key's own size, and three gradient stops rather than one, which is what
actually fades rather than stops.

#### The profile, in the panel's voice

The one block of running prose here was set in the page's Helvetica at body
size and colour, which made it the single humanist, low-contrast, ragged thing
on a screen of hard tracked caps — a paragraph pasted onto an instrument rather
than something the instrument had printed. A second pass moved it into
`Chakra Petch`, vendored and otherwise unused, inside a bordered housing with
two corner brackets — which fixed the voice and broke the picture-frame
problem differently: it now read as a card floating on the panel, competing
with the boxed readout next to it rather than sitting beside it.

What is there now is plainer: the paragraph in `ui-monospace` — the face this
site already reserves for its other system text — at no more weight than a
caption, with nothing drawn around it. A MAGI screen or a Blade Runner overlay
both print a block of prose in the same monospace their other readouts are in
rather than framing it separately, and that turned out to be the actual fix:
not a face for this one paragraph, but the one the rest of the panel's system
text already had.

It is **lit** now rather than printed. It sat at `0.58` on the accent with no
glow, which is the panel's caption treatment — the weight of `GAL. UNLEADED
FUEL ONLY` under a gauge — and this is the only prose on the site: the one
block that says what I actually do. It burns at the readings' own strength
(`profileInk` up to `0.94`) with the same bleed off `--g` every lit thing here
carries, so it reads as something the display is showing rather than as
something silkscreened onto the housing beside it. Both halves of the glow ride
`--profile-ink`, so the knob still turns the whole thing down in one move
rather than leaving a halo behind dimmed text.

It is also on **its own hue** — `#8FE2CB`, a shade cooler and bluer than either
the panel's `--accent` (`#a2e0cc`) or the site's (`#86e2b4`). Written as a
local `--profile-rgb` on that one rule rather than inline, so the alpha and the
glow are built off one pair the way every other colour here is, and declared
nowhere else: it is one block's colour, not a change to what the panel is lit
in.

#### Three gauges, not one reading drawn three times

`ORGS SHIPPED` is gone, and the argument against it is not that the word is
ugly. Reading the three off every slot in turn gives this:

| slice                          | yrs | roles | orgs |
|--------------------------------|-----|-------|------|
| product (RDR2, GTA, Plus One…) | 11  | 4     | 3    |
| brand (Capsule, Mecha, Slider) | 10  | 3     | 2    |
| code (Stitchfam, Wyte, Block)  | 1   | 1     | 1    |

They never disagree. All three are *how big is this slice* drawn three times —
more projects in a field means more years and more roles and more companies,
always — so the block spent three gauges on one reading. Which also rules out
the obvious swaps: projects, tags, media count, anything of the form "count the
things in the slice" inherits exactly the same correlation.

To get three readings, at least one has to be a **position** rather than a
count. `recent` is that one: where the slice's latest work sits in the span of
everything, so it answers *is this live* rather than *is there a lot of it*.
The code slice is two years wide and reads near the top of its scale; the
Rockstar work is the same size and sits at the bottom. Two bars that moved
together now separate, which is the entire reason for having a second one.
`roles` stays — it is the one number not visible anywhere else on the panel,
and it is what the reel opposite is reading out.

**And the ceilings are derived rather than picked.** They were `{16, 12, 8}`
against real maxima of 11, 7 and 4, so `ORGS` could never pass 38% of its own
bar and `ROLES` never passed 58%, regardless of what was selected — two thirds
of two gauges unreachable by construction, which is a scale nothing is ever
plotted against. The ceiling is the whole roster's own figure now: everything
reads full, a slice reads its share of it.

#### The name came off the instrument

The name used to be laid **over** the quiet left end of the tachometer, on a
plate with the profile under it — the only arrangement where the largest thing
on the screen and the most important thing on it were the same object. It
moved for a reason that had nothing to do with that argument: the name is
signature, not a reading, and warming it to `--warn` — the panel's one red-
orange, the colour `STOP` and the tally are lit in — made it read as a third
thing sitting *on* an instrument rather than an instrument's own display. A
signature in the instrument's own phosphor was a quieter problem the plate had
been hiding.

So `.mech-ident` is its own line now, between the warning pair and the
tachometer, centred, set in `--warn` with the same three-shadow glow every
other lit thing on the panel carries — the same fit-to-width `cqw` trick
against a character count that `.mech-console` used to do, just no longer
laid over anything. Fitting it to a fixed-width block rather than the full
column is still necessary: `.mech-cluster` is a flex column and stretches its
children to the panel's full width by default, and a name fitted to *that*
renders several times too large before it can be read as a bug — `.mech-ident`
carries its own `width` for exactly this reason, `640` frame units, centred
with `margin: 0 auto`.

**Not the same face any more, either.** Audiowide, self-hosted from
`public/fonts/audiowide/` the same way Clash Display is — the site's own
display face is a magazine headline, and the name wanted something closer to
the reference's own dashboard signage: wide, geometric, built for exactly
this register. Two things change with the font, not just the `font-family`.
Audiowide is drawn wide already, so the negative tracking Clash Display's own
`-0.5 * var(--type)` wanted here crowds it — a hair of positive tracking
instead. And its average advance runs much wider per character than Clash
Display's: the fit-to-width divisor that stood in for "0.6 of an em, on
average, per uppercase glyph" is `1.15` now, measured against the twelve
characters of the actual name rather than carried over from the old face — so
`--cluster-name`'s by-eye scale on top still means the same thing after the
swap.

**The name types itself in over a copy of itself drawn in nothing.** The `h1`
holds two spans: `.mech-ident-full`, the finished line at `visibility: hidden`,
and `.mech-ident-typed`, absolutely positioned on its top-left corner, which is
what `Typed` writes into. That sizer does two jobs, and both of them were bugs
before it existed.

It gives the heading its **height** from the first frame. An `h1` whose only
content is `Typed`'s empty `<span>` has no line box at all — CSS is explicit
that a line box containing nothing but empty inline boxes is zero pixels tall —
so for the four hundred milliseconds of `delay` the name occupied its padding
and nothing else, and the tachometer, the counts and the rail all sat about a
hundred and forty pixels high and dropped into place the instant the first
character landed. The panel is meant to be in position before anything is typed
into it, the same argument `.mech-intro`'s fixed height already makes for the
paragraph.

And it gives the heading its **width**, which is what lets the typing run from a
fixed left edge. `.mech-ident` centres its one flex item; with the item sized to
however far `Typed` had got, every keystroke widened it and shunted every letter
already on screen half a character sideways — the line grew out of its own
middle. Sized to the whole name, the box is centred once and stays there, and
the characters fill it left to right. Note that `visibility: hidden` is doing
real work over `opacity: 0`: the glow is a three-term `text-shadow`, and a
transparent copy of the finished name still throws all three halos, which would
light the whole line before a character had arrived.

The quiet corner it left behind did not stay empty. `.mech-intro` sits there
now — the label reads `INTRO` in the same fourteen-segment glyphs as the rest
of the panel's readouts (`Segment`, not a heading font) and the profile
underneath it, still the same `ui-monospace` paragraph it was as a caption on
the instrument's own reading rather than a title pasted over it. Lower, too —
under the label rather than a full gap above the tach, so it reads as
belonging to the graph it now sits beside instead of floating in the corner
above it.

**And the profile is typed now, not dropped in.** Every other line on this
panel arrives a character at a time; a paragraph that simply appeared —
which is what it did, because `.mech-intro` had no exit animation of its own
either — read as the one line the machine had not actually switched on, and
opening a project left it frozen behind the cover rather than leaving with
everything else. `Typed` fixes both: `back={covered}` backspaces it out on
the same beat the rest of the cluster leaves, the way the header's wordmark
already hands the name back and forth on the way in and out of a project (see
*The name behind the cast*, mounted or not). A hundred and fifty-odd
characters is a lot to type or delete inside `EXIT_MS`'s one second, so this
one runs much faster both ways than the wordmark or a tagline does — `speed`
and `backSpeed` are a fraction of theirs, closer to a held key repeating than
someone typing.

#### The bank is the navigation

Twelve slots, numbered, named, and obviously pressable. One is lit; the
display above the bank reads it out, the role reel under the counts reads out
what I did on it, and the field meters under the bank mark what it is made
of. Pressing it opens the project.

**The line naming the company and the years is gone.** It sat under the field
meters, opacity zero until something was selected, and it was the one thing on
this rail that only ever showed up on hover — a control built to work on a
tap as well as a mouse growing a piece that a thumb would have to press and
release just to see. The name and the number on the slot itself, and the
field meters saying what a project is made of, were already saying what this
line was for.

**It is a rail down the right, not a row across the bottom.** That was a
second move, after the first — the reference's own tachometer is the single
largest graphic on its dash, and there was nowhere to put one back once the
bank had taken the full width of the bottom of the frame. Standing the bank up
the side gave the width back; see `#### The tachometer` below for what it went
to. It stood up the *left* first and moved across when the counts came off the
readout and went to the edge of the frame, which put the two flanks on the
sides the reference has them and left the instrument in the middle with the
name on it.

The rail runs the full height of the panel and scrolls on its own — twelve
rows at a size worth pressing do not all fit a real window, and a persistent
side rail is allowed to scroll where a row of preset buttons across the bottom
was not.

**What this replaced was a bar graph**, and the argument is worth keeping
because all three faults were the same fault wearing different clothes.

*A bar is not a thing you press.* Nothing about a column of lit cells says it
can be chosen, so the bottom half of the screen read as an illustration of the
work rather than as the way into it.

*A bar is not identifiable.* The axis said 2024 and four projects were made in
2024, so the only way to find out which bar was which was to sweep the pointer
along the row and watch a readout somewhere else change.

*And there is no pointer on a phone.* A control whose entire affordance is
hover has no affordance at all on half the devices that will ever see it.

The bank is the preset row off a car stereo, which is the one control in the
reference material that was built to be *pressed* rather than read. On a mouse
the pointer selects on the way in and a click opens, so it is one click. On a
phone the first tap selects — filling in both displays, the field meters and
the detail line — and the second opens, which is the two taps a control with no
hover has always needed, with the first one doing real work.

Selection persists rather than following the pointer. A preset bank holds the
preset you pressed, and a tap has no "leaving" to be cleared by. What releases
it is the pointer leaving the bank *on a mouse*, after a couple of seconds —
the instrument returning to its default channel.

#### The subjects in the bank

Each slot holds the project's own subject, live and turning: Mr. Takahashi's
head, the Capsule C1 enclosure, Solomon's rider, the fish man's flipbook, and
the eight pieces built out of primitives for the projects with no model. The
first pass put a still out of each project's media in there, which is a picture
of a screenshot of the work — the work *is* these objects, and every one of
them was already being rendered somewhere else on this site.

**One canvas for all of them.** Twelve `<Canvas>` elements is twelve WebGL
contexts, twelve environment maps and twelve render loops, which is exactly the
mistake `MechCast.tsx` was written to undo. What is different here is that a
slot is a box in a CSS grid rather than a place in a composition, so the
subjects cannot be arranged in one world — they have to land where the grid put
their boxes. drei's `View` does that: one canvas over the whole viewport, each
view scissored to the rectangle of its own element.

Four things about it cost real time and are worth writing down.

**`View` renders the element; you do not hand it one.** Outside a Canvas it is
`HtmlView`, which makes its own `<div>` and tunnels the scene to whichever
Canvas holds `View.Port`. A `track` prop given to it *there* is not reported as
a mistake — it is spread onto the div as an unknown attribute and ignored, and
every view then scissors to wherever drei's own div happened to land. Which,
rendered in a row after the slots, is a row after the slots: every subject drawn
two hundred pixels below the one it belonged to, with nothing in the console.
`track` is only honoured by the inside-a-Canvas variant. So `.mech-slot-shot`
is a `<View>`, not a `<span>`.

**The canvas has to actually be the viewport.** `View` works the scissor box out
from the canvas's rect and the tracked element's, and a transformed ancestor
makes itself the containing block for a `position: fixed` descendant. So
`.mech-cluster` centres itself by offsetting `top` and `bottom` rather than with
`translateY(-50%)`, and the rail fades in and out rather than moving — an
element with a `transform` animation attached has a transform, an identity
matrix, and that is enough. Both of those look like arithmetic errors in the
scissor and are stacking rules.

**Each view portals into a scene of its own**, so a light inside one reaches
nothing outside it. `MechCast` needs three.js layers to stop five rigs lighting
each other; nothing here does, because every subject is alone. The environment
map is the exception — it is one texture built once at the canvas and assigned
per scene, picked up from a frame rather than an effect because the views and
the canvas are siblings and neither can hand the other anything.

**Solomon's rider is the one subject that opts out of all of this.** It has its
own `<Canvas>` (`MechRider.tsx`), laid into slot `a-game`'s bay in place of a
`<View>` — `SlotBox` in `MechCluster.tsx` branches on the id. The rider was
authored for the game as black leather over black metal, and that look only
holds under a dim, *environment-less* rig with ACES tone mapping at 1.05 and
UnrealBloom on the red taillight; drop it in the shared `RoomEnvironment`
turntable and it flattens to grey. Bloom and `toneMappingExposure` are
whole-canvas settings, so the real look cannot be scoped to one `<View>` — it
needs a context of its own. That is one extra WebGL context, spent knowingly on
the one subject on the page that is a game. The dark look itself is four
material lines per mesh (tint the baked map, null the metalness/roughness maps
so the numbers get real control, keep the normal map) plus five neutral-grey
lights and no `scene.environment` at all — the full spec, with game line
numbers, is `PORTFOLIO-RIDER-HANDOFF.md` in the `solomon-game` checkout.

The same canvas is mounted a second time, larger, as the **Solomon project
screen's stage subject** (`RiderStage` in `MechRider.tsx`, wired in `Mech.tsx`
where `bare && project.id === 'a-game'` would otherwise draw the "no material"
card). The project has no case study yet and the rider *is* the material until
it does. `Rider` takes a `place` prop because the slot and the stage frame it
from different distances; everything else — the rig, the taillight, the dark
look — is shared.

One trap cost an hour: **do not tone-map twice.** r3f's `<Canvas>` already sets
`ACESFilmicToneMapping` on the renderer, and adding postprocessing's
`<ToneMapping>` effect on top of that runs ACES a second time over the whole
buffer — which turned the pure-red taillight magenta and blew every grey
specular to cyan, reading as a broken shader rather than a double grade. Pick
one: the renderer's (what the game does, what this uses) *or* the effect, never
both. `<HueSaturation>` then runs at +0.26 rather than the spec's +0.42 —
+0.42 was tuned against a frame the game keeps almost fully desaturated, and
the taillight's own point-light spill makes this frame warmer than that.

Camera, framing and light values are eyeballed and are the obvious next thing
to move onto a panel — a **Rider** tab, whenever the case study lands.

**Every view shares one camera.** `View` sets the aspect from its own rect
before each pass and every slot is the same shape, so it is set once. Framing is
therefore the subject's business: each is normalised to a unit cube by `Resize`
and scaled by its own entry in `FIT`.

**The canvas sets its own `pointer-events`, and it wins.** r3f's `<Canvas>`
puts an inline `pointer-events: auto` on the element `.mech-bank-gl` targets —
for its own raycasting, on every `<Canvas>` it ever renders — and an inline
style beats an external rule at equal specificity no matter which one is
written second. `.mech-bank-gl { pointer-events: none }` looked correct in the
stylesheet and did nothing at runtime: this canvas is `position: fixed`,
`inset: 0`, transparent, and — with an inline style silently overriding a
plain rule — sat on top of the entire page capturing every click before a
button under it ever saw one. The whole rail was unpressable, and nothing in
the console said why; `element.style.pointerEvents` doesn't show up beside the
stylesheet in the inspector's computed panel the way a specificity fight does.
Only `!important` gets the stylesheet's rule to actually apply, the same way
`position: fixed !important` already had to for this same element — see the
note above it.

**The rail scrolls; the canvas does not know that.** `getBoundingClientRect`
— what `View` scissors every bay against — has no idea `.mech-work-rail-list`
clips its own overflow, so a slot half scrolled past the top or bottom of the
list was clipped as a *button* by the browser while its picture, a scissor
test against a rect that never shrank, kept painting straight through the clip
and out the top or bottom of the rail. `MechCluster.tsx` measures the list's
own distance from the top and bottom of the viewport on scroll and resize and
writes it onto the list itself as `--rail-clip-top` / `--rail-clip-bottom`;
`.mech-bank-gl` reads them back as a `clip-path: inset(...)`. A `position:
fixed` element still inherits custom properties from its DOM ancestors —
inheritance is a tree relationship, not a layout one — so the fixed canvas,
nested inside the list in the markup despite covering the whole viewport,
picks the values up without anything having to be passed to it directly.

**And that clip has to come off on a phone**, because the listener driving it
is on `.mech-work-rail-list` — which does not scroll down there. The page does.
So `--rail-clip-*` froze at their first-paint values and masked off the whole
top band of the viewport permanently, taking every bay scrolled up into it. The
bays read as simply not rendering, which sends you looking at the canvas and
the views; it was the mask. Narrow has no inner scroll region to clip against,
so it drops `clip-path` and the mask outright.

**The narrow bay is a square, and it has to be said out loud.** Two columns of
slots is right for a thumb, but the bay was a fixed 110-unit height against a
full-width cell — a letterbox, and every slot shares one camera whose aspect
comes from the bay's own rect, so the subjects were framed out of their own
boxes as well as being the wrong shape. `--slot-bay` is the cell width worked
out from the viewport and the gutters either side of it
(`(100vw - 98 * --px) / 2`), handed to the shot, to the veil cell, and into the
row height. It has to be one value rather than an `aspect-ratio` on each,
because the bank and the veil laid over it are two grids that must agree track
for track, and a veil cell is a square where a bank row is a square plus its
label.

**And "plus its label" has to be the label's real height.** `--slot-label` is
the second half of that row and the row is a *fixed* track, so a bar taller
than its allowance does not push the row down — it overflows into the one
underneath, which is what read as the name and the year sitting "tight and
misaligned in there". The bar is two lines of a 12-unit name, a gap, and a row
holding the number and the year, inside its own padding: about ninety units
down there, against the fifty-six it was given. The number's own alignment in
that row is a second thing and looks like the same one — `Segment`'s viewBox is
forty units tall with the glyph between 2 and 34, so the digits sit five per
cent of the box above the box's middle and centring the *box* against the year
centres nothing you can see. `.mech-slot-n` is nudged back down by that five
per cent, as a percentage of its own height rather than a pixel guessed at one
window size.

The subject is never quite still while it sits in its bay, and it turns all
the time — a full rotation every fourteen seconds or so, at a fixed rate that
has nothing to do with whether the pointer is anywhere near its slot. It used
to: selection eased the turn toward face-on as well as growing the subject a
little, which read as the picture "spinning" the moment you hovered it and
sitting dead still the rest of the time, the opposite of a bank of twelve live
subjects. Selection only grows the subject now; the turn itself never answers
`live`. Either way it steps rather than glides: `Drift` in `MechSlots.tsx`
recomputes the pose on a fixed twelve-times-a-second tick rather than once a
frame, holding the last pose between ticks. The canvas itself still renders at
whatever the display does — the undersampling is deliberate, the difference
between an object turning on a monitor and one turning on a panel meter.

#### The tachometer

The single largest instrument on the panel, and the one thing on this screen
that reports on nothing at all.

It came back first as a chart: one column a year, projects shipped against the
years worked, real data drawn out year by year. Honest, and wrong — a bar chart
of twelve things sitting under a rail that lists the same twelve things is the
same information drawn twice, and the second copy is the one nobody can read.
The `YRS ACTIVE` gauge on the other side of the panel was already the total.

So it is an instrument: revs, sweeping up the scale and falling back, the way a
tachometer does with a foot on the throttle. A dashboard is allowed exactly one
thing that is only a dial, and this is it — everything else on the screen
answers to the rail.

**The columns stand at a fixed power curve and never move.** `CURVE` is a
logistic rise, a long plateau and a fall away past the red mark, with a hair of
deterministic wobble on top so it reads as measured rather than plotted. What
moves is `--rev`, one custom property on the face, and each column works out
whether the sweep has reached it from its own index:
`clamp(0, calc(var(--rev) * var(--cols) - var(--i)), 1)`. So a frame where the
reading has moved costs
one property write, not twenty-two, and the alpha of the column's own gradient
and the strength of its glow both come off that number.

**Thirty-four slim columns with a gap about their own width, and the cells in
them are graded.** There was a pass at twenty-two columns with a gap of
eighteen, and it over-corrected: fat bars with air around them read as a row of
blocks, not a graph. The reference is a *wide, shallow* bank of hairlines —
about ten units of bar with ten between — and the face is two and a half times
wider than it is tall. A graph standing nearly as tall as it is wide stops
being a strip along the top of a dash and starts being the page.

The grading is the other half of that. A column of identical cells is a
progress bar in a dashboard's clothes; the reference stands *tall* segments at
the foot of a column and shortens them as they climb, so the bottom of the
graph is solid and the top dissolves into ticks. `cellH` is that taper (18
units at the foot, down by 1.5 a cell, floored at 8) and `ladder(k)` is how
tall a column standing `k` of them is. Every column height on the face is one
of those sums, so cells never end part way through one — and the boundary
where the tall cells give out draws a second reading of the power curve across
the graph for free.

**The cells are still one gradient, not twenty-six elements per column.**
`cellStack` builds the whole ladder as a `linear-gradient` string on the
module, twice — once in the phosphor and once in the warm channel — and hands
it to every column as an inline `background-image`. The colour inside the
string is left as a live `calc()` over that column's own `--on`, so twenty-two
columns share two strings and only the custom property decides how brightly any
of it burns. It is laid on `no-repeat`, anchored to the foot of the column, and
sized to the face rather than to the column, which is what makes cell three the
same height on a column of four as on a column of twenty-six.

**`TACH_FACE` is the sum of the ladder, and the whole panel is measured off
it.** The face's height is not a number anyone picked in the stylesheet — it is
`ladder(TACH_ROWS)`, handed to `.mech-cluster` as `--face`, and `--panel-h`
(the height of the middle column *and* of the rail opposite) is derived from
it. Add a row to the ladder and the graph, the middle column and the rail all
grow together. See *the rail is as tall as the instrument* below.

**The curve idles high** — a third of the scale, not a twentieth — because the
left end of the reference's bank is a run of columns already well off the
floor, not a flat line waiting to start. There was a pass where the rise was
pushed out to 0.52 to keep the columns from running up through the intro
paragraph laid over the face, and it cost the graph its shape: the only way to
hold a paragraph clear of a curve is to hold the curve at idle across half its
own face. Moving the intro into the head row as a readout box (below) gave the
curve back.

**The value is snapped to whole columns before it is written.** A bar graph
lights lamps, so a value between two of them has nowhere to go — and snapping
also means the property is only written on the frames the reading actually
crosses a column, which keeps a style invalidation over the whole graph off
most of them.

**The red zone is painted on the face, on the x axis.** Columns past
`TACH_RED` carry the warm channel whether or not the needle has ever been
there, exactly like a real one being red at six thousand with the engine off.
`TACH_RED` is handed to the stylesheet as `--red` rather than written into it,
along with `--cols`, so changing either in `MechCluster.tsx` cannot leave a
graph lighting the wrong half of itself.

**And it starts *on* a mark, not near one.** `TACH_RED` was 0.82 — set by eye,
which put the line three quarters of the way from the 5 on the axis to the 6,
reading as a mark nobody had bothered to line up. A real redline begins at a
number on the dial. So it is written as the number instead: `TACH_MARKS` is the
axis, `TACH_RED_AT` is which of them the zone starts on, and `TACH_RED` falls
out of the two (the axis is `space-between`, so mark `n` is at `n / (marks -
1)`). It begins at 5 now, and `REV_PEAK` came in with it — the old peaks were
tuned against a zone starting at 0.82 and would have parked the needle in the
red permanently against one starting at 0.71.

**Up fast and down slow.** `REV_RATE` keeps the rise at better than twice the
fall, which is the whole character of a throttle being blipped; the same rate
both ways is a slider. `REV_HOLD` keeps it wound up longer than it rests. The
peaks stop just short of the red and occasionally clip into it — a needle that
lives in the red is a needle nobody looks at — and the very first thing it does
on arrival is sweep the whole scale and drop back, which is what a cluster does
when the ignition is turned.

**At a constant rate, and this is the one place on the panel where an eased
chase is wrong.** Everything else here settles exponentially — the counts, the
subjects' scale, the drift — because those are values being *arrived at*, and
an exponential arrival is what settling looks like. The tachometer is not
arriving anywhere: it is thirty-four lamps, and what you actually watch is the
lit edge travelling along them, because `--rev` is snapped to whole columns
before it is written. An exponential moves that edge fast and then slower and
slower, so the lamps light in a rush and then visibly stall — several columns
in a frame near the start, better than a tenth of a second between the last
two. Which is what it looked like: the graph staggering its bars in rather than
sweeping. Linear gives one column every few frames the whole way, and it reads
as a wipe. Four rates rather than one easing, in `REV_RATE`: the ignition sweep
(the slowest, because it is the one move anyone watches from the beginning), a
blip up, a blip down, and off the scale entirely when the screen leaves.

The tremor is only applied while the needle is **holding**. It is worth a lamp
either way under the snap, which reads as an instrument that will not quite
settle — and, laid over an edge that is already travelling, as the sweep
stumbling.

The dotted envelope riding just clear of the tops is the same `CURVE`, drawn in
a 100 × 100 viewBox stretched to the face with `preserveAspectRatio="none"` —
which is why the stroke has to opt out of being stretched with it
(`vector-effect="non-scaling-stroke"`), or the dashes come out as ovals. It is
two polylines, not one, because a single element cannot change stroke half way
along and the trace goes warm where the face does; they share the column either
side of the mark so the join is a point rather than a gap.

#### The counts wander, and now they answer

Three bars, their labels, and the reel of what I do standing over them. No
border — see `#### The display` for why nothing on this panel is boxed.

**The bars are taller than the graph's face, on purpose.** The two blocks are
aligned at the *top* — the reel of what I do sits level with `INTRO` across the
panel, which is the line the eye reads along — and the tachometer carries a head
row above its face that the gauges do not. So the bars are `--face` plus that
head, and both blocks land on one floor as well as one ceiling.

**They used to be bled off the left edge of the frame**, on the argument that a
block running past the glass reads as a panel carrying on rather than as a card
floating near a corner. It does, and it also put the three gauges a third of
the frame away from the instrument they are read against with nothing in
between. They are pulled in against the middle column now: `.mech-flank` stays
`--flank-w` wide, because that width is what balances the rail and keeps the
middle centred, but its contents sit at the *right* of it. The empty run
belongs on the outside edge, not between two things being compared.

**The numbers over them are gone, and so is the line under them.** Each gauge
used to carry a two-cell segment number on top and a second caption below —
`11` over `YRS` over `ACTIVE`. Between the digits, the noun and the qualifier,
one reading was printed three times, and the block ran so tall that the bars it
exists for were the least of it. What the numbers said the bars already say,
which is the whole job of a gauge: a bar against a fixed ceiling means "a lot
of" or "a few", and that is the honest resolution of these three. The count is
still in the markup as an `aria-label`, because a screen reader has no bar to
look at.

**The reel of what I do stands where the digits were.** Under the bars it was a
fourth line on a block that was already three deep; over them it is the block's
one reading with the bars beneath it as the scale, which is the arrangement
every other instrument on this panel uses.

**They used to be frozen at the whole roster's numbers regardless of what the
panel was saying elsewhere**, which read as decoration wearing an instrument's
styling: a gauge that never moves is a sticker. `countsFor` in
`MechCluster.tsx` filters the roster to whichever field is current — the field
the cycling title falls under with nothing picked, or every field the selected
project touches — and recomputes all three from that slice. Point at
"filmmaker" and `YRS ACTIVE` becomes years active *as one*, not the whole
career; `roles` and `orgs` shrink to match. The scale each bar reads against
(`of`) stays fixed to the whole roster regardless, so a field with two
projects in it reads as a short bar against the same ceiling rather than a
gauge that rescales itself every time the reading changes — a fixed ceiling is
what makes "short" mean something.

The bars do not sit still, and they do not simply reset either. `Counts` runs
one rAF for all three: a fraction per gauge (`shownFrac`) chases whatever
`countsFor` currently returns at a fixed rate, the same framerate-independent
easing `Drift` and the tachometer both use — so landing on a new field mid-
cycle slides the bars to the new reading rather than dropping them back to
empty and climbing again, which is what re-running the old arrival-only
animation on every change would have looked like. Once a bar is within a
cell of its target it also wanders — a pair of slow sines at different rates,
a fraction of the bar either way. **The number in the window above never
moves once it has landed** — that part is true, and the wander is on top of
it, never instead of it. A stack of cells frozen at two-thirds is a progress
bar wearing an instrument's styling; a needle that will not sit perfectly
still is the one thing that says something is being measured. The `Segment`
readouts above the bars scramble-settle on every change now too, rather than
skipping straight to the new number — a count that changes should say so the
same way every other reading on this panel does.

Same trick as the tachometer, one axis over: the loop writes a cell count to
`--lit` on the bar and each cell compares its own `--n` against it, so a reading
that has moved costs one property write instead of sixteen and a reading that
has not costs nothing. Both bars and columns go static under
`prefers-reduced-motion`, in the JS as well as the stylesheet — an animation
turned off in CSS while a rAF keeps writing to it is an animation that stutters
instead of stopping.

#### Coming up, and going down

Every block on the panel arrives on its own beat and leaves on its own beat, and
both are hung off an attribute rather than declared on the blocks themselves. It
comes up from the middle outward — the run of displays, then the name, then the
instrument, then the flanks — and goes down from the outside in.

**Both directions are on an attribute, not just the exit.** The entrances used
to be plain `animation` declarations on the blocks themselves, which meant they
ran during the boot, while `.mech[data-boot='true'] .mech-cluster` still had the
whole thing at `opacity: 0`, and were finished by the time anybody could see
them. Home arrived as one flat cross-fade and the stagger was never once
visible. On the attribute, the entrance starts on the beat the cover lifts —
and it plays again coming back from a project, which is the same beat.

**But the two directions are on two different attributes, and that is what
stopped home flashing.** The entrances take `data-covered`, the same cover the
rest of the screen takes. The exits take `data-leaving`, which is only true
while the screen is actually on its way out. `covered` is *also* true on the
`hold` beat — and coming home from a project mounts the whole cluster on exactly
that beat, because home and a project are one component and the cluster simply
was not in the tree a frame earlier. An exit here is a `to`-only keyframe under
`animation-fill-mode: both`, so its held *first* frame is the block at full
opacity in its finished position: with the exits on `covered`, arriving home
painted the entire settled panel for a frame before the entrances took it back
to nothing and brought it in — which read as home flashing its contents and then
loading them. What covers that frame instead is one rule,
`[data-covered='true'][data-leaving='false'] { opacity: 0 }`, which also does
the job `.mech[data-boot='true'] .mech-cluster` used to do for the boot alone,
so that rule is gone. Exactly the same trap as `leaving` on the project screen's
housing — see *The swap*.

**Every exit has its own keyframes.** Never the entrance with
`animation-direction: reverse`: an animation is only restarted when its
`animation-name` changes, so reusing the name leaves the finished entrance
sitting there and the exit never plays at all. Same rule, and the same failure,
as the frame swap — see *The swap*.

**The exit is half the length of the entrance, and it has to be.** `EXIT_MS` is
a little over a second, but the first frames of it are not free: pressing a slot
mounts the project's model, and fetching a chunk, cloning a scene graph and
compiling its shaders is a few hundred milliseconds of main thread with nothing
painting. An exit timed against the second is an exit whose first half never
draws.

**The rail only ever fades.** It is an ancestor of the fixed canvas the bank's
subjects are scissored into, and a transform on it — including the identity
matrix an unfinished one leaves behind — makes it the containing block for that
canvas. Same rule as `.mech-cluster` and `.mech-body`, which is why none of the
three carries one either.

#### The housing arrives empty

The rules above are about the *blocks*. What is in them is a second pass, and
it is the one that makes the arrival read as a machine coming up rather than as
a panel fading in: **every housing arrives dark and empty, and whatever it is
going to read is put into it afterwards.**

A readout that fades up with its word already lit was already on. That is the
whole argument, and everything below is one application of it:

- The **flank** — the reel of what I do, over the three count gauges — used to
  slide in from the left edge it is welded to. Good gesture, wrong block: what
  is in it is a display and three instruments, so the movement moved off the
  housing and into them. It fades now (`mech-cluster-fade`, where it had
  `mech-cluster-left-in`), the reel flickers its word up, and the three bars
  climb from empty.
- The **counts** and the **tachometer** both already started from nothing —
  `shownFrac` at zero, `rev` at zero and a first sweep to the peak — and both
  were doing it *behind the cover*, so what anyone actually saw was three bars
  already at two-thirds and a needle already idling. Both take a `start` now
  and hold at nought until they are asked.
- **`SHOOT` / `STOP`** type themselves in a cell at a time. They are the one
  pair on the page the scramble is wrong for: a scramble is a display being
  told something *else*, and these two words never change, so there was
  nothing to scramble from. That is `type` on `Segment`.
- The **address and the credit** in the footer are typed, and typed again on
  every arrival — `run` is keyed on what is on screen. They were the last two
  lines on the page that were simply already there. Both are boxed to their
  finished width in `ch` (the footer is set in the panel's monospace), because
  the credit is held against the right edge by `space-between` and a line that
  grows from nothing drags that corner along with it, one character at a time.
- The **field dials** sweep all the way round on arrival, drop back to nothing,
  and only then start reading — `arc` in `MechCluster.tsx`, four states through
  three timers. Every cluster does this on ignition, and it is the only reason
  anyone knows what the top of a scale is.
- The **subjects in the bank** are dealt in one at a time down the rail. This
  one needs telling twice: the slot is a DOM box with a CSS entrance, but the
  subject inside it is WebGL and CSS cannot fade it, so the stagger is `dealt`
  (an index that walks) gating the `<View>`'s children, and `Drift` starts its
  scale at nought and grows into the bay on the same eased chase selection
  already used. The two staggers have to agree: `IN.slot` / `IN.slotStep` in
  `MechCluster.tsx` and the `.mech-slot` animation delay in the stylesheet.

**Two lists that have to be read together.** `IN` in `MechCluster.tsx` holds the
beats the *contents* run on; the delays in *Coming up, and going down* hold the
beats their *blocks* run on. Every number in `IN` is deliberately a little later
than the block it is inside — a display cannot switch on before its housing is
there. And both count from the cover lifting rather than from mount, which is
what `start` on `Typed` and on `Segment` exists for: home mounts behind the
boot's cover, so a timer started at mount has finished before anyone can see it.
That was true of the name, which used to be spelled out at `delay: 0.4` against
a 1200ms boot.

**The name is last on purpose.** It is the one line on the screen that is not a
reading — it is who the machine belongs to — and a machine says that once its
instruments are lit, not before.

#### And it empties again on the way out

Every one of those has a way back out, and it is the same gesture backwards.
The blocks already left on their own beats (above); what was missing is that
their *contents* left by being unmounted, which is not an exit — it is the
screen being taken away with the lamps still lit.

**The exit has two beats, and that is the whole of it.** First every readout
takes its own reading off — words come off displays, gauges run down, the
needle falls off the scale, the bank empties, the name backspaces. *Then* the
blocks they sit in leave. `--out` on `.mech-cluster` is the moment the second
beat starts and every exit delay in the stylesheet is written against it, so
the handover moves by editing one number.

Hung on one beat, all of the first was there and none of it could be seen: the
blocks began fading on the same frame the readings started coming off, the
whole panel was gone in a fifth of a second, and what read as an outro was a
cut. The name has the better part of half a second of backspacing in it and
never got past the first letter. `--out` is set against the slowest thing in
the first beat, which is the name and the intro paragraph.

**`LEAVE_MS` is not `EXIT_MS`.** Two beats need more budget than one, and a
step along the tile strip is a *picture* being replaced — nothing on that path
has a reading to take off, so it keeps the shorter number and stays quick. Only
a screen change pays for the first beat. `LEAVE_MS` has to outlast the last
delay in the stylesheet; the project column's own exit (`.mech-side`) waits out
its title and fold headings the same way.

- The **displays** take their word off from the right and go dark. `back` on
  `Segment`, and which reverse it plays is whichever arrival it used: a typed
  display untypes, everything else dissolves back into noise. Eight steps rather
  than one per cell, because the exit has a budget the entrance does not — a
  twenty-one cell display walking off one lamp at a time would still be doing
  it after the screen had gone. When it reaches dark it also resets `first`, so
  coming back is an *arrival* again rather than a change.
- The **counts** and the **tachometer** run down instead of blanking. Both
  loops were restructured for it: `start` is read off a ref and the rAF never
  restarts, because re-running the effect would put the reading at zero
  first — which is the drop, not the run down to it. Both fall much faster than
  they climb (`FALL`, `REV_DROP`), for the same reason the CSS exit is half the
  length of the entrance.
- The **field dials** unwind, last block back round to twelve o'clock. That is
  the one case the "drop all at once" rule bends for: a *reading* going away
  should not pretend it faded, but the panel switching off should run its sweep
  backwards like everything else. Scoped to `[data-leaving='true']` so it
  cannot touch the ordinary case.
- The **bank** empties from the bottom of the rail up — the deal, backwards.
  This is the one that needed a structural change: the subject cannot be
  unmounted on the flag, because that is a cut and the rail's fade cannot cover
  it (the canvas is fixed and scissored to the bays, so CSS opacity reaches the
  boxes and never the pictures in them). So `SlotView` keeps the scene mounted
  once it has ever arrived and `show` shrinks the subject back out of its bay.
- The **name** and both **footer lines** backspace, the same as the intro
  paragraph already did.

**The footer takes `transiting`, not `covered`.** The two are the same thing
for a screen change and very different for a step along the tile strip, which
is also `phase === 'out'`. Hang the footer off the cover and picking a picture
on a project screen backspaces the address and types it again — the exact bug
`transiting` was added for. The cluster's own readouts can use `covered`
safely, because home has no tile strip to step.

**The warning pair is not part of this.** `SHOOT` / `STOP` types itself in
once, on the boot, and stays. It is global chrome that deliberately survives
the swap — that is why it moved out of `MechCluster` in the first place — so
giving it an exit on every navigation would put back the thing moving it
fixed. The same goes for the header, the deck, the compass strip and the
coords: see *Chrome that survives a navigation*.

#### The project's column had no exit at all

Everything above is home. The other half of a screen change is a *project*
leaving, and one whole block of it was not leaving: `.mech-side` — the title,
the tagline and the entire fold column — carried a bare `animation: mech-in`
declared on the element itself. A plain declaration runs once when the element
mounts and never again, and there was no exit rule anywhere, so on the way out
the column simply sat at full brightness for the length of the transit and then
stopped existing when the component unmounted. Against a stage whose picture
and leaders were carefully fading, the left third of the screen was cutting.

Both directions hang off `data-transiting` now, the same as the wordmark above
it, with `mech-side-out` as its own keyframes. The two `Segment`s in there —
the title and every fold heading — take `back` as well, so the lamps come off
rather than the words being carried out lit inside a fading box.

**`transiting`, not `covered`, and this one is not the usual reason.** The
cover is also down for a step along the tile strip, and this column belongs to
the *project* rather than to the picture on the stage: a title and a write-up
have no business leaving because you picked a different photograph of the same
work. The stage's own contents take `covered` precisely because they *are* the
thing that changed.

On the narrow layout `.mech-side` is `display: contents` and generates no box,
so neither animation can live on it — both move onto `.mech-lede` and
`.mech-folds-wrap`, the two children that become the frame's own flex items.
The attribute is still read off the wrapper, boxless or not, so the flag has
one home on both layouts.

#### Twelve renders, on one panel's supply

The subjects come out of the renderer in their own colours, and twelve
full-colour renders on a two-colour panel is twelve holes cut in it. So a layer
over the bays turns them into phosphor: greyscale by way of `mix-blend-mode:
color` with the accent over the top, which takes hue and saturation from the
layer and lightness from what is under it — the duotone a monitor of this era
could actually produce — plus a scan at the grid's own pitch.

Where that layer lives took three attempts, and the rule that came out of it is
worth stating plainly: **`mix-blend-mode` blends against the backdrop of its
nearest stacking context, and a `z-index` makes one.**

Inside `.mech-slot-shot` it painted *under* the canvas, which is a sibling of
the slots rather than a child of one. One flat sheet over the bank tinted the
names and the numbers along with the pictures. And the sheet given a `z-index`
to lift it above the canvas became its own stacking context, whose backdrop
starts transparent — so the blend had nothing to blend with and poured flat
accent over the bays.

What works is a second grid matching the bank cell for cell, `.mech-bank-veil`,
with no `z-index` at all: it paints over the canvas because it comes after it in
the markup, and it blends against `.mech-bank`, which is `isolation: isolate` so
the tint stops at the edge of the bank. Two grids that have to agree also means
the row height is stated rather than derived — a bay plus a label bar — and that
the bay is `flex: none`, or a name wrapping to two lines shrinks the picture out
from under its own tint.

The veil ran at full strength (`0.7`) in the first pass, and at that opacity
the duotone was doing its job too well: every subject flattened to the same
tone, and colour is the one cue that tells twelve renders apart at a glance —
remove it and the bank reads as one dark mass with borders in it rather than
twelve separate, pressable things. It sits at `0.42` now, enough to still read
as the panel's own phosphor rather than twelve full-colour holes, not enough to
erase what a bay actually is. `.mech-slot-shot` lost its own vignette at the
same time — a radial fade to near-black behind the subject, which darkened
exactly the centre of the bay a pointer or a thumb aims for and made the bank
read as a strip of moody photographs rather than a live instrument.

#### What is still here, and unmounted

Nothing was deleted. `MechCast.tsx`, `MechWave.tsx`, `MechCastPins.tsx`,
`castTuning.ts`, `castTags.ts`, `nameTuning.ts` and `tint.ts` all still exist
and all still work — they are simply not mounted, and putting the line-up back
is one block in `Mech.tsx`. The sections below describing them are kept for
the same reason: what they explain is still true of the code, it is just not
on screen. Each is marked.

The four dev-panel tabs those files owned (Cast, Tags, Wave, Name) went with
them. Home gets one tab now, `clusterTuning.ts` — four numbers, and
deliberately only four. Where the bands sit and how the graph is spaced are
decisions, and decisions live in the stylesheet next to what they affect; what
is on the panel is the handful of things that are a matter of taste in front
of a real screen.

**The cluster's own pool of light is on a project screen now too.**
`.mech-cluster::before` — the haze the whole panel sits in, described at the
top of this section — is one radial wash behind the readout, tied to where
the cluster actually is rather than to the middle of the screen. `.mech-
stage::before` in Mech.css is the same recipe behind the subject on a project
screen instead: a still, a clip and a model are all just "whatever is on the
stage" as far as it is concerned, so it is drawn once, behind all three,
rather than being a property of any one media kind. Root `--accent-rgb`
there rather than the cluster's own paler sage — a project screen reads off
the root pair for everything else already lit on it, and this should not be
the one exception.

**Two passes of client mark-up, on the cluster.** The scale row under the
bank reads `PRODUCT` / `CODE` / `BRAND` now — `FIELDS` in MechCluster.tsx is
`product`, `code`, `design`, and `FIELD_LABEL` is the cosmetic remap that
prints `design` as "brand": the label is a fact about this scale, the `Field`
key is still a fact about what `FIELD_OF` maps a `3d` tag onto, and the two
were deliberately kept apart rather than renaming the key itself. Three
dials, not five — `games` and `film` are off the row entirely, which is also
what stopped five of them from running past the rail's own width.

**Warm and green stayed split, the first pass just drew the line in the wrong
place.** The rail's own names (`.mech-slot-name`) are `var(--accent)` — green,
like every other reading the machine prints — whether or not that row is
selected. The rail's *header* above the bank (`.mech-work-rail-head`) is the
one that is warm unconditionally instead, because that line reports a *pick*
rather than a reading, the same distinction the scale row and the rail
itself already draw: everything the pointer changes is warm, everything the
machine reports is green, and a header that changed colour depending on what
project it named was the one place on the panel breaking its own rule. It
also reads `PROJECTS` at rest now, not `SELECT`.

**`SHOOT` / `STOP` are drawn in `Segment` glyphs, and lit is a filled block
again** — black glyphs on a solid colour, the way the reference's own shift
light works, rather than the glow-only first pass (a fill in the segment's
own stroke colour swallows the segments drawn in it, which is why the first
pass had dropped the fill rather than fixing that). `SHOOT` carries its own
colour, `--shoot` (an amber-yellow) on `.mech-alarm-key`, rather than the
panel's green — the two keys read as a pair by shape and position, not by one
of them being the panel's usual channel.

**The compass heading is drawn, not typed**, in the same seven-segment
grammar `Segment.tsx` uses everywhere else — reimplemented small and local in
`MechHud.tsx` (`HEADING_SEGMENTS` / `HEADING_FONT`) rather than mounting
`Segment` itself, because this number changes on every `pointermove` and the
whole point of this file is staying off React state for exactly that reason.
Only the lit segments' opacity is written per frame, and only on the frames
the three-digit string actually changes.

**The name and the panel under it — `.mech-panel-mid` in MechCluster.css,
wrapping `.mech-ident` and `.mech-body`** — centre as one group in whatever
room is left under the warning pair, rather than the panel claiming the
cluster's whole leftover height and pinning its contents to the top of it.
(`mech-panel` was already taken, by the dev tools panel in MechPanel.tsx — a
global class collision, not a scoped one, caught by the name rendering
inside the Leva root instead of the cluster.) `SHOOT` / `STOP` are not part
of that group: `.mech-alarm` is `position: fixed` now, welded to the tally
above it regardless of `--cluster-y` (the panel's Vertical knob), which
answers the client note that dragging Vertical was dragging the warning pair
along with everything else. Narrow reverts it to `position: static` — that
layout scrolls the whole page rather than a fixed frame, and a fixed pair
there would sit stuck over whatever scrolled underneath it instead of taking
its place in the column.

**A third pass fixed what the second one got wrong, and added a fifth knob.**
`STOP` at `cells={5}` (matched to `SHOOT`'s own length so the two boxes came
out the same width) left a trailing blank cell — Segment centres a word by
padding blanks on both sides, and one spare cell over an even split rounds
down to zero leading blanks, so the word sat in the upper-left of its box
rather than the middle of it. Fixed two ways: `STOP` is `cells={4}`, its own
length, and `.mech-alarm-key` is a flex container now rather than a block one,
so a mismatch like that centres regardless. The box is smaller, and moved
down to `top: calc(90 * var(--px))` — level with `.mech-deck-slot`, the audio
widget, rather than sitting above it. And the `::after` throwing a 300-unit
radial pool of light behind a lit key is gone outright: sized for the
reference's own dashboard rather than this one, it was several times the
key's own box, and — the real complaint — it did not answer to `--g` (the
Bloom knob) the way the `box-shadow` beside it already did, so it read as a
glow with a source somewhere else on the page.

The other note was that the gap between the counts, the instrument and the
rail had not actually closed. It hadn't, because it was never `.mech-body`'s
`gap` doing that: `.mech-main` is `flex: 1` and centres a fixed-width
`.mech-tach` inside it, and *that* — the leftover room either side of a
720-unit instrument in a column wider than that — was the real distance, a
number several times the row's own `gap`. `tach` is the cluster panel's fifth
knob now (`--cluster-tach`, "Instrument width"), wired straight to `--tach-w`,
so winding the instrument wider is what actually pulls its neighbours in —
the tool asked for, rather than another guess at a constant. Default moved
up to `900` at the same time, so the panel reads closer at rest and the knob
is there for taste from that point rather than to fix a gap by itself.

**A fourth pass: same size, right colour, a real default, and one more stray
glow found.** `STOP`'s glyphs were rendering smaller than `SHOOT`'s — both
keys were scaled to the same fixed *width*, and a shorter word (`STOP`,
`cells={4}`) stretched over the same width as a longer one (`SHOOT`,
`cells={5}`) is a smaller word. `.mech-alarm-key` is scaled by a fixed
**height** now instead (`.mech-alarm-key .mech-seg` / `.mech-seg svg`
override `Segment.css`'s usual width-driven sizing), so a cell is the same
size on both keys regardless of how many of them there are, and only the
box's width — which was never the thing that needed to match — differs.
`SHOOT` gave up its bespoke amber for `var(--accent)`, the panel's own green:
a colour this panel does not otherwise have was one colour too many, and the
two keys already read as a pair by shape and position.

`CLUSTER_DEFAULTS` took a client-supplied set outright — `name: 1.56`,
`glow: 1.75`, `slot: 80`, `tach: 1030` — rather than another round of
by-eye guessing at this end.

**The tally moved into the warning pair**, and bigger. `Tally` is its own
file now (`Tally.tsx`), read by both `Mech.tsx` (its usual fixed spot, for
every screen that is not home) and `Alarm` in MechCluster.tsx (`inline`,
sitting in the gap `.mech-alarm` reserves between `SHOOT` and `STOP`) — the
same store, never both mounted at once, so home shows the reticle's count
where the reticle's own instruction is instead of above it.

**And a second `::before` was throwing the same unscoped glow the warning
pair's old one did.** `.mech-stage::before` — the pool of light behind the
subject on a project screen, `.mech-cluster::before`'s own counterpart — was
a flat `0.12` alpha with no tie to `--g` at all, which is what "opening a
project gets slightly brighter in the centre" was: a stray hot spot that
does not answer to the Bloom knob the way every other glow on the site does.
`rgba(var(--accent-rgb), calc(0.12 * var(--g)))` now, matching the fix
already made to the warning pair.

**A fifth pass moved the warning pair off home entirely.** It used to live
inside `MechCluster.tsx` and vanish the instant a project opened, which read
as the one instrument on the panel that did not survive the swap — the gun,
the reticle and the creatures it reports on are all mounted plainly in
`Mech.tsx`, not gated on home, so the lamp reporting on them had no business
being gated either. `Alarm.tsx` is its own component now, mounted
unconditionally in `Mech.tsx` next to `MechCursor` / `MechBird` / `MechMoth`
/ `MechLaser`, and `.mech-alarm` moved with it into `Mech.css`. `top` changed
from `calc(90 * var(--px))` (level with the audio widget) to `calc(24 *
var(--px))` — the same as `.mech-head` — so the pair reads as part of the
header row rather than a second thing floating under it; being global chrome
now rather than a child of `.mech-cluster` means it never answered to
`--cluster-y` in the first place, which made the narrow-layout `position:
static` override dead weight, also removed. Both keys came down in scale —
`.mech-alarm-key`'s height from `30` units to `19` — and the lit fill went
from a solid `background: var(--accent)` / `var(--warn)` to `rgba(…, 0.55)`
with the box-shadow alphas cut by roughly half: full saturation read as
louder than a header instrument should, next to the audio deck and the menu
key it now sits beside. The inline tally between the two keys lost its
enlarged variant at the same time — same width as every other reading on the
panel, not a bigger one, once the row around it had come down in volume too.

**A sixth pass took the words off it.** Every note above is about making two
words in segment glyphs sit better on the page, and the sixth one is that they
should not be words. Three things were wrong and they are all the same thing —
the row was loud:

- Two twenty-unit readings across the top of every screen is the second
  largest thing on the page, competing with the name on home and with the
  project title everywhere else, and neither of those is what a lamp about
  the birds is for.
- `SHOOT` and `STOP` read as instructions and behave as status. The lit one
  reports whether there is anything up there; it is not telling you to pull
  the trigger. A word that says one thing and does another is a word arguing
  with itself, and no amount of scaling it fixes that.
- The tally only mounted after the first kill, so the row changed **width**
  the first time you hit something and both keys shuffled outward.

So the row is two small squarish lamps either side of a fixed reading, which
is what a real cluster does with a binary — green left, red right, `--lamp`
(19 units) square, one of the two always burning. `Tally` shows at nought
rather than returning `null`, so the row is one fixed-width block from the
first painted frame and nothing in it ever moves; `000` is what every other
gauge on this panel reads before it has anything to report anyway. `Alarm`
lost its `start` prop with the last `Segment` — there is nothing left to spell
out a cell at a time, so the row simply comes up on `[data-boot]`'s own fade
with the rest of the chrome. Two whole blocks of `Mech.css` went with it: the
glyph sizing that scaled `STOP` and `SHOOT` to the same height in different
viewBoxes, and the white-on-glow rules that kept a lit word legible over a
filled housing. Neither has anything left to size or to light.

**A pass after that rounded the lamps to dots but kept the pair red/green.**
`border-radius: 999px` rather than a 4-unit corner — a dot, not a housing —
but the right lamp stays `--warn` red on the shift-light reading: left green
while there is something in the air, right red while there is not.
`.mech-alarm-key[data-warn]` and its lit variant carry the red; a brief
all-green pass (both `--accent`) was reverted because the colour *is* the
report at a glance on a phone, where the two dots sit small and close.

**`ROLE_CELLS` now equals `CELLS`.** The role reel under the counts and the
project title over the bank are boxed to the same width (`--count-w` and
`--flank-w` are the same variable), and `Segment` scales by *width* — two
displays the same width but a different cell count render their glyphs at
two different sizes, fewer cells over the same box being a bigger glyph.
Sixteen cells (the role reel's own longest word) against the title's
twenty-one was the same class of bug the warning pair had in its third pass,
just along a different axis: a readout's size should come from the panel it
shares, not from how long its own longest word happens to be.

**The footer is two plain lines now, not one boxed one.** `hello@` used to
be the only permanent thing down there — bordered, tagged "comms", pinned to
the right edge by `margin-left: auto` because the tally (when a project had
one) was the only thing that ever stood at the other end. The tally moved
into the warning pair for good in the pass above, so the footer's own copy
of it is gone, and with a first thing always at the left there was no reason
left to fake `space-between` with a margin. `hello@tarloksingh.com` lost its
border and its "comms" tag; `developed by tarlok singh` is new, at the right
edge, in the same voice. Each carries a small dot — `.mech-dot`, phosphor not
warm, since it answers to nothing the pointer does — on a slow, offset
flicker loop (`mech-dot-flicker`, gaps in the keyframes rather than a smooth
pulse, so it reads as a bulb catching rather than breathing) with the second
dot's `animation-delay` staggered off the first so the two never dim
together.

**A sixth pass: the comms line took the name's own colour, and the warning
pair's keys were redrawn to a client-supplied lamp design.** `hello@` and its
dot are `--warn` now — the same warm the name at the top of the panel is lit
in, its own three-shadow glow scaled down to a footer line — because it is
the way to reach the person that name belongs to, not a fact the machine is
reporting. The dot's own class had to move first: `.mech-dot` was already
taken, by the small circle at the reticle's own centre in `MechCursor.tsx`,
and a second element answering to it was the class-collision mistake this
file has been bitten by twice before. Renamed `.mech-foot-dot`, scoped to
the footer, and `.mech-comms .mech-foot-dot` takes `--warn` while
`.mech-credit`'s stays the panel's default phosphor.

`SHOOT` / `STOP` moved from "black glyph on a filled block" to "white glyph,
glowing, on a filled block" — a backlit LED cell rather than a shift light —
and picked up a fixed box each (`81.6 × 34` design units, close enough to
this panel's own frame that they carry over as `--px` multiples outright)
instead of a box sized to its own word. Fixed-width boxes on their own would
have reopened the third pass's bug — `STOP` at four cells over the same
width as `SHOOT`'s five renders a taller glyph — so the fix keeps the fourth
pass's answer underneath: `.mech-seg` still scales by a fixed **height**,
and the result is centred inside the now fixed-width `.mech-alarm-key`,
which gets equal boxes and equal glyphs at once rather than trading one for
the other. Idle is the housing's own colour at low opacity — wired but not
lit, not a dead lamp — and lit inverts it: a half-saturated fill, a bright
border, and the glyphs' `stroke` overridden to white so the colour comes from
the glow and the glass, not the ink. The centre cell — the inline tally — was
resized to the same fixed box as the two keys and its glyphs went white too,
so the row reads as three lamps in one housing rather than two switches
either side of a stray number.

**A seventh pass put the footer in the panel's own voice.** `hello@` and
`developed by tarlok singh` were still the site's body font, the one thing on
this screen not set in the panel's own system-text face — see *The profile,
in the panel's voice* above for why that face (`ui-monospace`) is what every
other piece of running text down here already uses. `.mech-foot` now sets it
once, for both lines, rather than each one carrying its own copy, at
`.mech-profile`'s own size (`10.5`, not the footer's old `13`) — the same
voice at a different size would still have read as a second document.

### The bank is on every screen

The rail of work used to be one of home's four blocks, and opening a project
took it off the page — so the one permanent thing about this site, the list of
what is *in* it, was the thing that disappeared the moment you used it. You
pressed a project and every other project went with the screen you pressed it
from, leaving the header's index sheet as the only way on. A list that vanishes
when you use it is not navigation, it is a menu.

So it is `MechBank.tsx` now, mounted from two places: home puts it in the
cluster's right flank, and a project screen puts it down the right-hand margin.
The extraction is the interesting part, and three things fell out of it.

**`bank.ts` exists because two components need the same rows.** `SLOTS`, the
`Field` scale and `FIELD_OF` were consts in `MechCluster.tsx`, and `MechBank`
needs the first while the cluster still needs all three for its counts and
dials. A const in one component's file that another component imports is a
circular import waiting to happen the first time the traffic goes the other
way, so the data is its own module and both import from it.

**Only ever one bank is mounted**, which matters more than it looks: `MechSlots`
lives inside it, and that is the *one* WebGL canvas all eleven subjects are
scissored into. Two banks would be two canvases, eleven subjects each.

**It reports something different on each screen, off one prop.** Home passes
`onPick`; a project screen does not, and that single absence carries three
consequences. The head is a **readout** on home (crossing a slot names it) and
a **sign** on a project (`PROJECTS`, permanently, because the lit slot is the
project you are already on). A press **opens directly** rather than selecting
first — `direct` in `SlotBox`, which a phone also sets, both being the cases
where there is no hover to have done the selecting for you. And the rail
**scrolls the lit slot into view**, which is right where the selection arrived
from somewhere else (open Wyte Card from the index sheet and slot 11 is four
rows below the fold) and wrong on home, where scrolling a list under the cursor
that is choosing from it moves the next row out from under the finger.

`.mech-bank-col` is the project screen's wrapper, and it exists to hand over
what the rail inherits from `.mech-cluster` on home and would otherwise be
missing: `--count-w`, `--flank-w`, `--panel-h`, and **the panel's own green**.
`--accent` is redeclared on `.mech-cluster` — a paler sage-mint than the site's
— and every rule in `MechCluster.css` reads that rather than the root pair, so
the same eleven slots mounted outside the cluster come up in a different green
from the one they were drawn in a moment earlier. `--cluster-slot` is the one
token handed over from JS instead, because it is a live knob on the Cluster
tab; without it the rail falls back to the stylesheet's 150 here and the
panel's 98 on home, and a bay half again as wide eats the room the name needs
and clamps "Mr. Takahashi" to an ellipsis.

It takes no transform, for the same reason `.mech-cluster` and `.mech-body`
take none: a transformed ancestor becomes the containing block for a
`position: fixed` descendant, and `.mech-bank-gl` would quietly stop being the
viewport. Its entrance is an opacity fade for exactly that reason.

#### And the media strip moved to the foot

It had the right-hand margin only because nothing else was asking for it. The
strip is horizontal on both layouts now, above the coords readout and below
everything else, so the order down a project screen is the subject, the
pictures of it, then the machine's own footer.

The narrow layout had already worked this out — pictures of one project are a
row you scan, not a list you read — so making it the base case deleted rather
than added: `.mech-rail`, `.mech-rail-track` and `.mech-rail-thumb` are
horizontal in their own rules, the narrow overrides that repeated it are gone,
and what is left under `[data-narrow]` is genuinely narrow (tile sizes, snap,
gutters). The scrubber in `Mech.tsx` lost its branch with them: it measured
`scrollHeight`/`scrollTop` on one layout and `scrollWidth`/`scrollLeft` on the
other, writing a different pair of custom properties for each, and there is one
axis now.

**The strip is draggable, and the drag nearly cost the click.** `overflow-x:
auto` alone answers a trackpad's own sideways gesture and a shift-scroll, and
neither is the reach a wide window's mouse makes first — so there is a
press-and-drag on `.mech-rail` and a plain wheel turned sideways, both
mouse-only (`pointerType` gates every listener, so a finger is left to the
browser's own momentum scrolling rather than fighting a second one built by
hand on top of it). A press that turned into a drag must not also select the
tile it was let go over, which is a `click` listener in the capture phase
rather than a check inside each tile.

Two things went wrong there and both are worth keeping.

**The threshold has to clear a human hand, not a still one.** At four pixels
every ordinary press read as a drag and got suppressed, so no tile was
selectable at all. Ten.

**And the pointer capture cannot be taken on the press.** A captured pointer
retargets its own `click` to the capture element — so `setPointerCapture` on
`pointerdown` delivered every click on the strip to the strip, and no tile
ever saw one. The symptom was exact and misleading: selection worked perfectly
on a phone and not at all with a mouse, because `pointerType` never lets a
touch into this code and a touch therefore never took the capture. It is taken
in `pointermove`, once the drag has passed the threshold — at which point the
retarget is what you want, because that click was going to be suppressed
anyway.

**It stands the same height in the same place on both screens, and it does
not fade.** The first extraction gave the project screen's `.mech-bank-col` a
column to fill — `top: 148`, `bottom: 120`, `--panel-h: 100%` — so the rail
was as tall as whatever margin it landed in, which on a project screen is
taller than home's instrument. Pressing a project made the one block that is
supposed to be permanent visibly grow. It is a fixed height now, centred in
the range it is given: `--panel-h` is the same `(281 + 172)` the cluster
computes, `284`/`120` are the range, and `margin: auto 0` does the centring —
never a `transform`, for the reason the cluster's own note gives (a
transformed ancestor becomes the containing block for `position: fixed`, and
`.mech-bank-gl` would quietly stop being the viewport). Measured off the built
page the two rails now sit within a tenth of a pixel of each other.

`--panel-h` is duplicated rather than plumbed across because `--face` is only
ever written by `MechCluster.tsx`, which is not mounted on a project screen —
and the value is a fixed ladder sum over a fixed row count, not something Leva
or a visitor can move.

The fade went with it. `.mech-bank-col` carried the cluster's `1200ms`
entrance delay, which is the boot's number; on a project screen this component
mounts on every arrival from home, so that delay played out as the rail
blinking out and coming back a beat and a bit later, every time.

**Project to project: it hands over the way home does.** This component is
mounted once for the whole life of the project screen — picking another
project re-picks a slot, it does not remount — so the block naming the thing
you just changed was the one block on the page that did not move. Home has a
whole choreography for this (`data-leaving`: the rail unfades, the slots
undeal from the bottom up, the displays take their words off) and a project
screen had none of it.

It has home's rules now, in `MechCluster.css`, keyed on `data-transiting` —
the flag `Mech.tsx` already leaves on for the length of a retarget, the same
one the wordmark and the stage take — and hung on a much shorter `--out`
(300ms against home's 560ms), because the first beat here is one display
backspacing a word off rather than a name, an intro paragraph and three
gauges running down.

Two things about it are not optional. The delays match `BANK_IN` in
`MechBank.tsx` cell for cell, because the *subjects* in the bays are dealt by
a timer over there and a slot's CSS cannot carry a WebGL view with it — the
two staggers have to be the same stagger, which is why `up` is
`!booting && !transiting` rather than just `!booting`. And the exit has its
own keyframes: `mech-cluster-out` leaving, `mech-cluster-in` arriving, never
the entrance with `animation-direction: reverse`. An animation restarts only
when its `animation-name` changes, so reusing the name leaves the finished
entrance held and plays nothing — the same rule as the frame swap, and it
catches everybody once.

The entrance side of that is also the entrance the bank never had. On the
first mount of a project screen `data-transiting` is already `false`, so
arriving from home the eleven rows now deal themselves in instead of being
found sitting there while everything around them comes up.

### The bank, on a phone

Two problems in one place, and only the second one is interesting.

The bank is eleven live subjects sharing **one canvas**, with drei's `View`
scissoring that canvas to each bay's rectangle. What `View` actually computes
is a difference between two viewport positions — the tracked element's rect,
read fresh once a frame inside `useFrame`, minus the canvas's own, which r3f
measures and hands over as `state.size`. On the wide layout that is exact by
construction: the canvas is the viewport (`position: fixed`, inset 0), so its
own rect is a constant and nothing on the page scrolls anyway.

On a phone the page scrolls under the bank, and the subjects visibly swam
behind their own borders on every touch fling.

**A fixed canvas cannot be scrolled.** A touch scroll on iOS runs on the
compositor thread: the boxes move at the display's own rate however busy the
main thread is, while the rect the canvas reads is only as fresh as the last
`requestAnimationFrame` the main thread got to — and during a fling WebKit
*throttles* the main thread's rAF callbacks in favour of keeping the
compositor smooth. So the pictures lag their boxes by however far the page
travelled since the last frame the main thread was allowed to run.

Two attempts went past before that was clear. The first cut the canvas's
per-frame cost — `dpr` to 1 and antialiasing off on narrow — on the reasoning
that cheaper frames close the gap. It narrows it and cannot close it: the
bottleneck is how *often* the main thread runs, not how long it takes once it
does. (Both are still down, and worth keeping on their own merits.) The second
hid the canvas outright the moment a scroll started and faded it back a beat
after the page settled, which traded a picture that swims for a picture that
is not there, and read exactly as badly as that sounds.

**The fix is that the canvas scrolls too.** Narrow, `.mech-bank-gl` is
`position: absolute` over `.mech-bank` rather than fixed over the window, so
it is in the same scrolling flow as the bays it paints into. Now the
compositor moves the drawn pixels and the borders together, for free, between
main-thread frames — the main thread can be throttled to nothing and the
subjects stay glued, because the *relative* geometry never changed. This is
the arrangement an old note in `MechCluster.css` warned against ("sizing it to
the bank was the first attempt and every subject landed a couple of hundred
pixels low"), and that note was right about the symptom and wrong about the
cause, which is the next paragraph.

**It only works if `canvasSize` is as fresh as the bay's rect.** The two are
subtracted from each other, so they cancel only if they were read in the same
moment. r3f measures its own container through `react-use-measure` with
`scroll: true` and a **50ms debounce** — right for a canvas that only moves
when the layout does, and useless for one that moves with every scroll event,
because a debounce that keeps being retriggered never fires at all during a
continuous fling. That mismatch is what put the subjects a couple of hundred
pixels low the first time this was tried. So `Track` in `MechSlots.tsx`
re-reads the canvas's rect at the top of every frame, before any view has
drawn.

It writes **into** `state.size` rather than through r3f's `set()`, and that is
deliberate. drei's `Container` reads `canvasSize.top` off the same object at
frame time, so a mutation is picked up with no store update, no re-render of
eleven views, and no risk of the render loop that anything setting state once
a frame invites. What it costs is that r3f never learns the canvas moved —
and nothing in r3f cares, because its resize path keys off width and height
and neither of those changed. It runs at `useFrame` priority **0**: it has to
go before the views (all `index={1}`), and a zero is the one priority that
does not count toward r3f's manual-render flag, which if switched back on
would clear the canvas out from under every view.

**One thing the new arrangement breaks, and puts back.** `View` has an
offscreen test of its own, and it compares the bay's rect against *the
canvas's* box. With the canvas as the viewport, that is a window test and it
culls correctly. With the canvas as the bank — six rows tall — nothing is ever
outside it, so all eleven subjects would render every frame including the
seven nobody can see. `useNear` puts the test back where it belongs: an
`IntersectionObserver` per bay against the window, a whole bay's height of
`rootMargin` either side so a subject is drawn before its box arrives, driving
`View`'s own `visible` prop. `View` clears the region once when that goes
false and stops rendering it; the scene stays mounted, so coming back is a
render and not a rebuild.

Solomon's rider is the exception to all of it, as usual — `RiderSlot` has a
`<Canvas>` of its own inside its bay (it needs an environment-less rig, bloom
and exposure the shared canvas cannot give it), so it is an ordinary DOM
element and always scrolled correctly.

### The cast

> **Not mounted.** The line-up came off home — see *Home is a cluster*
> above. `MechCast.tsx` is intact and this still describes it.

Five subjects: Mr. Takahashi, Capsule C1, the Solomon rider, the StitchFam
loop and Slider Engine's fish man — between them a character, a product, a
game, a piece of film and a sprite out of an engine. Not a sample of the work,
a sample of the *kinds* of work.

**One canvas, not six.** This is the second thing the character select got
wrong. Each subject had its own `HeroStage` — its own `Canvas`, its own
camera, its own environment map — plus Mr. Takahashi's own context over the
top. Six WebGL contexts, and each one centred its occupant in a box of its
own. Which is exactly why the line-up never looked *composed*: there was no
group, there were six photographs hung in a row, and the only numbers any of
them had for "where does this sit" were a size and a turn inside its own cell.
Nothing anywhere described the arrangement, so the arrangement could not be
adjusted.

`MechCast.tsx` is one context with every subject placed in it, and
`castTuning.ts` is the panel that places them: three axes, a scale and two
rotations per subject, one folder each, all of them on the panel at once
rather than a folder for whichever one is selected. Arranging a group means
dragging one thing while watching its neighbours, and a panel that only shows
you the numbers for the current selection cannot do that. Copy button hands
back `CAST_STUDIO` and `CAST_SLOTS` to paste over source, like every other
panel here — nothing set on it reaches a visitor until it is pasted.

A slot's `scale` is *how big this should read*, not how big the file is:
`Resize` normalises every subject to one unit on its longest edge, and the
subjects are not the same shape. Capsule C1 is a long enclosure, and at scale
1 it is a metre of cylinder lying across the whole left half of the screen —
which is what the first arrangement did.

Adding a subject to the home page is one entry in `CAST` (`heroes.ts`) and one
in `CAST_SLOTS`. Nothing else.

**Mr. Takahashi is in that canvas.** He used to be a second full-stage canvas
laid over it, which was fine while he was the only subject with a rig — but it
meant he was in a *different camera* from everyone else, so the cast's dolly,
tilt, lift and spread moved the other four and left him where he was, and his
placement had to be faked as a CSS percentage. He is a cast member now: same
camera, same handles, hoverable and taggable like the rest, on his own layer
with his own two lights. `FaceScene` in `MechModel.tsx` is his rig with the
canvas, lens and room taken off, so the reason he was ever separate travels
with him.

Two things had to give for that. **`turn` and `tilt` were dead numbers on his
slot** while he was a layer, and the moment he became a real subject the
`-180` sitting in one of them came through as the back of his head. And **the
canvas wears his lens and his exposure**, which is the part worth writing
down: focal length is free to copy, because `fill` decides how much world the
frame holds and the camera backs off to hold it — so a lens change is a
perspective change and not a framing one. Exposure is not free. It is one
number for the whole canvas and ACES tone mapping is not linear, so lighting
him at 28.5 under an exposure of 0.05 and lighting him at 1.43 under an
exposure of 1 are *not* the same picture even though the product matches: the
first lands on the shoulder of the curve and gives the dark, moody face his
page has, the second sits in the middle and gives a flat, washed one. The
canvas takes his 0.05, his lights are copied across untouched, and the other
four are scaled twentyfold to suit. The wave keeps a lens of its own — a grid
running to a horizon through a 200mm barely converges.

**His float is the studio's, not his own.** `floatSpeed`/`floatRange`/
`floatRotation` in `modelTuning.ts` are tuned for a subject filling the whole
of his own project screen alone, and next to four others bobbing by the
studio's own numbers, his own read as barely moving. `Placed` builds the
tuning `FaceScene` gets by overriding those three fields with `studio`'s
before handing it over — his lean and his gaze, which follow the pointer and
the bird rather than a fixed loop, are untouched, because those *are* his
alone.

**A hover spotlight was tried twice and is gone.** The first pass put the
brightening on `Studio`'s canvas-wide `toneMappingExposure`, which lifted all
five subjects together — there is one tone map for the whole canvas, so that
was never going to isolate to one. The second moved it to each subject's own
two lights: `dim` on `CastStudio` multiplying that subject's
`keyIntensity`/`fillIntensity` while `focus !== true`, lerped in `Placed`'s
existing per-frame loop. That one measured correctly in isolation — one
subject's lights climbing, the other four's held flat — and still read on the
page as every subject lifting together, faintly. Rather than a third
mechanism on top of a second that did not behave as reasoned, both are out:
`exposure` is a static canvas baseline again and every subject sits at
exactly the brightness its own `CastLight` authored.

Which is the right answer anyway, and it took two failures to see it. The old
roster dimmed every unselected subject, which made a cast of five read as one
subject and four rejected candidates; a spotlight is that idea in nicer
clothes. What answers the pointer now is the tag being drawn and the subject
stepping forward — both unambiguous, both about the one thing you are pointing
at, and neither one an opinion about the other four.

**Every subject has its own lighting, and it is genuinely its own.** A
`directionalLight` is infinite — it lights the whole scene — so five subjects
sharing one scene cannot have five rigs: turning Capsule C1's key up lit
Solomon with it. three tests `light.layers` against `object.layers` before
illuminating, so each subject and the two lights aimed at it go on a layer of
their own and the camera enables all of them. Layer 0 is deliberately left
empty: anything that misses its assignment comes out unlit rather than
silently borrowing a neighbour's rig. The layer has to be re-applied when the
GLB actually resolves out of Suspense, which is long after the group mounts —
`Placed` notices by watching its own node count, which only changes when
something loads.

What stays shared is the room: `scene.environment` and the tone map are one
each, and layers do not touch either. So the per-subject handle on the
environment is each material's own `envMapIntensity` (`env` on `CastLight`),
applied by traversal.

**Hover moves the cast in depth.** Pointing at a subject — or at its box in
the index, which is the same signal arriving from the other end — brings it
forward and pushes the others back, damped. Small numbers; it is parallax, not
a carousel. A direct pointer-over beats the index, because the pointer is the
more specific answer.

**The cast fades in, and it only fades.** It used to *scale* — each subject
growing from nothing — which was chosen to avoid making every material
transparent, and which read as the line-up being inflated rather than as it
arriving. So it is opacity, and the cost is paid narrowly: every material on a
subject is switched to `transparent` for the length of the arrival and
switched back to opaque the moment it settles, so the sorting a transparent
material brings only exists while something is moving. Staggered, because a
cast arriving one after another reads as a line-up assembling.

**Leaving is not this.** Opening a project takes the whole canvas out on one
CSS opacity — `.mech-model-layer` in Mech.css, the same fade a project's own
subject leaves on. Fading five subjects out material by material was doing the
same job twice and doing it worse, in three ways that were all visible and all
read as "something weird happens on the way out":

- **The lift.** A subject arrived from `RISE` under its mark, so on the way
  back out the line-up sank through the floor — and Mr. Takahashi, framed
  largest and lowest, sank furthest. A fade with a slide in it is not a fade.
- **The inside of his head.** `depthWrite` was dropped below half opacity, so
  for the second half of every exit nothing was in the depth buffer and the
  back faces of the head drew over the front ones. On an enclosure you would
  never notice; on a face it is the thing you notice first. Depth is written
  for the whole of the arrival now, and restored to what each material was
  authored with rather than to `true`.
- **The lunge.** Opening a project means the pointer is on an index box, so
  the subject that box names was being pulled forward by the hover parallax at
  the exact moment the stage was asked to leave. The depth is frozen once the
  cast is no longer `shown`.

A picture already composited cannot sort wrong; five sets of half-transparent
materials can. Nothing has to be restored afterwards either — the cast is
unmounted at the end of the exit and mounts again at zero when home comes
back, which is what the arrival's stagger is timed from.

**Two frame-one bugs, both the same shape.** A `camera` prop is read once at
mount and the `Lens` effect corrects it a frame later — and that frame is
painted. The face is framed much smaller on home than on his own project
screen, so with the shipped constant in the `camera` prop the first frame drew
him at project size and the second at cast size: the "flashes large" on the
way back to home. `toneMappingExposure` is set in an effect too, and the
renderer's default of 1 against this page's 0.6 is a visibly brighter frame:
the "flashes white". Both are now computed from the tuning actually in force,
before anything is drawn.

**And the flickering on Capsule C1's shell was the depth buffer.** Precision is
spent almost entirely near the near plane, and near was `z * 0.05` on a
subject sitting at `z` — almost no resolution where the subject actually is,
so two coincident faces of a moulded part swapped which one was in front,
frame to frame. The planes are wrapped tight around the cast now
(`CAST_DEPTH`).

The rider carries **no baked animation of any kind** — `gltf.animations` on
that export is an empty array — so "at max speed" is built out of the only two
things the node graph gives: separate wheel nodes and a body to shake. Two
details that cost an afternoon each. `wheel` is a *group* holding
`wheel_wheel_0` and `wheel_wheel_0.001`, and the second sits 25 local units
from the first, so turning the group orbits the rear wheel around the front
one and sails it off the top of the frame; only the leaves turn. And the spin
axis is *measured* — a wheel is a disc, so its axle is whichever of its own
three dimensions is shortest, which is true of any wheel in any export and
does not depend on knowing this file was authored Z-up. The rider also has to
be cloned with `SkeletonUtils.clone`, not `Object3D.clone`: a plain clone
copies skinned meshes without rebinding them to the copied skeleton, and what
that looks like is a pair of legs hanging in the air a foot above the bike.

### Pointing at the cast

> **Not mounted.** See *Home is a cluster*.

Hovering a subject names the project it opens and pressing it opens that
project. Since the row of project names came off the bottom of the screen,
this is not a nicety on top of the index — **it is the index**, and the tag
is what does the naming.

Two pieces, one gesture. The line is **the same leader the project screen
draws** — not something that resembles one. It reuses `.mech-leaders` and
every `.mech-leader-*` rule outright, so it is the same three circles and the
same hairline drawn on out of nothing. At the end of it is **the index box**:
the same rounded rectangle, the same border, the same name on the left and
number on the right that used to run twelve-across the bottom of this screen.
Its design did not need replacing when the row went; it needed a new place to
be, one at a time, for the thing you are actually looking at.

**The order it arrives in is the point.** The line draws out to the elbow, the
box opens along it like a drawer being pulled, and only then is the name typed
into it, with its number after. A label that arrives whole is a tooltip; a box
that opens empty and is then filled in is an instrument acquiring something.
Out is the same list backwards — the name backspaces (`Typed`'s `back`), the
box shuts, the line retracts — and those add up to just inside `TAG_OUT`,
which is how long the tag stays mounted after the pointer has gone.

Getting that cascade *out* meant not unmounting on pointer-out. The exit is
the same trick the frame swap uses — its own keyframes under a `data-off`
flag, never the entry reversed, because an animation is only restarted when
its `animation-name` changes. So the tag stays mounted for `TAG_OUT`, plays
the retraction, and only then goes.

The line is SVG in the stage's own coordinates; the box is HTML. That split is
deliberate: a line is a line, and a rounded rectangle with two typefaces in it
is already correct in CSS and would have to have its widths guessed in SVG
text. Both are moved by **the same rAF**, off `aim` in `subject.ts` — one
number a frame crossing out of the Canvas, the same pattern `drift` already
uses — so the tag rides the subject's float rather than being pinned to a
patch of screen the subject swims away from. Two clocks that agree at the
start and not a minute later is exactly the sort of thing nobody can name and
everybody notices.

**Where it reaches is placed, not derived.** It used to be three constants and
a rule: up and out by `TAG.rise`/`TAG.run`, to the left unless the subject sat
past the middle of the stage. Which is a composition for one subject and a
guess for five — Mr. Takahashi stands high and near, the rider low and turned
away, and the fish in the top right corner, so one fan puts a label across a
face on one of them and off the frame on another. The same thing that is true
of a project's readout is true here: a line that names a thing has to touch
that thing, and no constant knows where that is.

So a subject's tag has its own two points, `at` and `to`, and there is an
editor for placing them — **press P on the home screen**, exactly as you would
on a project screen. It is written up under
[Pinning the leaders](#pinning-the-leaders), which is where the tool it is a
copy of is. The one thing that differs is what the numbers are measured
against. A note is a *fraction of the picture's box*, because a picture has
edges; a subject has none — it is a thing standing in a scene, drifting on its
float — so a tag is an offset in frame coordinates from wherever the camera is
projecting the subject this frame. Which is exactly what makes it ride the
float instead of being pinned to a patch of screen the subject swims away
from. `CAST_TAGS` in `castTags.ts` is the table; anything not in it falls back
to the old fan, and reads as a dashed handle in the editor.

Two things had to be untangled for a pointer to reach the stage at all, and
neither was obvious:

**The face layer was eating every hover.** `MechModel` is a full-stage canvas
sitting over the cast's, so it captured everything. `pointer-events: none` on
the layer did nothing, because r3f sets `auto` on the canvas *and* on the two
wrapper divs it puts around it — and on the wrapper it sets it inline, which
beats any selector. It takes `!important` on the whole subtree.

**And the raycaster only tests layer 0.** Per-subject lighting works by moving
each subject onto a layer of its own; a `Raycaster` gates intersections on
`raycaster.layers` exactly the way a light gates illumination. So the moment
the lighting started working, nothing on the stage could be hovered or clicked
any more. Two features that look unrelated, one line of three.js —
`raycaster.layers.enableAll()`, next to the camera's.

Mr. Takahashi is drawn by his own canvas, so what stands in the cast's scene
for him is an invisible sphere at the same slot. A hit target in that scene
rather than a hotspot in the DOM, so all five subjects are picked by one
raycaster and the tag comes off one code path.

### Lighting, per subject

Nothing on this site shares a lighting rig any more, and the three places it
happens each needed a different answer.

**The home cast** shares one scene, so a `directionalLight` — which is
infinite — would spill from one subject onto the next. Each subject and its
two lights sit on a three.js layer of their own; see above.

**The pieces** never share a scene: a project screen shows one piece at a time
in a canvas of its own. So no layers are needed, and *exposure and the scene's
environment can be per-piece too* — the two things the cast genuinely had to
share. Each piece owns its exposure, its room, both lights with positions, and
its surface. One shared studio had to suit a matte business card, a glossy
moulded kiosk, a video-texture monitor and a flipbook of fish at once, which
means at most one of them was ever right.

**And the lens is the piece's too, which took a second pass to find.** When
light went per-piece the camera did not, so `focalLength` and `fill` stayed on
`ProductTuning` — one lens for all eight. On the panel that read as a settled
studio default and behaved as anything but: the **Lens** folder sat as a
*sibling* of the per-piece folder, one scroll below Size and Turn, so framing
one piece by eye silently reframed the other seven. Nothing on screen could
say so, because every other piece is on a different screen. It surfaced only
when a tuning session on Slider Engine was pasted back and the diff moved
`PRODUCT_DEFAULTS` — 60mm to 75mm across the board.

A lens is not a neutral setting to share. The camera backs off to hold the
framing, so millimetres do not change how *large* a piece is — they change how
much perspective it has, and a disc case at 60mm and the same case at 75mm are
differently shaped objects. Which one is right depends on what the piece is.
So `focalLength` and `fill` are on `PieceTuning`, seeded at the old shared
60mm/0.72 so nothing but Slider Engine moved the day it split, and the panel's
**Lens** folder is now *inside* `This piece` beside Light and Surface — the
grouping is the documentation.

**`Drift` is the one folder still shared, on purpose.** Speed, range and turn
are the stage's own idle rather than a property of the object standing on it,
and every piece drifting to the same clock is what makes the stage read as one
place.

Splitting the lens also closed a **frame-one pop** on the pieces, the same
shape as the two written up under the cast's exit. A `camera` prop is read
once at mount, so it has to be computed from the tuning actually in force —
and `MechProduct`'s was quoting the shared `PRODUCT_DEFAULTS.fill` raw, with
no `piece.size` in it. Every piece is sized, so every piece drew one frame at
the wrong distance before the `Lens` effect corrected it. It is
`distanceFor(piece.focalLength, piece.fill * piece.size)` now, which is exact
for seven of the eight. Block Builder is the exception: its blocks fly apart
and stack, so `Resize`/`Center` used to lock onto whatever pose was on screen
at mount — the flat ground scatter — and `Center` then pinned that pose's low
midpoint to the origin, sending the tower straight out of frame. It carries an
invisible box the size of its whole travel volume now (`BlockBuilder.tsx`), so
the measure is a constant. **And its values were coming back undefined in a
build:** `BlockBuilder` calls `useControls('Objects', { … })` — the named-folder
string form — and `leva-prod.tsx` only handled `useControls(schema)`, so it
flattened the *string* and every slider read `undefined`, which walked the
block positions to `NaN` and drew nothing. The stub takes the string form now.

**And the two GLB models** were both running on `MODEL_DEFAULTS` — a rig built
around a face, with an enclosure tuned to look acceptable under it. That is
now `MODEL_RIGS`, one entry each, seeded identical so nothing changed the day
it split.

**Seeded identical is what then hid the problem for a while.** Capsule C1's
entry stayed `{ ...MODEL_DEFAULTS, watchBird: false }`, which is the split
undone — `MODEL_DEFAULTS` *is* Mr. Takahashi's rig — and the case came up the
wrong colour on a screen where v2 renders the very same GLB correctly.
Dumping the export is what explains it. Six materials: two grey, two pure
black (the logo and the front panel), and **two carrying no
`pbrMetallicRoughness` block at all**, which in glTF means the defaults apply
— white, `metallicFactor: 1`, `roughnessFactor: 1`.

- **`envMapIntensity: 0` was the big one.** It scales the environment's
  contribution per material, and at zero the case sees no reflection at all,
  only the two directional lights. A metal has no diffuse response, so the
  export's two metallic materials had nothing left to render with. For a
  moulded enclosure the environment *is* the look. v2 sets 1.3.
- **`metalnessScale` multiplies where v2's `metalnessBoost` adds**, so 0
  forced those two metals to dielectric. 1 is the identity here and leaves the
  export saying what it was authored to say.
- **`roughnessBoost` adds**, and -0.93 clamps all six materials to roughness
  0. The black logo was not a washed-out black, it was a black mirror.
- **The fill light was nearly six times too strong** — 71.3 against v2's 12.3.

Every replacement number was v2's own, from `LIGHT_DEFAULTS` in `Gallery3D.tsx`
and `CAPSULE_DEFAULTS` in `CapsuleC1.tsx` — and the two surface ones still are.
The lamps and the exposure are not, any more: they were v2's for exactly as
long as it took to look at the case on *this* screen, which frames it far
larger and from another side, and they have since been set by eye on the
Subject tab. Exposure and intensity stay one setting either way — ACES is not
linear, so a key of 30 at 0.1 is not 60 at 0.05 and neither number means
anything alone. It reaches nothing else: `MechModel` sets
`toneMappingExposure` per canvas, a project screen has one subject on it, and
home's bank (`MechSlots.tsx`) sets its own exposure and never reads
`MODEL_RIGS`.

**The framing is its own now.** It was the face's for a while, deliberately,
and then it was tuned: `fill` 0.15 against a head's 0.56, plus a `turn` of
-138 to meet the case on a corner rather than flat on. `fit` normalises a
model by its **height alone** (`TARGET_HEIGHT / size.y`), which is right for a
head — about as tall as it is wide — and wrong for a wide, flat box, whose
short axis gets scaled up to a head's height before the camera has moved at
all. So the **Fills** control runs 0.05–2 now instead of 0.2–0.95: the old
floor was set around a head and could not stand the camera far enough back to
get the whole case on screen. `distanceFor` is `1 / fill`, so lower is further
away and smaller.

**What made the case follow the pointer was `lean`, and it is 0 now.** The
natural place to look for it is the Eyes folder — a Follow slider, a
sensitivity, a "watch bird" toggle — and every one of those is a red herring
on this model: they drive morph targets, `capsule-c1.glb` carries none, and
`setMorph` walks a `morphTargetDictionary` that has no such entry and writes
nothing. Turning them all down changes exactly nothing, which is a
frustrating way to spend an evening. The only thing that ever moved the case
is `Lean` in `MechModel`, which swings the **whole subject** toward the gaze
by `lean` degrees, and `MODEL_DEFAULTS` sets that to 11 because a head should
lean. `watchBird: false` had already taken the bird out of that gaze; zero
takes the pointer out of it too.

**And the rigs export used to claim six models for a site with two.** `Mech`
calls `useModelTuning` unconditionally — the Subject *tab* only appears when
there is a model, but the hook runs on every screen, and it runs as
`id ?? FACE`. The write-back then saved the loaded rig under whatever project
was open, so opening Mecha Station wrote Mr. Takahashi's lamps into
`rigs['mecha-station']`, and `asSource()` prints every entry it holds. Nothing
on screen was ever wrong — `rigFor` is only asked about a model — but the
export read as the face's rig being smeared across the whole site, which is a
convincing symptom of a bug that was not there, and it cost an afternoon.
`MODELS` in `model.ts` is exported now and is the guard, on both sides: the
write-back returns early for a project that has no model, and `rigs` filters
`savedRigs` through it on the way in, so a scratchpad already full of the old
junk sheds it on the next load rather than needing a Reset.

**And the Eyes folder should never have been on that panel at all.** The
schema has been conditional on `isFace` since the split, which reads as
settled — but Leva reads a schema **once per deps change**, and this hook
passed no deps. The first mount decides what the panel declares for the whole
session, the first mount is always home, and home calls
`useModelTuning(id ?? FACE)` — so the Eyes folder was declared every time and
stayed declared over Capsule C1. The condition only started meaning something
when `[isFace]` was passed as deps. Two things had to move with it: `declared`
is re-read when the schema is rebuilt rather than latched on first mount (a
stale list hands `set()` a key with no input, which is the blank-paper-gradient
crash that list exists to prevent), and the write-back merges over the rig
instead of replacing it — `values` no longer carries the same keys for every
model, and saving it bare would drop `lookH` and `blinkMin` off the case's
record, print them back out of `asSource()` as `undefined`, and put a NaN
rotation into source.

> **Calibrating this is panel work, and the panel beats source.** Editing
> these numbers in this file while the Subject tab is open changes nothing you
> can see — the scratchpad in `localStorage` is merged *over* the constants,
> so what is on screen is whatever the panel last held. Press **Reset** on any
> tab first; it clears the key and reloads. This is the single most confusing
> thing about the tuning panels and it is worth re-reading *A panel's
> scratchpad beats source* before concluding a number here does nothing.

**The models follow that rule now too.** `modelTuning`'s metalness was a
*multiplier* long after the pieces' had become an offset, and it is the reason
Capsule C1's logo stayed white through several rounds of correcting its
lighting. The logo is authored black at `metalness: 0` and `roughness: 0.046`
— a black mirror — and metalness is the one surface property where zero is a
different *material model* rather than a low setting: a dielectric reflects
white, a metal tints its reflection with its own base colour. So as a
dielectric it reflected the room and came out white, and no scaling of a zero
was ever going to change that. v2 adds 0.24 and the reflection picks up the
black. The face's default is `-1` rather than `0`, because an additive
identity would have quietly *un*-flattened six materials on a head that
already looked right — six of `adam-face.glb`'s thirteen are authored metallic
and the old multiply-by-zero was forcing all of them to dielectric.

Surface is Gloss, Metal and Reflects, and they are **offsets, not absolutes**.
A piece is several materials on purpose — a disc case is a clear sleeve over a
printed insert — and writing one roughness across all of them flattens it into
a single plastic. Added rather than multiplied, too: most pieces are authored
at `metalness: 0`, and no multiplier lifts a zero, so a scaling Metal slider
would have run its whole range without anything ever turning metal. Metal on
its own only darkens — a metal with nothing to reflect is a black surface — so
Reflects goes up with it.

### The index

> **Superseded twice.** The row of names lost to the line-up; the line-up
> lost to the bar graph. Both arguments are worth keeping — see *Home is a
> cluster*.

**Home does not carry a row of project names any more.** Twelve boxes ran
along the bottom edge, two rows of six: the name, and its number out at the
right. Under them stood a line-up with five of those projects on it as
objects. So the screen asked you to read a list and look at a group portrait
that were about the same twelve things, and the list won every time — a name
is easier to scan than a shape, which meant the objects were decoration and
the page's whole idea was decoration.

The objects are the index now. Point at one and it steps forward and puts up
**that same box** — same rounded rectangle, same border, same name and number
in the same places — on a line drawn to the thing it names. One at a time, for
the thing you are actually looking at. See
[Pointing at the cast](#pointing-at-the-cast), which is where that box now
lives, and `git show 4a322c0` for the row as it was.

That leaves the seven projects with no object on the stage, which is what the
one control in the header is for. It was already the only way through the work
on a phone; it is both layouts' way now. The list behind it is **written out**
rather than derived, which is the one place on this site where that is the
right answer. `entries` is "every project with something to put on a stage",
and that is correct for the timeline and the tile rail — a screen whose whole
job is showing frames cannot show a project that has none. It is wrong for an
index. Visa is the largest piece of work here and it is under an NDA, so it
has no media and never will; Solomon is a sibling checkout with a write-up
still to come. Both belong in a list of the work, and a filter that reads
`media.length` cannot know that. So `MENU` in `model.ts` is an ordered list of
ids, and a project named in it opens whether or not it has frames — a
**restricted card** stands in for the subject, saying so in the panel's own
voice, because an empty stage reads as a failure to load. The tile rail does
not draw at all for those, for the same reason.

`restricted` prose alone does not say *why* there is nothing to show, and the
two reasons are not the same: Solomon's write-up is unfinished, Visa's is
sealed. `locked: true` on the project (`projects.ts`) is the second case —
`.mech-bare[data-locked]` centres its head, reads **not yet disclosable**
instead of "no material", and shows a **lock**: a phosphor padlock, SVG, that
gives its shackle a small tug and settles back so it reads as held shut rather
than drawn on. The card also has **its own entrance keyframe**, `mech-bare-in`,
and not `mech-in`: this card centres itself with a `translate(-50%, -50%)`, and
`mech-in`'s rest frame is `transform: translateY(0)` held by
`animation-fill-mode: both`, which overwrites that translate and drops the card
down and to the right by half its own size. Same trap as every reused keyframe
on this screen — the fix is a keyframe that carries the centring offset in both
of its frames.

`MENU` is also where a subject's *number* comes from: the tag on the stage
prints the same two digits the sheet does, because they are the same index and
there is only one order of the work.

What went with the row is worth naming, because it was the good part of it and
it has no job now. Every box was the width of the *longest* name and no
wider — done with a gauge, every name rendered in every box at zero height, so
each box's natural width became the widest name and all twelve matched
exactly. Six `1fr` columns do not do that on their own: in an intrinsically
sized grid each column takes its own content's width, which is why the row
came out as six different widths at first. There is one box on screen at a
time now and it is as wide as its own name, so the gauge went with the row.
`portraitOf` in `model.ts` is likewise still there and likewise unused — there
was a square in each box for `public/portraits/<project-id>.png`, and none of
those files were ever made.

### The note before the boot, and why it is gone

There is a bird crossing every screen on this site and a moth sitting on it,
both shootable, with a reticle following the pointer and a gun under it, and
nothing on the page says so. Somebody who never happens to click empty space
never finds out. Somebody who does finds out by accident — a laser bolt leaves
the cursor on what they took for a portfolio, and the reasonable first reading
is that something broke. The warning pair reports on the birds and has done
since the third pass, but a lamp that is already lit when you arrive explains
nothing about what it is a lamp *for*.

So for a while the page said it once, in one line, and then got out of the way:
`MechGreeting.tsx`, two typed lines in a readout housing and one button, held
in front of the boot with `booting` true until it was dismissed. It was also
where `sound.boot()` moved to, because a press is the gesture a browser will
open an `AudioContext` on and before that the boot chime fired into a suspended
context on every load and was never once heard.

**It is out, and the removal is the decision, not a regression.** The verdict
on it was that it did not earn the screen it took: a card between the reader
and the site, every ten minutes, explaining a toy. The argument above is still
true — the gun really is undiscoverable — but the answer to an undiscoverable
toy is not a modal in front of the work. `MechGreeting.tsx` and `TextType.tsx`
(React Bits' typing reel, ported to TS, and used nowhere else) are **deleted**,
not unmounted; `git log` has them if the note is ever wanted back, and the
paragraphs below on `TextType`'s cost are kept because they are the reason
`Typed.tsx` is still what every readout uses.

`sound.boot()` went back onto the load with it. It is once again firing into a
context that may be suspended — which is the browser's rule, not a bug here,
and the first click anywhere on the page opens it (`sound.wake`, bound once in
`MechCursor.tsx`).

**What `TextType` cost, and why `Typed` is still what readouts use.** A reel
that deletes one line and types the next re-renders its component once per
character. Over a page that has not booted, behind a card, that is affordable
and nowhere else is: `Typed.tsx` writes into a node it owns rather than
re-rendering, which is why it is what the title, the wordmark, the fold
headings and every `Segment` are drawn with.

### What the page pays for every frame

This screen is a dozen independent `requestAnimationFrame` loops — the
compass, the reticle, the aim, the tachometer, the alarm, the bird, the gun,
the deck's meter — plus two WebGL canvases, and each of the loops writes into
the DOM. Nothing about that is wrong; the readout *is* a set of instruments
reporting continuously. What was wrong is how much of it was being paid for
readings that had not changed.

**A property written to a node invalidates that subtree's style whether or not
the value is different.** The browser does not diff for you. So a loop that
writes the same number sixty times a second is buying a full style recalc
sixty times a second for a picture of nothing happening. Three of them were
doing exactly that.

**The deck's meter, on every screen and every device.** `MechDeck.tsx` wrote a
`transform` and a `--v` onto each of sixteen bars and a `--level` onto the
housing, every frame, for the life of the page — and with nothing playing every
one of those thirty-three writes was the value the bar already held. It rests
in one pass now and then writes nothing until something is playing. The rest
state it writes is also exactly what `.mech-meter i` already declares in CSS
(`scaleY(0.06)`, `--v` defaulting to 0), so nothing about the idle deck looks
different — it was redundant, not load-bearing. The one-shot rest is keyed on
the *node* rather than a flag, because the narrow deck's meter unmounts and
comes back with the sheet and a fresh one has no inline styles to have been
rested.

**The compass, on the wide layout.** `MechHud.tsx` set a `transform` on the
strip and two `textContent`s every frame. The eased position converges within
a few frames of the pointer stopping and then reports the same number
indefinitely, which is most of the time a page is open. All three are written
only when they differ now — a tenth of a user unit on the strip, well under
the width of its finest tick.

A trap in that, which cost a round: the "what did I last write" sentinel
**cannot be `NaN`**. Every comparison against `NaN` is false, so the guard
rejects the first write and then every one after it, and the strip never moves
at all. `Infinity`.

**The stage canvas did not know it was on a phone.** `MechSlots` has made this
trade for the bank since it was written (`dpr={narrow ? 1 : [1, 1.75]}`, no
antialias); `MechModel` and `MechProduct` — the full-window canvas that is the
actual subject of a project screen — were still asking for `devicePixelRatio`
2 with multisampling on. On a 430-point handset at `dpr` 3 that is an 860×903
backing store; it is 645×677 now, which is 44% of the fragment work, and MSAA
is off. They take `useNarrow()` for it, the same store everything else on this
site branches on.

**The boot ripple was the one that was named, and it is the one this pass got
wrong.** `MechTiles` lays out a cell per grid square of the window and animates
all of them; a phone asks for about five hundred, each carrying a blurred outer
shadow, inside a container with a `mask-image`. That is real work on the exact
beat the main thread is compiling shaders and parsing a GLB, and it was cut two
ways: the blur came off the cells on narrow, and `MOST` dropped to 200, which
buys one halving out of the pitch loop — a hundred and fifty cells at double
pitch instead of five hundred at the grid's own.

**Both are reverted.** The verdict on it was "slow and not as nice", and that
is the correct reading of what those two numbers do. Neither is about the
count; both are about the *cell*:

- A 63-unit box scaling from 0.2 to 1.04 travels twice as far as a 31-unit one
  over the same fixed 420ms. The ripple takes exactly as long as it did and
  reads as slower, because what you actually watch is a box moving.
- The front advances in nine steps across a phone instead of seventeen. Nine
  steps is a sequence of things lighting up. Seventeen is a wave.

The pitch *is* the effect — the whole premise of the file is that these are
`.mech-grid`'s own cells — so it is not a knob with a cheap end. If the boot
needs milliseconds back, the lever that does not touch the look is the
`mask-image`: a masked layer is re-rastered as a whole whenever anything inside
it changes, so those five hundred boxes repaint into one bitmap rather than
compositing independently. Folding that falloff into a per-cell opacity (the
distance from centre is already computed for the delay) would drop the mask
without changing what is on screen. Untried, and it is a real change with real
visual risk — measure before spending it.

**What the attempt did leave behind is a real bug in the timing, and it is
fixed.** `RING` was milliseconds *per ring* — a speed — and a speed makes this
a different effect on every window, because a wider one has more of the grid's
cells between the middle and the corner. What varies is not the duration, it is
the **shape**: a cell is lit for `mech-tile`'s fixed 420ms, so the band on
screen at any moment was 71% of a phone's radius and 46% of a 2560-wide
desktop's at a default font size. One reads as the panel coming up; the other
as a thin ring crawling out. Same code, two effects, and only one of them was
ever looked at while it was being tuned.

`SPAN` replaces it: 570ms for the front to reach the furthest **corner**,
whatever that corner is. The delay is a ratio of cells to cells, so the band is
420/570 of the radius on every window and the ripple is the same gesture at
every size. 570 because it is what a handset was already doing, and the handset
is the one that reads right.

Two things fall out of it. The pitch loop can no longer affect timing as a side
effect — a ratio does not care what a cell is worth — so the correction factor
that halving used to need is gone rather than kept. And `LIFE` now covers a
known ceiling (`SPAN` + `SCATTER` + 420, a shade over a second) instead of one
that depended on how many cells wide the window happened to be.

**Worth knowing before reading a difference into it:** how many cells a window
gets is `--px`, and `--px` has a `rem` term in its `min()`. A browser with a
larger default font size or a zoom level lands on a completely different cell
count for the same pixel width — a 2560-wide window at a 16px root gets 48
columns and at a 25.6px root gets 31. Two machines at the same resolution do
not necessarily see the same grid, which is worth remembering before concluding
that a change did something.

**The bank's canvas ran flat out through the boot, drawing nothing.** This is
the one that was actually costing the frame rate on a phone, and a CPU profile
found it in about a minute after several rounds of reasoning did not.

`MechSlots` covers the viewport and renders eleven views into it, and it did
that from the frame it mounted — which is the middle of the boot, when the bank
is at `opacity: 0` behind the cover and not one of those views is on screen. So
the most expensive loop on the page ran for the whole boot to produce nothing,
in exact competition with the one sequence here whose entire job is to be
smooth.

On a phone it is worse than wasted work, because `Track` is inside that loop.
`Track` reads `getBoundingClientRect()` off the canvas every frame — a forced
layout flush, per frame — and it is gated on `narrow`, so it is a mobile-only
cost by construction. During the boot that flush is against a document carrying
five hundred animating ripple cells.

`frameloop={up ? 'always' : 'never'}` on that Canvas, `up` being the same flag
the bank's own deal already runs on. Counted off the built page at 430×900:
**27 and 32 forced layouts against the canvas during the boot before, 0 after**,
with the loop resuming normally once the bank is up. There is no race with the
bank appearing — the rail's entrance is a 700ms fade starting 380ms after the
flip, and the slots do not begin dealing until 620ms.

**`Track` still costs a forced layout per frame once the bank is up, and that
is untouched.** It is not waste there: the canvas is `position: absolute` over
the bank on the narrow layout and genuinely moves under a fling, and r3f's own
50ms debounce never fires during a continuous scroll — the note in
`MechSlots.tsx` is the full argument. The obvious economy is to read the rect
only while something could have moved, but "something" is not only scrolling:
the narrow reveal (`[data-arrive]`) animates a `translateY`, so a scroll-gated
version would hold a stale scissor box for the length of every block's
entrance. Worth doing, not worth doing carelessly.

**On profiling this.** The frame-rate numbers out of a headless run are
worthless — swiftshader varies the boot between nine and fifty-four frames
across identical runs, so anything derived from a frame count varies with it.
What *is* worth having from that environment is a **CPU profile**, which is
GPU-independent, and a **count of the specific call** you think you removed.
Build with `--minify false` first or the profile is a list of two-letter
names. `getContext` (the `WebGLRenderer` constructor, blocking, inside a React
commit) and `PMREMGenerator.fromScene` are the other two big ones at mount;
both now land inside the `primed` hold below rather than under the ripple.

### What the boot actually costs

The bundle work below cut what a phone has to *fetch*. It did not fix the
stutter, and the reason is worth keeping: the two are different problems and
only one of them was ever measured.

**How this was measured, because none of it was guessable.** A real Chrome over
CDP with `Emulation.setCPUThrottlingRate: 4` and a 430×900 device — a real GPU,
so frame numbers mean something, unlike the headless runs warned about above —
and every figure below is the median of six loads. Three instruments, in the
order they were useful:

- `Performance.getMetrics` for `RecalcStyleDuration` / `LayoutDuration`. This is
  what pointed at style rather than layout, and it took one run.
- `Tracing` with `disabled-by-default-devtools.timeline.invalidationTracking`,
  which names the node and the reason for **every** style invalidation.
- `Profiler` over a `--minify false` build, for self time by function.

What came back, before anything was changed:

| | |
|---|---|
| style recalculation | **1121ms** over 193 passes |
| layout | 68ms |
| script | 2395ms |
| main thread busy | 4651ms of 6500 |
| long tasks | 1853ms over 9 |
| frames over 50ms | 21 |
| worst frame | **1333ms** |

Layout was already cheap. The cost was style recalculation and script, and the
single most useful number in the whole exercise was this one, from bucketing
recalc passes by how many elements they touched:

```
  <=  100 els:  57 passes   887ms  (15.6ms each)
  <= 1200 els:   8 passes    62ms  ( 7.8ms each)
  >  1200 els:   3 passes   146ms  (48.5ms each)
```

Fifty-odd elements costing **fifteen milliseconds** to restyle, when nineteen
hundred cost forty-eight. Twelve times the per-element cost. That is not "the
page is big", it is a handful of specific elements being pathological, and it
narrows the search to almost nothing.

**It was the tachometer, and it was one string.** A column's twenty-six cells
are one `background-image` of a hundred and four gradient stops (`cellStack`).
Every stop was `calc(N * var(--px))` for its position and every other one was
`rgba(var(--accent-rgb), calc(0.07 + 0.93 * var(--on)))` for its colour. `--on`
is derived per column from `--rev`, and `--rev` is written on the face by a rAF
whenever the needle moves a whole column — so a sweeping gauge re-resolved
about **three and a half thousand calc-bearing tokens per frame**, across
thirty-four columns, and none of it changed anything but a brightness.

Two changes, neither visible:

- **Positions are percentages.** `background-size` already declares the box as
  `--face` frame units tall, so a stop at `at` units *is* `at / TACH_FACE` of
  the box. Same pixels, no `calc()`, no `--px`.
- **The colour is a registered custom property.** `@property --cell-ink { syntax:
  '<color>' }` in MechCluster.css. A *registered* property computes to one
  resolved colour per element and `var()` substitutes the value; unregistered,
  `var()` substitutes the token stream and the `calc()` inside is re-run at all
  fifty-two stops. A browser without `@property` falls back to exactly the old
  behaviour — correct, and as slow.

Style recalculation: **1121ms → 516ms**. Frames over 50ms halved.

**Then it was geometry, and it was being built for bays nobody could see.**
With style out of the way the profile was clear: `toCreasedNormals` (594ms) plus
`Vector3.dot` (666ms) — **1.26 seconds**, the largest single cost left. That is
drei's `RoundedBox`, which extrudes a bevelled solid and then hashes every
vertex against its neighbours to crease the corners. Six of the bank's eleven
subjects are pieces built out of them and the till (`PosStation`) alone has ten.

`useNear` already knew which bays were anywhere near the window — it was only
being used to skip *drawing* them. It gates the build now as well, so on a
phone a subject is made a screen before you reach it instead of eleven of them
being made at once behind the boot. Wide is untouched: `near` is always true
there. `mounted` only ever latches on, so nothing is rebuilt on the way back.

Script: **2395ms → 664ms**. And the whole picture, six runs each:

| | before | after |
|---|---|---|
| style recalculation | 1121ms | **511ms** |
| script | 2395ms | **664ms** |
| main thread busy | 4651ms | **2202ms** |
| long tasks | 1853ms over 9 | **201ms over 3** |
| frames drawn | 126 | **188** |
| frames over 50ms | 21 | **5** |
| p95 frame gap | 100ms | **34ms** |
| worst frame | 1333ms | **101ms** |

**And one thing that was tried, measured, and reverted.** The note above about
the ripple's `mask-image` — that a masked subtree cannot have composited
animations, so five hundred cells animating `opacity` and `transform` are ticked
on the main thread — is *true*. The trace confirms it: 12,997 style
invalidations on `<i>` attributed to `Animation`. It was replaced with a
per-cell alpha computed from the offsets the delay already uses, which drew the
same picture and halved that count. It changed the medians by about three per
cent, inside the run-to-run spread. A style invalidation on a leaf `<i>` with
four declarations is *cheap*; how many of them there are was never the problem.
The mask is back, with the measurement written beside it in Mech.css. Don't
spend it again.

The lesson is the general one: the expensive thing was not the biggest thing, it
was the most complicated thing being redone most often. Bucket the recalcs by
element count before touching anything.

#### The entrance, which is a different window again

What the above left was reported precisely: the ripple still catching on a
phone, and on a desktop *"when the main section loads in with my name and all"*.
Two complaints about the same beat, and whole-page medians cannot see either —
a 6500ms run that is mostly idle averages a saturated 1800ms window away to
nothing.

So the measurement was split into the boot's own phases, on marks the page
itself sets (`.mech-tiles` appearing and going, `.mech-cluster` getting
`data-covered="false"`), with frame gaps, long tasks and CPU samples attributed
to each. That is `phase.mjs`'s whole job and it changed the answer immediately:

```
  phone                                          desktop
  ripple→uncover  1235ms  36 frames  1 stall     THE ENTRANCE  1800ms  19 frames
  THE ENTRANCE    1800ms  54 frames  0 stalls    long tasks    1904ms over 5
```

The phone's entrance was already clean. The desktop's was **1904ms of long
tasks inside an 1800ms window** — the main thread gone for the entire length of
the animation, with a 534ms stall in the middle of it and a 1.3 second one just
after. Which is exactly, and only, what was reported.

**It was the same `RoundedBox` geometry as before, on the layout the fix had
skipped.** `useNear` had been made narrow-only, on the reasoning that `View`
does its own offscreen test when the canvas is the viewport — true, but that
test is about *drawing*, and what costs is *building*. The wide rail is
`--panel-h` tall and on a 1512×900 window **seven of its eleven bays fall
outside it**, built and never seen. An `IntersectionObserver` clips its
intersection rect against every scrolling ancestor and not just the viewport, so
one mechanism answers both layouts, and it now gates the build on each. Counted
in the page: on a phone the first screen builds **zero** rounded boxes.

That was not enough on desktop, because one of the four bays it does keep is
the till, and the till is ten `RoundedBox`es plus a mapped keypad. Which turned
out to be the real number: drei's `RoundedBox` is **3876 vertices whatever size
the box is** — `smoothness: 4` and `bevelSegments: 4`, doubled on the way into
`ExtrudeGeometry`, then `toCreasedNormals` hashing every vertex against its
neighbours. Counted live with a patched profiling build: **15 calls, 58,140
vertices**, for a column of seventy-five-pixel thumbnails.

`src/three/detail.tsx` is the answer and it is deliberately small: a React
context that multiplies those two segment counts, defaulting to **1 — exactly
what every piece was authored with**. Nothing that does not opt in changes at
all, so the project stage, the v2 gallery and the unmounted cast render the
geometry they always did. `MechSlots` provides `0.5` around the pieces in the
bank and nowhere else. 58,140 vertices → **17,820**; ten boxes cost 5ms instead
of 41.

The context does cross r3f's portal, which was the thing that might not have
worked — and if it ever stops, `detail` stays 1 and the geometry is what it was.
The failure is a saving that does not appear, never a thing that renders wrong.

**Is it visible?** No, and that was checked rather than asserted: the Wyte Card
in its bay, screenshotted from a build of the previous commit and from this one,
is the same picture — same silhouette, same corners, same shading. Creased
normals do the shading either way and the bevel is about five per cent of an
object seventy-five pixels tall. If a bay ever grows large enough for four
facets to show, `BAY_DETAIL` is one number in one file.

| desktop, 1512×900 | before | after |
|---|---|---|
| script | 3291ms | **1579ms** |
| main thread busy | 5129ms | **3370ms** |
| long tasks | 2544ms over 9 | **879ms over 6** |
| frames drawn | 112 | **166** |
| frames over 50ms | 19 | **10** |
| worst frame | 1367ms | **434ms** |

The entrance window itself: 1904ms of long tasks down to 660ms, and the 1.3s
stall behind it down to 233ms.

**What is left, and why it was left.** The phone's ripple has one repeatable
67ms hitch about 130ms in — the first style, layout and paint of five hundred
cells — and the rest of that window is 40% idle with the browser's own paint,
not script, as the largest share. `contain: layout paint` on the cells was tried
against it and measured **identical** to three decimal places of the same
numbers, so it is not in the file. The desktop's remaining 434ms is diffuse:
shader compilation, texture upload and the first render of four subjects that
have never been drawn. Both are the cost of the thing actually happening.

### Still slow to load on a phone, and the splitting that was not splitting

Reported after all of the frame-rate work above, and it is a different
complaint from the one that work answered: the boot's *frame drop* was fixed —
the bank's canvas no longer runs through the boot, the deck and the compass no
longer write unchanged readings, the stage canvas no longer asks a handset for
`dpr` 2 with multisampling — and desktop was reported fine. A phone was still
slow **on load**, and stuttered right at the start.

It was the bundle, and the reason it was the bundle is worth reading carefully,
because the code was already written as though this had been dealt with.

**Every `lazy()` boundary on this page was decorative.** `MechCluster`,
`MechModel`, `MechProduct`, `MechRider` are all behind `React.lazy`, and the
comments beside them say what that is for: a visitor who lands straight on a
project URL should never fetch home's eleven subjects, and nobody should fetch
three.js before the page has painted. None of it worked. Three static imports
put the whole 3D stack into the chunk that has to arrive before `Mech` renders
at all, and **a dependency already in the eager chunk is not deferred by being
imported a second time behind a boundary** — the boundary splits the module,
not the module's dependencies.

The three were:

| where | what it dragged in |
|---|---|
| `Mech.tsx` — `useProgress` from `@react-three/drei` | all of drei, and three behind it |
| `Mech.tsx` → `MechBank` → `MechSlots` / `MechRider` | three, drei **and** postprocessing |
| `MechPanel.tsx` and ten `*Tuning.ts` hooks — `leva` | 211 kB of development panel |

And a fourth, one level up: `App.tsx` imported the v2 `Site` **statically**, so
a `/v3` visitor downloaded and parsed the whole of the old site inside the entry
chunk before the router had decided not to render any of it.

**And v3 was standing on v2's reset without knowing it.** That fourth one was
right, and it broke the project screen: `src/site/base.css` carries the global
`*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box }`, and
because `Site` was an eager import that rule reached `/v3` too. `src/v3/` has
no `box-sizing` of its own anywhere — it never needed one, so nobody ever wrote
one. Lazy-loading v2 took the reset off v3 along with it, and every box on the
page silently became `content-box`.

The symptom was the leaders, and it did not look like a reset at all: cards cut
off mid-word at the right edge of their box, second lines sliced away, text
sitting outside the frame that draws it. `.mech-leader-card` is
`width: max-content; max-width: 100%` with 28 units of horizontal padding and a
1.3 border, and under `content-box` that padding lands *outside* the cap — so
the card grows past the seat and the `foreignObject` clips whatever sticks out.
Measured on a 1379×841 window, the first card's content box went 204 → 250 and
the third's 274 → 325, which also dropped it from three lines to two. Nothing in
`leaders.ts`, `Mech.css` or the placement had changed by a character.

The reset is declared in `V3.css` now, identical to `base.css`'s so the two
agree wherever both are loaded. **The two versions are strangers and neither
may depend on the other's stylesheet** — that is the rule the bug was breaking
before anyone moved anything. If a v3 box ever starts measuring its padding on
the outside, this is the first thing to check.

There was also a fifth path that looked like nothing at all. `bank.ts` — which
`Mech.tsx` reaches on the first render of every screen — imported `hasSubject`
from `MechSlots.tsx`, to answer one question: does this project have an object
to stand in its bay, or does the slot read "no signal"? A one-line predicate,
living in the file that imports three, drei and every piece. That is now
`subjects.ts`, which **imports nothing** and holds both registries as plain
data, and the heavy files read *it*. Keep it importing nothing: a single import
of anything under `three/`, `@react-three/*` or `./MechProduct` reopens the trap
and nothing on the page looks different when it does — the only symptom is half
a megabyte arriving before first paint. `MechProduct`'s `PIECES` is keyed on
`PieceId` from that file so the two registries cannot drift.

What it costs to open `/v3`, before and after:

| | raw | gzip |
|---|---|---|
| before — `index` + `V3` + `Gallery3D` | 2.27 MB | 692 KB |
| after — `index` + `V3` + `tracks` | 386 KB | 103 KB |

Three, drei, leva and postprocessing are now genuinely on the far side of a
boundary, fetched beside the boot instead of in front of it. The render-blocking
stylesheet went from 8.4 kB gzipped to 0.6 kB with the same change, because v2's
CSS left the entry chunk along with v2.

**Leva is aliased away in a build.** `vite.config.ts` points `leva` at
`src/v3/leva-prod.tsx` when `command === 'build'`, and `npm run dev` gets the
real package untouched. This is not a case of hiding a panel: every tuning hook
calls `useControls`, and the values it returns *are* the layout, so leva was a
static import of ten modules that run on a visitor's screen. The stub is the
schema's own defaults, flattened out of its folders and held in state — a real
store and not a constant, because `useProductTuning` and `useModelTuning`
reseed their per-item folder with `set()` when the readout swings to another
project, and a `set()` that did nothing would render every piece with the first
project's tuning. It is the *panel* that is missing in production, not the
values behind it. `MechPanel.tsx` is the only importer of leva's panel rather
than its hooks, and it is lazy now for that reason.

The trap in that alias is the usual one for a stub: `tsc` always resolves `leva`
to the real package, so nothing in `leva-prod.tsx` is type-checked against its
call sites, and a divergence appears in a production build and nowhere else.
The whole surface is six exports. Read the note at the top of the file before
using a leva API that is not already there.

**What is left in the critical path**, in case the next pass wants it: the
`tracks` chunk, 24 kB gzipped, which is the media glob — every asset URL for
every project, reached through `MechDeck` and `model.ts`. It is real data the
page uses. Beyond that the levers are the ones the profile named and neither is
about bytes:

- **Do not build the WebGL context inside a React commit.** `getContext` (the
  `WebGLRenderer` constructor) is the single largest blocking call at mount and
  `PMREMGenerator.fromScene` is behind it. Both are synchronous, both land in
  the commit phase, and neither has anything to do with the boot's *animation*.
- **`Track`'s per-frame forced layout**, which is mobile-only — see the note
  above and the one in `MechSlots.tsx`.

None of this is guesswork about where the time goes: build with
`--minify false` and take a CPU profile, as described above. What cannot be
trusted from that environment is any number derived from a frame count.

**Not the models.** Home's bank fetches about 18 MB of GLB — `gta-v-rifle.glb`
alone is 8 MB with no geometry compression at all, and four of the seven models
have none. That is a real number and it will matter on a connection rather than
on a tailnet, but it is not what this pass was about and it is not the stutter:
the stutter was reported before those files existed.

### Load first, then play

The boot is a dozen staggered CSS animations and a five-hundred-cell ripple,
and it used to start on the same frame as the WebGL context, the shader
compile, the environment map and, on a project deep link, a GLB. The smoothest
sequence on the site was scheduled against the busiest main thread it ever has,
which is most of why it read as sluggish on a phone.

So it waits. `primed` in `Mech.tsx` gates both `MechTiles` and the `BOOT_MS`
countdown, and turns true when three things have happened — the 3D chunk has
arrived, the fonts have resolved, and three's loading manager has gone quiet —
each with a cap so none of them can hold the page for ever. Nothing is lost on
screen: what is behind the boot is the bare grid on black, which is what a
machine that has not been switched on should look like.

**The chunk is the newest of the three, and it is there because of the split.**
Three, drei and leva used to be *static* imports of `Mech.tsx`, so that parse
happened before this component existed and the boot never had to think about
it — the page was simply blank for all of it. Now it lands beside the boot
instead, which is the whole point, and so the boot has to decline to start
underneath it or the ripple plays against exactly the traffic this gate exists
to get out of. `heavy` is that wait, resolved by the same dynamic import
`Warmth` is behind: importing that module is what fetches the chunk, and its
promise resolving is what says the chunk is parsed. `CHUNK_CAP` is longer than
`WARM_CAP` — it is a fetch of a known, large thing rather than a wait on
something that may never come, and there is nothing to show until it lands in
any case, because the bank and the subject are both inside it. See *the
splitting that was not splitting* above.

Four parts of it are load-bearing.

**`Warmth` is a file of its own.** `useProgress` is a drei export, so a static
import of it is a static import of three — twelve lines of subscription were
what put half a megabyte in front of first paint. It is lazy now, and doubles
as the signal that the chunk has landed.

**`Warmth` is a leaf component.** drei's `useProgress` re-renders whoever
subscribes on every progress tick, and the screen is not something to re-render
a few dozen times while it is trying to come up. It renders nothing; the only
output is one call upward.

**An idle loading manager means two opposite things** — nothing requested yet,
and everything arrived — and the gate has to tell them apart or it sits on the
cap every time there was nothing to load. Which is **home**, every single load:
the bank's eleven subjects are not requested until `up`, and `up` is
`!booting`, so they queue up *behind* the boot rather than under it. Hence
`WARM_GRACE`: nothing asked for in the first 350ms is nothing to wait for. A
project deep link is the case that actually waits, and what it waits for is
that project's own model, which is exactly the load worth waiting for.

**Two frames after, not zero.** What has just finished loading has not been
*drawn* yet — the first paint of a decoded texture or a compiled program is
itself a frame of work — and starting the ripple on that frame puts it straight
back into the traffic the gate exists to get out of.

`WARM_CAP` is a cap and not a wait. A cold cache, a slow network, a font that
never resolves, a loader that errors without telling anyone: none of them hold
the page. The machine comes up.

**On measuring this.** Don't trust a headless run for it. Software WebGL
(`--use-angle=swiftshader`, which the recipe in the memory note needs to keep
the app from unmounting) is slow enough that it swamps everything else: boot
frame rates land between 0.9 and 3.1 fps and the run-to-run spread is larger
than anything you are trying to see. What *is* trustworthy there is state you
can read at a moment — cell counts, canvas backing stores, the inline styles a
loop left behind — and that is what the numbers above were taken from.

### The panel coming alive

The boot was already a machine switching on a piece at a time — the chrome
holds off, the compass spins several turns and eases into where it should have
been all along, the leaders extend last. The one part that simply *appeared*
was the surface all of it is printed on: `.mech-grid` faded up over 1400ms and
that was that.

So the grid's own cells are dealt in, once, as a ring travelling out from the
middle of the window. Each cell strikes bright, holds a frame and decays to
nothing; what is underneath when the last of them has gone is `.mech-grid`
itself, at the same 46-unit pitch and in the same accent — so it reads as that
grid lighting up rather than as a second grid laid over the first. One ring is
drawn as an actual expanding circle over the top, which is what makes the
cells read as being *struck* by something travelling outwards instead of
merely taking their turn.

`MechTiles.tsx` builds it. Three things about it are deliberate:

**It is a thousand elements, not a canvas.** Each cell runs one composited
keyframe, which is work the compositor does off the main thread — and the main
thread on this exact beat is bringing up a WebGL context, compiling shaders
and parsing a GLB. Nothing here animates anything but `opacity` and
`transform`, for the same reason: those two are the only properties that get
run without waking it. Colour is baked into the cell and the flash is opacity
alone rather than an animated `background-color`. `will-change` is
deliberately absent — a thousand promoted layers is a worse problem than the
one it would solve.

**There is no rAF in it at all.** Every cell's place in the ring is a delay,
computed once from its distance to the centre, so the whole thing costs
nothing after layout. The cell size is *measured* rather than worked out —
`--px` is a `min()` over a rem and two viewport terms and `getComputedStyle`
hands back the expression rather than the value, the same problem
`useTypeScale` has — so one throwaway element sized in the real unit is read
once and removed. Past a ceiling on cell count the pitch doubles, which nobody
can tell apart at the size that happens.

**The ring spacing is set against how long a cell stays lit, not against a
total.** That ratio is the entire difference between a ring travelling out and
the window filling in at once. A cell is visible for 420ms; at 34ms a ring
that is a band about a dozen cells deep, with a bright core two or three cells
thick at the front. The first attempt spaced rings at 19ms and gave each cell
a long dim plateau in the middle of its run — which put a faint version of
every cell on screen simultaneously, and what should have been a wave read as
a grid fading up. There is no plateau in the keyframes now: bright by a fifth
of the way through and falling from there.

The layer takes itself down when its own ripple is over rather than being
unmounted with the boot flag, which is a little shorter than the furthest cell
needs, and it does not draw at all under `prefers-reduced-motion` — where the
grid is simply there, which is what it was before any of this.

### The wave

> **Not mounted.** The ground went with the line-up standing on it.
> `MechWave.tsx` is intact.

The ground the cast stands over: a displaced grid running back to a horizon,
moving.

It started as a stock AVIF laid behind the page with `mix-blend-mode: screen`,
which was fine for about a minute and then obviously wrong for two reasons. It
was a *picture of* depth pasted behind things that have real depth, so nothing
on the stage stood in any relation to it — move a subject back and it slid
across a flat backdrop. And it could not move, which on a page where the
brackets breathe and the compass drifts made it the one dead layer on screen.

So it is geometry: one plane, 200×200 vertices, displaced in a vertex shader
and lit by nothing. Four sines at incommensurable rates, not noise — noise
wants to look like terrain and this wants to look like a signal, something
generated rather than somewhere real.

**Its own canvas, at the size of the window.** It went inside the cast's
canvas first, which put it inside `.mech-frame` — and that frame is a 16:9
column, because `--px` takes the smaller of a width term and a height term. On
any window wider than 16:9 the wave stopped in mid-air at the letterbox while
the phosphor grid behind it ran to the edges, and a horizon with a vertical
cut down each side is not a horizon. It cannot both share the cast's canvas
and be full-bleed: that canvas is where the subjects are placed, and widening
it would move every one of them.

So it is a second context — which it can afford to be, with no lights, no
environment map, no raycasting, one mesh, one material and `dpr={1}`. It stays
glued to the cast because it is handed the same lens: same focal length, same
camera height, same distance. The vertical framing is therefore identical and
the horizon lands on exactly the scanline it would have landed on inside the
frame. Only the sideways extent differs, which is the whole point. That makes
three WebGL contexts on home — cast, face, wave — and none on a project
screen but the subject's.

**The lines are drawn in the fragment shader, not built out of geometry.**
`wireframe: true` on a triangulated plane draws the diagonals too, which reads
as a net rather than a grid, and a real `LineSegments` grid at this density is
forty thousand segments to upload. A grid measured off the interpolated UV
costs nothing, stays exactly one pixel wide at any distance — that is what
`fwidth` is for, the derivative of the UV per pixel, which is how thick a
line has to be drawn to look constant — and brightens its own intersections
into nodes for free. Without that division the far half of the field is a
solid sheet of aliased white.

The far fade is squared, so the field thins across most of its length instead
of running at full strength and stopping. A linear ramp put a bright band
exactly where the surface goes edge-on to the camera, which is the one place a
horizon must not have an edge.

Additive and `depthWrite: false` — it is a light source in the composition,
not an object in it, and nothing shares its scene to fight for the depth
buffer.

Colour is three stops, not two: a two-stop ramp makes every middle height a
muddy blend of the ends, so there is a trough, a middle and a crest. On top of
that, **Bright** is a straight multiplier on the colour (past 1 it blows the
crests out, which over black is exactly the look), **Glow** is how much hotter
crests and intersections run than troughs, and **Hue spread** fans the hue
across the width of the field with **Hue drift** turning it slowly. The hue
controls rotate colours that have already been chosen rather than generating
them, so a spread of zero leaves the three swatches exactly as set instead of
replacing them with a rainbow nobody picked.

All of it is one folder on the Cast panel, with the same copy-to-source as
everything else.

**On, and a second on next to it, for a different grid entirely.** `MechHud`
draws a flat, CSS-timed phosphor grid behind the whole readout — `.mech-grid`
— on every screen, unrelated to this shader beyond sharing a name. Its toggle
sits on the Wave tab anyway, as `grid` on `CastWave`, because that is already
where "is the ground on" lives and a second tab for one checkbox would be
worse than a checkbox in the wrong-sounding place.

### The panel turns with it

> **Not mounted, and not wanted.** The drift was the right mechanism and the
> wrong effect — see *Home is a cluster*. `tint.ts` is intact.

The wave drifts its hue, and for a while everything else on the home screen
was fixed at one green while it did — which left the ground looking like a
screensaver running behind a printed page rather than like the same instrument
lit off one supply.

So the page drifts with it. Not a second effect: the *same* rotation, applied
to the one token every green thing on this site already comes out of.
`--accent` and `--accent-rgb` are one colour written two ways — Mech.css needs
the bare triplet for the eighty-odd `rgba(…, 0.22)` it sets — and `tint.ts`
writes both on `.mech`, so the phosphor grid, the title, the tagline, the
index, the leaders, the reticle and the bloom's middle all turn together and
none of them has to know it is happening.

It is the shader's own formula, written out in JS rather than taken through
HSL: Rodrigues' rotation about the grey axis of RGB space, which is what a hue
rotation is when it must not touch how bright the colour is. It rotates from
the **authored** green every frame rather than from what is currently on the
element — reading the element back and rotating that again compounds, and a
few seconds of it walks the page off anywhere.

Three things worth knowing:

- **Home only.** A project screen is about the project, and a panel whose
  colour moves while you read a case study is a panel competing with it. The
  hook takes the wave to follow or `null`, and clears what it set when it is
  handed the second one.
- **One knob, and it is amplitude.** `tint` on the Wave tab is degrees of
  hue: 0 leaves the panel the green it was authored, 360 turns it right round
  at the field's own `hueSpeed` — literally the same drift the grid has — and
  anything between rocks it back and forth through that many degrees, so it
  can move without ever stopping being green. The *rate* is the wave's,
  deliberately, because a second speed control is a second thing to keep in
  sync by hand.
- **Thirty a second, not sixty.** Writing a custom property on `.mech`
  invalidates style for everything under it, and the whole readout is under
  it — so this is the one animated thing on the page that is deliberately off
  the frame clock. At the rates the panel offers a step is a fraction of a
  degree and nothing on screen can tell.

Why not CSS: rotating a hue in a stylesheet needs either relative colour
syntax — `rgb(from var(--accent) …)`, which cannot produce the bare `r, g, b`
triplet every `rgba()` here is written against — or an `@property` angle,
which costs the same style recalculation and can only reach a colour already
expressed as one. Two `setProperty` calls on one element is the cheap version,
not the lazy one.

### The housing

A still is not laid on the page, it is mounted in something: corner brackets, a
strip naming it, a transport under it. The brackets sit well clear of the
picture — at five pixels they read as a border with a bite taken out of each
corner, and the air between a bracket and the thing it holds is the whole point
of a bracket. They breathe, all four together, drifting a few pixels further
out and back on a four-second cycle, so the housing reads as something holding
the picture rather than as a rule drawn around it. One set of keyframes serves
all four corners: `--dx`/`--dy` on each one is which way out is.

The pictures and the clips carry a small radius (`--round`, in frame
coordinates like everything else, so it scales with the composition rather than
staying 10px on a wall display). Full screen puts them back square.

The words around the picture — the strip that names it above, the transport
below — are two tokens rather than four numbers scattered through the file:
`--label-gap` is how far off the picture's edge they sit and `--label-inset`
how far in from its sides they start. The inset is not decoration. The
brackets hang 13 out and are 15 long, so type set flush with the picture's left
edge is type set underneath a bracket, which is what "clip" was doing. Those
are the two numbers to move if it ever wants to sit differently.

### One frame, scaled

Every number in `Mech.css` is a coordinate in the Figma's 1920×1080 frame, and
`--px` is what one of those is worth in real pixels:

```css
--px: min(0.0749rem, 0.0520833vw, 0.0925926vh);
```

Whichever is smallest wins. The two viewport terms keep the composition fitting
at any window shape. At a 16px root the rem term is 1.1984px, which caps the
frame's natural width at **2300**: past that this stops being a readout and
becomes a billboard.

**The rem in a `min()` is a cap, and a cap is not a zoom.** It reads like the
term that makes browser zoom mean something — zoom works by making a CSS pixel
physically bigger, a rem is a fixed count of them so it grows, and `vw`/`vh`
are fractions of the window so they do not. But `min()` takes the *smallest*:
the moment a viewport term drops under the cap, the rem is out of the sum
entirely and the readout is pinned to the window at exactly the physical size
it already had. On a 2560×1318 window that happens at about 118%. Press harder
and nothing at all moves. A rem in a `min()` can only ever hold this design
back, never carry it.

So every size that is type — and nothing that is not — is written in a second
unit:

```css
--type: max(var(--px), 0.0749rem);
```

The same rem, and a `max()`. A frame coordinate says how big a thing is *in the
composition*, which is the right answer for a bracket and the wrong one for a
word: at the bottom of the range the frame's idea of 13.5 is ten real pixels,
and nothing is gained by a label nobody can read being perfectly in proportion.
The floor is the rem out of `--px` itself — the size the type is drawn at once
the frame has stopped growing — so **at the cap nothing renders a pixel
differently than it did when all of it was `--px`**. Below the cap the words
hold while the drawing shrinks around them, and above it they keep growing for
as long as anyone keeps pressing ⌘+. It is the same reason the page follows the
browser's own text size, which is the setting a person who needs bigger type
has usually already found.

**SVG text cannot be reached this way.** The leaders' labels and the compass's
heading are drawn inside a `viewBox` the browser scales by `--px`, so a length
written in there — rem, pixel, anything — is scaled along with the drawing.
What crosses the boundary is the *ratio* between the two units, because a plain
number multiplies the same on both sides of it: `--type-k`, set on `.mech` by
`useTypeScale` in `Mech.tsx` and used as `calc(18px * var(--type-k))`. It has
to be measured rather than worked out, since `getComputedStyle` hands back
`min(…)`/`max(…)` as the expression and not the value — so a hidden probe is
sized `100 * var(--type)` by `100 * var(--px)` and its own box is read. The
observer watches the probe rather than the window: the probe changes when
either unit does, which includes a text-size change that never resizes the
window at all.

**What a floor costs is that one block can outgrow its slot.** The role line's
type has a floor and the column's width does not, so a narrow window sets 133
characters in six lines where a wide one sets three — and the folds used to
start at a fixed 174 down the column, which would have put the first one
through the middle of them. A taller fixed number does not fix it either: the
line count rises as the window *narrows*, which is the opposite direction to
anything expressible in `--px`. So the column is a flex stack and the 174 is a
`min-height` on the role line instead of a position under it. Under the floor
nothing has moved by a pixel; over it, the folds move down by exactly what the
words needed.

The chrome hangs off a centred column of 2000. Only the subject and its
leader lines share a 16:9 box, and they have to, because a label that misses
what it names is not a readout. A wider window buys the leaders clearance,
never less.

### The title is a readout

`.mech-title` is a `Segment` — the same fourteen-segment display the folds
under it and home's `INTRO` are, one size up, in the warm channel. Twenty-one
lamps (`TITLE_CELLS` in `Mech.tsx`), which is "red dead redemption 2", the
longest title any project has, and the same count home's two big readouts use.

**This deleted a whole mechanism.** The title used to be type set on one line,
and keeping that promise took a size capped against the character count:

```
font-size: min(46 * --type, (460 - 26) * --px / (--title-len * 0.66))
```

— once for the wide layout and once for narrow, with `--title-len` handed in
from `Mech.tsx` as an inline custom property, `white-space: nowrap` said out
loud underneath in case a name of unusually wide letters overran the average
advance, and a note explaining that the count is *counted and not measured*
because a box measured while it is being typed into is a box that is still
growing. A display cannot break a name across two lines. All of it is gone:
`--title-len`, both `min()` sums, and the caret rule that went with the typed
title.

**Its width is not its column's.** `.mech-side` is 380 frame units and the
title box is 620, reaching out over the empty space before the subject's box
starts past 600 — the same argument the old 460 cap made, and it holds further
here, because a fixed twenty-one lamps is a much wider box than a name's worth
of type was. Set it to the column's width and the title prints *smaller* than
the nineteen-lamp fold headings under it, which inverts the one hierarchy this
column has.

Two traps in that, both of which produced exactly that inverted result:

- **`max-width: 100%` silently threw the width away.** 100% of a 380-unit
  column is 380 units, so the 620 was never once used. Narrow needs the window
  and gets `width: 100%` in its own rule instead.
- **A flex item is stretched back.** `.mech-side` is a flex column, so an
  over-wide child needs `flex: none` or it is shrunk to fit.

**`settle`, not `arrive`.** The fold headings under it switch on when a project
opens (see below); the title is the one line that is genuinely *re-set* —
stepping from one project to the next holds the same display and changes what
is on it, which is exactly the change the scramble was written for.

**The period comes up blank.** `Segment`'s alphabet has no glyph for `.`, so
"Mr. Takahashi" prints as `MR  TAKAHASHI` — a dark cell where the dot is and
another for the space. That is the component's documented behaviour for a
character it cannot form, and it is the right trade: the alternative is a
decimal-point lamp in `SEGMENTS`, which every cell of every display on the site
would then draw in its unlit field, home's `INTRO` and counts included, for one
project's punctuation.

### The title and the name are the same instrument

The project screen used to speak in two voices it had not earned. `.mech-title`
was Clash Display in the panel's phosphor — the site's magazine headline face,
in the colour the machine reports readings in — and `.mech-wordmark` in the
corner was the same face a size down, in `--mid`. Home, meanwhile, had settled
on Audiowide and the warm channel for the one line that says whose site this
is (`.mech-ident-name`, and the note under **Home is a cluster** for why a
display face rather than a headline one).

Both are Audiowide and `--warn` now.

**The wordmark, because the two names are one gesture, not two labels.**
Opening a project backspaces the big name out of the middle of the cluster and
types this one into the corner — the handover described below. A name that
changes typeface *and* colour halfway through being handed over is two names.
So `.mech-wordmark` is `.mech-ident-name` verbatim apart from the size: the
same face, the same warm channel, the same three-term glow, the same flicker.
Its hover is `brightness(1.35)` rather than a switch to white, because there is
one warm channel on this site and the hover state of a lamp is the lamp turned
up.

The title went a step further and stopped being type at all — see **The title
is a readout** above. Audiowide had it for one pass in between, and the two
constants that pass needed (an average advance of 1.15 against Clash Display's
0.66, in both layouts) went with the size formula.

**Audiowide's `@font-face` still lives in `Mech.css`.** It was declared in
`MechCluster.css`, which is imported by `MechCluster.tsx` — lazy, and mounted
on home only. A visitor landing straight on `/v3/p/<id>` never loaded that
chunk, so the wordmark would have come up in the fallback sans and nothing in
the DOM would have looked wrong. A face used on both screens belongs in the
stylesheet both screens load.

### A fold's heading is a readout

The write-up in the left column is home's intro block, in the same two voices:
the heading is the display, the paragraph is the panel's system text.

**The heading is a `Segment`** — the same fourteen-segment component that draws
`INTRO` at the top of the cluster, `warn`, `align="left"`, over the same field
of faintly-lit unlit cells. Nineteen of them (`FOLD_CELLS` in `Mech.tsx`), which
is "branding & insights", the longest heading any project has. Fixed for the
reason every readout here is fixed: a display is a fixed number of lamps, and
the dark ones after "roles" are what say so.

**Brightness carries the state, and the range it carries it over starts high.**
A closed heading is `0.82`, one under the pointer `0.92`, an open one full — the
whole `.mech-seg` fading rather than the word alone, so the display dims instead
of going monochrome. Those numbers used to be `0.5 / 0.75 / 1`. Half brightness
is the right resting state for a lamp that reports something occasionally, and
the wrong one for the only list of what a project *is*: turned that far down the
headings read as disabled, and a heading nobody can see is not a heading held in
reserve. The three states are still three states — a range does not need to
reach the floor to be a range.

**And they are half again the size on a phone.** The cell is `* 16` there
against the wide layout's `* 12`, which is not a contradiction: `--px` is
re-based on the narrow layout, so a multiplier copied straight across prints
larger than it does on the desktop and the correction was made twice, first to
`* 7` and then to `* 9.5`. Both overshot. A phone has one column with nothing
competing for it, so a section marker can take most of the width; what it must
not do is reach the gutters, where it stops being a readout in a panel and
becomes a headline.

**A restricted project has no overview fold.** Visa, 3D Printing and Mr
Grocery all put their `restricted` note on a card in the middle of the stage,
because there is nothing else to put there — and then printed "project
overview" underneath, opening onto a second, shorter paragraph about the same
thing. One drawer, holding one sentence, under a card holding five. `foldsFor`
takes a `carded` flag now and drops the overview when the card is up, which
leaves those screens with an empty column. That is the honest state: there is
no write-up to open yet, and a fold saying so twice is worse than no fold.
Solomon is the exception the flag exists for — it is `bare` too, but the rider
is on its stage rather than the card, so its overview stays.

It replaced a `Typed` line, and `Segment` grew one prop to carry that arrival
over. **`arrive`** runs the settle on the *first* word rather than only on a
change. The default is off and the comment in `Segment.tsx` says why — a readout
that scrambles the instant it mounts is claiming it was already on and showing
something else, which is a lie about a panel that has just booted. A project's
fold headings are the honest exception: they really are a row of lamps being
switched on when a project opens.

Home's arrival added three more, and they are all about *when* rather than
*what*. **`wait`** holds the display dark for a while before the arrival runs,
because a readout inside a block that is still fading in has to wait for its
housing. **`start`** holds it dark indefinitely and does not spend the arrival —
flip it and the word comes up from the beginning, which is how a readout inside
home waits out the boot's cover instead of settling behind it. And **`type`**
is the other arrival: the word spelled into the housing a cell at a time from
the left, no noise ahead of the caret. `SHOOT` / `STOP` are what wanted it —
two words that never change, so the scramble had nothing to scramble from.
`Typed` grew a `start` of the same shape and for the same reason.

And **`back`**, which is the way out: the word comes off from the right and the
display goes dark, mirroring whichever arrival it used. It is checked *before*
`start` in the effect, because leaving takes `start` away on the same beat —
without that the two race and the word is snapped dark rather than taken off.

**Brightness carries what three colours used to.** The typed version was `--dim`
closed, `--mid` on hover, `--accent` open. A lamp has no third state but its
level, so `.mech-seg` sits at 0.5 / 0.75 / 1. Fading the whole `.mech-seg` takes
the unlit field down with the word, which is right — the display dims, it does
not go monochrome.

**A heading is sized to a *cell*, not to the room.** `Segment` scales by width,
so a display handed the whole column prints bigger glyphs the wider the column
is. Filling the 380 put the cell at nineteen frame units against home's twelve,
and the headings came out half again the size of the readout they are modelled
on. Home's `INTRO` is `--count-w` (253) over twenty-one cells, so twelve units
a cell is that same measure and the two instruments print at one size.

The count comes down as `--fold-cells` from `Mech.tsx` rather than being
written into the stylesheet a second time: the width has to track the cell
count, or the next project with a section title longer than "branding &
insights" silently resizes every heading on the site. Narrow is the exception
and goes back to filling its room — the column is the window there, and a
display printing at home's cell across a phone is a caption.

**The row height had to be said out loud** too. It came off `line-height` when
the heading was type; the display sets its own height from its aspect, so the
space between headings is `padding` on the button now.

**`.mech-fold-rule` follows the heading to `--warn`.** A green rule under a red
readout reads as two different instruments.

**And the paragraph is `.mech-profile`'s voice** — `ui-monospace`, pulled toward
the phosphor rather than left at plain white. The argument is the one written up
under **Home is a cluster**: what a panel does with a block of prose is set it in
the monospace its system text already is. This column was the last block on
either screen still setting body copy in the site's own sans, which made a
project read as a document laid over the machine rather than something the
machine had printed.

**White, at home's own intro size.** 11 over 1.6, the `profileSize` default in
`clusterTuning.ts` — but `#fff` rather than the phosphor tint `.mech-profile`
carries. Home's paragraph is a three-line caption on a lit panel; this is the
copy the project is actually read from, and several hundred words of tinted
monospace is a wall.

Neither number is bound to `--profile-size` or `--profile-ink`. Those are
written onto `.mech-cluster` by home's own Cluster tab, so binding to them
would put a knob on the home panel that quietly resizes a project screen's body
copy — a knob nobody would ever find.

**And the tagline joins them.** `.mech-tagline` was the last line on this
screen set in the site's sans, sitting directly under a readout, which made it
read as a caption printed on a different machine. Same monospace, same white,
same 11 — one voice for every sentence in this column.

Nothing about the fold *mechanism* changed: it is still a grid row grown from
0fr to 1fr, still the rule drawing across and the copy lifting in behind it,
still both running backwards on close.

### The name behind the cast

> **Not mounted.** The name is `.mech-ident-name`, in the middle of the
> cluster, fitted to its own column with `container-type` rather than by the
> average-advance sum described here.

Home's title used to be the first two things in `.mech-lede` — small, in the
side column, typed in for whichever project the pointer happened to be over
and swapped for that project's own name and tagline on hover. Both were the
wrong call for the one thing on the page meant to say whose site this is: it
should not compete with a project's title for the same element, and it should
not move every time the pointer crosses an index box.

`.mech-hero-name` is a full-bleed layer instead — "designer" above, "Tarlok
Singh" filled out to the frame's own width below it, always one line, both
lines in Clash Display — drawn
*behind* the cast rather than beside it. It carries no `z-index` of its own;
`.mech-stage` right after it in the DOM carries `z-index: 1`, and an explicit
z-index always wins over `auto`, document order aside — the same reasoning
`.mech-wave-layer` relies on to stay behind everything in the frame without a
z-index either. So the paint order — wave, name, cast — falls out of two
z-indexes and where things sit in the document, not out of three layers
someone has to keep straight.

The size formula is `.mech-title`'s own average-advance heuristic, run against
a different width: `--gutter`, the same full-bleed inset the index sheet uses,
rather than the side column's 460. Narrow, the same formula is rebased on 500
rather than 1920 — that is what a frame coordinate is worth on that layout —
and the block comes out of the overlay entirely to become the first thing in
the page's scroll, kicker then name then the line-up under it. Behind the cast
is a wide-layout idea: `.mech-frame` has no fixed height there for a 50% to be
half of, and a name laid over five objects at 390 points is a name over a
face. `nameTuning.ts` is the panel it answers to
— the **Name** tab — with `size` as a scale on top of the fit for when the
width-fitted number still wants nudging by eye, `y` to move the block off
vertical centre, and `opacity` for how much shows through the cast standing in
front of it. Home only, and `.mech-lede` stays empty there now: it fills in
only for a project's own title, exactly as it always did.

The long paragraph that used to sit under the old title — the intro copy, or a
project's brief while hovering — is gone outright rather than left empty.
`.mech-brief` was never a project screen's own; it only ever filled in for
home's old fallback state, and there is no fallback state left to have one.

**The corner signature is a way back, not a second copy of the name.**
`.mech-wordmark` in the header used to sit top-left on every screen, home
included — which put "Tarlok Singh" twice on the one page that has it large
behind the cast as well. It only mounts now when `!home`: absent on the home
screen, drawn the moment a project opens, in the same corner it was always in.

**And it is the same name, handed over.** Opening a project backspaces the big
one out from behind the cast, a character at a time; a beat later the corner
one types itself in, in the same typeface. Going home runs it the other way.
Nothing here fades: `Typed` grew a `back` prop, which deletes from wherever
the line actually got to rather than restarting from the end, so a fast exit
picks up mid-word. Fading a typed line out is the one exit that says it was
never really typed; backspacing says the machine is still holding the caret.

The flag it runs off is `transiting`, and it is deliberately **not** `phase`.
`phase === 'out'` is true for any exit, and stepping the tile rail is an exit —
the name has no business reacting to a picture changing. `transiting` is set
only in the retarget effect, the one place the *screen* changes, and cleared
on the same beat `shownId` does, so whichever of the two names is mounting on
the other side of it mounts with something to type rather than something to
delete.

**The tile strip runs off the same flag, and for the same reason.**
`.mech-rail-wrap` clears out before a retarget and comes back after it, because
the strip is a different set of tiles on the other side of one — see *the
exchange* in `Mech.css`. That was keyed off `data-covered` on the root, which
made it true of stepping the strip as well: pick a different still or clip and
the control you were using faded out and back in under your hand, while not one
tile in it changed. It is `data-transiting` now. Stepping leaves the strip
alone entirely — live, lit, and still taking the pointer — and the swap happens
on the stage, which is the only place anything actually changed.

The header hangs its one control off `flex-end` rather than spacing two things
apart, and the signature pushes itself over with `margin-right: auto` when
there is one. `space-between` with a single child left in it put the index key
against the *left* edge of the home screen, which is the one place a way in to
everything should never be.

### Narrow viewports

That column assumes there's room either side of the centred stage —
`.mech-side` and `.mech-rail-wrap` sit in the margins a 16:9-ish window
leaves. Neither shrinks the way the frame does, though: both are absolutely
positioned off `.mech-frame`'s edges, and `.mech-frame` is always full
viewport height regardless of what `--px` comes out to. So on a phone in
portrait, where the frame's width collapses to fit but its height doesn't,
the two side columns keep their full height and shrink to a sliver of width
instead — and end up sitting on top of the stage rather than beside it.

Moving the boxes was only half of it. **The other half is the unit.** `--px`
is `min(0.0749rem, 0.0520833vw, 0.0925926vh)`, so on a 390-point window the
`vw` term wins at a fifth of a pixel: every gutter, gap and bracket in
`Mech.css` is a multiple of that fifth (a 28-unit gutter comes out at five
real pixels) while `--type` is floored at a rem and holds its full size.
Type at desktop size on a layout with no space left in it is what a phone
was showing — a title split across two lines, three leader labels stacked on
each other over a subject the size of a thumbnail.

So below 700px `data-narrow` on `.mech` — a `matchMedia` store in
`Mech.tsx`, not a plain CSS breakpoint, because two behaviours have to agree
with it — **re-bases `--px` to a 500-unit frame instead of a 1920-unit one**
and gives `--type` a lower floor of its own. Every ratio in the file lands
back where it was drawn, and from there the layout is one column, in this
order:

| | |
|---|---|
| header | sticky, folded into one control — `MechMenu.tsx` |
| `.mech-hero-name` | home only: "designer", then the name |
| `.mech-lede` | a project's title and the line under it |
| stage | the subject (or the whole line-up, on home), with its leader lines |
| rail | the tile strip, sideways |
| `.mech-folds-wrap` | the write-up, one section open at a time |
| footer | the contact line |
| deck, and `SHOOT`/`STOP` over it | floating, centred at the bottom of the window |

The subject is the change worth naming. The stage is no longer a 16:9 island
in the middle of the frame: it's a tall box the width of the window, the
model's `fill` is multiplied on the way into `MechModel` (`narrowTuning.ts`,
never `MODEL_DEFAULTS`), and a picture fills the box rather than sitting in a
780-unit rectangle inside it — `Flat` drops its inline frame-coordinate
`left/top/width/height` when narrow, which is what leaves the stylesheet
anything to set.

**That multiplier is per project.** One number for every subject cannot be
right: `fill` is normalised by height, so a tall head and a wide flat enclosure
do not fill a portrait stage at the same scale, and tuning one threw the rest
out. `narrowTuning.ts` is keyed by project id the same way `MODEL_RIGS` is —
`NARROW_TUNING` holds the overrides, `NARROW_FALLBACK` is what an untuned
project runs at, and the hook takes the project on screen and reseeds when the
readout swings to another (with the same `wroteFor` guard `modelTuning.ts`
carries, because `setValues` does not land until a render later and without it
one project's numbers get saved under the next one's id). The **Scale** tab is
hidden on home, which has no subject to scale.

**The Scale tab also pans the subject.** `model` is the zoom (labelled **Zoom**
now, not **Subject**); `offsetX` / `offsetY` — **Pan X** / **Pan Y** — nudge it
left/right and up/down in the tall stage, in frame heights, added on top of
whatever `liftY` (and, for a piece, `liftX`) the subject's own rig already
carries and divided by the same `fill` so the pan holds its screen position as
the zoom changes. It reaches the subject as an `offset` prop on `MechModel` and
`MechProduct` — narrow-only, `undefined` on desktop, so the group position
there resolves to exactly the expression it always was. Every field is
per-project and pasted back through the same **Copy for source** button.

**The Scale tab also rotates the subject.** `spin` / `tilt` — **Rotate Y** /
**Rotate X**, degrees — are added on top of the subject's own `turn` and
`tilt`, so a phone can meet a different face of a thing than the desktop rig
was framed to. For a model they fold into the `tuning` handed to `MechModel`
(`turn`/`tilt` on the placement group); for a piece `spin` folds into
`piece.turn` and `tilt` arrives as its own narrow-only `tilt` prop on
`MechProduct`, layered under the pointer sway in `Swing` rather than added to
`PieceTuning` (which has no pitch field). Both `undefined`/absent on desktop.

**And the Scale tab sets the lens.** `lens` — **Lens** — multiplies the
subject's `focalLength` on the way into `MechModel` / `MechProduct`. The camera
backs off through `distanceFor` to hold `fill`, so this moves the perspective —
wide and near, or long and flat — without changing how large the subject sits
in the stage. Narrow-only; desktop reads the rig's own `focalLength` untouched.

**`SHOOT`/`STOP` sits at the foot of the window, not the head.** On the wide
frame the warning pair floats on the header's own row, where there is width to
spare either side of the index key. A phone header is the wordmark and one
control filling the line, and the pair printed straight over both — then over
the project's title when it was moved down a row. It is stacked over
`.mech-deck-slot` instead, so the two floating controls read as one column of
chrome rather than two things that happen to be fixed. It clears the deck by a
real gap now — `bottom: 18 * --px + 52 * --type`, the pill's own height, since
`--px` is a couple of real pixels on a phone and the old `76 * --px` left the
lower lamp behind the pill — and sits at `z-index: 9`, above the deck, so the
pill's translucent green never washes over the count.

**The deck's glow is a phone-sized radius on a phone.** `--g` (the room's
bloom multiplier, `5` on this screen) is tuned for instruments read across a
wide frame; on the floating pill it drew a 20-unit green halo — alpha clamped
to fully opaque — that read as a lit box rather than a glow and washed up over
the warning pair. Narrow sets `--g: 1` on the pill's subtree, which is the
whole fix: an ordinary soft edge, nothing else about the pill touched. (An
earlier attempt also laid a dark gradient under the pill's tint — it turned a
faint translucent control into a solid slab and was reverted.)

**The deck has no floor behind it.** `.mech-deck-slot::before` used to darken
the foot of the window so the fixed pill would not fight a headline scrolling
under it — a `radial-gradient` first, then a softer full-bleed
`linear-gradient`. Every version read as a box sitting behind the control on a
dark page, so it is gone: the pill's own border and soft glow hold it off the
page well enough.

**The fold headings are sized to a cell here too.** They are the same
fourteen-segment display the wide layout uses, and `Segment` scales by width —
so a heading handed the full width of a phone column prints as a headline over
the body copy it is only meant to mark. Narrow sets it to `--fold-cells * 9.5 *
--px` rather than letting it fill the row. The multiplier is lower than the
wide layout's 12 because `--px` is re-based *bigger* down here, and 12 would
print larger on a phone than it does on a desktop.

The write-up is the same accordion the wide layout has, and **the overview
puts itself down** — here and on desktop both.

That has been round twice. It used to arrive already open, which was a screen
answering before it had been asked. It then arrived shut, on the argument that
a drawer standing open is the one thing in the column nobody opened — and what
*that* missed is that the column then says nothing at all: a title, a tagline
and seven closed headings, with the answer to "what is this" one press away and
nothing indicating that pressing is where the writing lives.

The distinction that resolves it is between **open on arrival** and **opening**.
`setOpen(null)` still runs on the covered beat, so the fold is shut underneath
the cover; `OVERVIEW_MS` (900ms, long enough for `.mech-side`'s own staggered
entrance to finish) then puts it down on screen, where it is seen going down. A
fold found open is furniture. A fold that opens is the machine answering.

Once per project, held on a ref rather than state. `covered` also goes true for
an ordinary step along the tile rail, and re-opening the overview every time
somebody looked at a different picture would fight them for the column. The ref
is cleared in the retarget, so coming back to a project you have already read
opens it again.

**Home's line-up needed its own two numbers here.** The objects *are* the index
now, so all five of them have to be on the screen and reachable by thumb — and
a composition drawn across a 16:9 frame puts the two on the ends past both
edges of a portrait window, with the whole set along its top edge. `fill` is a
fraction of the stage's *height*, so a tall stage shows less world sideways,
not more. `castSpread` (a multiplier on `CAST_STUDIO.spread`) pulls the
line-up in and `castLift` (an offset on `lift`) drops it toward the middle;
both are applied on the way into `MechCast` in `Mech.tsx`, never to
`CAST_STUDIO` itself, exactly as `model` is applied to `fill` on the way into
`MechModel`. Narrowing the spread rather than pulling the camera back is the
deliberate half of that: pulling back would fit them by making all five
smaller, which on the smallest screen is the wrong trade.

The title is capped against the width it actually has — the same rule the wide
layout has, against a different width. See **The title is one line** below.

The order is the second half of it, and it is not the markup's order. The
frame becomes a flex column below the breakpoint and `.mech-side` — the wide
layout's left column — is dissolved with `display: contents`, so its two
halves become items of that column in their own right and `order` puts each
where it belongs: the name and the line under it *above* the picture, the
write-up *below* the tile strip. Which is the reading order a phone wants
(what is this → look at it → look at the rest → read about it) and exactly
not the one a three-column desktop layout needs.

The breakpoint itself lives in `narrow.ts` — one query, one store, read by
both screens. Two copies of a media query is two copies that can drift, and
the home screen needs the same call: its chrome hangs off the same 952-unit
column, which centred on a phone puts the wordmark and the index link off
both edges.

Three behaviours branch on the flag. The rail turns sideways — a swipe strip
instead of a list — so `Mech.tsx`'s scrubber measures
`scrollWidth`/`scrollLeft` instead of `scrollHeight`/`scrollTop` and writes a
different pair of custom properties for the CSS to read. The dev panels are
hidden on both screens. And the arrow keys'
`scrollIntoView` names *both* axes: `block` defaults to `'start'` when it's
left out, and narrow the page itself is the vertical scroller, so asking only
for `inline: 'nearest'` scrolled the whole window down to put the tile strip
at the top and took the subject off the screen.

The dev panels are off at this width — Leva's own minimum is most of a
390-point window, and the subject panel and the label editor stacked cover
the subject, the deck and the title. What's left is `narrowTuning.ts`: subject
scale, picture scale and the home line-up's two, in the same shape as every
other tuning panel here (a `_DEFAULTS` constant, a localStorage scratchpad, a
copy button that hands back source).

Home's **Cluster** tab is the one exception to that. Three of its controls —
the role reel's size and the air either side of it — only do anything on this
layout, so a narrow window is the only place they can be adjusted from, and a
panel that cannot be reached where its controls apply is a panel that does not
exist. It is as wide as Leva always is; `H` and the `×` still put it away, and
that state is remembered.

#### Home, on a phone

Four things move, and every one of them is a block that had nothing left to
report once the layout changed under it.

**One tap opens a project.** It used to be two — a control with no hover has
to select before it commits, and the first tap was not wasted because it
filled in the rail's head, the field dials and the counts. The first three
of those are gone from this layout now (below), so the first tap bought
nothing and cost the one thing a tile in a grid of tiles is obviously for.
`SlotBox` still picks on the way through, so the beat between the press and
the screen leaving has the right project lit under the reticle.

**The rail's head came off and went back on.** It came off because with
nothing selectable it read `projects` from the page arriving to the screen
leaving — a display that never changes is not a readout. That was true and
beside the point: what the column was missing was not a readout, it was a
**label**. It is back, and it means a different thing on each layout — a
reading wide, a sign on the bank narrow — which is why it is `align="left"`
down here and centred up there. A sign that labels a grid sits at the grid's
own left edge; a heading over a centred block does not.

**The field dials are still gone.** Product / Code / Brand report on the selection,
and there is no selection to report; all three sat at whatever the cycling
title happened to fall under. Three rings and three words is also most of a
phone's width spent on the smallest reading on the panel. `display: none`
rather than an unmounted branch — the ignition sweep that drives them is the
same one the wide layout runs, and a second code path for "did this screen
draw the dials" is a second thing to keep in step.

**The column is reordered around the name.** Wide, the role reel stands over
the gauges with the bars beneath it as its scale, and `INTRO` caps the
paragraph in the instrument's head row. Neither arrangement survives one
column: the counts are a wide row down here rather than a stack of gauges, so
a reading standing over them is a caption on a chart, and the intro following
the counts put the one paragraph on the page — the block that says what the
name above it actually *does* — three screens below it, after two instruments
nobody had asked a question of yet. So the order is

> tachometer → role reel → **the name** → `INTRO` → the paragraph → the counts
> → `PROJECTS` → the bank

which is what the name means, then the name, then what it means at length,
then the numbers behind it. `.mech-intro` takes `order: 1` and `.mech-flank`
`order: 2` to get there; the markup is untouched, because the wide layout
needs the opposite of both.

**And the three signs are one size.** The role reel, `INTRO` and `PROJECTS`
are all twenty-one-cell `Segment` displays, and `Segment` scales its glyphs to
whatever box it is handed — so equal boxes is the only way to get equal type
out of them, and one number is the only way to keep three boxes equal.
`--sign` on `.mech-body` is that number (`--role-size` × 100%), and it works
at all three use sites because all three parents are full-width children of
the same column even though each percentage is measured against its own. The
reel and `INTRO` are centred, `PROJECTS` is not. Size is a **width** and not a
font size for the same reason: shrinking the box is the only knob that makes a
segment reading smaller while keeping its cells square. `roleSize` /
`roleTop` / `roleGap` on the Cluster tab move all of it.

`.mech-ident` also gave up its 26 units of top padding. The reel sits directly
on the name now, and the reel's own bottom padding plus `.mech-main`'s column
gap is already more separation than a title and the line above it want.

**And the bank lines up with everything above it.** `.mech-work-rail` carried
fourteen units of padding of its own, bought so a full-width slot was not
flush to the viewport edge and the reticle's lock brackets had room. What it
actually paid for was the one block on the page inset further than every
other: counts, reel, name and intro all sit at `--gutter`, and the grid of
boxes — the block whose edges are most visible — sat at `--gutter` plus
fourteen. The padding is gone and `--slot-bay`'s sum lost the twenty-eight
units with it. The brackets are drawn over a page that scrolls; a few units
past a slot's corner is not worth a seam down the whole layout.

### The subject, when there is no model

Two of the ten projects have a model — Capsule C1 and Mr. Takahashi. The other
eight had a photograph where the subject should be, which on a screen built
around *the thing itself* is the one frame that isn't one.

They do all have a piece, though, and have since v2: a video-texture monitor
for Mecha Station, a phone for OpenUp, a disc case for the two game credits,
Wyte's card, Block Builder's flying blocks, Slider Engine's fish man.
`MechProduct.tsx` stands those on the project screen's stage, as a third
`Frame` kind (`piece`) beside `model` and `flat` — three kinds because they
mount three different things, and everything that only cares whether a frame
is a picture asks `kind === 'flat'`.

**It is not `MechModel`.** That component is built for one face: its lens, its
lighting and its morph driving are tuned around that head, and
`MODEL_DEFAULTS` is shared with Capsule C1, which is already lit to look right
under them. Feeding a monitor through it would mean forking its lighting per
piece or quietly changing numbers a model is already lit by. So `MechProduct`
is a studio of its own — its own exposure, its own lens, its own panel
(`productTuning.ts`) — and the two files do not read each other. What they do
share is arithmetic: a lens quoted in millimetres and how far back a camera
stands to hold a fraction of the frame are generic camera geometry, not
anything about a subject.

It also points at the eight components directly rather than at
`src/site/products.tsx`, and that is not a preference — it's a cycle.
`products.tsx` imports `AdamFace`, `CapsuleC1` and `BlockBuilder`; all three
import `EXTRA_CONTROLS` from `Gallery3D`; and `Gallery3D` calls
`specDefaults()` from `products.tsx` at module scope. That resolves when
`Gallery3D` starts the chain, which is the only way it was ever entered — but
entering from `products.tsx` reaches that top-level call while `SPECS` is
still in its temporal dead zone, and the module throws before it finishes
loading. There is nothing much left to reuse anyway: `exhibitFor` hands back a
piece already scaled, lit for a case and turned for a room, and this stage
normalises the bounding box itself, lights it in its own studio and takes its
turn off a panel.

One more thing falls out of normalising on the longest edge, and it is not
about phones even though a phone is where it showed up: `fill` is a fraction
of the frame's *height*, so a wide subject asked to fill more of the height
than the frame is *wide* runs off both sides. `Lens` caps `fill` against the
frame's own aspect for that reason — true of any window shape and any
subject, and the reason a point-of-sale terminal came out cropped at both ends
on a stage that is about as wide as it is tall.

Each piece is `Center`ed and `Resize`d to one world unit before framing —
every one of them was built at whatever size suited the thing it is, and the
gallery they came from fitted them into a case for the same reason. Which is
also why they each need a `size` afterwards: a flat card and a tall monitor
fitted to the same bounding box do not read as the same size, they read as a
card blown up. `PIECE_DEFAULTS` carries `size`, `turn`, `liftY` and `liftX` per
project — `turn` seeded from the value each piece already carried in
`products.tsx`, since those were settled by eye against a real render.

`sway` is on that list too. `Swing` leans the piece a few degrees toward the
pointer, and toward the bird while it is in the air — the same preference the
face has. That gesture suits a thing on a stand, not a fixed object: Mecha
Station's till is a piece of hardware, not a character, and following a moth
across the room read as a bug. `sway` scales the whole effect: `1` is the
built-in amount, `0` holds the piece still.

**Every piece is on 0 now, and only Mr. Takahashi answers the pointer.** The
till was the first exception and the argument it was made on — a fixed object
has no reason to track anything — turned out not to stop at the till. None of
the eight is a face. A disc case, a card and a phone all tipping toward the
cursor read as the page being loose rather than as anything paying attention,
and eight subjects doing it at once made the sameness obvious in a way one
did not. So the default is 0, the per-piece overrides are gone, and the two
places anything still follows a pointer are both his: `Lean` in `MechModel`
at 11 degrees, and the eye morphs. Capsule C1 is on `lean: 0` for the same
reason — see **the case does not move with the pointer** above. The knob
stays on the Piece tab, because this is a judgement per piece rather than a
law, and the next piece may well want it.

**StitchFam is the piece that wanted it.** The frame is a moving image and the
one thing on that screen genuinely alive, so `sway: 0.56` reads as the picture
answering the pointer rather than as the layout being loose. Two other things
about it changed at the same time and they are the same bug twice:

- **The loop runs end to end now.** It used to sit in a mount — a 0.06 shell
  border and a 0.04 mat inside that, so the picture was about eight tenths of
  the box with two rings around it. A film in a picture mount is a still that
  happens to move; but the real fault is arithmetic, because both borders come
  off the width and the height by the same *absolute* amount, so the opening is
  never the shape of the frame. 444 × 532 footage was landing in a 0.72 : 0.83
  hole and being squashed into it — which is the exact crop the aspect constant
  at the top of `VideoFrame.tsx` exists to prevent.
- **And it was the wrong 444 × 532.** Two different files share the name
  `hero.mp4`: `src/assets/stitchfam/hero.mp4` is a 1280 × 720 landscape cut and
  `public/videos/stitchfam-hero.mp4` is the portrait loop the frame is built
  around. `MechProduct` was resolving the asset one. `heroes.ts` already
  pointed at the right file, which is the sort of disagreement that survives a
  long time because each half looks correct on its own.

**Every clip a piece wears is served from `public/videos/`, and that is a
rule.** They are textures on a subject, not frames in a project's media —
anything in `src/assets/<id>/` that the project's `projects.ts` entry quotes
becomes a step in the tile rail, and the loop running on a phone's screen is
part of the phone rather than something to page to. Mecha Station's monitor has
always read from there; Plus One's and StitchFam's do now.

> Changing this in source will not move anything on a machine that has a
> scratchpad, and `sway` is per piece inside it. Rather than Reset — which
> takes every piece's framing and lighting with it — rewrite the one field:
> `const k='v3.product.tuning.v1', s=JSON.parse(localStorage.getItem(k)||'{}');`
> `for (const p of Object.values(s.pieces||{})) p.sway=0;`
> `localStorage.setItem(k,JSON.stringify(s)); location.reload()`

**One piece is three objects.** Mecha Station is a cash register, a card reader
and a monitor on a stand, each placed by a literal inside `PosStation.tsx` —
placed against each other for the case v2's gallery stood them in, which is a
different composition from a project screen. On this stage they overlapped and
the register read as outsized next to the machine beside it, and `size` on the
**Piece** tab is no help there: it scales all three together. So the three
placements come off `stationParts.ts` — X, Y, Z, Size and Turn each — with a
**Station** tab (`stationTuning.ts`) that only mounts on that project.

Two things about that module are deliberate. It holds nothing but numbers and
imports nothing but React, because `PosStation` is in `src/three/` and is
mounted by *both* sites — pulling leva or a panel through it would drag them
into v2's gallery. And the placement reaches the piece through a live store
rather than a prop, subscribed with `useSyncExternalStore` the same way
`subject.ts` crosses the Canvas boundary: `Piece` in `MechProduct` memoises the
element on the project id precisely so a slider does not rebuild a component
that fetches a video, and threading the placement in as a prop would remount
the monitor's `<video>` on every tick. `tuned` is what says which site is
asking — false in v2, so tuning this screen cannot quietly recompose a screen
nobody is looking at.

Four projects (`a-game`, `mr-grocery`, `visa`, `3d-printing`) never reach any
of this: `entries` in `model.ts` drops a project with no media, and those four
have none. They are write-ups waiting for assets, and adding a piece for them
would put a subject on a screen with nothing else on it.

### The subject that never arrives

Two separate faults both present as *the 3D just isn't there* on a project
screen — no error, no network request, an empty stage. Neither looks like what
it is.

**A canvas that was never measured.** `@react-three/fiber`'s `<Canvas>` will
not call `configure()` or `render()` until the box it is in reports a non-zero
width and height, and it learns that box from `react-use-measure`'s
`ResizeObserver`. A tab that is still in the background when the page loads has
that observer's *first* callback throttled away entirely, so the measurement
stays `0 × 0`, the scene never mounts, `useGLTF` is never called, the GLB is
never fetched, and the element sits at the HTML canvas default of 300×150 —
and it stays that way after you switch to the tab, because the observer has
nothing new to report. Open a project in a background tab and you get a screen
with a title, leaders and a hole. `Mech.tsx` fires a handful of `resize` events
over the first second and one more on `visibilitychange`, which is all r3f
needs to re-read the box. Fired straight, not off a `requestAnimationFrame` —
a background tab pauses those too. Home's cluster canvas is `position: fixed`
over the viewport and never has the problem.

**A scratchpad older than the schema.** Every tuning hook merges what is in
`localStorage` *over* the `_DEFAULTS` constants, and both `modelTuning.ts` and
`productTuning.ts` used to do it one level deep — `{ ...MODEL_RIGS,
...savedRigs }`. A saved rig written before a field existed is a *partial*
object, and a shallow spread lets it replace a complete rig outright. The
missing `turn`/`tilt`/`liftY` reach the subject as `undefined`,
`degToRad(undefined)` is `NaN`, and a group at a `NaN` rotation is somewhere
off screen: a model that mounted, loaded and rendered, into nothing you can
see. Both files now fill each entry key by key — fallback, then the shipped
rig, then whatever was saved — so an old scratchpad can only override fields it
actually has. The tell in the console is Leva's *input at path `Place.turn` is
not recognized*.

### Motion, where the page scrolls

The wide layout has the whole composition on screen at once and a boot
sequence that brings every part of it up in order. A phone is a scroll, and a
scroll where everything is simply already there reads as a document rather
than as a panel coming up. Three things, all narrow-only:

- **`SplitReveal` waits until it can be seen.** It always drew a line in a
  character at a time; what it did not do was hold off. A cascade that fires
  at mount is a cascade that finished three screens before you got there. One
  `IntersectionObserver` per line, which is fine at this count.
- **Blocks arrive** — `reveal.ts` flips `data-arrived` on anything marked
  `data-arrive` as it comes into view, and the motion is one CSS transition.
  The attribute is `data-arrive` and not the obvious `data-reveal` because
  **that one is already taken**: v2's own scroll-reveal claims `[data-reveal]`
  globally in `src/site/base.css`, and both stylesheets ship in the same
  bundle. A bare `data-*` selector is a namespace shared by every stylesheet
  on the page, which is easy to forget in a repo that is two sites at once —
  it cost an hour of wondering why the folds had gone invisible on *desktop*.
- **The grid moves with the page.** It is a fixed layer, which is right on the
  wide layout because nothing scrolls there. Narrow, the readout slides past
  a texture welded to the glass, which reads as a screenshot with a filter on
  it. `MechHud` writes the scroll position to `--scrolled` (captured, because
  the scroller is `.mech` rather than the document) and the grid's
  *background* moves at a third of it. The background and not the element: a
  transform would drag the mask and the blurred copy with it, and both of
  those belong to the window rather than to the page.

  **Captured means every scroller, not the one you meant.** A capturing
  listener on `window` hears the scroll event of any element on the page, and
  the handler read `event.target.scrollTop` off whatever fired. The fact deck
  under a picture (`MechFacts.tsx`) scrolls *sideways*, so its `scrollTop` is
  a permanent zero — and the first swipe across it wrote `--scrolled: 0px`
  and snapped the grid back to the top of its parallax while the page had not
  moved at all. That is the whole of the "background jitters on the first
  swipe, project screens only" bug: one number, taken from the wrong box. The
  handler now ignores any scroller that is not `.mech` itself. Anything else
  that ever scrolls inside this screen inherits the fix for free, which is
  the reason it is a check on the element rather than on the axis.

The menu draws itself in the same way — every row typed out, staggered down
the list, on the same `SplitReveal` the taglines and the section titles use.
It is the one bit of motion here that reads as *writing* rather than as
sliding, and a sheet that types itself is part of the same machine as the
readout behind it.

### Getting to another project

There used to be two routes here, both in the header: a tag row that stepped
to the next project carrying whichever tag you pressed, and — tried once,
found to collide with the title, and moved to a strip along the bottom edge —
every project spelled out by name. Ten projects made both of them read as
clutter rather than navigation, and neither one told you where you actually
were.

Both are gone now. `.mech-menu-key` is the only route, on *both* layouts: the
same three-line control that already opened `MechMenu.tsx` on a phone. Press
it and the whole index folds open as a sheet — every project, named and typed
in a character at a time, the tags actually worth a shortcut, and the way
home. It's the one place on the site where a button opens a second button,
and it turned out to be the trade every window wants once there are enough
projects that a row can't hold them: the alternative is spending a strip of
the screen on navigation for a screen whose whole job is one large subject.

### The leaders

The lines that fan out of the subject and name its parts. A note that says
nothing about where it goes falls into a fan of three slots — upper right, mid
left, lower left — traced off the Figma as *fractions of the subject's box*, so
they reshape to whatever is on screen; a note that names its own two points is
drawn to them instead, which is what **Pinning the leaders** below is about. A
gutter either side keeps the card clear of the project copy and the rail when a
wide still pushes the seats outward.

**A note is a card, and the card holds a sentence.** It used to be SVG text —
a key in accent set over a value in white, on a horizontal rule the leader
elbowed into. Two words was the ceiling and it was a hard one: SVG text does
not wrap, and there was nothing for it to wrap *inside*. So the label is a
rounded box with an accent border and a translucent accent fill, the leader is
one straight run into the corner of it, and the elbow is gone with the rule it
was carrying.

Which corner is the whole trick. The line lands on the corner *facing* the
subject and the card grows away from there — up and left of a tip on its lower
right, and round. That corner is one we placed, so the geometry stays a pure
function of two points: nothing has to wait for a layout pass to find out where
the line ends. The card's own size is left to its text inside a `max-width`.

The box itself is HTML in a `foreignObject`, and two things about that element
are worth knowing before touching it. It **clips to its own rectangle**, so it
is drawn `CARD.glow` larger than the card on every side and `.mech-leader-seat`
pads the slack back — without that the halo is sliced off square, and a card
taller than the reserve is cut off mid-sentence with its border still drawn
round what is left, which reads as a wrapping bug and is not one. `CARD.h` is
that reserve, and it is deliberately more than double what any card needs: type
sits on a rem floor, so on a *small* window a card is half again as tall in
frame units as it is at the cap. Reserving it costs nothing — the seat takes no
pointer and the card is pinned to a corner of it. And everything authored
inside is in plain `px`, which in the leaders' `viewBox` are **user units**:
one unit is one `--px`, so the border, the corner radius and the padding all
scale with the frame with nothing overridden. Type is the exception and takes
`--type-k`, like the SVG text did.

Three guards keep a card somewhere sensible, and all three exist because a card
takes up room a line of type did not. It is never laid **over its own tip** —
on a phone stage there is no room beside the subject, the horizontal flip
pushes the card back across the middle, and it lands on the thing it is
pointing at; it is dropped clear vertically instead, which is the move that
always has somewhere to go on a stage taller than it is wide. Its assumed
extent is kept inside a **top and bottom edge** that on the wide layout clear
the header and the music deck above and the compass and footer below — a
two-word label cleared those by being small. And its **width is whatever is
left** between its corner and the gutter it is growing towards, capped at
`CARD.w` and, narrow, at a share of the stage.

**That width is the room, not the fit, and the two are different.** The card is
`width: max-content` capped at the room above, so a sentence that fits stays
hugged to its own text — but one that does not wraps, and the box then keeps
the full width it was *allowed* while the last line ends wherever it ends. A
label pointing at something should be the size of what it says, not the size of
the space it was offered, and the gap on the right was the most visible thing
about a two-line card.

No CSS keyword closes it: `fit-content` and `max-content` shrink-wrap to the
unwrapped width or fall back to the available width, and neither one is "the
widest line the wrapping actually produced". So `fitCards` in `Mech.tsx`
measures the line boxes with a `Range` and writes the width back. Three things
in it are load-bearing:

- **`Range.getClientRects()` is in screen pixels**, and a card lives inside a
  `foreignObject` in a `viewBox`-scaled svg, so those are not the units its
  `width` is set in. The card's own `getBoundingClientRect().width /
  offsetWidth` is exactly that scale.
- **The entrance animation cancels out of that ratio.** `getBoundingClientRect`
  includes the `transform: scale(0.82)` a card opens from; `offsetWidth` does
  not. Dividing one by the other removes it, which is what makes the fit safe
  to take while the cards are still opening.
- **It is taken again on `fonts.ready` and on resize.** Clash Display is
  `font-display: swap`, so a card measured before it arrives is fitted to
  Helvetica's metrics and clips its own last word a moment later; and a card's
  type is `14px * --type-k`, a ratio that moves with the window, so the
  sentence re-wraps under a width measured for a different size. `space` only
  changes on the narrow layout and cannot stand in for the second one.

The width is reset to `''` before each pass — measuring without that measures
the last pass's answer, and the card walks itself narrower every time.

Text is a table keyed by media id (`mr-takahashi/hero.mp4`); anything unwritten
gets a derived placeholder that reads like one. `Note.label` is the handle and
never appears on screen — it is what the fold link, the React key and the pin
editor's list are keyed on. `Note.value` is what the card says. A note names
the fold it is evidence for, and hovering either lights the pair — additively,
because dimming the rest of the readout made hovering anything read as the
labels going out. Lit is the border coming up and the halo widening, never the
sentence changing colour: turning the one white thing on the card accent makes
it read as disabled the rest of the time.

Every leader ends in a **mark on the spot**: a ring, a dot inside it, and a
slow ping that opens out of it and goes. A line arriving at a picture says
there is something there; the ring says *which* thing, which is the entire job
of a leader and the one part a bare line could never do. Hovering the card or
its fold lights the mark along with everything else in the pair.

Over the model they ride its float, read from what the float actually did this
frame rather than an animation timed to look like it. Two clocks that agree at
the start and not a minute later is the sort of thing nobody can name and
everybody notices.

### The leaders, on a phone

There are none. A phone gets the **marks** on the picture and the sentences in
a **deck** under it — `Marks` in `Mech.tsx` and `MechFacts.tsx` — and this
section is the arithmetic that says why, because the answer is not a font size
and two previous passes spent themselves finding that out.

A card's box is in frame units: `min(CARD.w, 0.6 × stage)`, which on a 402pt
phone is about 240 real pixels. Its type is on `--type`, and `--type` has a rem
floor — it is a `max()`, deliberately, so browser zoom can reach a readout that
is otherwise a fraction of the viewport (see **Type is on its own unit**). A
floor does not shrink. So the two units drift apart as the window narrows, and
any device that scales its own text — iOS's per-site text size, Dynamic Type,
zoom — pushes them further. The sentence outgrows the box it was allotted,
`width: max-content` overflows the `foreignObject`, and what you get is a card
clipped mid-word, printed across the card below it, running off the right edge
of the screen. It reads as a placement bug. It is a unit mismatch.

Turn the sum round and it is worse news than a bug. A sentence set at a size
anyone can read on a phone wants about 280 real pixels — **seventy per cent of
the screen's width**. Three of those cannot be arranged around a subject that
is using the same screen, at any size, in any arrangement. The fan is not a
composition that can be tuned onto a phone. So it is not there.

What is there:

- **The picture, and nothing on it.** See below — the marks went too, in the
  end. What is left of the geometry is `tipsFor` in `leaders.ts`: `atNarrow`
  first, then the wide `at` pulled onto the picture, then the fan's slot.
**And in the end, not even the marks.** They went in two steps, and the second
follows from the first. Each mark carried its card's number, printed beside the
ring — but a number floating on a face is a caption on the photograph rather
than an instrument on the panel, and three of them is a diagram over the one
thing anyone opened the page for. With the numbers off, a ring pulsing on a
cheek pointed at *something* and could no longer say what, which is an effect
rather than a readout. So a phone draws nothing at all on the picture. The
readout is the deck, and the deck is the whole readout.

`Marks` is gone with them; `tipsFor` is still in `leaders.ts` and the pin
editor still places `atNarrow`, which is the one loose end here — points that
nothing currently draws, kept because putting the marks back is one block in
`Mech.tsx` and the placements are hand-made.
- **The deck**, between the picture and the tile strip: one card, snapped to
  the left edge the title and the write-up already line up on, the next card's
  shoulder showing so it reads as swipeable, and the count on a five-cell
  segment display beside the word `FACTS`. Three parts and no more. There were
  pips under it for a while — a bar per note, the current one long — and they
  were a third readout of a position the count and the shoulder were already
  reporting, in a row of targets small enough that pressing one on glass was a
  coin toss.
- Every card in a run is **the same height** — they are items of one flex row
  and nothing overrides that. A row of boxes stepping up and down as you swipe
  is a set of different things; this is one readout showing one of its entries.
- A card is **as wide as what it says**, capped at a share of the screen past
  which the sentence wraps — and then `fitAll` measures the box back down to
  the widest line the wrapping actually produced, the same trick `fitCards`
  plays on the wide layout's leaders and for the same reason: no CSS keyword
  means "the width the wrapping came to", so the box otherwise keeps the full
  width it was *allowed* with the last line ending wherever it ends. Set to a fixed share instead, "Spoke in English and
  Japanese." was a box with a hand's width of empty green after it — and the
  shoulder of the next card, which is the thing that says the deck is
  swipeable, is not worth faking by padding one out.
- A card is **the height of its own sentence**, and carries **its number in
  front of the words** rather than on a line above them. Both are the same
  complaint: a flex row stretches its items, so a one-line fact was drawn in a
  box built for the longest fact in the set, and the number cost it another
  line on top.
- **The card is the one block on the site with no halo.** A scroll container
  clips to its padding box on both axes — `overflow-y: visible` is not
  available, because a box that scrolls on one axis computes `visible` to
  `auto` on the other — so a glow drawn outside the border is cut off square
  along the whole length of the deck. That reads as a lit panel sitting behind
  the cards rather than as light coming off them, and padding the run out far
  enough only moves the cut. The border does the work instead. The rule that
  ran out of the number to the far edge went at the same time: a divider
  separates a heading from a body, and this is one line with a number in front
  of it.

The two halves are joined by an index, held in `Mech` because they sit in
different halves of the tree. Press a mark and its card comes up; swipe to a
card and its mark lights. It goes back to the first note whenever the picture
changes.

Three things in the deck are worth knowing.

**The wide fallback is pulled onto the picture.** A wide tip is routinely set
a little *past* the edge — 1.02 across is common — because out there it is in
the frame's margin beside the 16:9 island, next to its card. On a phone the
picture is the whole stage, so past the edge is past the window, and a note
pinned only for the desktop had no mark at all. `tipsFor` clamps a fraction it
is *reusing* to `0.04..0.96`, and leaves a fraction that was actually placed on
this layout exactly where it was dropped — the same distinction `seated` makes
with `free`. The number flips to the other side of its ring near the right
edge, for the same reason.

**The deck is mounted for as long as there is a picture**, and not only for the
phases the marks are drawn in. It is a block in a scrolling column: taking it
out between two frames would drop everything below it up the page and back
down again. Its contents fade on `data-covered` with the picture instead, and
that fade is hung off its three children rather than the section itself,
because the section carries `data-arrive` and the reveal already has an opinion
about its opacity.

**A card is a percentage of a scroller, not a box in frame units.** Which is
what makes it safe to set its type on `--type` at all: type that grows past
what the frame expected makes the card taller, and taller is free on a page
that scrolls. That is the whole difference between this and the thing it
replaces.

The canvas the marks are drawn into is still the stage's own shape, and for the
original reason. The lines were drawn with `preserveAspectRatio="none"` over a
`viewBox` of the frame, which on the wide layout is exactly the stage's shape,
so x and y scale by the same amount. Stretch that same 1920×1080 box onto a
390×409 phone stage and the two scales differ by nearly two to one: everything
comes out squashed flat sideways. So `Space` in `leaders.ts` is the stage
measured **in frame units** — `useStageSpace` in `Mech.tsx` reads the stage's
box and divides by one `--px`, taken off the same probe `--type-k` is measured
from, because `--px` is a `min()` over rem and viewport units that
`getComputedStyle` hands back unevaluated. One user unit stays worth one `--px`
on both layouts, so every fixed offset in `leaders.ts` and every radius in the
stylesheet keeps rendering at the size it was drawn at.

`boxOf` takes the space for the same reason: the subject is a centred fraction
of a narrow stage rather than `MODEL_BOX`, and a picture is the same
contain-fit the browser is doing.

One more: `drift` is published in the frame's own 1920×1080 coordinates,
because that is the space the wide layout draws in. A narrow canvas is a
different number of units tall for the same amount of world, so the bob the
marks ride has to be converted on the way in, or they swing twice as far as
the head does.

And `drift` is the bob *only*, measured on screen. `Drift` holds two nodes at
the same nominal spot — one inside `Float`, one just outside it — projects both
through the camera to the leaders' 1920×1080 frame every frame, and publishes
the difference. Everything the two share cancels: the lift the outer group
applies as `position.y`, the turn and tilt, the lens, the lean toward the
pointer. What is left is exactly how far the float has carried the subject
across the screen, in the units the leaders are drawn in.

It used to scale a world-space offset by hand — `at.y * 1080 * fill` — which
needed the lift subtracted back off (it is framing, not motion; leaving it in
stood Capsule C1's labels 16px low) and, worse, had the *wrong sign* on a
turned subject: Capsule's outer rotation tips the bob onto the camera's other
axes, and the hand-rolled conversion did not know that, so the labels rode
backwards. Projecting the actual points is sign-correct by construction.

The rAF that rides the labels writes `drift` straight onto the group, no
easing. It used to low-pass it — the idea was to trail the head by a hair so
the labels read as pinned to it rather than welded on. But the float is slow,
and a low-pass lags by its own time constant regardless of the input's speed,
so the lag was a fixed fraction of a second at every point in the cycle — which
does not read as "trailing", it reads as the labels and the model bobbing at
different speeds. The frame loop's own output is smooth enough; the ride just
copies it. Both readouts share it as `useRide`.

### Pinning the leaders

Three arms off a fixed fan is a composition, not a readout: the line that says
"3D model" has to touch the model, and on the next picture the thing worth
naming is somewhere else entirely. So a note can carry its own two points —
`at`, where the line touches, and `to`, **the corner the line runs into**, both
as fractions of the subject's box, which is what makes them hold on a 4K
display and on a portrait still that lands somewhere the model never does.

`to` used to be where the text was set from, out at the far end of the run.
Now that the label is a card growing away from its own corner, that is the
corner, and the pin editor's grip moved onto the same spot — drag it and you
are dragging where the leader lands, not where the sentence starts.

The corner the line runs into is the one *facing* the tip, and usually that is
`to` itself: the box grows away from the tip, so `to` is the near corner. But
`seated` can be forced to flip either grow direction when the gutter or the
frame edge leaves no room that way — a card pinned near the top of the frame
with its tip *below* it has to grow down, onto the tip's own side. `to` is then
the *far* corner, and drawing the line to it runs it into the top of the card
while the tip is under the bottom. `sx0`/`sy0` keep the un-overruled sense, and
when a flip has happened `meets` is walked across the card to the corner that
actually faces the tip — `w` wide, and `cardHeight` tall.

Which is still not enough on its own, because both of the edges it walks to are
**guesses**. `seated` runs before anything is laid out: the far edge is
`anchor + w`, the width the card was *allowed* rather than the width it took,
and the lower one is `cardHeight`, an estimate off the sentence. `fitCards`
then shrinks the box to its own longest line, and the line is left pointing at
a corner the card no longer has. That is leaders ending in open space beside
their labels — and it was a phone-only symptom for a reason worth keeping in
mind: the flips are the only thing that reads those two guesses, and the flips
effectively never fire where there is room beside the subject.

So `fitCards` re-aims as well as fits. It measures the box that actually
exists — inside a `foreignObject`, CSS pixels *are* the viewBox's own user
units, so `offsetWidth`/`offsetHeight` need no conversion, and the seat's 34px
padding is `CARD.glow` — takes the corner of that box nearest the tip, which is
what "facing the tip" means once the card is real, and re-cuts the line on that
corner's arc with the same `meetsCard`. `--l` moves with the endpoint, or the
draw-in animation stops short of where the line now ends. Measured on both
layouts, every leader lands with a zero-pixel gap to its card.

Neither is required. A note with no geometry falls into the next free slot of
the fan, and a fourth starts the fan again a line lower, so a picture with one
thing worth naming and a picture with six both work before anyone has placed
anything.

Placing is not typing. Press **P** on a project screen in development:

- **click the picture** to add a line where you clicked — the box a click
  counts inside is drawn and says so, and **+ line** on the bar drops one down
  the middle for anyone who would rather not aim
- **drag the dot** to move where it points, **drag the label anywhere on it** to
  move where it reads — the first drag of either pins both, since a half-pinned
  note would leave its other end in a slot it no longer shares. The whole chip
  is the handle; it used to be the six-pixel grip alone, which is not a target
  on a phone and left the rest of the label looking draggable without being.
  The fields and the delete key stop the pointer, so tapping into one is still
  tapping into one
- the three fields are the handle, the sentence the card says, and the fold in
  the left column the line is evidence for (hovering either lights the other).
  Three sizes, not three equal boxes: the sentence is what the card is built
  around and it gets the room
- **copying and reverting are on the Labels panel**, not on the overlay — see
  below

### A placed label goes where you put it

`seated` does four things to a card it is handed: clamps the anchor into the
gutters, flips which way the box grows when a side is short, pushes the card
clear of its own tip, and pulls it back inside the top and bottom edges. All of
that exists to rescue a **derived** position. The auto fan is one shape traced
off the Figma and reused for every subject, every picture and every window, so
it has to be talked out of the edges it inevitably walks into.

A hand-placed note is not derived. Somebody dragged it to that spot, on this
layout, and watched where it landed — and overruling that is the editor arguing
with the person using it. It reads exactly as it sounds: you let go of a label
and it jumps somewhere else. So `free` in `seated` turns all four off, and
`leadersFor` sets it for any note carrying its own two points.

The qualifier that matters is **on this layout**. A phone falling back to the
wide `at`/`to` is reusing the desktop's answer, not honouring a placement — and
those answers sit off the left and right of the subject, where a wide frame has
margin and a phone has nothing. Reused coordinates therefore keep the clamps
that drag them back on screen; only a pair actually placed at this width goes
free. Get that distinction wrong in either direction and it shows: all-free
puts every un-pinned card half off the edge, all-clamped is the snapping.

Desktop is unchanged in practice by any of this. The note on the *never over
its own tip* guard already said those branches do not fire on a wide frame, and
the card positions measure identical either side of the change.

### Two layouts, two placements

A note can carry `atNarrow` as well as `at`/`to`. Below the breakpoint
`tipsFor` prefers it, falls back to the wide `at`, and falls back again to the
fan — so a picture can be laid out once for the desktop and once for the phone,
and neither placement disturbs the other.

**One point on a phone and two on the desktop**, because there is no card on
the picture down there to seat — the sentence is in the deck under it, and a
`toNarrow` would have nowhere to put anything. It existed until the deck did;
the three values that had been placed were deleted with the field rather than
left in the table as geometry nothing reads.

The editor writes whichever belongs to the width it is open at, which is the
whole of what makes this usable: press **P** at a phone width and every drag
lands in `atNarrow`. Narrow, only the tip is a handle and **the chips are a
numbered stack off the foot of the stage** rather than labels sitting beside
their own tips. Beside the tip was the obvious answer and the wrong one: a chip
is three text fields and a delete key, authored in real pixels because it is a
form, so a tip on the right half of the picture put its fields off the side of
a layout that cannot scroll sideways. Stacked, every row is reachable and the
number on it is the number drawn beside its mark. `MechPins`
takes the stage's `Space` for this — `boxOf(frame, space)` for the subject's
box, `space.w`/`space.h` to turn a click into a fraction — and the overlay
itself needed nothing, because it already positions in `calc(unit *
var(--px))`, which maps a space unit to a stage pixel on both layouts by
construction.

On a phone the panel carries **Scale** and **Labels**, so copying and reverting
are reachable without a keyboard; *Place them — press P* on the Labels tab
dispatches the keypress, which is how the editor opens on a device that has no
**P** to press. The pins bar docks to the window rather than to the foot of a
short stage.

**The same P, on the home screen, places the cast's tags.** There is no
picture there, so there is nothing to click on to *add* a line — the roster
is the roster and every subject has exactly one tag — and what is up instead
is **all five tags at once**, each with a dot on the end that touches the
subject and a bar over the words for the end that reads. All five, not the one
being hovered, for the same reason the cast panel puts a folder on screen per
subject rather than a folder for whichever is selected: arranging labels
across a group means dragging one while watching the other four. It also
side-steps the thing that makes this awkward to build the obvious way, which
is that the real tag is only on screen while the pointer is over its subject,
and a pointer cannot be over a subject and dragging a label twenty degrees
away from it at the same time.

The handles have to follow the subject rather than sit still, which is why
`MechCastPins.tsx` has a frame loop in it at all — every subject's projected
position is published on `aim.spots`, not only the one being pointed at.
Copying and reverting are on the **Tags** panel, next to Cast and Wave, and
the source pastes over `CAST_TAGS` in `castTags.ts`. Everything else about it
— the localStorage draft, the dashed "this one is still on the fan" state, the
clipboard falling back to `execCommand` — is the same machinery as above.

Both editors are the same key and they are never up together: a project screen
has a picture to pin notes on, home has a cast to tag, and neither has the
other.

**The mute control only draws on a clip that has sound.** `MediaItem.hasSound`
comes off `sound: true` in the project data, and `Stage.tsx` has always asked
it. This screen never did — it put a sound switch under all seventy-odd clips
in the rails, and all but a handful of those are silent screen captures, so the
control was a switch that reports nothing standing next to one that does.

**The transport is drawn, not typed.** It was a row of single characters —
`▶`, `⊘`, `⤢` — at eleven frame pixels, which is a row of specks: you could not
tell the full screen control from the mute one, which is the only thing either
of them has to say. They are SVG now, at the same weight of line as the reticle
and the bird, in a hit target you can actually hit.

**Full screen on a phone means the `<video>`, not the housing.** iOS Safari
ships no Element Fullscreen API — `requestFullscreen` is undefined on every
element — so the housing div can never go full there and the button read as
dead. `toggleFull` now checks for `requestFullscreen` and, when it is missing,
falls back to the clip's own `webkitEnterFullscreen`, which is the one thing a
phone will take fullscreen. A still still can't; the ask was about clips.

**The two halves are split by what they are for.** Placing a label wants to be
over the picture; getting one out does not. The overlay lives inside `.mech`,
where the native cursor is hidden and every press is a placement — a text field
in there is one you cannot see yourself select in. So the copy and revert
buttons are their **own Leva panel** — `useCreateStore` in `labelTuning.ts`,
stacked under the subject's, because lighting and labels have nothing to do
with each other and a folder buried inside someone else's panel is a folder
nobody finds. The source itself opens in a dialog portalled to `body` too.

**Three scopes, not two.** "Copy this frame" is one picture; "Copy every
frame" is every frame of every project you have pinned this session — which,
after a run through several projects, is a wall of other work to scroll past to
find the one you just did. "Copy this project" sits between them: `focus.id` is
`<project>/<file>`, and the slash with nothing after it is the prefix
`pins.source` filters the draft on. It is almost always the one you want.

**Copying works on a plain http origin.** `navigator.clipboard` only exists in
a secure context — HTTPS, or localhost — and the dev server here is reached
over the tailnet by IP or MagicDNS name, which is neither. Written the obvious
way, the copy buttons were doing nothing and saying nothing on the one machine
most likely to be using them. `clipboard.ts` tries the real API and falls back to the
old `execCommand` — out of a field that is really on screen, because browsers
decline to copy a selection out of something they consider invisible and the
`opacity: 0` version of that trick is a copy that reports success and puts
nothing on the clipboard.

And the source goes on screen **either way**, in a field that is focused and
already selected. The clipboard is the one part of this that cannot be
verified: there is no reading it back to check, `execCommand` reports success
it did not have, and on this origin the modern API is not there at all. If the
automatic copy worked the dialog is a receipt you close; if it did not, it is
one ⌘C. A copy button that might have worked is not a copy button.

The focus is set in an effect rather than a ref callback, because the button
that opened the dialog still has the focus at the moment a ref runs and
whichever of the two lands second is the one that wins.

The tuning panels' copy buttons go through the same helper, for the same
reason.

Everything is held in localStorage while you work, the same as every tuning
panel here, and *nothing reaches a visitor until it has been pasted*. A dashed
chip is a note still sitting where the fan put it; a solid one has been placed.

### The swap

Frames do not cross-fade, and they no longer come apart either. Four beats, in
this order, and the order is the whole idea:

1. the picture fades out
2. the labels that were pointing at it follow it out
3. the next picture fades in
4. its own labels draw themselves in

A leader should still be pointing while there is something to point at, which
is why the labels go second and not with it — and why they come back last
rather than arriving over an empty stage. The timings live next to the rules
that use them in `Mech.css`; `EXIT_MS` in `Mech.tsx` is the first two beats
and has to stay longer than they add up to, or the incoming lines are drawn
over the outgoing ones. Out is quicker than in: a picture leaving is a thing
being taken away and wants to be brisk about it, a picture arriving is the
thing you asked for and can settle.

The leaders are **mounted for the two phases the picture is on the stage and
not for the one where it is empty**. That is what makes the sequence hold
without a timer: the set that is leaving belongs to the frame that is leaving,
and the set arriving mounts at the moment the next picture starts, which is
what its own draw-in is timed against.

**Nothing here fades out. Everything undoes its entry.** A fade out of a thing
that was drawn on, or popped in, is a different gesture from the one it arrived
with — and the housing is furniture, so it should read as being *placed* and
then *taken*. The corner brackets, the strip naming the frame and the transport
under it pop in on `mech-pop` and leave on `mech-unpop`; a leader is drawn on
with `mech-draw` and taken back off with `mech-undraw`, retracting to the tip it
grew from.

The housing's exits key off `[data-leaving]`, not `[data-covered]`. `covered`
spans both beats the picture is off — the frame leaving *and* `hold`, the gap
before the next one arrives — and `hold` is when the next frame's own housing
first mounts, a fresh set of brackets with no exit to play. Keyed off `covered`
there, they open on `mech-unpop`'s first keyframe — full opacity, held by
`animation-fill-mode: both` until the delay runs out — before correcting into
fading in once the frame reaches `in`: a flash of the thing that just arrived.
`leaving` is only true for the beat the outgoing frame — the same DOM nodes,
not a fresh mount — is actually on its way out, so a new housing never sees it.

**Each exit is its own keyframes, and that is not a style choice.** The obvious
way to write this is the entry with `animation-direction: reverse`, and it fails
twice, both times looking like the animation is simply missing:

- A `reverse` animation runs its keyframes backwards but evaluates its timing
  function at 1−t rather than mirroring it. Every entry here starts fast and
  eases out, so every exit sat still and then snapped — a quarter of the way
  through its retract the leader had given back 2px of 170.
- And **an animation is only restarted when its `animation-name` changes.**
  `mech-draw` in and `mech-draw reverse` out is the *same* running animation
  with new timing bolted onto it. By then its current time is seconds past the
  end of the entry, so it lands in the after-phase on the first frame and holds
  the finished value. The line is not retracted, it is gone. Nothing in the DOM
  looks wrong either: the animation is attached, with the right duration and
  the right direction, and it is over. This is invisible in a background tab,
  where animations never advance and the current time is still near zero, which
  is exactly where it was first looked for.

Different names force a new animation with a current time of zero, and let the
exits run forward so their curves mean what they say.

Only the *picture* fades, because a photograph has no entry to undo. Out is
quicker than in either way: a picture leaving is a thing being taken away and
wants to be brisk, one arriving is what you asked for and can settle.

**The cascade is written in the stylesheet, in both directions.** A leader
arrives in order — the line drawn on, the words landing on it, the mark opening
on the spot last — and each leader 170ms behind the one before. That used to be
an inline `animation-delay` per element, which is a delay no rule can override:
the way out could only ever reuse the way in's timing, and a CSS delay written
against those selectors did nothing at all. `Mech.tsx` now sets two variables — `--d`
and `--d-out`, this leader's place in each cascade — and the offsets between the
parts of a leader live in `Mech.css` beside everything else.

**Both orders are mirrored on the way out.** Inside a leader, what came last
goes first and the line is taken off after everything it was carrying; across
the set, the last leader laid down is the first away. Shorter steps going out
than coming in, and capped — `OUT_STEP` in `Mech.tsx` — because an entry can
take as long as it likes and an exit has a swap waiting on it: six pinned notes
leaving at the entry's own pace would be most of a second of goodbye. The cap is
what `EXIT_MS` is set against.

The brackets are a case of two animations on one element: the entry owns
`opacity` and `scale`, the breath owns `transform`. Separate properties on
purpose — a bracket that popped in with a transform would have the breath take
the property straight back off it.

`hold` is the beat in the middle, after the outgoing frame has gone and before
the incoming one comes in. It is a real hole now rather than time hidden behind
a cover, which is why `HOLD_CAP` is shorter than it was — and mostly unspent,
since `warm` starts the fetch when the tile is picked rather than when the
frame is mounted.

**What this replaced.** A field of cells drawn on a canvas, eaten out of the
subject and rebuilt in a different order — `50629fd`, if it is ever wanted
back. Two things were wrong with it that a fade does not have. The field was
the subject's own box, so a 16:9 frame followed by a 9:16 one changed the size
of the block half way through the swap; and the canvas is resized when that box
changes, which clears it, which is the blank between them. Making the block one
size for every frame of a project would have fixed both, and is the change not
made — the sequence above was worth more than a better cover.

### The face

`adam-face.glb` **is** Mr. Takahashi — the head was modelled for Adam and kept
its filename through the pivot. It carries no head animation, only
`TeethAction`/`TongueAction`; all of its life is in morph targets driven from
code, ported from v2's `AdamFace.tsx`: a blink on a loose timer, eyes tracking
the pointer, an idle expression that rises and falls.

Two things about those morphs that are not written down anywhere else:

- **Influence zero is not a centred gaze.** `HorizontalLook` and `VerticalLook`
  are single morphs that slide the whole eye mesh from one end of its travel to
  the other — each accessor's `min` equals its `max`, so both are one rigid
  translation, and the horizontal covers 65% of the eye's own width. Zero is
  hard left. The gaze is measured out from **0.5**.
- **The scene must be cloned per mount.** `useGLTF` hands one cached scene to
  the whole app, and writing morph influences onto it means unmounting mid-blink
  leaves `Eyes Closed` pinned at 1 — and the blink only writes that morph while
  a blink is running, so nothing puts it back down.

**Noticing the bird takes a moment.** The face prefers the bird to the pointer
while it is in the air, and handing it the bird's position on the frame the
bird appears made him whip round to it: the damping downstream only ever
softens the *end* of a turn, never the start of one. So the target itself
crosses from the pointer to the bird over `watchCatch` seconds on a smoothstep
— the first tenth of a second barely moves — and comes back off it quicker than
it went. Something caught out of the corner of an eye, rather than a turret
acquiring.

Its lighting is one setting, not several: exposure 0.1, `RoomEnvironment` at
3.4, key 30 and fill 12.3 at the intensities that go with that exposure, and
`envMapIntensity` 0.6 with roughness +0.2 and metalness ×0.5 on every material.
Moving any part of it alone throws the face out. All of it is on the panel, and
the copy button hands back `MODEL_DEFAULTS` to paste into `modelTuning.ts`.

### The gun

Press anywhere on the readout that is not something you could press *for* a
reason, and a bolt leaves the bottom edge of the frame for wherever you aimed.
It is meant for the bird, which is the only thing on the page with a hitbox,
but it fires at empty black just as happily: a gun that only works when there
is a target is a button.

**One muzzle, in the middle of the bottom edge.** You are behind the gun, not
beside a pair of them, and a shot that leaves from somewhere different every
time reads as coming from the page rather than from you.

**Nothing on the readout selects.** `user-select: none` on `.mech`, because a
press-and-drag is how you aim, and every one of those was leaving a blue
highlight smear across whatever text it crossed. The dev panel's `<textarea>`
turns selection back on for itself and is the only thing that does.

**And it goes away from you.** The bolt is longest and thickest leaving the
muzzle and shrinks the whole way out, on a travel eased so it covers less
screen the further it gets — which is the whole of the depth, and why there is
no tracer: a line held between the muzzle and the target is a line drawn across
a flat page, and it was the one thing that gave the trick away.

The head of the streak lands exactly on the point at every distance, which
takes **`transform-origin: 0 0`** and is wrong without it. The transform ends
in `translate(-100%, -50%)` to put the head on the aim point, and a transform
applied about the element's default centre swings that head away again by up to
half the bolt's length, in a direction that turns with the angle and shrinks
with the scale. It looked like the gun being slightly out of alignment. It was
the origin.

There is no separate muzzle flash. The wash along the bottom edge is the
discharge: a flash element *and* the wash *and* the bolt all arriving at the
bottom of the screen together read as two or three bullets leaving rather than
as one gun going off.

It shares its **orange** with a handful of other things now — the bird, the
compass's marker box, the audio deck, the reticle's lock box when it is on the
bird — rather than being the one warm thing on an all-green panel, which is
what it was originally built against. A bolt in the panel's own green would
still read as another instrument lighting up rather than as something leaving
the page; what changed is how much else on the panel is allowed to share its
color instead of sitting apart from it.

The blast is wide, and the bottom edge of the screen carries a low wash of the
same colour — faintly on all the time, so the bolts have somewhere to have come
from, and flaring on every shot. It says where the gun is without drawing a
barrel.

**You can hit the subject.** While the thing on the stage is the model rather
than a picture, it is a target: the project screen registers its box in client
pixels (worked out from the stage's own rect, padded out to the space the float
actually moves the head through), and a bolt landing inside it goes to
`MechModel`. A still is not a target — shooting a photograph of something is
shooting a photograph.

What he does about it: shuts his eyes, twitches twice, tips his head back, and
saddens for a few seconds. The eyelids are one morph for the pair, so a wink is
not available and the twitch is a flutter rather than one eye going.

Every part of it is slower than it first was, because every part of it was
instant and instant reads as a glitch: the blink takes the better part of half
a second, the sadness arrives over a second and a half and leaves over five,
and the head tips back over a quarter of a second rather than all at once. The
tip is a curve laid over the lean rather than a shove into it — the lean keeps
its own damped value, because adding the knock to `rotation.x` and then damping
`rotation.x` toward the pointer next frame feeds the knock back into the lean
and the two never finish arguing.

The reticle's pin is snapped onto the pointer on every press: it normally
chases a couple of frames behind, and a bolt aimed at the true pointer while
the crosshair was still catching up landed *beside* the sight rather than in
it, which reads as the shot being off.

Every `a`, `button`, `input`, `label` and `video` is the page's, not the gun's,
and a press that lands on one of them does that control's job silently. The
bird is the one exception — it is a `<button>` so the reticle can lock onto it,
and clicking it fires a bolt like everything else rather than killing it by
touch. The whole of that is `CONTROLS` in `MechLaser.tsx`.

Nothing about it is React state: a shot is three divs, a transform per frame,
and a `remove()`. Bolts test the bird's position *this frame* rather than where
it was when you pressed, so leading it is a real thing you can do — and the hit
radius is wide enough that a shot aimed dead at it still lands, since a bolt
takes about a fifth of a second to cross and the bird covers forty pixels in
that time.

The bird and the gun never refer to each other. `quarry` in `subject.ts` is one
hitbox and one function that says whether the shot landed, the same trick as
`gaze`, for the same reason: two things on opposite branches of the tree that
have to agree every frame and never render anything.

### Two animals, and a tally

The bird is a clean thing: it enters at one edge, crosses on a bezier, leaves
at the other. You lead it and you hit it. A second bird with different wings
would be a recolour, so the moth is built around the other half of hunting —
the part where something is already there and you have not noticed it.

A moth settles somewhere on the panel and sits still, dim, wings shut, at a
size you could easily take for another mark on the readout. Bring the reticle
within about 120px and it *startles*: it bursts off its perch and flies a
jittery path — a random walk with a drift away from whatever startled it, and
a fresh heading every time it reaches the last one — until it is off an edge.
Some seconds later there is another one somewhere else. So the two are two
different shots: the bird is a timing shot at something that has not seen you,
the moth is a snap shot at something that has, and it is much harder.

Both live on the home screen and on every project screen, **and both work on
touch.** That took three things.

The gun fires on a different event depending on the pointer. A mouse fires on
the way down — you aimed, you clicked, and waiting for the button to come back
up is a gun with lag. A finger cannot: every scroll on this page starts with a
`pointerdown`, so firing there is a bolt per flick, which is a page fighting
you. So a touch fires on the way *up*, and only if the press was a tap — under
twelve pixels of travel and under six hundred milliseconds. A scroll cancels
it outright.

Tapping a creature shoots it rather than swatting it. Both are `<button>`s so
the reticle can lock on, and both are named as exceptions in the gun's
`allowed` check, so a press on one fires a bolt *at* it like any other press;
the bolt then has to actually reach it. Each also gets an invisible fourteen
pixels of hit area on a coarse pointer, because they are drawn at the size
they should look and that is well under what a thumb can reliably hit.

And the moth needed a different trigger. It is built around being approached
by a cursor, and a finger approaches nothing — so on touch the thing that
startles it is the *page moving*, which is what v2's birds did too and for the
same reason: something standing on a line is standing on nothing the moment
that line goes anywhere. Scroll past a moth and it goes.

The subject watches a tap as well as a hover, for the same reason: on a phone
a press is the only way anyone says *here*, and a head that ignores it is a
head that does nothing at all on half the devices this runs on.

Adding the second one meant generalising the gun. `quarry.hit` used to be a
single slot a creature claimed on mount, which works for exactly one creature:
the second to mount silently replaces the first and only one of them is ever
shootable. It is `quarry.creatures`, a `Set`, now — each creature registers
`{ at, hit }` and removes itself on unmount, and the gun walks the set without
knowing what is in it, exactly as it never knew before.

**Firing at nothing costs a point now.** `STOP` is not only a lamp — it is
telling you the range is empty, and pulling the trigger anyway is the one
thing on this page the reticle actively warns against. `MechLaser.tsx` asks
the same question `Alarm` asks every frame — is anything in `quarry.creatures`
currently `.at()` — at the moment a shot actually leaves the muzzle, and
`kills.miss()` takes one back if the answer is no. Judged at the trigger, not
at where the bolt lands: a shot fired at empty black is a shot fired at empty
black whether or not it happens to cross paths with the subject on its way
there, so a hit on the model itself does not save a shot taken while `STOP`
was lit. Floored at zero rather than run negative — `kills.miss()` on an
empty tally is a no-op, because the display was never built to show a number
below the one that hides it.

**The tally** (`kills.ts`) counts what has come down, across every screen and
across a reload. It cannot be React state on a screen: `V3.tsx` swaps `Home`,
`Browse` and `Mech` as siblings and unmounts whichever you are leaving, so a
count kept on one of them resets at exactly the moment that matters. So it is
`localStorage`-backed, read through `useSyncExternalStore` — the hook the
label-pin store already uses — with the count cached in the module because
`snapshot` has to be referentially stable between changes or that hook loops
forever. It renders as one more digit readout on the instrument panel, and not
at all at zero, because a counter saying nothing has happened is a counter
advertising a feature.

It is docked at the **top of the frame** now, above the warning pair, with no
"downed" label beside the number any more — the count is the whole reading,
next to `SHOOT` / `STOP` rather than filed away with the contact address at
the bottom of the page. It used to sit at the left end of the footer, on the
same baseline as the contact address, which put "what you have shot" a whole
screen away from the reticle that does the shooting, and before that it was
its own absolutely positioned box pinned to the bottom right, an inch above
that same address. `Tally` is still mounted in the footer's markup — on every
screen, not just home — but `.mech-tally` takes it out of that flex line with
`position: fixed`, centred, so it reads next to the thing it is counting
regardless of where the footer itself sits at any width.

### The tour

Someone opened the page and did not know there was anything to do. The rail of
work is pressable, the range is shootable, the reticle is a real reticle — and
none of it says so. `Tour.tsx` (`Tour.css`, and `tourState.ts` for the flags)
says so once, the same way the subject's leaders do: a dot lands on a thing, a
line draws out to a word at a slight lean — not a plain perpendicular tick —
the word folds in a glyph at a time, it holds a breath, and it folds out. One
label at a time, the sequence runs itself, and **the whole layer is
`pointer-events: none`** — a visitor is never boxed in, and if they ignore it
and start pressing things, that was the idea. Warm, like the reticle and the
bird: this is the pointer's colour, not the machine's. The first version of
this dimmed the screen and put a card with a Next button over a spotlit hole;
it was a modal in an interface that has no other modals, and it read wrong.

**Two runs, one per screen kind, wide only.** `home` points at the rail of
work (`.mech-work-rail`) and then at the range (`.mech-alarm`); `project`
points at the write-up (`.mech-folds`) and then at the media strip
(`.mech-rail-wrap`). A phone gets neither — the screen is already tight and
the boot and the shooting are there to be found. Each label is a
`{ target, label }` in `STEPS`; one whose target is missing or collapsed when
the run starts is dropped (the `useState` initialiser filters on
`getBoundingClientRect`), so a locked project with no folds and no strip gets
a shorter run or none — an empty run marks itself seen and ends.

**Once per browser.** `tourSeen` / `markTourSeen` in `tourState.ts` keep a
`done` flag per run in `localStorage`, next to `v3.kills.v1`. `Mech.tsx` starts
each run **four seconds** after the boot (`!booting` / `phase === 'in'`), well
clear of the opening animations, behind a `useRef` latch, the flag, and
`!narrow`. `tour` is the live run and is cleared on every navigation
(`[shownId]`) so a run never outlives its screen. The `?` key in the
bottom-right corner (`.mech-tour-key`, off during the boot and on a phone)
clears the flag for the screen you are on and starts that run again —
`replayTour` bumps a signal `Mech.tsx` watches.

**It is portalled to `body`,** above the readout (z 900) and below the dev
panel, with its own colours. `Tour` picks the target edge with the most room,
puts the mark on it, and computes the anchor a short way out *and* along the
edge so the connector runs at an angle; the line is one `<span>` rotated by
that angle with `scaleX` for the draw-in, and the chip's word is split to one
`<span>` per glyph, each folded flat and swung up on a staggered delay
(reversed on the way out). One effect on `[i]` drives a label's whole life:
arm `enter`, wait for the target's rect to arrive (everything is mounted
folded and only unfolds then — flipping to `show` early was the pop in the
first cut), `show`, hold, `leave`, hand over. It was briefly split so that
`hold → leave → next` sat in its own `vis`-keyed effect, and the advance
timer got torn down the instant `vis` flipped to `leave` — the run stuck on
label one. A separate rAF loop follows the current target's rect, because a
per-label follow was torn down by `Mech`'s re-renders before its frame landed.

**Home's second label shoots for you, with the real gun.** `Demo` in
`Tour.tsx` flies a bird across the window at a steady pace under its own frame
loop and registers it with `quarry` like any other creature. A third of the
way across it dispatches a real `pointerdown` on `.mech` — not at the bird but
*ahead* of it, where the bird will be once a bolt from the muzzle arrives
(same flight-time easing `MechLaser` uses) — so `MechLaser` fires *its* bolt
and *its* hit test catches the bird in the air. The bolt that kills it is the
one the visitor would fire, not a lookalike drawn here; `kills.add()` /
`sound.hit()` run from the creature's `hit`, exactly as `MechBird` does it,
and the tally ticks over while the "shoot anything" label is up. A 0.55s
backstop drops the bird regardless, so a near-miss on the hit test still lands
the demonstration.

### Nothing stutters on a swap

Four things were doing work at the exact moment the frame changed, which is the
one moment there is none to spare:

- **The subject was being taken down and rebuilt.** Stepping to a still
  unmounted the Canvas, and coming back built a WebGL context, compiled its
  shaders, cloned the scene graph and generated an environment map again. It is
  now mounted for as long as the project has a model and *stopped* while a
  still is up — `frameloop="never"`, which costs nothing per frame and keeps
  all of it warm.
- **The pictures were being decoded.** Several are multi-megabyte webp, and
  `load` only means the bytes arrived. The cover now waits on `decode()`, and
  the frames either side of the one on the stage are fetched and decoded on an
  idle callback, so stepping to one is a paint and not a decode.
- **Nothing started loading until the cover finished.** The frame is mounted at
  full cover, a third of a second after the tile was pressed — a third of a
  second the picture could have spent arriving. `warm` now runs the moment the
  tile is picked, and it warms clips as well as stills: a clip is several
  megabytes and the housing waits on `loadeddata` before it uncovers, which is
  what was left of the pause between one picture and the next.
- **The title was re-rendering the screen per character.** `Typed` wrote
  through React state, so the rail, the folds and the leaders all reconciled
  forty times a second during the one beat that is meant to read as a machine
  coming up. It writes to its node now, and touches state once, at the end, to
  put the caret out.
- **The dissolve grid was being rebuilt.** Grid shapes are rounded to six cells
  before anything is built, so most of a project's frames share one grid and
  swapping between them touches no DOM at all; the shapes a project does need
  are worked out on an idle callback while the machine is still booting. And
  the grid is a quarter the size it was — see **Disintegration**, which is
  where the measurements are.
- **Everything on the screen was re-rendering three times a swap.** The project
  screen re-renders on each phase, and the dashboard, the reticle, the bird,
  the gun and the deck went with it every time despite taking no props and
  caring about none of it. They are memoised.
- **Hovering a tile now starts its fetch.** It is the earliest honest signal
  that a frame is about to be wanted, and it is a few hundred milliseconds of
  head start for nothing.

### Nothing shows a master

The stills in `src/assets/<project>/` are camera and render output: 2316×3088,
3024×4032, several megabytes each. The stage they land on is 780×730 frame
pixels — about 1600 device pixels on a retina display at the frame's widest —
and the rail tile beside it is sixty-eight.

Measured in Chrome, one 2316×3088 webp costs **~256ms to fetch and ~144ms to
decode**, and the decode is on the main thread. A dozen rail tiles each
decoding a twelve-megapixel photograph to draw it at seventy pixels is most of
what opening a project used to cost. That was the pause between one picture and
the next, and no amount of prefetching fixes a decode that big — it only moves
it.

So `scripts/stills.mjs` builds two copies of every still:

| | Long edge | What uses it |
|---|---|---|
| `src/assets/stills/` | 1600 | The stage, the wall, the index screen |
| `src/assets/thumbs/` | 400 | The rail tiles and the timeline squares |

They arrive as `MediaItem.still` and `MediaItem.thumb`, both falling back to
`src` if the script has not been run. **Nothing that displays an image should
read `src`.** The script uses `sips`, which is in macOS and reads webp — it
cannot write webp, so the output is jpeg, the same as `posters.sh`, and at
these sizes the difference is tens of kilobytes. Rerunning it only rebuilds
what is missing or older than its master.

### Sound

**The deck is a green pill.** One song on loop, so there is nothing to choose:
the track list, the volume slider, the skip buttons, the level meter and the
narrow sheet are all gone. What is left is the track's name in Audiowide (the
display face `INTRO` and the role reel use) over "Tarlok Singh" in Clash
Display Light, and a play / pause triangle — `clip-path` for the wedge, a pair
of gradients for the two bars. Green, not the warm channel the old strip used:
it is a readout, not a warning. `<audio loop>`. On wide it is docked top-right
between the header and the rail; on a phone it floats fixed at the bottom of
the window — where the compass sits on wide, which a phone does not draw — so
the song is reachable there too. Geometry is the Figma frame's, in `--px`.

**One scale for the three things that make noise, and a panel to set it.**
`levels` in `sound.ts` is a small persisted store — music, effects, clip — read
by the deck (`<audio>` volume), by `audio()` (the effects master gain, live)
and by every clip (`<video>` volume, live via `levels.subscribe`). The synth
effects start at `0.6` and lead — the boot sweep and every crack after it are
the page's punctuation and were being lost under the loop at the old `0.3` —
the music sits at half of that, `0.3`, and a clip's own audio track at `0.72`,
tamed off the raw `1.0` a `<video>` plays at. The `localStorage` key is
`v3.levels.v2`; the bump is what lets a browser that stored the old balance
under `v1` pick the new default up.

**The music wants to be on.** `wantPlay` in `MechDeck.tsx` starts false only
because a browser will not let audio play before the first interaction — an
effect catches that first `pointerdown` or `keydown` anywhere on the page (the
deck's own pill excepted, since pressing it is already a choice) and sets it.
From then on the pill is a normal toggle. There is no autoplay attribute doing
this and there cannot be; it is a deferred start, not a played-on-load.

**A clip and the music are never heard together.** Not a duck — the deck
stops, but on a ramp: a reconcile effect eases the `<audio>` element's own
`volume` to zero over half a second and *then* pauses it, and eases it back up
from zero when the clip ends, so a clip with sound coming up does not chop the
song off mid-bar. It plays only when `wantPlay` is set *and*
`levels.clipAudible()` is false. `claimAudio()` is ref-counted (several clips,
one hold), `Flat` in `Mech.tsx` and `Video` in `Stage.tsx` each hold one while
they are audible, and every hold and release runs the reconcile through
`levels.subscribe`. A paused `<audio>` keeps its `currentTime`, so the song
resumes where it left off; the pill keeps showing pause throughout, because the
visitor never asked it to stop. A silent screen capture, which is most of them,
never touches any of this.

The panel is the three-bar toggle next to the deck pill (`MechDeck.tsx`,
`.mech-deck-mix` in `Mech.css`) — three sliders and a Reset, `v3.levels.v2` in
`localStorage`. **Wide only** (`useNarrow()` in `MechDeck`): the sliders want a
pointer and the panel wants room the phone layout has not got, and on a phone
the deck is one tap to start the song and one to stop it, nothing else. It is
the only audio control anywhere; there is no global mute (see below).


Everything is synthesised in `sound.ts` — oscillators, one noise buffer, a
filter. No files, so a hover tick is not a network request and every sound can
be tuned by reading it. Nothing plays before a gesture: browsers refuse, and
audio arriving unasked on someone's speakers at work is a hostile thing for a
page to do.

The reticle sounds on *acquiring* a target and not on losing one, which covers
every `a` and `button` on the page — anything that also ticked on its own hover
was firing the same event twice.

There is no on/off switch. There was one — `sound.toggle()`, a persisted
`v3.sound.v1` key — but nothing on the page ever called it, so the only way it
could flip was a stale scratchpad from an older build, and a browser that had
picked up `off` had no way back: every effect silently gone with no control to
restore it. The whole mechanism is deleted. The effects are on once the first
gesture has woken the context; the mute control on a clip is only ever that
clip's own audio track (see below).

### Adding music

Drop audio into **`src/assets/audio/`**. That is the whole procedure: `tracks.ts`
globs the folder, orders by filename and titles from it, and the deck picks it
up with no list to keep in sync. With the folder empty the deck reads
`audio — no signal`, which is a slot waiting for something rather than a feature
nobody knows exists.

---

### The deck has colour

Every readout on this panel is green. The deck was green too — which made the
one thing on the screen that is *actually reacting to something* look like the
compass, which is not reacting to anything.

So the meter is a spectrum: `--n` (set once, in markup) is where a bar sits
across the band and picks its hue between the panel's warm end and its green
end; `--v` (written every frame from that bar's own analyser bin) lights it.
The mix is in `oklab`, because interpolating orange to green through sRGB goes
via a muddy olive and through oklab it does not. The housing has a `--level`
of its own — the average of the band, one property write a frame — so the box
breathes with whatever is playing.

All three colours are the ones already defined on `.mech`: `--warn`, `--shot`,
`--accent`. This is the palette turned up, not a new one. And none of it is
canned: at silence the meter is dark, because the numbers it draws are the
numbers coming out of the `AnalyserNode`.

### Comms

The way to reach anybody was "designed by Tarlok Singh" in grey in the corner,
which is a credit line and not a contact. Same address and the same `mailto:`
— this is a static site and a contact *form* would need a backend nobody asked
for — given the shape every other readout here has: a strip naming what it is,
and the value beside it.

**It is one line on a phone as well.** It was stacked and centred for a while,
on the argument that two things at opposite ends of a 390-point line are two
things nowhere near each other. What that produced was a centred block, which
is a sign-off — every other layout of this page ends in a machine's footer with
its two corners occupied, and the phone had no reason to be the one that
doesn't. What made the row fit is the size and only the size: both halves are
boxed in `ch` against their own character counts (see `.mech-comms-to`), so the
pair costs exactly 46 monospace advances and no amount of layout can shrink it.
At the wide layout's 11 units that is wider than a small phone; at 8.5 the two
ends clear each other on a 320-point window, and it prints at very nearly the
size the wide footer already does — `--type` has bottomed out on its rem floor
by then either way.

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
`sections` and `hero` to promote either to a full study. `visa` also sets
`locked: true` — an NDA rather than an unwritten study — which is what puts the
lock and the *not yet disclosable* wording on its v3 card (see **Home is the
project screen**).

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

**`=== 'Plane'`, not `/^plane/i`.** That strip was a prefix test, and it is a
trap the moment a second export arrives, because Blender names the backdrop
`Plane` and then names the *next* eleven things `Plane.001`, `Plane.003`,
`Plane_Material.001_0`. The revolver has three of those and every one is a real
part of the gun: under the prefix test the grip panels and the trigger guard
did not render, on a model that otherwise loaded, lit and framed correctly —
which reads as a bad export rather than as a filter in our own code.

### Three new subjects, and what each one cost

**Wyte Card became the fourth.** `wyte-card.glb` (3 KB, Draco — a card mesh and
a backdrop `Plane` the loader hides by exact name) replaces the `WyteCard`
primitive; `src/three/WyteCard.tsx` stays for the v2 gallery. Same
height-normalisation trap as the guns — a flat card at a face's `fill` is as
tall as the stage — so `MODEL_RIGS['wyte-card']` ships as a starter (`fill:
0.4`, `lean: 0`) to be set by eye. The frame id is `wyte-card/model` now.


`rdr2-revolver.glb`, `gta-v-rifle.glb` and `iphone-17-pro-max.glb` are
Sketchfab exports rather than things modelled here, and none of them is
Draco-compressed or WebP-textured the way the Blender exports are — 3.1MB,
8.0MB and 5.3MB as they arrived. The rifle is the one worth revisiting if the
bundle ever matters; it is 83k vertices of an object that is never seen closer
than a third of the screen.

- **Two guns replaced one disc case, used twice.** Red Dead Redemption 2 and
  Grand Theft Auto V both stood on the same `DiscHolder`, so two of the twelve
  slots on home were the identical object two rows apart with a different name
  under each. `model.ts` had been carrying them as `PENDING_MODELS` under
  exactly these filenames, with a note saying a `MODELS` entry pointing at a
  file that is not there suspends `useGLTF` forever; the files are in and the
  entries moved up, and that was the whole of it.
- **Which axis a gun was exported down is not a thing you can see.** The
  revolver is along its own X and the rifle along its own Z, so at `turn: 0`
  one arrives side-on and the other arrives pointing at you — and a rifle seen
  down its own barrel does not read as a rifle, it reads as a muzzle. Measure
  the world box rather than reason about the render: 4.73 × 1.85 × 0.58 against
  0.015 × 0.052 × 0.184. There is also no third rotation axis on the Subject
  panel, and there did not need to be: `Euler(tilt, turn, 0)` composes as
  `Rx · Ry`, which can only swing a **+Y**-aligned model into the YZ plane, and
  neither of these is Y-aligned.
- **A handset that is a handset.** Plus One's piece was `Phone3D`, a rounded
  box with a video plane a millimetre off its front. It is an iPhone 17 Pro Max
  now, with the app running on the glass — `Phone17.tsx`. The screen is one
  mesh and the export's names are all obfuscated (`HkNSnYzBPABcqwM.001`,
  `BsXHDwLKqtDOfrW`), so it is found by what it *is*: the only perfectly planar
  mesh in the file carrying `emissiveFactor: [1, 1, 1]`, sized 7.28 × 15.77,
  which is 19.5:9 to four decimal places. Its UVs run 0 → 1 across the panel,
  so the clip needs no fitting at all.

**And the Plus One capture is squeezed on purpose.** It is 1190 × 1080 — a
1.1:1 frame holding a portrait app UI, because the recording was scaled
sideways on the way out rather than letterboxed. Stretched back across the
0.4617 screen it comes out at exactly the proportions it was shot at. Anyone
who "fixes" that aspect will letterbox a phone screen or crop the tab bar off
it; the pixels are non-square and the screen is what squares them.

**Three Takahashi exports exist and only one is current.** `adam-face.glb`
(2.3MB, no textures) is what both v2 and v3 render — same face, the filename it
was modelled under. `mr-takahashi.glb` (555KB) is an older export with baked
clips and a backdrop plane, still referenced by `src/archive/` and nothing else.
A third, textured at 21MB, exists outside the repo and is not worth its weight:
it carries the same morph targets as the one an order of magnitude smaller.

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
