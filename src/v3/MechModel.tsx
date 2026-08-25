import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, useAnimations, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, MathUtils, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { drift, flinch, gaze } from './subject'
import { MODEL_DEFAULTS, type ModelTuning } from './modelTuning'
import type { Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three'

/* The subject of the project screen: the model itself, lit and drifting, with
   nothing but black behind it.

   Deliberately not `drei/Stage` (what the index screen's `ModelFrame` uses):
   Stage reframes the camera around whatever it is handed, and here the camera
   has to stay put — the leader lines are drawn at fixed coordinates in the
   same 1920×1080 frame, and they only touch the model if the model does not
   move between projects. So the model is normalised to the camera instead. */

/** World units the model's height is normalised to before framing. */
const TARGET_HEIGHT = 1

/** Lens focal length to three's vertical field of view, against a 35mm back.
 *  Copied rather than imported from `CapsuleStage`, which is three lines of
 *  arithmetic against dragging the whole gallery stage into this chunk. */
const fovForFocalLength = (mm: number) => (2 * Math.atan(24 / (2 * mm)) * 180) / Math.PI

/** How far back the camera has to stand to hold `fill` of the frame's height
 *  at this lens. Longer glass, further away — that is the whole trade, and
 *  keeping it as one sum is what lets the panel move the lens without also
 *  having to move the camera by hand. */
const distanceFor = (focalLength: number, fill: number) =>
  TARGET_HEIGHT / fill / (2 * Math.tan((fovForFocalLength(focalLength) * Math.PI) / 360))

/* ---- the face ----

   The v2 export carries no head animation — what it carries is morph targets,
   and v2 drives them from code rather than from clips. Same numbers as
   `AdamFace`, minus the two things that only make sense inside the gallery:
   sadness measured off the scroll, and a Leva panel over all of it.

   Without this the model is a very well lit mannequin. */
const IDLE = ['EmotionSearching', 'EmotionListening']
const BLINK_LENGTH = 0.28
const THINK = { gap: [4, 12], hold: [1.2, 3.8], intensity: 0.6, fade: 2.5 }

const between = (min: number, max: number) => min + Math.random() * (max - min)

/* ---- being shot ----

   The gun can land a bolt on him, and something has to happen or the whole
   thing is a decoration you fire at. What happens is small: he shuts his eyes
   for a moment, twitches, and goes a little sad for a few seconds.

   The eyelids are one morph for both eyes — `Eyes Closed` drives the pair —
   so a wink is not available and the twitch is a flutter rather than one eye
   going. Two half-closes after the first hard blink, which reads as a face
   shaking something off. */
const HURT = {
  /** Seconds the eyes take to close and open again. Slow enough to see: a
   *  blink you cannot follow is a frame drop, not a reaction. */
  blink: 0.42,
  twitch: [
    [0.6, 0.86],
    [1.05, 1.24]
  ],
  /** How far the lids come down on a twitch, against 1 for the blink. */
  squint: 0.45,
  /** How sad. `rise` and `fall` are the seconds it takes to arrive at that and
   *  to leave it again — arriving is the part you watch, so it is slow, and
   *  `hold` is how long he stays there before it starts to lift. */
  sad: 0.85,
  rise: 1.5,
  hold: 2.6,
  fall: 5,
  /** Degrees the head is knocked back, over `tip` seconds, and the seconds it
   *  takes to come back off it. Not an impulse: a head that reaches five
   *  degrees inside one frame has been hit by a truck, and this is a bolt. */
  kick: 5,
  tip: 0.26,
  settle: 0.9
}

/** How far back the head is tipped by a hit `since` seconds ago, 0..1. Up on
 *  a smoothstep and down on a longer one, so both ends of it ease. */
const hurtTip = (since: number) => {
  if (since < 0) return 0
  if (since < HURT.tip) {
    const t = since / HURT.tip
    return t * t * (3 - 2 * t)
  }
  const t = (since - HURT.tip) / HURT.settle
  if (t >= 1) return 0
  return 1 - t * t * (3 - 2 * t)
}

/** How far the lids are down from a hit, `since` seconds ago. Zero once it is
 *  over, so it can be maxed against the idle blink without either one having
 *  to know about the other. */
const hurtLids = (since: number) => {
  if (since < 0) return 0
  // The blink is a triangle raised above 1 so it holds shut across the middle
  // of its window rather than touching closed for one frame.
  if (since < HURT.blink) return Math.min(1, 1.5 - Math.abs(since / HURT.blink - 0.5) * 2)
  for (const [from, to] of HURT.twitch) {
    if (since >= from && since < to) {
      return HURT.squint * (1 - Math.abs((since - from) / (to - from) - 0.5) * 2)
    }
  }
  return 0
}

/** Seconds since the last hit, or a large number if there has not been one. */
const hurtAge = () => (flinch.at === 0 ? Infinity : (performance.now() - flinch.at) / 1000)

/** Seconds the attention takes to come back off the bird once it is gone.
 *  Quicker than going, because losing interest is not the part anyone
 *  watches — but not instant, or the head snaps back to the pointer the
 *  moment the bird leaves the frame. */
const LOSE = 1.1

/** Where to look, in normalised device coordinates: -1..1 with +1 at the right
 *  and +1 at the top.
 *
 *  Tracked off `window` rather than read from the Canvas's own pointer, which
 *  is the bug this replaces — R3F only updates that on events that reach the
 *  canvas, so the eyes went dead the moment the cursor crossed the project
 *  copy or the rail, which is most of where a cursor actually is.
 *
 *  A bird in the air wins over the pointer. Something crossing the room is
 *  more interesting than a mouse sitting still, and it is the one moment the
 *  face has anything to react to.
 *
 *  It does not win *immediately*, which is the whole of `attention`. Handing
 *  the head the bird's position the frame the bird appears makes him whip
 *  round to it — the damping downstream only ever softens the last part of a
 *  turn, never the first. So the target itself crosses from the pointer to
 *  the bird over `catchSeconds`, on a smoothstep: the first tenth of a second
 *  barely moves, and by the time he is really turning he is already most of
 *  the way there. Something caught out of the corner of an eye and then
 *  followed, rather than a turret acquiring. */
function useGaze(watchBird: boolean, catchSeconds: number) {
  const ndc = useRef({ x: 0, y: 0 })
  /** 0 is the pointer, 1 is the bird, and the whole of the catch is in
   *  between. Advanced on its own clock rather than per reader: `Lean` and
   *  the eyes both call the returned function every frame, and an attention
   *  that stepped on every call would run twice as fast for two readers. */
  const attention = useRef(0)
  const settings = useRef({ watchBird, catchSeconds })
  settings.current = { watchBird, catchSeconds }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      ndc.current.x = (event.clientX / window.innerWidth) * 2 - 1
      ndc.current.y = -((event.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)
    /* And a tap. On a phone there is no hovering, so a press is the only way
       anyone says "here" — and a head that ignores it is a head that does
       nothing at all on half the devices this runs on. */
    window.addEventListener('pointerdown', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let previous = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const onto = settings.current.watchBird && gaze.bird.active
      const span = Math.max(0.05, onto ? settings.current.catchSeconds : LOSE)
      attention.current = MathUtils.clamp(attention.current + (onto ? dt : -dt) / span, 0, 1)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return () => {
    const t = attention.current
    if (t <= 0) return ndc.current
    // Smoothstep, so the move out of the pointer's orbit starts at nothing
    // and the arrival at the bird settles rather than stops.
    const k = t * t * (3 - 2 * t)
    const bird = {
      x: (gaze.bird.x / window.innerWidth) * 2 - 1,
      y: -((gaze.bird.y / window.innerHeight) * 2 - 1)
    }
    return {
      x: MathUtils.lerp(ndc.current.x, bird.x, k),
      y: MathUtils.lerp(ndc.current.y, bird.y, k)
    }
  }
}

type Look = () => { x: number; y: number }

function Model({ src, tuning, look }: { src: string; tuning: ModelTuning; look: Look }) {
  const { scene: source, animations } = useGLTF(src)
  const group = useRef<Group>(null)
  const { actions } = useAnimations(animations, group)

  // Every clip at once. These exports are one clip per part — a face is a
  // mouth and a pair of eyes and a tongue all moving together, not a take you
  // pick between.
  useEffect(() => {
    const list = Object.values(actions)
    list.forEach((action) => action?.reset().play())
    return () => {
      list.forEach((action) => action?.stop())
    }
  }, [actions])

  const fit = useMemo(() => {
    // Cloned rather than used in place. `useGLTF` hands back one cached scene
    // for the whole app, and this component writes morph influences straight
    // onto its meshes — unmounting mid-blink left `Eyes Closed` at 1 on the
    // shared object, so coming back from a still found him with his eyes shut.
    const scene = source.clone(true)
    const box = new Box3()
    const morphed: Mesh[] = []
    const surfaces: Array<{ material: MeshStandardMaterial; roughness: number; metalness: number }> = []
    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      // Some exports carry a backdrop plane behind the subject. Against a
      // black page it only ever reads as a grey card, and it throws the
      // framing off by several times the size of the thing being framed.
      if (/^plane/i.test(mesh.name)) {
        mesh.visible = false
        return
      }

      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphed.push(mesh)

      // Cloned with the export's own roughness and metalness kept alongside:
      // the panel adjusts from those bases every frame rather than compounding
      // onto whatever the last drag left behind.
      const material = mesh.material as MeshStandardMaterial
      if (material?.isMeshStandardMaterial) {
        const clone = material.clone()
        mesh.material = clone
        surfaces.push({ material: clone, roughness: clone.roughness, metalness: clone.metalness })
      }

      mesh.updateWorldMatrix(true, false)
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld))
    })

    const size = box.getSize(new Vector3())
    const scale = TARGET_HEIGHT / (size.y || 1)
    return { scene, scale, morphed, surfaces, offset: box.getCenter(new Vector3()).multiplyScalar(-scale) }
  }, [source])

  const blink = useRef({ at: performance.now() / 1000 + between(tuning.blinkMin, tuning.blinkMax) })
  /** How sad he currently is, chased toward the target rather than set: it
   *  comes on fast and leaves slowly, which is the difference between being
   *  hurt and pulling a face. */
  const hurt = useRef(0)
  const eyes = useRef({ h: 0, v: 0 })
  // `phase` is what makes the gap a real rest rather than a fixed pause: it
  // only leaves 'gap' once the timer is up *and* the outgoing expression has
  // actually faded out, so a slow fade can never be cut off mid-way.
  const think = useRef({
    name: IDLE[0],
    weight: 0,
    target: 0,
    phase: 'gap' as 'gap' | 'hold',
    timer: between(THINK.gap[0], THINK.gap[1])
  })

  const setMorph = (name: string, value: number) => {
    for (const mesh of fit.morphed) {
      const index = mesh.morphTargetDictionary![name]
      if (index !== undefined) mesh.morphTargetInfluences![index] = value
    }
  }

  // The blink only writes `Eyes Closed` while a blink is running or has just
  // finished — in the gap before the first one there is nothing to hold it
  // down, so it has to start down.
  useEffect(() => {
    setMorph('Eyes Closed', 0)
    setMorph('EmotionSad', 0)
    for (const name of IDLE) setMorph(name, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit])

  useFrame((_, delta) => {
    for (const surface of fit.surfaces) {
      surface.material.envMapIntensity = tuning.envMapIntensity
      surface.material.roughness = MathUtils.clamp(surface.roughness + tuning.roughnessBoost, 0, 1)
      surface.material.metalness = MathUtils.clamp(surface.metalness * tuning.metalnessScale, 0, 1)
    }

    // Blink, on a loose timer — down and back up across the window, a
    // triangle rather than a snap.
    const now = performance.now() / 1000
    const since = now - blink.current.at
    let lids = 0
    if (since >= 0 && since < BLINK_LENGTH) {
      lids = 1 - Math.abs(since / BLINK_LENGTH - 0.5) * 2
    } else if (since >= BLINK_LENGTH) {
      blink.current.at = now + between(tuning.blinkMin, tuning.blinkMax)
    }

    /* Being shot closes the eyes over the top of whatever the idle blink was
       doing. Maxed rather than added, so a hit landing mid-blink is one pair
       of eyelids and not one and a half. */
    const hit = hurtAge()
    lids = Math.min(1, Math.max(lids, hurtLids(hit)))
    setMorph('Eyes Closed', lids)

    // And it stays with him for a few seconds after the flinch is over.
    const wants = hit < HURT.hold ? HURT.sad : 0
    // Three time constants is most of the way there, which is what makes
    // `rise` and `fall` read as the seconds they say.
    const rate = 3 / (wants > 0 ? HURT.rise : HURT.fall)
    hurt.current = MathUtils.lerp(hurt.current, wants, 1 - Math.exp(-rate * delta))
    setMorph('EmotionSad', hurt.current)

    /* The eyes go where you are, measured out from the middle of their travel
       — see `lookCenterH` for why the middle is not zero. Sensitivity decides
       how eagerly they react; the cap decides how far they are ever allowed
       to go, so a cursor flicked into a corner cannot drive them to an
       extreme of the sweep.

       Neither axis is negated, despite v2 negating the vertical. Its
       `usePointer` documents itself as "+1 = up" and then computes
       `clientY / height * 2 - 1`, which is +1 at the *bottom* — so v2's minus
       and this function's already-flipped Y were the same sign applied twice.
       Both signs check out against the morph deltas: `HorizontalLook` slides
       the eyes toward +x, which is the viewer's right, and `VerticalLook`
       slides them toward -z, which the head's rotation turns into up. The
       flips stay on the panel anyway, because a morph's sign convention is
       written down nowhere. */
    const target = look()
    const k = 1 - Math.exp(-tuning.lookSpeed * delta)
    const h = target.x * tuning.lookH * (tuning.lookFlipH ? -1 : 1)
    const v = target.y * tuning.lookV * (tuning.lookFlipV ? -1 : 1)

    // Tracked as a deviation from the middle of the sweep rather than as the
    // morph value itself, so the eyes start looking straight ahead instead of
    // easing over from hard left on the first frame.
    eyes.current.h = MathUtils.lerp(eyes.current.h, MathUtils.clamp(h, -tuning.lookMaxH, tuning.lookMaxH), k)
    eyes.current.v = MathUtils.lerp(eyes.current.v, MathUtils.clamp(v, -tuning.lookMaxV, tuning.lookMaxV), k)
    setMorph('HorizontalLook', MathUtils.clamp(tuning.lookCenterH + eyes.current.h, 0, 1))
    setMorph('VerticalLook', MathUtils.clamp(tuning.lookCenterV + eyes.current.v, 0, 1))

    // An expression that rises and falls on its own, so the face reads as
    // thinking rather than as waiting.
    const state = think.current
    state.timer -= delta
    if (state.phase === 'hold') {
      if (state.timer <= 0) {
        state.target = 0
        state.phase = 'gap'
        state.timer = between(THINK.gap[0], THINK.gap[1])
      }
    } else if (state.timer <= 0 && state.weight < 0.01) {
      const others = IDLE.filter((name) => name !== state.name)
      state.name = others[Math.floor(Math.random() * others.length)] ?? state.name
      state.target = THINK.intensity
      state.phase = 'hold'
      state.timer = between(THINK.hold[0], THINK.hold[1])
    }
    state.weight = MathUtils.lerp(state.weight, state.target, 1 - Math.exp(-THINK.fade * delta))
    for (const name of IDLE) setMorph(name, name === state.name ? state.weight : 0)
  })

  return (
    <group ref={group}>
      <group scale={fit.scale} position={fit.offset}>
        <primitive object={fit.scene} />
      </group>
    </group>
  )
}

