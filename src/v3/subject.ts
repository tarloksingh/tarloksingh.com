/* Two live facts about the thing on the stage.

   Both are mutable objects at module scope, which is unusual for this
   codebase and worth the exception: each is a single number pair that things
   on opposite branches of the tree need every frame, and one of those
   branches is on the far side of a Canvas. Threading refs down through the
   project screen, the stage and an R3F boundary would be a lot of plumbing
   for values that are never rendered and never cause a re-render.

   Nothing here is state. Whoever writes it writes it from a frame loop, and
   whoever reads it reads it from one. */

export const gaze = {
  /** Where the face should be looking, in client pixels. Set whenever the
   *  bird is in the air — the face prefers it, because something crossing the
   *  room beats a cursor sitting still. */
  bird: { x: 0, y: 0, active: false }
}

export const orbit = {
  /** Degrees the visitor has turned the subject by hand, dragging the stage.
   *  Kept rather than sprung back: turning the thing is something you did,
   *  and undoing it the moment you let go says it was not really yours to
   *  turn. `active` is only for the readout, which dims when nobody is. */
  az: 0,
  el: 0,
  active: false
}

export const drift = {
  /** How far the subject has floated from where it is nominally framed, in
   *  frame coordinates — the same 1920×1080 the leaders are drawn in, so they
   *  can ride along by adding it. Converted from world units on the way out,
   *  because only the camera knows the exchange rate. */
  x: 0,
  y: 0
}
