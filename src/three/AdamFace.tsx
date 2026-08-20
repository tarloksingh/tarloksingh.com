import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Center, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { folder, useControls } from 'leva'
import { Box3, MathUtils, Vector3 } from 'three'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { TARGET_SIZE } from './CapsuleStage'
import { EXTRA_CONTROLS, folderName } from './Gallery3D'

const MODEL_URL = '/models/adam-face.glb'

/** Expressions that read as "thinking" rather than reacting to anything —
 *  cycled on their own timer, independent of the scroll-driven sadness. */
const IDLE_EXPRESSIONS = ['EmotionSearching', 'EmotionListening']

/** The schema's `value:` fields are seeded from this, and the "Copy for
 *  source" button (Gallery3D.tsx) diffs the live panel against it — one
 *  object rather than the same numbers written out twice. */
const ADAM_DEFAULTS = {
  lift: 0.6,
  roughnessBoost: 0.2,
  metalnessScale: 0.5,
  blinkMin: 2.5,
  blinkMax: 9.5,
  blinkDuration: 0.28,
  lookSensitivityH: 0.8,
  lookSensitivityV: 0.5,
  lookMaxH: 0.6,
  lookMaxV: 0.4,
  lookFollowSpeed: 4,
  lookRecentreSpeed: 2,
  sadAtDistance: 1.95,
  sadIntensity: 1,
  thinkGapMin: 4,
  thinkGapMax: 12,
  thinkHoldMin: 1.2,
  thinkHoldMax: 3.8,
  thinkIntensity: 0.6,
  thinkFadeSpeed: 2.5
}

interface AdamFaceProps {
  scale: number
  /** Live scroll position — slot `n` is centred when this reads `n`. Read
   *  every frame, never through a render; see `progressRef` in Gallery3D. */
  progressRef: MutableRefObject<number>
  /** This piece's own slot in the row. */
  slot: number
  /** How many projects the row loops through — needed to take the shortest
   *  distance across the wrap, the same way Gallery3D places the case. */
  count: number
}

/** Live pointer position in NDC (-1..1, +1 = right/up), and whether it
 *  should be trusted right now. Tracked once for the page rather than per
 *  component — Adam is the only thing reading it, but a listener belongs at
 *  the level of the thing it's a fact about (the pointer), not the mesh. */
function usePointer() {
  const pointer = useRef({ x: 0, y: 0, active: false })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
      pointer.current.active = true
    }
    // `mouseleave` on the document — not `pointerleave`, which doesn't fire
    // for the viewport boundary itself — is what catches the cursor
    // actually leaving the page. Without this the last position before it
    // crossed the edge (often a screen corner) sticks, and the eyes stay
    // pinned to that corner instead of settling back to centre.
    const onGone = () => {
      pointer.current.active = false
    }
    window.addEventListener('pointermove', onMove)
    document.addEventListener('mouseleave', onGone)
    window.addEventListener('blur', onGone)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onGone)
      window.removeEventListener('blur', onGone)
    }
  }, [])

  return pointer
}

/**
 * Adam's facial rig, driven live rather than baked to a clip: blinking on a
 * loose timer, eyes tracking the pointer, an idle "thinking" expression that
 * comes and goes on its own, and a sadness that rises with how far the
 * scroll has carried you past his case — 0 while he's centred in frame, full
 * by the time a neighbouring piece has taken his place.
 */