/** Publishes the float's translation, converted out of world units into the
 *  frame coordinates the leaders are drawn in, so the labels can ride the
 *  same bob the model is on rather than approximating it with an animation
 *  that would drift out of step within a minute.
 *
 *  Sits inside `Float` at the origin, so its world position *is* the offset.
 *  The exchange rate falls out of the framing: the camera is placed so the
 *  subject's one world unit of height covers `fill` of 1080 frame pixels. */
function Drift({ fill }: { fill: number }) {
  const ref = useRef<Group>(null)
  const at = useMemo(() => new Vector3(), [])

  useFrame(() => {
    if (!ref.current) return
    ref.current.getWorldPosition(at)
    const perUnit = 1080 * fill
    drift.x = at.x * perUnit
    // Frame coordinates count downward and world units count up.
    drift.y = -at.y * perUnit
  })

  return <group ref={ref} />
}

/** Leans the whole subject a few degrees toward the pointer. Damped against
 *  the frame clock rather than snapped, so a flick of the mouse is a turn of
 *  the head and not a jump. */
function Lean({ degrees, look, children }: { degrees: number; look: Look; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const limit = MathUtils.degToRad(degrees)
  /** The lean on its own, without the knock. Kept apart from what is on the
   *  group: adding the knock to `rotation.x` and then damping `rotation.x`
   *  toward the pointer next frame feeds the knock back into the lean, and
   *  the two never quite finish arguing. */
  const lean = useRef({ x: 0, y: 0 })

  useFrame((_, delta) => {
    const group = ref.current
    if (!group) return
    const target = look()
    const k = 1 - Math.pow(0.002, delta)
    lean.current.y = MathUtils.lerp(lean.current.y, target.x * limit, k)
    lean.current.x = MathUtils.lerp(lean.current.x, -target.y * limit * 0.55, k)
    group.rotation.y = lean.current.y

    /* The knock is a curve laid over the lean rather than a shove into it.
       Shoving the rotation once and letting the damping unwind it put the
       whole five degrees into a single frame, which is a head snapping rather
       than a head recoiling; this tips back over a quarter of a second and
       comes off it over the best part of one. */
    group.rotation.x = lean.current.x - MathUtils.degToRad(HURT.kick) * hurtTip(hurtAge())
  })

  return <group ref={ref}>{children}</group>
}

/** Built inside three rather than fetched, so the page still makes no
 *  third-party request for an HDRI. Same reasoning as the gallery's stage,
 *  and the same exposure, because it is the same face. */
function Studio({ intensity, exposure }: { intensity: number; exposure: number }) {
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

  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}

/** The camera has to be moved rather than remounted: a `camera` prop is only
 *  read on the first render, so dragging the lens slider would otherwise do
 *  nothing until a reload. */
function Lens({ focalLength, fill }: { focalLength: number; fill: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera

  useEffect(() => {
    camera.fov = fovForFocalLength(focalLength)
    camera.position.set(0, 0, distanceFor(focalLength, fill))
    camera.near = camera.position.z * 0.2
    camera.far = camera.position.z * 4
    camera.updateProjectionMatrix()
  }, [camera, focalLength, fill])

  return null
}

/** Whether the subject is the thing on the stage right now.
 *
 *  A still on the stage does not unmount this — see the stage in `Mech.tsx`.
 *  It stops instead: `frameloop="never"` means no render, no `useFrame`, no
 *  morph writes and no GPU work, while the context, the shaders, the cloned
 *  scene and the environment map all stay exactly where they are. Coming
 *  back is a flag; building them again was a visible stutter. */
export default function MechModel({
  src,
  tuning = MODEL_DEFAULTS,
  live = true
}: {
  src: string
  tuning?: ModelTuning
  live?: boolean
}) {
  /* From the tuning actually in force, not from the shipped constant.
 
     A `camera` prop is read once at mount; `Lens` below corrects it in an
     effect, which is a frame later — and that frame is painted. On the home
     screen the face is framed much smaller than on his own project screen
     (his slot's `scale` multiplies `fill`), so with the constant here the
     first frame drew him at project size and the second at cast size. That
     is the "flashes large" on the way back to home, and the exposure below
     is the "flashes white": `Studio` sets `toneMappingExposure` in an effect
     too, and the renderer's default of 1 against this page's 0.6 is a
     visibly brighter frame. Both are now right before anything is drawn. */
  const distance = distanceFor(tuning.focalLength, tuning.fill)

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={live ? 'always' : 'never'}
      camera={{ fov: fovForFocalLength(tuning.focalLength), position: [0, 0, distance] }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: tuning.exposure,
        outputColorSpace: SRGBColorSpace
      }}
      style={{ background: 'transparent' }}
    >
      <Lens focalLength={tuning.focalLength} fill={tuning.fill} />
      <Studio intensity={tuning.envIntensity} exposure={tuning.exposure} />
      <directionalLight position={[tuning.keyX, tuning.keyY, tuning.keyZ]} intensity={tuning.keyIntensity} />
      <directionalLight position={[tuning.fillX, tuning.fillY, tuning.fillZ]} intensity={tuning.fillIntensity} />

      <FaceScene src={src} tuning={tuning} />
    </Canvas>
  )
}

