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
  /** The thing on the stage, while it is a model rather than a picture: a box
   *  in client pixels and what to do when a bolt lands inside it. Registered
   *  by the project screen, which is the only thing that knows where the
   *  subject is framed. A still is not a target — shooting a photograph of
   *  something is shooting a photograph. */
  subject: null as null | { rect: () => DOMRect | null; hit: () => void },

  /** How near a bolt has to pass, in client pixels. Generous on purpose, and
   *  for a reason beyond the bird being 38px of thin line: a bolt takes about
   *  a fifth of a second to cross the screen and the bird covers forty pixels
   *  in that time, so a shot aimed dead at it lands where it *was*. Leading
   *  the target is the skill; needing to lead it to hit it at all is not. */
  radius: 46,

  /** Everything on the page a bolt can bring down.
   *
   *  A set rather than the single slot this used to be. One creature could
   *  own `quarry.hit` outright; two cannot — the second to mount would
   *  quietly replace the first, and only one of them would ever be
   *  shootable. Each registers itself on mount and removes itself on
   *  unmount, and the gun walks the set without knowing what is in it. */
  creatures: new Set<Creature>()
}

/** Something that can be shot. */
export interface Creature {
  /** Where it is right now, in client pixels, or null while it is not on the
   *  page. Read from inside the gun's own frame loop, several times a frame,
   *  and never rendered — which is why this is a function rather than state. */
  at: () => { x: number; y: number } | null
  /** Returns true if this shot is what brought it down, so a bolt arriving a
   *  frame after something else killed it does not fire a second burst. */
  hit: () => boolean
}

/** When the subject was last hit, on the `performance.now()` clock. Read from
 *  inside the Canvas's frame loop; written from a pointer event outside it.
 *  Zero means it has never happened. */
export const flinch = { at: 0 }

/** Where on the home stage the subject being pointed at currently is, as a
 *  fraction of the canvas — `{0,0}` top left, `{1,1}` bottom right.
 *
 *  Published rather than passed, and for the same reason `drift` is: it
 *  changes every frame and nothing that reads it wants a re-render. The tag
 *  that names the subject is an SVG leader drawn *outside* the Canvas, in the
 *  stage's own coordinates, so it has to be told where the thing it is
 *  pointing at ended up on screen — which is only knowable after the camera
 *  has projected it, inside the frame loop.
 *
 *  `id` is which subject, or null while nothing is being pointed at.
 *
 *  `spots` is the same number for *every* subject, whether it is being
 *  pointed at or not, keyed by hero id. The tag only ever needs the one, but
 *  the tag *editor* draws all five at once — placing a group means seeing
 *  where the other four are while you drag one, which is the same reason the
 *  cast panel has a folder per subject rather than a folder for the selected
 *  one. Five projections a frame is nothing; five that are only computed
 *  while a dev overlay happens to be open is a special case to get wrong. */
export const aim = {
  x: 0.5,
  y: 0.5,
  id: null as string | null,
  spots: {} as Record<string, { x: number; y: number }>
}
