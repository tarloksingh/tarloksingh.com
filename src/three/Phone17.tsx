import { useEffect, useMemo } from 'react'
import { useGLTF, useVideoTexture } from '@react-three/drei'
import { MeshBasicMaterial, SRGBColorSpace } from 'three'
import type { Mesh, VideoTexture } from 'three'

/* ---- a real handset, with the work running on it ----

   `Phone3D` is a rounded box with a video plane floating a millimetre off its
   front, built when there was no modelled handset to use. There is one now:
   an iPhone 17 Pro Max, which is the phone Plus One is an app for, and a
   rounded box next to a modelled camera plateau is the difference between a
   product shot and a placeholder. `Phone3D` is still mounted by the v2
   gallery and is not touched.

   **The screen is one mesh, and it has to be found by material.** The export's
   node and material names are all obfuscated — `HkNSnYzBPABcqwM.001`,
   `BsXHDwLKqtDOfrW` — so there is nothing to match on by meaning. What
   identifies it is what it *is*: the only flat, perfectly planar mesh in the
   file carrying `emissiveFactor: [1, 1, 1]` and an emissive texture, sized
   7.28 × 15.77, which is 19.5:9 to four decimal places. `SCREEN` is that
   material's name, and if a re-export ever changes it the phone still renders
   — it renders with the stock wallpaper on it, which is the failure this is
   allowed to have.

   Its UVs run 0 → 1 across the whole panel, so the clip needs no offset, no
   repeat and no fitting: mapped straight on, it lands corner to corner.

   **And that is why the source clip looks wrong on its own.** `Plus One_
   compressed.mp4` is 1190 × 1080 — a 1.1:1 frame holding a portrait app UI,
   because the recording was squeezed sideways on the way out rather than
   letterboxed. Stretched back across a 0.4617 screen it comes out at exactly
   the proportions it was recorded at. Do not "fix" the aspect here; the
   pixels are non-square on purpose and the screen is the thing that squares
   them. */

const SRC = '/models/iphone-17-pro-max.glb'
const SCREEN = 'BsXHDwLKqtDOfrW'

function useScreenVideo(videoUrl: string) {
  const texture = useVideoTexture(videoUrl) as VideoTexture

  /* Same teardown every video-bearing piece here needs: `useVideoTexture`
     starts the element and never stops it, and this component remounts every
     time the stage comes back around to Plus One. */
  useEffect(
    () => () => {
      const video = texture.image as HTMLVideoElement
      video.pause()
      texture.dispose()
    },
    [texture]
  )

  return texture
}

export interface Phone17Props {
  /** The screen capture to loop on the glass. */
  videoUrl: string
  scale?: number
}

export default function Phone17({ videoUrl, scale = 1 }: Phone17Props) {
  const { scene } = useGLTF(SRC)
  const texture = useScreenVideo(videoUrl)

  /* Cloned, because `useGLTF` hands back one cached scene for the whole app
     and this writes a material onto it — the home screen's bank draws the same
     handset in a slot, and the two must not share the one video element's
     texture through a shared material.

     The flip is the glTF convention: three's `Texture` origin is bottom-left
     and a glTF UV set counts down from the top, so a video mapped straight on
     arrives upside down. `flipY` is the one line that says so. */
  const phone = useMemo(() => {
    const copy = scene.clone(true)
    texture.flipY = false
    texture.colorSpace = SRGBColorSpace
    copy.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      if (material?.name !== SCREEN) return
      /* Unlit, like every other screen on this site: a capture read through
         the studio's low-exposure product grade is a photograph of a phone
         that was switched off. */
      mesh.material = new MeshBasicMaterial({ map: texture, toneMapped: false })
    })
    return copy
  }, [scene, texture])

  return (
    <group scale={scale}>
      <primitive object={phone} />
    </group>
  )
}

useGLTF.preload(SRC)
