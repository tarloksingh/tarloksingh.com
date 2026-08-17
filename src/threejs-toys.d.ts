/* `threejs-toys` ships no types and no `main` — its package.json declares only
   `module`, which Vite resolves and TypeScript does not. This is the shape of
   the one toy the site uses, written against the source of v0.0.7.

   Only the parts `flock.ts` actually touches are typed. The uniforms are the
   live objects the GPGPU shaders read every step, so writing to `.value` is
   how the flock is steered — that is the whole API for the exodus. */
declare module 'threejs-toys' {
  import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

  interface Uniform {
    value: number
  }

  interface ButterfliesConfig {
    el?: HTMLElement
    canvas?: HTMLCanvasElement
    /** Where OrbitControls and the pointer listen. */
    eventsEl?: HTMLElement
    resize?: boolean | 'window'
    /** Butterflies are `gpgpuSize²` — one per texel of the simulation. */
    gpgpuSize?: number
    /** Scene clear colour; `undefined` leaves the canvas transparent. */
    background?: number
    material?: 'basic' | 'phong' | 'standard'
    materialParams?: Record<string, unknown>
    /** URL of the wing strip: `textureCount` frames side by side. */
    texture?: string
    textureCount?: number
    wingsScale?: [number, number, number]
    wingsWidthSegments?: number
    wingsHeightSegments?: number
    wingsSpeed?: number
    wingsDisplacementScale?: number
    noiseCoordScale?: number
    noiseTimeCoef?: number
    noiseIntensity?: number
    attractionRadius1?: number
    attractionRadius2?: number
    maxVelocity?: number
  }

  interface ButterfliesHandle {
    three: {
      renderer: WebGLRenderer
      camera: PerspectiveCamera
      scene: Scene
    }
    uniforms: {
      uMaxVelocity: Uniform
      uNoiseIntensity: Uniform
      uWingsSpeed: Uniform
      uAttractionRadius1: Uniform
      uAttractionRadius2: Uniform
    }
  }

  export function butterfliesBackground(config: ButterfliesConfig): ButterfliesHandle
}
