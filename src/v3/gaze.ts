/* Where the face is looking.

   One mutable object at module scope, which is unusual for this codebase and
   worth the exception: it is a single fact about the screen that two things
   on opposite branches of the tree both need every frame — the bird writes
   it, the face reads it — and threading a ref down through the project
   screen, the stage and a Canvas boundary would be a lot of plumbing for two
   numbers that are never rendered.

   Client pixels, not NDC: the bird lives in page coordinates and the face
   converts, rather than the bird having to know anything about a camera. */

export const gaze = {
  /** Set whenever the bird is in the air. The face prefers it — something
   *  crossing the room beats a cursor sitting still. */
  bird: { x: 0, y: 0, active: false }
}
