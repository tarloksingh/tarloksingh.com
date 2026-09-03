# Archive

Nothing in here is mounted. It is all working, finished code that the current
site does not use — kept because it took real effort to build and any of it
could come back.

It is still typechecked (`tsc -b` covers `src/`), and every relative import was
rewritten when it moved, so a file here still compiles against the live tree.
That is the point: this is a shelf, not a bin. If something in `src/` is
renamed and breaks an import in here, fix it rather than deleting the file.

## The ribbon

**`components/ProductRing.tsx`** — the piece worth protecting.

A band of type standing up around a product, projected by hand in JS rather
than handed to CSS 3D. Before it closes it is a *banner*: the same per-glyph
engine printed on a strip of film leader — black stock, sprocket notches
punched top and bottom, the name set pale in the rebate, an ink wash across —
hanging between the two edges of the screen, sagging under its own weight and
moving in wind built from two beating waves plus a finer ripple. Clicking cuts
it where you clicked; the cut ends swing down about their supports under
gravity and the same glyphs are then drawn up into the ring.

The whole opening is one continuous run of type. Four things hold that
together, and undoing any of them breaks it into two events:

- The slot count is fixed, so the glyphs are the *same DOM elements* before and
  after and the text changes on them mid-flight.
- Nothing leaves the screen.
- Every position is one blend — `banner → ring` is a single lerp per glyph.
- The animation clock lives outside the draw effect, which re-runs when the
  glyph characters change.

To bring it back: mount `<ProductRing />` and copy the `.ch-ring*` rules out of
`components/CapsuleHome.css`. Its full behaviour is documented at length in the
repository `README.md` under **The name ring** and **The product page**.

## Everything else

| Path | What it is |
|---|---|
| `components/CapsuleHome.tsx` `.css` | The product-on-a-stage home page the ribbon sealed. Superseded by `src/site/`. |
| `components/Home.tsx` | The earlier shuffling card-cluster home page. |
| `components/LightRays.tsx` `.css` | A WebGL (ogl) volumetric light-ray backdrop. |
| `components/OptionWheel.tsx` `.css` | The scroll-driven radial menu. |
| `components/WorkScene.tsx` | The scene that hosted the wheel over the light rays. |
| `components/Timeline/` | Scrubber, era heading and detail panel for the career-timeline concept. |
| `three/DoorScene.tsx` + `Door*` | A medieval door you walked through, with volumetric mist. |
| `three/DanceFloorScene.tsx` | The dance floor with the crowd glTFs under `public/models/dance/`. |
| `three/EraGroup.tsx` `EraObjectItem.tsx` | The timeline's ring of small 3D objects. |
| `three/CameraRig.tsx` `SceneBackground.tsx` | Helpers for the scenes above. |
| `hooks/useGravityDrop.ts` | matter-js drop-in for the intro's choice buttons. |
| `hooks/useScrollTimeline.ts` | Scroll → normalised timeline progress. |
| `animations/crawlOut.ts` `utils/animations.ts` | GSAP choreography for the old three-scene track. |
| `data/eras.ts` | The career timeline's era/object content. |
| `data/work.ts` `data/projectMedia.ts` | The old project list and asset resolver. Replaced by `src/data/projects.ts` and `src/data/media.ts`, which carry far more. |

The small 3D objects those scenes posed — `src/three/objects/` and
`src/three/Clay.tsx` — stayed in the live tree. The new site still uses them.
