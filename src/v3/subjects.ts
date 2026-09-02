/* ---- what stands in a slot, named without loading any of it ----

   This module imports nothing, and that is its entire job.

   `bank.ts` needs one fact about every project — is there a subject to put in
   its bay, or does the slot read "no signal" — and it used to get it by
   importing `hasSubject` from `MechSlots.tsx`. That is a one-line predicate
   sitting in a file that imports three, drei and every piece in
   `MechProduct.tsx`, and `bank.ts` is imported by `Mech.tsx` itself. So asking
   "does Visa have an object?" pulled the whole 3D stack into the chunk that
   has to arrive before the page can paint anything at all — which defeated
   every `lazy()` boundary around it, because a dependency that is already in
   the eager chunk is not deferred by being imported a second time behind a
   `lazy`.

   The registries live here instead and the heavy files read them back. Both
   are plain data, and both are *declarations* rather than implementations: the
   file that draws a GLB imports the paths from here, and the file that builds
   the pieces is typed against the ids here, so a piece added on one side and
   not the other is a type error rather than a slot that quietly goes empty.

   Keep it importing nothing. A single `import` of anything under `three/`,
   `@react-three/*` or `./MechProduct` reopens the trap by the back door and
   nothing on the page will look different when it does — the only symptom is
   half a megabyte arriving before first paint. */

/** Which projects have a GLB rather than a piece built out of primitives.
 *
 *  Solomon's rider is here rather than in `model.ts`'s `MODELS` because it is
 *  not a subject of the case study — the game is a sibling checkout and the
 *  file is copied in. `heroes.ts` had the same three, for the same reason. */
export const GLBS: Record<string, string> = {
  'a-game': '/models/akira-rider.glb',
  'mr-takahashi': '/models/adam-face.glb',
  'capsule-c1': '/models/capsule-c1.glb',
  /* The two games' subjects. They were pieces until the files arrived — and
     the same piece, a `DiscHolder`, for both of them, so this bank held two
     identical objects two rows apart. Keep these in step with `MODELS` in
     `model.ts`: a project whose subject is a GLB on its own screen and a
     primitive in its slot is a project that changes shape when you open it. */
  'grand-theft-auto-v': '/models/gta-v-rifle.glb',
  'red-dead-redemption-2': '/models/rdr2-revolver.glb',
  /* Was a `WyteCard` piece built from primitives until the export arrived. */
  'wyte-card': '/models/wyte-card.glb'
}

/** Every project with a piece built out of primitives, in `MechProduct.tsx`.
 *
 *  `PIECES` there is typed `Record<PieceId, …>`, so this list and that
 *  registry cannot drift: adding a piece without naming it here, or naming one
 *  here that has no component, is a build error. */
export const PIECE_IDS = [
  'mecha-station',
  'openup',
  'stitchfam',
  'block-builder',
  'slider-engine'
] as const

export type PieceId = (typeof PIECE_IDS)[number]

const PIECE_SET: ReadonlySet<string> = new Set(PIECE_IDS)

/** Whether a project has a piece built for it at all. */
export const hasPiece = (project: string) => PIECE_SET.has(project)

/** Whether a project has anything at all to stand in its slot. Visa is the
 *  only one that does not, and its slot says "no signal" rather than being
 *  left out of the bank — see `SlotBox` in MechCluster.tsx. */
export const hasSubject = (id: string) => Boolean(GLBS[id]) || hasPiece(id)
