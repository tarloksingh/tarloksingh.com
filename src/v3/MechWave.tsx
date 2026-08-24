import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide } from 'three'
import type { ShaderMaterial } from 'three'
import type { CastWave } from './castTuning'

/* The ground the cast stands over: a displaced grid running back to a
   horizon, moving.

   This started as a stock AVIF of a purple wave laid behind the page with
   `mix-blend-mode: screen`, which was fine for about a minute and then
   obviously wrong for two reasons. It was a *picture of* depth pasted behind
   things that have real depth, so nothing on the stage related to it — move a
   subject back and it slid across a flat backdrop. And it could not move,
   which on a page where everything else breathes made it the one dead layer
   on the screen.

   So it is geometry, in the cast's own canvas and therefore in the cast's own
   space: one plane, 200×200 vertices, displaced in a vertex shader and lit by
   nothing. The subjects stand in front of it because they are actually in
   front of it.

   **The lines are drawn in the fragment shader, not built out of geometry.**
   `wireframe: true` on a triangulated plane draws the diagonals too, which
   reads as a net rather than as a grid, and a real `LineSegments` grid at
   this density is forty thousand segments to upload and re-upload. A grid
   measured off the interpolated UV costs nothing, stays exactly one pixel
   wide at any distance (that is what `fwidth` is doing — the derivative of
   the UV per pixel, which is how thick one cell's line has to be to look
   constant), and can brighten its own intersections into nodes for free.

   Additive, depth-write off, and drawn first. It never occludes a subject and
   never fights one for the depth buffer — it is a light source in the
   composition, not an object in it. */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uScale;
  uniform float uSpeed;

  varying vec2 vUv;
  varying float vElev;
  varying float vDist;

  /* Four sines at incommensurable rates and directions. Not noise: noise
     wants to look like terrain, and this wants to look like a signal —
     something generated rather than somewhere real. The frequencies do not
     share a common factor, so the surface never repeats a pose. */
  float wave(vec2 p, float t) {
    float h = 0.0;
    h += sin(p.x * 0.90 + t * 0.70) * 0.55;
    h += sin(p.y * 0.70 - t * 0.50) * 0.45;
    h += sin((p.x + p.y) * 0.45 + t * 0.90) * 0.30;
    h += sin((p.x - p.y) * 1.30 - t * 1.10) * 0.14;
    return h;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float t = uTime * uSpeed;
    /* The plane is authored in XY and rotated flat by the mesh, so its own
       +Z is the world's up. Displacing local Z is displacing height. */
    float h = wave(pos.xy * uScale, t);
    pos.z += h * uAmp;
    vElev = h;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform float uOpacity;
  uniform float uCells;
  uniform float uFade;

  varying vec2 vUv;
  varying float vElev;
  varying float vDist;

  void main() {
    vec2 g = vUv * uCells;

    /* Distance to the nearest cell edge, in pixels. Dividing by fwidth --
       the derivative of the UV per pixel -- is what keeps the line one pixel
       wide whether the cell is filling the screen or a speck on the horizon.
       Without it the far half of the field is a solid sheet of aliased
       white. */
    vec2 grid = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    float node = (1.0 - min(grid.x, 1.0)) * (1.0 - min(grid.y, 1.0));

    /* Off at both ends: in close it would cut across the readout, and far off
       it has to reach nothing rather than stopping at a visible edge. */
    float near = smoothstep(2.0, 9.0, vDist);
    /* Cubed, so the field thins out gradually across most of its length
       instead of running at full strength and then stopping. A linear ramp
       put a visible bright band exactly where the surface goes edge-on to the
       camera, which is the one place a horizon must not have an edge. */
    float far = 1.0 - smoothstep(uFade * 0.25, uFade, vDist);
    float fade = near * far * far;

    vec3 tint = mix(uLow, uHigh, clamp(vElev * 0.5 + 0.5, 0.0, 1.0));
    float alpha = (line * 0.72 + node * 0.95) * fade * uOpacity;
    if (alpha < 0.004) discard;

    // Crests and intersections run hotter, so the surface reads as lit from
    // inside rather than as a flat sheet of one colour.
    gl_FragColor = vec4(tint * (0.55 + node * 0.85 + max(vElev, 0.0) * 0.5), alpha);
  }
`

export default function MechWave({ wave }: { wave: CastWave }) {
  const material = useRef<ShaderMaterial>(null)

  /* Built once. Recreating the uniform object every render would hand the
     material a new object each frame and force a shader recompile, which is
     the sort of thing that only shows up as the page quietly dropping to
     fifteen frames a second. */
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: wave.amp },
      uScale: { value: wave.scale },
      uSpeed: { value: wave.speed },
      uOpacity: { value: wave.opacity },
      uCells: { value: wave.cells },
      uFade: { value: wave.fade },
      uLow: { value: new Color(wave.low) },
      uHigh: { value: new Color(wave.high) }
    }),
    // Seeded once on purpose; everything below keeps them current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((_, delta) => {
    const shader = material.current
    if (!shader) return
    const u = shader.uniforms
    u.uTime.value += delta
    // Written every frame rather than through React, so dragging a slider on
    // the panel moves the surface without re-rendering the whole cast.
    u.uAmp.value = wave.amp
    u.uScale.value = wave.scale
    u.uSpeed.value = wave.speed
    u.uOpacity.value = wave.opacity
    u.uCells.value = wave.cells
    u.uFade.value = wave.fade
    ;(u.uLow.value as Color).set(wave.low)
    ;(u.uHigh.value as Color).set(wave.high)
  })

  if (!wave.on) return null

  return (
    <mesh
      // Flat, below the cast, and running away from the camera.
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, wave.y, -wave.depth]}
      // Before everything, and it writes no depth — so it can never occlude a
      // subject however far forward hover brings one.
      renderOrder={-1}
      frustumCulled={false}
    >
      <planeGeometry args={[wave.size, wave.size, wave.segments, wave.segments]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}
