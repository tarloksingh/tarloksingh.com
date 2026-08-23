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

export const drift = {
  /** How far the subject has floated from where it is nominally framed, in
   *  frame coordinates — the same 1920×1080 the leaders are drawn in, so they
   *  can ride along by adding it. Converted from world units on the way out,
   *  because only the camera knows the exchange rate. */
  x: 0,
  y: 0
}

/* ---- what can be shot ----

   The laser and the bird live on opposite branches of the tree and neither
   owns the other, so the target registers itself here: one hitbox in client
   pixels and one function that says whether the shot actually landed. Same
   reasoning as `gaze` — a bolt tests this from inside its own frame loop,
   several times a frame, and none of it is ever rendered. */
export const quarry = {
  /** How near a bolt has to pass, in client pixels. Generous on purpose, and
   *  for a reason beyond the bird being 38px of thin line: a bolt takes about
   *  a fifth of a second to cross the screen and the bird covers forty pixels
   *  in that time, so a shot aimed dead at it lands where it *was*. Leading
   *  the target is the skill; needing to lead it to hit it at all is not. */
  radius: 46,
  /** Set by whatever is shootable while it is in the air. Returns true if the
   *  shot brought it down, so a bolt that arrives a frame after something
   *  else killed it does not fire a second burst. */
  hit: null as null | (() => boolean)
}
