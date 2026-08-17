import { butterfliesBackground } from 'threejs-toys'

/* The butterflies, from Kevin Levron's `threejs-toys` — a GPGPU flock where
   every position, velocity and wing phase lives in a floating-point texture
   and is stepped on the GPU, which is the only way a screen holds nine
   thousand of them at 60fps.

   The toy is written to be an ambient background that mills about forever, so
   two things have to be arranged around it here.

   The first is that its canvas has to be transparent. `butterfliesBackground`
   builds its renderer internally and never passes `alpha`, so the drawing
   buffer would have no alpha channel and the canvas would composite as opaque
   black over the page. What it *does* accept is a canvas — and a canvas only
   ever has one context: `getContext` returns the one that already exists and
   ignores the attributes on every call after the first. Asking for the
   context ourselves, with alpha, before handing the canvas over is therefore
   enough. `hasAlpha` on the result reports whether it took.

   The second is that the flock has no notion of leaving. It has a pull toward
   the origin that keeps it gathered, a curl-noise field that makes it wander,
   and a speed limit. `setFlight` is the exodus written in those three terms:
   let go of the middle, turn the wind up, and lift the limit. Nothing is
   pushed in any particular direction — where each one goes is the noise's
   decision, which is why it comes out as a flock breaking up rather than as
   an explosion.

   The wing texture is a four-frame strip; the shader picks a column per
   instance with `uv.x = (mapIndex + vUv.x) / TEXTURE_COUNT`. Ours carries the
   silhouettes only — the four photographs it was cut from are in colour, and
   they are multiplied flat by `color` here, so the colour would be several
   hundred kilobytes of detail that never reaches a pixel. Rebuild it from
   `packages/toys/public/b1..b4.png` in klevron/threejs-toys if the design ever
   wants them in colour. */

/** How dark the wings are. Just under the ground they rest on, so the field
 *  has a grain to it before it moves, and reads as a silhouette once there is
 *  a lit page behind it. */
const WING_COLOUR = 0x161616

/* Resting, and fleeing. Everything in between is an interpolation.

   `wings` is not a wingbeat rate — the shader advances the wing phase by
   `|velocity| * wings` every step, so it is a rate *per unit travelled*. It
   therefore has to come down as the speed goes up or the beat outruns the
   frame rate and the wings alias into a blur. Resting: a slow breath, one
   cycle every three seconds or so. Fleeing: a hard beat, about a third of a
   radian a frame. */
const REST = { velocity: 0.02, noise: 0.0006, wings: 1.1, radius1: 100, radius2: 150 }
const FLEE = { velocity: 1.2, noise: 0.05, wings: 0.3, radius1: 9000, radius2: 12000 }

export interface Flock {
  /** 0 at rest, 1 fully scattered. Cheap enough to call every frame. */
  setFlight(k: number): void
  /** True if the canvas really did come back with an alpha channel. */
  hasAlpha: boolean
  dispose(): void
}

const mix = (a: number, b: number, k: number) => a + (b - a) * k

/**
 * Repairs the toy's fragment shader against a modern three.
 *
 * `threejs-toys` 0.0.7 was built for r140, where the map's texture coordinate
 * reached the fragment stage as `vUv`. r152 gave every texture slot its own
 * transformed varying and renamed that one `vMapUv`, so the strip-lookup the
 * toy splices in — `uv.x = (vMapIndex + vUv.x) / TEXTURE_COUNT` — no longer
 * compiles, the program is dropped, and not one butterfly is drawn.
 *
 * The rename is the entire incompatibility, and it is a rename, so it is
 * fixed by renaming: wrap the material's own `onBeforeCompile`, let it splice
 * its snippet in as usual, then rewrite that snippet's varying. Both
 * `replace` calls are no-ops against any shader that does not contain the
 * toy's exact text, so nothing else in the scene is at risk.
 *
 * Safe to run right after construction: `onBeforeCompile` is not called until
 * the first render, and that is a frame away.
 */
