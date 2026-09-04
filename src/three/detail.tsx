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

   At 0.25 a box is a few hundred vertices instead of 3876. What changes on
   screen is the number of facets around a bevel whose radius is about five
   per cent of the object — two instead of eight, on a corner a few pixels
   across in a box seventy-five pixels tall, with creased normals doing the
   shading either way. It was 0.5 first, and taken to 0.25 when the bays were
   measured against each other and the two were indistinguishable; if a bay
   ever grows large enough for that to show, raise the number. It is one value
   in one place (`BAY_DETAIL` in `MechSlots.tsx`).

   **It is worth much less than it looks, and only on a wide window.** Halving
   this again was measured on a 4× throttled phone as *no change whatsoever* —
   a phone has one or two bays on screen and the cost there is the face, not
   the boxes. On a 1512×900 desktop, where seven bays build, it took the
   entrance's remaining long task from 65ms to none. Do not reach for it as a
   fix for anything a handset is doing.

   **A failure here is silent and safe.** If the context did not reach a piece
   — a portal that does not forward it, say — `detail` stays 1 and the geometry
   is what it always was. The symptom is that the saving does not appear, never
   that something renders wrong. */

/** Multiplier on a rounded box's segment counts. 1 is as authored. */
export const Detail = createContext(1)

/* ---- how a subject is measured, as against how finely it is built ----

   drei's `Center` and `Resize` both default to `precise`, and a subject on
   this site is always inside both — one to put its middle at the origin, one
   to normalise it to a unit cube. `precise` means `Box3.setFromObject(obj,
   true)`, which does not read the geometry's own bounding box: it walks
   **every vertex** through `Object3D.getVertexPosition`, and that function
   applies every morph influence and every skin weight per vertex.

   On `adam-face.glb` that is 113,502 vertices against 47 morph targets, twice
   — once for `Center` and once for `Resize` — on the single frame that bay
   mounts. Measured at 49ms of the entrance's 194ms long task on a 4×
   throttled phone. And it is not geometry the way `Detail` above is: cutting
   the segment counts does not touch it, which is why the two are separate
   knobs and why halving `Detail` alone measured as doing nothing at all.

   `precise={false}` uses `geometry.boundingBox` instead, computed once per
   geometry and cached on it — so eleven subjects sharing a cloned scene share
   one measurement. What it costs is that the box is the mesh's *rest* box
   rather than its posed one. Nothing in a bay is posed: the influences are
   zero and the skeletons are at bind pose on the frame this runs, and the
   bays were checked against the precise ones on screen.

   Provided by the bank and nowhere else, exactly like `Detail`. A project
   screen, the v2 gallery and the unmounted cast all keep the precise
   measurement they always had, so if the rest box ever *is* looser than the
   posed one, the place it would show is the place still measuring properly. */

/** Whether a subject's bounding box is measured vertex by vertex. */
export const Precise = createContext(true)

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
