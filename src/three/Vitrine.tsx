import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { BoxGeometry } from 'three'

/* A museum vitrine: an acrylic case standing on a solid plinth, with a piece
 * inside it.
 *
 * This is what turns a row of rendered products into a row of *exhibits*. An
 * object floating on a lit background is a product shot; the same object
 * behind glass on a pedestal is a piece someone chose to put there.
 *
 * ---- what makes it read as acrylic and not as a drawing ----
 *
 * The first version was a single hollow box at 5% opacity with a wireframe
 * laid over its edges, and it read as a *drawing of a case*. Three things were
 * missing, and they are the three things that make the real object legible in
 * a photograph:
 *
 *  - **Thickness.** What you actually see of a vitrine is its edges, and an
 *    edge is visible because you are looking through ten millimetres of
 *    acrylic end-on. A pane with no thickness has no edge to see, so one has
 *    to be drawn in — and a drawn line is a constant width that does not
 *    foreshorten, does not catch light, and does not double up where two panes
 *    meet, which is exactly what gives a wireframe away.
 *  - **The edge is brighter than the face.** This is the one that matters
 *    most. A sheet of acrylic is nearly invisible face-on and glows along
 *    every cut edge, because light entering the sheet is trapped by total
 *    internal reflection and can only leave where the sheet was cut. Painting
 *    the whole pane at one opacity gives frosted glass; painting the faces
 *    almost clear and the cut edges bright gives acrylic. Both come out of the
 *    same box — see the material array below.
 *  - **Shadows.** The plinth, the walls and the piece all cast. The piece's
 *    shadow on the plinth top and the hairlines the walls lay on the floor are
 *    what put this in a room rather than on a page.
 *
 * Everything is measured off the case's height, and the scene works in
 * viewport-height units (see `Gallery3D`), so a vitrine is the same fraction
 * of the window on every screen and none of these numbers is a pixel.
 */

/** Footprint side, as a fraction of the case's height. Square, so the case is
 *  the same object from any angle and the room can be walked around.
 *
 *  Corner-on, the case reads about 1.4x this wide on screen, so the number
 *  that decides whether it looks like a vitrine or a fish tank is this one and
 *  not the height. Tall and narrow: a display case is built around a person
 *  walking up to one object. */
const SIDE = 0.48
/** Pane thickness. Real museum acrylic is 8–12mm on a case about a metre tall,
 *  which is very close to this. */
const PANE = 0.015
/** Plinth height, as a fraction of the case's. One clean block, flush with the
 *  case — no cap, no lip, no reveal. A pedestal is a plain rectangular volume;
 *  every moulding added to it is a piece of furniture the eye has to explain. */
const PLINTH = 0.46
/** Where the piece hangs inside the case, 0 at the floor and 1 at the lid.
 *  Above the middle: a piece hung dead-centre reads as *stored*, and one a
 *  little high reads as presented. */
const HANG = 0.54

/** How tall the whole assembly is, as a multiple of the case's height. What
 *  `Gallery3D` needs to put the floor exactly under it rather than near it. */
export const VITRINE_TOTAL = 1 + PLINTH

interface VitrineProps {
  /** Height of the glass case, in world units. */
  height: number
  /** Whether the acrylic case and plinth are drawn at all. Off leaves the
   *  piece floating where the case's `HANG` would have placed it inside the
   *  case — so toggling this back on later does not move anything. Default
   *  on; `Gallery3D`'s `SHOW_CASE` is what flips it off for the whole row. */
  showCase?: boolean
  children?: ReactNode
}

