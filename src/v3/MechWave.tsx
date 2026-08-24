import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide } from 'three'
import type { ShaderMaterial } from 'three'
import { CAST_STUDIO, type CastStudio, type CastWave } from './castTuning'

/* The ground the cast stands over: a displaced grid running back to a
   horizon, moving.

   This started as a stock AVIF laid behind the page with `mix-blend-mode:
   screen`, which was wrong in two ways. It was a *picture of* depth pasted
   behind things that have real depth, so nothing on the stage stood in any
   relation to it. And it could not move, which on a page where the brackets
   breathe and the compass drifts made it the one dead layer on screen.

   So it is geometry: one plane, 200x200 vertices, displaced in a vertex
   shader and lit by nothing. Four sines at incommensurable rates rather than
   noise — noise wants to look like terrain, and this wants to look like a
   signal, something generated rather than somewhere real.

   **Its own canvas, at the size of the window.** It lived inside the cast's
   canvas first, which put it inside `.mech-frame` — and that frame is a 16:9
   column, because `--px` takes the smaller of a width term and a height term.
   On any window wider than 16:9 the wave stopped in mid-air at the letterbox
   while the phosphor grid behind it ran to the edges. A horizon with a
   vertical cut down each side is not a horizon.

   It cannot both share the cast's canvas and be full-bleed: that canvas is
   where the subjects are placed, and widening it would move every one of
   them. So this is a second context, which it can afford to be — no lights,
   no environment map, no raycasting, one mesh, one material, and half the
   pixels (`dpr={1}`).

   It stays glued to the cast because it is handed the same lens: same focal
   length, same camera height, same distance. The vertical framing is
   therefore identical and the horizon lands on exactly the scanline it would
   have landed on inside the frame. Only the sideways extent differs, which is
   the entire point of moving it out.

   **The lines are drawn in the fragment shader, not built out of geometry.**
   `wireframe: true` on a triangulated plane draws the diagonals too, which
   reads as a net rather than a grid, and a real `LineSegments` grid at this
   density is forty thousand segments to upload. A grid measured off the
   interpolated UV costs nothing and brightens its own intersections into
   nodes for free.

   Additive and depth-writing nothing: it is a light source in the
   composition, not an object in it. */

