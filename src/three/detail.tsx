import { createContext, useContext } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ComponentProps } from 'react'

/* ---- how finely a piece is tessellated, for whoever is looking at it ----

   drei's `RoundedBox` is an `ExtrudeGeometry` with a bevel, and it runs
   `toCreasedNormals` over the result so the flat faces stay flat and the
   corners shade smoothly. At its defaults — `smoothness: 4`, `bevelSegments:
   4`, which drei doubles on the way in — that is **3876 vertices per box**,
   whatever size the box is. The till (`PosStation`) is made of ten of them
   plus a mapped keypad.

   That is fine for the thing filling a project screen. It is not fine for the
   same object in a bank bay, which on a 1512×900 window is **75 pixels tall**.
   Measured during home's entrance on a 4× throttled desktop, `toCreasedNormals`
   and the `Vector3.dot` underneath it came to about a second of main thread —
   the largest cost in the one 1.8s window where the name is typing itself in
   and the panel is coming up. Building fifty-eight thousand vertices for a row
   of thumbnails is the whole of it.

   So the bay asks for less. `Detail` is a plain multiplier on the two segment
   counts, defaulting to **1 — exactly what each piece was authored with** — so
   nothing that does not opt in changes at all: the project stage, the v2
   gallery in `src/site/products.tsx`, and the unmounted cast all render the
   geometry they always did. `MechSlots` provides a lower value around the
   pieces in the bank, and only there.

   At 0.5 a box is 1188 vertices instead of 3876 and ten of them take 5ms
   rather than 41. What changes on screen is the number of facets around a
   bevel whose radius is about five per cent of the object — four instead of
   eight, on a corner a few pixels across, with creased normals doing the
   shading either way. If a bay ever grows large enough for that to show, raise
   the number; it is one value in one place.

   **A failure here is silent and safe.** If the context did not reach a piece
   — a portal that does not forward it, say — `detail` stays 1 and the geometry
   is what it always was. The symptom is that the saving does not appear, never
   that something renders wrong. */

/** Multiplier on a rounded box's segment counts. 1 is as authored. */
export const Detail = createContext(1)

type Props = ComponentProps<typeof RoundedBox>

/** `RoundedBox`, tessellated for whoever is looking at it. Drop-in: the
 *  defaults are drei's own, so with no provider above it this is `RoundedBox`.
 *
 *  Never rounds below 1 — a bevel with no segments is a box with a chamfer
 *  drawn on it, which *is* a different object. */
export function RoundedBoxLOD({ smoothness = 4, bevelSegments = 4, ...rest }: Props) {
  const detail = useContext(Detail)
  const at = (n: number) => Math.max(1, Math.round(n * detail))
  return <RoundedBox {...rest} smoothness={at(smoothness)} bevelSegments={at(bevelSegments)} />
}