/** Everything the face is, minus the canvas, the lens and the room.
 *
 *  Exported so the home screen can stand him in the cast's own scene instead
 *  of over it. He used to be a second full-stage canvas laid on top, which
 *  worked while he was the only subject with a rig — but it meant he was in a
 *  different camera from everyone else, so the cast's dolly, tilt, lift and
 *  spread moved the other four and left him where he was, and his placement
 *  had to be faked as a CSS percentage. He is a cast member now: same camera,
 *  same handles, hoverable and taggable like the rest, on his own three.js
 *  layer with his own two lights. The reason he was ever separate — his rig —
 *  travels with him, because it is this.
 *
 *  `driftFill` is the framing the leaders are laid out against, which is the
 *  project screen's `fill` and not the cast's. On home nothing reads `drift`,
 *  so it only matters there. */
export function FaceScene({
  src,
  tuning,
  driftFill
}: {
  src: string
  tuning: ModelTuning
  driftFill?: number
}) {
  const look = useGaze(tuning.watchBird, tuning.watchCatch)

  return (
    <Suspense fallback={null}>
      <Lean degrees={tuning.lean} look={look}>
        <Float
          speed={tuning.floatSpeed}
          rotationIntensity={tuning.floatRotation}
          floatIntensity={0.5}
          floatingRange={[-tuning.floatRange, tuning.floatRange]}
        >
          <Drift fill={driftFill ?? tuning.fill} />
          <Model src={src} tuning={tuning} look={look} />
        </Float>
      </Lean>
    </Suspense>
  )
}
