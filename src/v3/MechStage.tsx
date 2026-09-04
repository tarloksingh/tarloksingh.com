import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, PMREMGenerator, SRGBColorSpace } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ModelStage } from './MechModel'
import { PieceStage } from './MechProduct'
import type { ModelTuning } from './modelTuning'
import type { PieceTuning, ProductTuning } from './productTuning'

/* ---- one canvas for the project stage ----

   The subject of a project screen — a model or a piece — drawn into a single
   WebGL context that outlives every project you open.

   **This file exists because opening a project used to rebuild the renderer.**
   `MechModel` and `MechProduct` each owned a `<Canvas>` of their own, keyed on
   the subject (`key={modelFrame.src}` / `key={pieceFrame.project}`), so moving
   from one project to the next unmounted one canvas and mounted another.
   Counted off the built page by wrapping `getContext`, `linkProgram`,
   `compileShader` and `getExtension('WEBGL_lose_context')` before any app code
   ran, every single navigation cost:

     open mr-takahashi          ctx=2 lose=1 link=19 shader=38
     open capsule-c1            ctx=1 lose=1 link= 7 shader=14
     open red-dead-redemption-2 ctx=1 lose=1 link=29 shader=58
     back home                  ctx=1 lose=2 link=10 shader=20

   One WebGL context created and one deliberately destroyed, every time, plus
   seven to fifty-eight shaders recompiled that had *already* been compiled in
   the context being thrown away. On top of that, three things the old note in
   `MechModel` correctly said cost "most of a hundred milliseconds" and then
   paid anyway on every move:

   - **`getContext` and the extension sweep.** three queries a few dozen
     extensions when a `WebGLRenderer` is constructed, synchronously, inside a
     React commit.
   - **The environment map.** `PMREMGenerator.fromScene` renders a cube and
     links its own shaders — 95ms of `getProgramInfoLog` in the profile — for a
     room that is identical for every subject on the site. It is `StageRoom`
     below now, built once per canvas.
   - **The face's morph-target texture.** three caches that in a `WeakMap` keyed
     on the geometry, so cloning the scene per project was already free; a new
     *renderer* is a new `WeakMap`, and it was 81ms of
     `WebGLMorphtargets.update` plus another 220ms of vertex reads to fill a
     texture that had not changed. This is why Mr. Takahashi was the worst
     project to open and why it looked like a model problem rather than a
     canvas one.

   So the canvas is hoisted here, `Mech.tsx` mounts it for the whole time you
   are on a project screen, and what changes between projects is the *scene*.
   `MechModel` exports `ModelStage` and `MechProduct` exports `PieceStage` —
   both of which are simply everything that used to be inside their canvas.

   **The `key` moved rather than went away.** The note it carried is still
   true: a subject that fails to frame — a gun exported down the wrong axis, a
   piece whose animation fights its `Resize` — should not be able to leave
   state behind for the next project to inherit. Keying the *scene* on the
   subject gives exactly that isolation and keeps the context, which is what
   the key was never meant to be paying for. */

/** Which subject the stage is drawing, and everything it needs to draw it.
 *  A discriminated union rather than two optional halves, because a project
 *  has a model or a piece and never both — see `model.ts`. */
export type StageSubject =
  | { kind: 'model'; src: string; tuning: ModelTuning; offset?: readonly [number, number] }
  | {
      kind: 'piece'
      project: string
      /** Omitted by the browse screen, which shows a piece at its shipped
       *  studio numbers rather than through the project screen's panel. */
      tuning?: ProductTuning
      piece: PieceTuning
      offset?: readonly [number, number]
      tilt?: number
    }

/** The room every subject on this site is lit by, built once per renderer.
 *
 *  Inside three rather than fetched, so the page still makes no third-party
 *  request for an HDRI. It was two identical copies of this — one in
 *  `MechModel`'s `Studio` and one in `MechProduct`'s — each regenerated on
 *  every project open. Same texture, same `0.04` blur, and now generated on
 *  the frame the stage first mounts and not again.
 *
 *  `scene.environment` and not a per-subject prop: the environment is a
 *  property of the scene and there is one scene in this canvas. How *brightly*
 *  it falls on a given subject is `environmentIntensity`, which is per-rig and
 *  stays in each scene's own `Studio`. */
function StageRoom() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = target.texture
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  return null
}

export default function MechStage({
  subject,
  live
}: {
  /** `null` while the project on screen has no 3D subject at all. The canvas
   *  stays up and stopped rather than unmounting, because a bare project
   *  between two solid ones would otherwise cost the whole rebuild above
   *  twice. An empty scene compiles nothing and `frameloop="never"` draws
   *  nothing, so what it holds is the context and the room. */
  subject: StageSubject | null
  /** Whether the subject is the thing on the stage right now. False while a
   *  still or a clip is up: no render, no `useFrame`, no morph writes, no GPU
   *  work — and the scene, the shaders and the room all stay put. */
  live: boolean
}) {
  return (
    <Canvas
      /* **A phone gets the same treatment as a desktop here, and it did
         not.** This canvas used to be capped at `dpr` 1.5 with `antialias`
         off on narrow, reasoned from the desktop intuition that a
         full-window multisampled canvas is the most expensive thing on the
         screen. Measured (`scripts/perf/canvas.mjs phone`) that came out at
         2.25 samples per CSS px² against the desktop's 16 — **seven times
         fewer** — and worse than under-sampled: at ratio 1.5 on a dpr-3
         screen every rendered pixel is magnified over four device pixels,
         which is why it read as crisp-jagged rather than soft.

         Two things make the original reasoning wrong for this canvas:

         - It is not full-window on a phone. `.mech-stage` down there is a
           390×410 box, small in fill and in memory, and it is the one thing
           on the screen being looked at.
         - MSAA is comparatively cheap on the tile-based GPUs handsets use —
           Apple, Mali and Adreno resolve it in tile memory rather than
           round-tripping a resolve target through bandwidth, which is the
           desktop cost the old note was budgeting for.

         The bank is the opposite case and keeps its own trade; the asymmetry
         is deliberate and the reason is in `MechSlots.tsx`.

         `dpr` is reactive and `antialias` is not — it is a context creation
         attribute, so crossing the breakpoint leaves the sample count as it
         was until a reload. Not worth a context rebuild to fix. */
      dpr={[1, 2]}
      frameloop={live ? 'always' : 'never'}
      /* The camera is set here only so the first frame has one; both scenes
         carry a `Lens` that puts it where their own tuning says, in an effect,
         and that is what every frame after the first is drawn with. */
      camera={{ fov: 40, position: [0, 0, 3] }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace
      }}
      style={{ background: 'transparent' }}
    >
      <StageRoom />
      {/* Keyed on the subject, which is the isolation the canvas's key used to
          provide. `Suspense` is here rather than in each scene so that the GLB
          a model is waiting on cannot suspend the room or the canvas with it. */}
      <Suspense fallback={null}>
        {subject?.kind === 'model' && (
          <ModelStage key={subject.src} src={subject.src} tuning={subject.tuning} offset={subject.offset} />
        )}
        {subject?.kind === 'piece' && (
          <PieceStage
            key={subject.project}
            project={subject.project}
            tuning={subject.tuning}
            piece={subject.piece}
            offset={subject.offset}
            tilt={subject.tilt}
          />
        )}
      </Suspense>
    </Canvas>
  )
}