export default function AdamFace({ scale, progressRef, slot, count }: AdamFaceProps) {
  const { scene } = useGLTF(MODEL_URL) as unknown as { scene: Group }
  const pointer = usePointer()

  const fitted = useMemo(() => {
    const root = scene.clone(true)
    const size = new Box3().setFromObject(root).getSize(new Vector3())
    const longest = Math.max(size.x, size.y, size.z) || 1
    const morphed: Mesh[] = []
    // Cloned once here, with each material's exported roughness/metalness
    // kept alongside — the Material folder below adjusts from these bases
    // every time a slider moves, rather than compounding onto whatever the
    // last drag left behind.
    const materials: { material: MeshStandardMaterial; baseRoughness: number; baseMetalness: number }[] = []
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphed.push(mesh)
      const mat = mesh.material as MeshStandardMaterial
      if (mat?.isMeshStandardMaterial) {
        const cloned = mat.clone()
        mesh.material = cloned
        materials.push({ material: cloned, baseRoughness: cloned.roughness, baseMetalness: cloned.metalness })
      }
    })
    return { root, fit: TARGET_SIZE / longest, morphed, materials }
  }, [scene])

  const setMorph = (name: string, value: number) => {
    for (const mesh of fitted.morphed) {
      const index = mesh.morphTargetDictionary![name]
      if (index !== undefined) mesh.morphTargetInfluences![index] = value
    }
  }

  const {
    blinkMin,
    blinkMax,
    blinkDuration,
    lookSensitivityH,
    lookSensitivityV,
    lookMaxH,
    lookMaxV,
    lookFollowSpeed,
    lookRecentreSpeed,
    sadAtDistance,
    sadIntensity,
    thinkGapMin,
    thinkGapMax,
    thinkHoldMin,
    thinkHoldMax,
    thinkIntensity,
    thinkFadeSpeed,
    lift,
    roughnessBoost,
    metalnessScale
  } = useControls('Objects', {
    // Nested into the same folder Gallery3D already builds his turn/scale/x/y
    // into (see OBJECT_SCHEMA there) — Leva merges controls registered under
    // matching folder paths from different components, so this doesn't open a
    // separate panel section of its own. Named through `folderName` and not
    // written out as a literal precisely so that stays true: the period in his
    // title is a path separator to Leva, and the two sides have to drop it the
    // same way or they stop matching.
    [folderName('Mr. Takahashi')]: folder(
      {
        Face: folder(
          {
            // The room lights every piece the same way, so this is the one
            // lever that's actually his own: how strongly his materials
            // answer that light, on top of whatever they were exported
            // with. Defaults are a guess at the softer, more matte look of
            // the Blender viewport — nudge them against a screenshot.
            // Short labels throughout, deliberately: this folder sits four
            // levels deep (Objects › Mr. Takahashi › Face › ‹this›), and
            // Leva's label column shrinks with every level of indent — a
            // label that reads fine at the top of the panel truncates to
            // "R..." down here.
            Material: folder({
              lift: { value: ADAM_DEFAULTS.lift, min: 0.1, max: 2, step: 0.05, label: 'Env ×' },
              roughnessBoost: {
                value: ADAM_DEFAULTS.roughnessBoost,
                min: -0.3,
                max: 0.5,
                step: 0.02,
                label: 'Rough +'
              },
              metalnessScale: {
                value: ADAM_DEFAULTS.metalnessScale,
                min: 0,
                max: 1,
                step: 0.05,
                label: 'Metal ×'
              }
            }),
            Blink: folder({
              blinkMin: { value: ADAM_DEFAULTS.blinkMin, min: 0.5, max: 10, step: 0.1, label: 'Min gap' },
              blinkMax: { value: ADAM_DEFAULTS.blinkMax, min: 1, max: 15, step: 0.1, label: 'Max gap' },
              blinkDuration: {
                value: ADAM_DEFAULTS.blinkDuration,
                min: 0.05,
                max: 0.4,
                step: 0.01,
                label: 'Length'
              }
            }),
            Eyes: folder({
              lookSensitivityH: {
                value: ADAM_DEFAULTS.lookSensitivityH,
                min: 0,
                max: 1.5,
                step: 0.05,
                label: 'Sens H'
              },
              lookSensitivityV: {
                value: ADAM_DEFAULTS.lookSensitivityV,
                min: 0,
                max: 1.5,
                step: 0.05,
                label: 'Sens V'
              },
              // Sensitivity decides how eagerly the eyes react; this decides
              // how far they're ever allowed to actually go, so a twitchy
              // cursor near the screen edge can't drive them past a
              // natural-looking rotation.
              lookMaxH: { value: ADAM_DEFAULTS.lookMaxH, min: 0.1, max: 1, step: 0.02, label: 'Max H' },
              lookMaxV: { value: ADAM_DEFAULTS.lookMaxV, min: 0.1, max: 1, step: 0.02, label: 'Max V' },
              lookFollowSpeed: {
                value: ADAM_DEFAULTS.lookFollowSpeed,
                min: 0.5,
                max: 10,
                step: 0.1,
                label: 'Follow'
              },
              lookRecentreSpeed: {
                value: ADAM_DEFAULTS.lookRecentreSpeed,
                min: 0.2,
                max: 8,
                step: 0.1,
                label: 'Recentre'
              }
            }),
            Sadness: folder({
              sadAtDistance: {
                value: ADAM_DEFAULTS.sadAtDistance,
                min: 0.2,
                max: 2,
                step: 0.05,
                label: 'Distance'
              },
              sadIntensity: { value: ADAM_DEFAULTS.sadIntensity, min: 0, max: 1, step: 0.05, label: 'Intensity' }
            }),
            // Gap → the rest between one expression and the next, both
            // morphs fully at 0 — Hold → how long an expression sits at
            // peak once it's risen. See the state machine below for why
            // the gap is a real wait rather than a fixed pause.
            Thinking: folder({
              thinkGapMin: { value: ADAM_DEFAULTS.thinkGapMin, min: 0.5, max: 15, step: 0.5, label: 'Gap min' },
              thinkGapMax: { value: ADAM_DEFAULTS.thinkGapMax, min: 1, max: 20, step: 0.5, label: 'Gap max' },
              thinkHoldMin: { value: ADAM_DEFAULTS.thinkHoldMin, min: 0.2, max: 6, step: 0.1, label: 'Hold min' },
              thinkHoldMax: { value: ADAM_DEFAULTS.thinkHoldMax, min: 0.5, max: 8, step: 0.1, label: 'Hold max' },
              thinkIntensity: {
                value: ADAM_DEFAULTS.thinkIntensity,
                min: 0,
                max: 1,
                step: 0.05,
                label: 'Intensity'
              },
              thinkFadeSpeed: { value: ADAM_DEFAULTS.thinkFadeSpeed, min: 0.5, max: 8, step: 0.1, label: 'Fade' }
            })
          },
          { collapsed: true }
        )
      },
      { collapsed: true }
    )
  })

  // Every frame rather than an effect keyed on the boost values: the room's
  // `Lift` wrapper (Gallery3D.tsx) writes `envMapIntensity` on every one of
  // its own re-renders with no dependency array, so it can catch meshes that
  // arrive later out of Suspense — and an effect here would only sometimes
  // run after it, silently losing this component's own boosts on whichever
  // commits Lift's happened to land second. Reapplying continuously means
  // whoever wrote last within a frame doesn't matter.
  useFrame(() => {
    for (const { material, baseRoughness, baseMetalness } of fitted.materials) {
      material.roughness = MathUtils.clamp(baseRoughness + roughnessBoost, 0, 1)
      material.metalness = MathUtils.clamp(baseMetalness * metalnessScale, 0, 1)
      material.envMapIntensity = lift
    }
  })

  // Registers this folder's live values into the panel-wide registry the
  // single "Copy for source" button (Gallery3D.tsx) reads from.
  useEffect(() => {
    Object.assign(EXTRA_CONTROLS, {
      'Mr. Takahashi › Material › Env ×': { value: lift, defaultValue: ADAM_DEFAULTS.lift },
      'Mr. Takahashi › Material › Rough +': { value: roughnessBoost, defaultValue: ADAM_DEFAULTS.roughnessBoost },
      'Mr. Takahashi › Material › Metal ×': {
        value: metalnessScale,
        defaultValue: ADAM_DEFAULTS.metalnessScale
      },
      'Mr. Takahashi › Blink › Min gap': { value: blinkMin, defaultValue: ADAM_DEFAULTS.blinkMin },
      'Mr. Takahashi › Blink › Max gap': { value: blinkMax, defaultValue: ADAM_DEFAULTS.blinkMax },
      'Mr. Takahashi › Blink › Length': { value: blinkDuration, defaultValue: ADAM_DEFAULTS.blinkDuration },
      'Mr. Takahashi › Eyes › Sens H': {
        value: lookSensitivityH,
        defaultValue: ADAM_DEFAULTS.lookSensitivityH
      },
      'Mr. Takahashi › Eyes › Sens V': {
        value: lookSensitivityV,
        defaultValue: ADAM_DEFAULTS.lookSensitivityV
      },
      'Mr. Takahashi › Eyes › Max H': { value: lookMaxH, defaultValue: ADAM_DEFAULTS.lookMaxH },
      'Mr. Takahashi › Eyes › Max V': { value: lookMaxV, defaultValue: ADAM_DEFAULTS.lookMaxV },
      'Mr. Takahashi › Eyes › Follow': {
        value: lookFollowSpeed,
        defaultValue: ADAM_DEFAULTS.lookFollowSpeed
      },
      'Mr. Takahashi › Eyes › Recentre': {
        value: lookRecentreSpeed,
        defaultValue: ADAM_DEFAULTS.lookRecentreSpeed
      },
      'Mr. Takahashi › Sadness › Distance': {
        value: sadAtDistance,
        defaultValue: ADAM_DEFAULTS.sadAtDistance
      },
      'Mr. Takahashi › Sadness › Intensity': { value: sadIntensity, defaultValue: ADAM_DEFAULTS.sadIntensity },
      'Mr. Takahashi › Thinking › Gap min': { value: thinkGapMin, defaultValue: ADAM_DEFAULTS.thinkGapMin },
      'Mr. Takahashi › Thinking › Gap max': { value: thinkGapMax, defaultValue: ADAM_DEFAULTS.thinkGapMax },
      'Mr. Takahashi › Thinking › Hold min': { value: thinkHoldMin, defaultValue: ADAM_DEFAULTS.thinkHoldMin },
      'Mr. Takahashi › Thinking › Hold max': { value: thinkHoldMax, defaultValue: ADAM_DEFAULTS.thinkHoldMax },
      'Mr. Takahashi › Thinking › Intensity': {
        value: thinkIntensity,
        defaultValue: ADAM_DEFAULTS.thinkIntensity
      },
      'Mr. Takahashi › Thinking › Fade': { value: thinkFadeSpeed, defaultValue: ADAM_DEFAULTS.thinkFadeSpeed }
    })
  }, [
    lift,
    roughnessBoost,
    metalnessScale,
    blinkMin,
    blinkMax,
    blinkDuration,
    lookSensitivityH,
    lookSensitivityV,
    lookMaxH,
    lookMaxV,
    lookFollowSpeed,
    lookRecentreSpeed,
    sadAtDistance,
    sadIntensity,
    thinkGapMin,
    thinkGapMax,
    thinkHoldMin,
    thinkHoldMax,
    thinkIntensity,
    thinkFadeSpeed
  ])

  const blink = useRef({ until: performance.now() / 1000 + randomBetween(blinkMin, blinkMax) })
  const look = useRef({ h: 0, v: 0 })
  // `phase` is what makes the gap a real rest instead of a fixed pause: it
  // only leaves 'gap' once the timer's up *and* the outgoing expression has
  // actually faded to ~0, so a slow fade speed can never get cut off and
  // snap when the next one starts rising.
  const think = useRef<{ name: string; weight: number; target: number; phase: 'gap' | 'hold'; timer: number }>({
    name: IDLE_EXPRESSIONS[0],
    weight: 0,
    target: 0,
    phase: 'gap',
    timer: randomBetween(thinkGapMin, thinkGapMax)
  })

  useFrame((_, delta) => {
    // ---- sadness, from how far the scroll has carried past this case ----
    let along = slot - progressRef.current
    along = along - Math.round(along / count) * count
    const away = MathUtils.clamp(Math.abs(along) / sadAtDistance, 0, 1)
    setMorph('EmotionSad', away * sadIntensity)

    // ---- blink, on a loose timer ----
    const now = performance.now() / 1000
    const sinceUntil = now - blink.current.until
    if (sinceUntil >= 0 && sinceUntil < blinkDuration) {
      // Down and back up across the blink window — a triangle, not a snap.
      const t = sinceUntil / blinkDuration
      setMorph('Eyes Closed', 1 - Math.abs(t - 0.5) * 2)
    } else if (sinceUntil >= blinkDuration) {
      setMorph('Eyes Closed', 0)
      blink.current.until = now + randomBetween(blinkMin, blinkMax)
    }

    // ---- eyes, tracking the pointer while it's on the page, otherwise
    // ---- easing back to centre rather than holding wherever it last was ----
    const targetH = pointer.current.active
      ? MathUtils.clamp(pointer.current.x * lookSensitivityH, -lookMaxH, lookMaxH)
      : 0
    const targetV = pointer.current.active
      ? MathUtils.clamp(-pointer.current.y * lookSensitivityV, -lookMaxV, lookMaxV)
      : 0
    const lookSpeed = pointer.current.active ? lookFollowSpeed : lookRecentreSpeed
    look.current.h = MathUtils.lerp(look.current.h, targetH, 1 - Math.exp(-lookSpeed * delta))
    look.current.v = MathUtils.lerp(look.current.v, targetV, 1 - Math.exp(-lookSpeed * delta))
    setMorph('HorizontalLook', look.current.h)
    setMorph('VerticalLook', look.current.v)

    // ---- an idle expression that rises and falls on its own, reading as
    // ---- "thinking" rather than reacting to the visitor or the scroll ----
    // Gated on being in focus: sadness and the idle expression share the same
    // face, and having both rise at once reads as two animations fighting
    // rather than one reaction — so thinking only runs at rest, and drops out
    // the moment the scroll starts carrying him away.
    const inFocus = away < 0.05
    if (inFocus) {
      think.current.timer -= delta
      if (think.current.phase === 'hold') {
        if (think.current.timer <= 0) {
          think.current.target = 0
          think.current.phase = 'gap'
          think.current.timer = randomBetween(thinkGapMin, thinkGapMax)
        }
      } else if (think.current.timer <= 0 && think.current.weight < 0.01) {
        // Both conditions, not just the timer: a break that ends the moment
        // the clock says so, before the last expression has actually faded
        // out, is exactly the stacking this replaced.
        const others = IDLE_EXPRESSIONS.filter((name) => name !== think.current.name)
        think.current.name = others[Math.floor(Math.random() * others.length)] ?? think.current.name
        think.current.target = thinkIntensity
        think.current.phase = 'hold'
        think.current.timer = randomBetween(thinkHoldMin, thinkHoldMax)
      }
    } else {
      think.current.target = 0
    }
    think.current.weight = MathUtils.lerp(
      think.current.weight,
      think.current.target,
      1 - Math.exp(-thinkFadeSpeed * delta)
    )
    for (const name of IDLE_EXPRESSIONS) {
      setMorph(name, name === think.current.name ? think.current.weight : 0)
    }
  })

  return (
    <Center>
      <primitive object={fitted.root} scale={fitted.fit * scale} />
    </Center>
  )
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

useGLTF.preload(MODEL_URL)