export default function Vitrine({ height, showCase = true, children }: VitrineProps) {
  const side = height * SIDE
  const pane = height * PANE
  const plinthH = height * PLINTH
  const floorY = (-height * VITRINE_TOTAL) / 2

  const geo = useMemo(
    () => ({
      // The walls run the full height and the lid caps them, so the top corner
      // is a butt joint — which is how these cases are actually made, and it
      // doubles the acrylic exactly where a photograph shows the brightest
      // line.
      wall: new BoxGeometry(side, height, pane),
      lid: new BoxGeometry(side, pane, side),
      plinth: new BoxGeometry(side, plinthH, side)
    }),
    [side, height, pane, plinthH]
  )

  const caseY = floorY + plinthH + height / 2
  const half = side / 2 - pane / 2

  const walls: Array<{ position: [number, number, number]; rotation: [number, number, number] }> = [
    { position: [0, 0, half], rotation: [0, 0, 0] },
    { position: [0, 0, -half], rotation: [0, 0, 0] },
    { position: [half, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [-half, 0, 0], rotation: [0, Math.PI / 2, 0] }
  ]

  return (
    <group>
      {showCase && (
        <>
          {/* The plinth. Matte, and the only part of this with real value
              contrast — glass reads as glass because the thing underneath it
              does not. */}
          <mesh
            geometry={geo.plinth}
            position={[0, floorY + plinthH / 2, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color="#f4f1ea"
              roughness={0.95}
              metalness={0}
              envMapIntensity={2.1}
            />
          </mesh>

          <group position={[0, caseY, 0]}>
            {walls.map((wall, i) => (
              <mesh
                key={i}
                geometry={geo.wall}
                position={wall.position}
                rotation={wall.rotation}
                castShadow
              >
                <PaneMaterials />
              </mesh>
            ))}
            {/* No `castShadow` on the lid. Shadow maps know nothing about
                transparency, so a horizontal slab lays down a solid square at
                the same weight as the plinth's — a lid made of stone. The
                four upright walls do cast, and a thin upright slab casts the
                hairline a real case lays on the floor. */}
            <mesh geometry={geo.lid} position={[0, height / 2 - pane / 2, 0]}>
              <LidMaterials />
            </mesh>
          </group>
        </>
      )}

      {/* The piece. Standing on the plinth inside the case when the case is
          drawn; floating at the same spot when it is not. */}
      <group position={[0, floorY + plinthH + height * HANG, 0]}>{children}</group>
    </group>
  )
}

/* Six materials for the six sides of a slab, in `BoxGeometry`'s own group
   order — `+x, −x, +y, −y, +z, −z`.

   Which pair is a broad *face* and which four are cut *edges* depends on how
   the slab was built, and the two slabs here are built differently: a wall is
   `side × height × pane`, so its faces are ±z; the lid is `side × pane × side`,
   so its faces are ±y. Getting this wrong is not subtle — put the edge
   material on the lid's broad faces and the case comes out with a slab of
   frosted grey for a roof. */

/** For a wall: broad faces on ±z. */
function PaneMaterials() {
  return (
    <>
      <Edge attach="material-0" />
      <Edge attach="material-1" />
      <Edge attach="material-2" />
      <Edge attach="material-3" />
      <Face attach="material-4" />
      <Face attach="material-5" />
    </>
  )
}

/** For the lid: broad faces on ±y. */
function LidMaterials() {
  return (
    <>
      <Edge attach="material-0" />
      <Edge attach="material-1" />
      <Face attach="material-2" />
      <Face attach="material-3" />
      <Edge attach="material-4" />
      <Edge attach="material-5" />
    </>
  )
}

/** A broad face: almost not there. What you see of it is the sheen. */
function Face({ attach }: { attach: string }) {
  return (
    <meshPhysicalMaterial
      attach={attach}
      // Museum acrylic is not water-clear — it carries a faint green from the
      // cast sheet, and that tint is a good part of why a real case reads as a
      // material rather than as absence.
      color="#e9f1ec"
      transparent
      opacity={0.055}
      roughness={0.01}
      metalness={0}
      ior={1.49}
      // The sheen is the whole illusion. A clearcoat over an almost clear
      // surface adds a second specular lobe that climbs as the pane turns away
      // from the camera — the gradient across a real pane, nearly invisible
      // through the middle and bright where it turns.
      clearcoat={1}
      clearcoatRoughness={0.015}
      specularIntensity={1}
      reflectivity={0.62}
      envMapIntensity={3.6}
      // Deliberately *not* `transmission`. It is the physically right answer
      // and it does not work here: three renders the scene into a buffer for
      // the transmissive pass and clears it with the renderer's clear colour,
      // which on a transparent canvas premultiplies down to black — so every
      // pane comes out a sheet of dark grey. Giving it a background means
      // either an opaque canvas, which would paint over the field this fades
      // in on top of, or drei's sampler at one scene render per material, and
      // there are fifteen panes in the row.
      //
      // The panes are thin slabs standing in front of one another and the
      // depth sort between two of them is a coin toss that changes as the row
      // slides. Not writing depth takes the question away: nothing behind a
      // pane is ever culled by it, so the piece stays visible through the
      // front wall from every angle.
      depthWrite={false}
    />
  )
}

/** A cut edge: where the sheet's trapped light gets out. Ten times the face's
 *  presence in a strip one pane thick, which is the whole read of the object —
 *  and where two panes meet at a corner there are two of them, so the corner
 *  comes out brighter again, exactly as it does in a photograph. */
function Edge({ attach }: { attach: string }) {
  return (
    <meshPhysicalMaterial
      attach={attach}
      color="#dfece4"
      transparent
      opacity={0.62}
      roughness={0.06}
      metalness={0}
      ior={1.49}
      clearcoat={1}
      clearcoatRoughness={0.04}
      // The glow. Faint in absolute terms — the room is exposed at 0.1 — but
      // it is what stops the edges going to shadow on the faces turned away
      // from the key, which is where a real cut edge is *brightest*.
      emissive="#cfe3d6"
      emissiveIntensity={0.5}
      envMapIntensity={4}
      depthWrite={false}
    />
  )
}