const fovForFocalLength = (mm: number) => (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI

const distanceFor = (focalLength: number, fill: number) =>
  1 / fill / (2 * Math.tan((fovForFocalLength(focalLength) * Math.PI) / 360))

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uScale;
  uniform float uSpeed;

  varying vec2 vUv;
  varying float vElev;
  varying float vDist;

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
  uniform vec3 uMid;
  uniform vec3 uHigh;
  uniform float uOpacity;
  uniform float uGain;
  uniform float uGlow;
  uniform float uHue;
  uniform float uHueSpeed;
  uniform float uCells;
  uniform float uFade;
  uniform float uTime;

  varying vec2 vUv;
  varying float vElev;
  varying float vDist;

  /* Rotates a colour that has already been chosen rather than generating one,
     so a spread of zero leaves exactly the three colours set on the panel and
     turning it up fans those across the field — instead of replacing them
     with a rainbow nobody picked. */
  vec3 hueShift(vec3 rgb, float angle) {
    const vec3 k = vec3(0.57735);
    float c = cos(angle);
    return rgb * c + cross(k, rgb) * sin(angle) + k * dot(k, rgb) * (1.0 - c);
  }

  void main() {
    vec2 g = vUv * uCells;

    /* Distance to the nearest cell edge, in pixels. Dividing by fwidth --
       the derivative of the UV per pixel -- is what keeps the line one pixel
       wide whether the cell fills the screen or is a speck on the horizon.
       Without it the far half of the field is a sheet of aliased white. */
    vec2 grid = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    float node = (1.0 - min(grid.x, 1.0)) * (1.0 - min(grid.y, 1.0));

    /* Off at both ends: in close it would cut across the readout, and far off
       it has to reach nothing rather than stopping at a visible edge. Squared,
       so the field thins across most of its length instead of running at full
       strength and then banding where the surface goes edge-on. */
    float near = smoothstep(2.0, 9.0, vDist);
    float far = 1.0 - smoothstep(uFade * 0.25, uFade, vDist);
    float fade = near * far * far;

    // Three stops, not two — otherwise every mid-height reads as a muddy
    // blend of the two ends and the field has one colour in practice.
    float h = clamp(vElev * 0.5 + 0.5, 0.0, 1.0);
    vec3 tint = h < 0.5 ? mix(uLow, uMid, h * 2.0) : mix(uMid, uHigh, (h - 0.5) * 2.0);

    // Fanned across the field and drifting, so the colour is somewhere rather
    // than uniform.
    tint = hueShift(tint, (vUv.x - 0.5) * uHue + uTime * uHueSpeed);

    float alpha = (line * 0.72 + node * 0.95) * fade * uOpacity;
    if (alpha < 0.004) discard;

    // Crests and intersections run hotter, so the surface reads as lit from
    // inside rather than as a flat sheet of one colour.
    float hot = 0.55 + (node * 0.85 + max(vElev, 0.0) * 0.5) * uGlow;
    gl_FragColor = vec4(tint * hot * uGain, alpha);
  }
`

function Surface({ wave }: { wave: CastWave }) {
  const material = useRef<ShaderMaterial>(null)

  /* Built once. Recreating the uniform object every render would hand the
     material a new object each frame and force a shader recompile, which only
     ever shows up as the page quietly dropping to fifteen frames a second. */
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: wave.amp },
      uScale: { value: wave.scale },
      uSpeed: { value: wave.speed },
      uOpacity: { value: wave.opacity },
      uGain: { value: wave.gain },
      uGlow: { value: wave.glow },
      uHue: { value: wave.hue },
      uHueSpeed: { value: wave.hueSpeed },
      uCells: { value: wave.cells },
      uFade: { value: wave.fade },
      uLow: { value: new Color(wave.low) },
      uMid: { value: new Color(wave.mid) },
      uHigh: { value: new Color(wave.high) }
    }),
    // Seeded once on purpose; the frame loop below keeps them current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((_, delta) => {
    const shader = material.current
    if (!shader) return
    const u = shader.uniforms
    u.uTime.value += delta
    // Written straight to the uniforms rather than through React, so dragging
    // a slider moves the surface without re-rendering anything.
    u.uAmp.value = wave.amp
    u.uScale.value = wave.scale
    u.uSpeed.value = wave.speed
    u.uOpacity.value = wave.opacity
    u.uGain.value = wave.gain
    u.uGlow.value = wave.glow
    u.uHue.value = (wave.hue * Math.PI) / 180
    u.uHueSpeed.value = (wave.hueSpeed * Math.PI) / 180
    u.uCells.value = wave.cells
    u.uFade.value = wave.fade
    ;(u.uLow.value as Color).set(wave.low)
    ;(u.uMid.value as Color).set(wave.mid)
    ;(u.uHigh.value as Color).set(wave.high)
  })

  return (
    <mesh
      // Flat, below the cast, and running away from the camera.
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, wave.y, -wave.depth]}
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

interface Props {
  wave: CastWave
  /** The cast's lens, so this one can be identical and the horizon lands
   *  where it would have inside the frame. */
  studio?: CastStudio
  live?: boolean
}

export default function MechWave({ wave, studio = CAST_STUDIO, live = true }: Props) {
  const distance = distanceFor(studio.focalLength, studio.fill)

  if (!wave.on) return null

  return (
    <Canvas
      /* One is plenty for a field of hairlines, and this covers the whole
         window — at 2 it is four times the pixels for the layer nobody looks
         straight at. */
      dpr={1}
      frameloop={live ? 'always' : 'never'}
      camera={{
        fov: fovForFocalLength(studio.focalLength),
        position: [0, 0, distance],
        near: 0.5,
        // Nothing shares this scene, so there is no depth fighting to lose by
        // reaching far enough to hold the whole field.
        far: distance + 200
      }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <Surface wave={wave} />
    </Canvas>
  )
}
