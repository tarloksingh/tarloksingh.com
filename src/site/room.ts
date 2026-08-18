/* How the gallery is proportioned, in fractions of the window.

   A leaf module on purpose. Both sides of the lazy chunk boundary need these
   numbers — `Gallery.tsx` to place the wall labels, `three/Gallery3D.tsx` to
   place the cases — and the two have to travel exactly the same distance or
   the label drifts off its piece. A constant written out in both places is a
   constant that will be changed in one.

   It could not simply live in `Gallery3D` and be imported: that file is
   behind the lazy boundary, and any import of `../three/*` from `Gallery.tsx`
   pulls the whole 3D stack into the initial bundle (see ProductStage.tsx). So
   the numbers live here instead, in a module that imports nothing at all —
   and must go on importing nothing, or the same trap reopens by the back
   door. */

export interface RoomLayout {
  /** Distance between two vitrines, in viewport *widths*. The same number the
   *  copy panels step by. Already multiplied by the tuning panel's spacing —
   *  `Gallery.tsx` folds that in before handing this down, so there is one
   *  step and not a base and a correction. */
  stepW: number
  /** Height of a case, in viewport heights. The whole assembly — case, plinth,
   *  and the depth the near bottom corner adds once it is seen from above —
   *  comes to a little over half again this, so this is what keeps the room
   *  off the top and bottom of the window. */
  caseH: number
  /** How far the row is lifted, in viewport heights. Non-zero on a narrow
   *  window, where the label goes under the case rather than beside it. */
  caseY: number
  /** How far right the whole exhibit sits, in viewport widths.
   *
   *  The case is at the 3D scene's own centre — world x = 0, screen 50% — but
   *  the label stands to its left, so the *pair*, which is what you actually
   *  look at, sits left of the window's centre. This moves both of them the
   *  same distance right.
   *
   *  It has to move the row inside the scene and the label inside the page,
   *  and **not** the canvas: `.gl` clips to the window, so translating the
   *  canvas hides the far edge of it and pieces get cut off a fraction early
   *  on their way out of frame. Zero on a narrow window, where the label is
   *  under the case and the two are already centred. */
  shiftW: number
}

/** What the gallery's debug panel is allowed to change about the room. The
 *  panel is rendered inside the 3D chunk, because leva belongs to that chunk
 *  and not to the initial bundle — so its values come back up to this side,
 *  which owns the proportions, rather than being applied where they are set. */
export interface RoomTuning {
  /** Multiplier on `stepW`, both wide and narrow. */
  spacing: number
  /** `shiftW`, as a percentage rather than a fraction — a slider reading 7 is
   *  easier to aim than one reading 0.07. */
  shift: number
  /** Window width at and below which the label stacks under the case. */
  narrowAt: number
  /** The wall label's own width, in viewport widths — still capped at 25ch so
   *  it never grows past a comfortable line length, just as before. */
  panelW: number
  /** The wall label's minimum height, in viewport heights. Zero leaves it
   *  exactly as tall as its copy, same as before this existed. */
  panelH: number
}

/** Wide: the case is centred with the label beside it, and the next project
 *  waits two thirds of a window away, just off-frame. */
export const WIDE = { stepW: 0.66, caseH: 0.46, caseY: 0 }
/** Narrow: there is no *beside*, so a project takes the whole window, the case
 *  shrinks and rises into the top half, and the label goes underneath it. */
export const NARROW = { stepW: 1, caseH: 0.3, caseY: 0.15 }
/** Below this the label cannot stand beside the case. Adjustable live from the
 *  tuning panel, because where a two-column layout actually gives out is
 *  something you find by dragging a window edge, not by reasoning. */
export const NARROW_AT = 900
/** Default `shiftW`, as a percentage. Roughly half the label's own width. */
export const STAGE_SHIFT = 7
/** Default `panelW`, in viewport widths — the cap `.gl-panel` used before it
 *  was tunable. */
export const PANEL_W = 22
/** Default `panelH`, in viewport heights. Zero: no minimum, the panel is
 *  exactly as tall as its copy. */
export const PANEL_H = 0

/** A fixed reference viewport, in pixels — not a real breakpoint, just the
 *  ratio the row's horizontal spacing and the wall label's size and position
 *  are frozen against.
 *
 *  `stepW` and `shiftW` are fractions of a window *width*, and used to be
 *  converted into world units (`Gallery3D.tsx`) or pixels (`Gallery.tsx`) by
 *  the *live* width — so the row's spacing and the case's distance from the
 *  label both changed as the window was resized, even when only the width
 *  moved and nothing about the piece itself should have. Both sides now
 *  convert against this fixed ratio instead: everything in the row holds
 *  still on a width-only resize, and only scales when the window's *height*
 *  does, matching the one axis the camera itself already answers to (see
 *  `RoomLens` in Gallery3D.tsx). The label's own type and box size are frozen
 *  against `REF_W`/`REF_H` outright, for the same reason. */
export const REF_W = 1440
export const REF_H = 900
export const REF_ASPECT = REF_W / REF_H
