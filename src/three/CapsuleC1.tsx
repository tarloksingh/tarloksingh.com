import { useEffect } from 'react'
import { folder, useControls } from 'leva'
import { LoadedModel } from './CapsuleStage'
import { EXTRA_CONTROLS } from './Gallery3D'

const MODEL_URL = '/models/capsule-c1.glb'

/** The schema's `value:` fields are seeded from this, and the "Copy for
 *  source" button (Gallery3D.tsx) diffs the live panel against it — one
 *  object rather than the same numbers written out twice. */
const CAPSULE_DEFAULTS = {
  metalnessBoost: 0,
  roughnessBoost: 0,
  liftBoost: 1,
  tiltX: 0,
  tiltZ: 0
}

/**
 * Capsule C1, with live metalness/roughness/reflection and tilt controls —
 * the case exports fully non-metallic (see the material dump in git
 * history), so "more metallic" needs an additive boost rather than a
 * multiplier, which would just be scaling zero.
 */
export default function CapsuleC1({ scale }: { scale: number }) {
  const { metalnessBoost, roughnessBoost, liftBoost, tiltX, tiltZ } = useControls('Objects', {
    // Nested into the same 'Capsule C1' folder Gallery3D already builds its
    // turn/scale/x/y into (see OBJECT_SCHEMA there) — Leva merges controls
    // registered under matching folder paths from different components, so
    // this doesn't open a separate panel section of its own.
    'Capsule C1': folder(
      {
        Material: folder({
          metalnessBoost: {
            value: CAPSULE_DEFAULTS.metalnessBoost,
            min: 0,
            max: 1,
            step: 0.02,
            label: 'Metal +'
          },
          roughnessBoost: {
            value: CAPSULE_DEFAULTS.roughnessBoost,
            min: -0.3,
            max: 0.5,
            step: 0.02,
            label: 'Rough +'
          },
          liftBoost: { value: CAPSULE_DEFAULTS.liftBoost, min: 0.1, max: 3, step: 0.05, label: 'Env ×' }
        }),
        // Separate from the row's own `turn`, which spins the case about Y
        // as you scroll — these pose it on the other two axes instead.
        Angle: folder({
          tiltX: { value: CAPSULE_DEFAULTS.tiltX, min: -30, max: 30, step: 0.5, label: 'Tilt X' },
          tiltZ: { value: CAPSULE_DEFAULTS.tiltZ, min: -30, max: 30, step: 0.5, label: 'Tilt Z' }
        })
      },
      { collapsed: true }
    )
  })

  // Registers this folder's live values into the panel-wide registry the
  // single "Copy for source" button (Gallery3D.tsx) reads from.
  useEffect(() => {
    Object.assign(EXTRA_CONTROLS, {
      'Capsule C1 › Material › Metal +': {
        value: metalnessBoost,
        defaultValue: CAPSULE_DEFAULTS.metalnessBoost
      },
      'Capsule C1 › Material › Rough +': {
        value: roughnessBoost,
        defaultValue: CAPSULE_DEFAULTS.roughnessBoost
      },
      'Capsule C1 › Material › Env ×': { value: liftBoost, defaultValue: CAPSULE_DEFAULTS.liftBoost },
      'Capsule C1 › Angle › Tilt X': { value: tiltX, defaultValue: CAPSULE_DEFAULTS.tiltX },
      'Capsule C1 › Angle › Tilt Z': { value: tiltZ, defaultValue: CAPSULE_DEFAULTS.tiltZ }
    })
  }, [metalnessBoost, roughnessBoost, liftBoost, tiltX, tiltZ])

  return (
    <LoadedModel
      url={MODEL_URL}
      scale={scale}
      fallbackColor="#000000"
      metalnessBoost={metalnessBoost}
      roughnessBoost={roughnessBoost}
      liftBoost={liftBoost}
      tiltX={tiltX}
      tiltZ={tiltZ}
    />
  )
}
