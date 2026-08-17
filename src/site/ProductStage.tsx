import { useMemo } from 'react'
import type { MutableRefObject } from 'react'
import Gallery3D from '../three/Gallery3D'
import type { RoomLayout } from '../three/Gallery3D'
import { projects } from '../data/projects'
import { exhibitFor } from './products'

/* The only door to the 3D stack.

   three, @react-three/fiber, drei and every hand-built product between them
   come to well over a megabyte, and none of it is needed to paint the name,
   the field, or a case study. This module is the whole of that dependency,
   loaded on its own chunk the first time the gallery wakes — so the first
   thing a visitor sees does not wait on a renderer it is not using yet.

   Keep it that way. An import of `../three/*` or `./products` from anywhere
   outside this file pulls the entire stack back into the initial bundle, and
   nothing about the page will look different when it happens. */

const EMPTY_CASE = {
  node: null,
  turn: 0,
  lift: 1,
  floatIntensity: 0,
  floatRotation: 0,
  floatSpeed: 1
}

interface ProductStageProps {
  /** Project indices with a case in the row right now. */
  slots: number[]
  /** How many projects the row loops through. */
  count: number
  /** Which of them is being looked at. */
  focus: number
  /** Live scroll position, read inside the render loop. */
  progressRef: MutableRefObject<number>
  /** Room proportions, in fractions of the window — owned by Gallery.tsx so
   *  the cases and the copy beside them cannot disagree. */
  layout: RoomLayout
}

export default function ProductStage({ slots, count, focus, progressRef, layout }: ProductStageProps) {
  // Rebuilt only when the mounted set changes, not per frame: `node` calls
  // each product's builder, and for the video-backed ones that is where the
  // texture is created.
  const pieces = useMemo(
    () =>
      slots.flatMap((index) => {
        const project = projects[index]
        if (!project) return []
        // A project with no modelled piece still gets its case — an empty
        // vitrine is a truthful thing for a museum to have, and a gap in the
        // row where a case should be is not.
        const exhibit = exhibitFor(project.id)
        return [{ id: project.id, slot: index, ...(exhibit ?? EMPTY_CASE) }]
      }),
    [slots]
  )

  return <Gallery3D pieces={pieces} focus={focus} count={count} progressRef={progressRef} layout={layout} />
}