function fixMapVarying(scene: { traverse(fn: (object: object) => void): void }) {
  scene.traverse((object) => {
    const mesh = object as { isInstancedMesh?: boolean; material?: Record<string, unknown> }
    if (!mesh.isInstancedMesh || !mesh.material) return
    const material = mesh.material
    const original = material.onBeforeCompile as
      | ((shader: { vertexShader: string; fragmentShader: string }, renderer: unknown) => void)
      | undefined
    material.onBeforeCompile = function (
      shader: { vertexShader: string; fragmentShader: string },
      renderer: unknown
    ) {
      original?.call(this, shader, renderer)
      // Its snippet, and only its snippet. Matched on the literal text the toy
      // splices in rather than on anything about the surrounding shader: at
      // this point three has not expanded its `#include`s yet, so the file
      // cannot be inspected for which varyings it is going to declare.
      shader.fragmentShader = shader.fragmentShader
        .replace('vec2 uv = vUv;', 'vec2 uv = vMapUv;')
        .replace('(vMapIndex + vUv.x)', '(vMapIndex + vMapUv.x)')
    }
  })
}

export function createFlock(canvas: HTMLCanvasElement, texture: string): Flock {
  // Ours, before the library's — see the note above on why this is what makes
  // the canvas transparent.
  const gl =
    canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true }) ??
    canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true })

  const flock = butterfliesBackground({
    canvas,
    // OrbitControls is hard-wired on inside the toy and would otherwise let a
    // drag swing the camera through the middle of the entrance. Pointing it at
    // an element that is not in the document is the whole of the fix.
    eventsEl: document.createElement('div'),
    resize: 'window',
    // Smaller flock on a small screen: this is 96² butterflies at full size,
    // and a phone GPU has other things to do.
    gpgpuSize: typeof window !== 'undefined' && window.innerWidth < 900 ? 48 : 96,
    // No scene background — the dark is the veil behind this canvas, so that
    // the reveal has something it can take apart.
    background: undefined,
    material: 'basic',
    materialParams: { transparent: true, alphaTest: 0.5, color: WING_COLOUR },
    texture,
    textureCount: 4,
    wingsScale: [1, 1, 1],
    wingsWidthSegments: 8,
    wingsHeightSegments: 8,
    wingsSpeed: REST.wings,
    wingsDisplacementScale: 1.25,
    noiseCoordScale: 0.01,
    noiseTimeCoef: 0.0005,
    noiseIntensity: REST.noise,
    attractionRadius1: REST.radius1,
    attractionRadius2: REST.radius2,
    maxVelocity: REST.velocity
  })

  const { renderer } = flock.three
  renderer.setClearColor(0x000000, 0)
  fixMapVarying(flock.three.scene)

  const setFlight = (k: number) => {
    const t = k <= 0 ? 0 : k >= 1 ? 1 : k
    // Cubed, so the first moment after the click is a stir and the leaving is
    // something the flock works itself up to.
    const e = t * t * t
    const u = flock.uniforms
    u.uMaxVelocity.value = mix(REST.velocity, FLEE.velocity, e)
    u.uNoiseIntensity.value = mix(REST.noise, FLEE.noise, e)
    u.uWingsSpeed.value = mix(REST.wings, FLEE.wings, e)
    // Letting go of the middle is what turns a swarm into a departure; while
    // these are near the flock's own size everything is pulled back in.
    u.uAttractionRadius1.value = mix(REST.radius1, FLEE.radius1, e)
    u.uAttractionRadius2.value = mix(REST.radius2, FLEE.radius2, e)
  }

  setFlight(0)

  return {
    setFlight,
    hasAlpha: gl?.getContextAttributes()?.alpha === true,
    dispose() {
      renderer.dispose()
      renderer.forceContextLoss()
    }
  }
}
