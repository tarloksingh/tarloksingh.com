import { button, folder, useControls } from 'leva'
import { copyText } from './clipboard'
import { addNote, focus, notesFor, pins } from './notes'
import { entries } from './model'

/* ---- the label maker, on the panel ----

   The pin editor draws its own controls over the readout, which is the right
   place to *place* a label and the wrong place to copy one out: the overlay
   lives inside `.mech`, where the native cursor is hidden and every press is
   a placement, and a text field in there is a text field you cannot see
   yourself select. The panel has none of that — it is portalled to `body`,
   Leva owns its input handling, and it is already the thing on this page that
   hands source back for pasting.

   So the two halves are split by what they are for. Press **P** to place and
   drag; use this folder to get the result out.

   The buttons close over nothing. `focus.id` is the frame the readout is
   showing, written by `Mech` on every change — the same arrangement
   `modelTuning`'s copy button has with `live`, and for the same reason: Leva
   builds its schema once and a closure captured then is a render behind
   forever. */

/** Handed back so the caller can show the source when the clipboard cannot be
 *  trusted — which, on a plain http origin, is always. See `clipboard.ts`. */
export type Handed = { text: string; copied: boolean } | null

const notesOf = (id: string) => {
  const entry = entries.find((item) => item.frames.some((frame) => frame.id === id))
  const frame = entry?.frames.find((item) => item.id === id)
  return entry && frame ? notesFor(entry, frame) : []
}

export function useLabelTuning(onHanded: (handed: Handed) => void) {
  const hand = (text: string) => {
    // eslint-disable-next-line no-console
    console.log(`[pins] paste into NOTES in src/v3/notes.ts:\n\n${text}`)
    void copyText(text).then((copied) => onHanded({ text, copied }))
  }

  useControls({
    Labels: folder(
      {
        'Add a line': button(() => {
          if (!focus.id) return
          // Down the middle of the picture, since there is nothing to click
          // on out here. Drag it where it belongs with P.
          const notes = notesOf(focus.id)
          addNote(focus.id, [0.5, 0.3 + (notes.length % 4) * 0.14], notes)
        }),
        'Copy this frame': button(() => hand(pins.source(focus.id))),
        'Copy every frame': button(() => hand(pins.source())),
        'Revert this frame': button(() => {
          if (focus.id) pins.clear(focus.id)
        })
      },
      { collapsed: true }
    )
  })
}
