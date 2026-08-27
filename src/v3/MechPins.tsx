import { useRef, useState } from 'react'
import { boxOf, leadersFor, pointIn, type Box } from './leaders'
import { addNote, pins, type Note } from './notes'
import { sound } from './sound'
import type { Frame } from './model'

/* Pinning the leaders.

   The readout names parts of a picture, and which part is the whole point —
   "3D model" pointing at a shoulder is a caption, not a readout. Nothing in
   the geometry is worth typing by hand, so this is the thing that types it:
   press **P** on a project screen, click the spot on the picture you mean,
   drag the label to where it should sit, write the two words, and copy the
   whole frame's entry into `notes.ts`.

   Everything is stored as a fraction of the subject's box, never as pixels,
   so a note pinned on a laptop still points at the same eyebrow on a 4K
   display and on a portrait still that lands somewhere else entirely.

   Development only. It is imported behind `import.meta.env.DEV`, so it is not
   in the bundle a visitor downloads. */

interface Props {
  frame: Frame
  notes: Note[]
  onClose: () => void
}

/** Client pixels to a fraction of the subject's box. The overlay is the whole
 *  1920×1080 frame, so a point in it converts through the frame first — and
 *  reading the rect per drag rather than per move keeps a drag from measuring
 *  layout on every pointer event. */
const fractionIn = (rect: DOMRect, box: Box, x: number, y: number): [number, number] => [
  Number((((x - rect.left) / rect.width) * 1920 - box.x) / box.w),
  Number((((y - rect.top) / rect.height) * 1080 - box.y) / box.h)
]

export default function MechPins({ frame, notes, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const box = boxOf(frame)
  const laid = leadersFor(notes, box)
  // Set for the length of a drag, and read by the overlay's own click handler
  // so letting go of a handle over the picture does not also add a note.
  const dragging = useRef(false)
  const [live, setLive] = useState<number | null>(null)

  const write = (next: Note[]) => pins.set(frame.id, next)

  const edit = (index: number, change: Partial<Note>) =>
    write(notes.map((note, i) => (i === index ? { ...note, ...change } : note)))

  /* A drag pins both ends at once, whichever one was grabbed. An unpinned
     note is sitting wherever the fan put it, and pinning only the end that
     moved would leave the other to jump to a slot it no longer shares. */
  const grab = (index: number, end: 'at' | 'to') => (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = host.current?.getBoundingClientRect()
    if (!rect) return

    const laidOut = laid[index]
    const seat: Pick<Note, 'at' | 'to'> = {
      at: notes[index].at ?? [(laidOut.tip[0] - box.x) / box.w, (laidOut.tip[1] - box.y) / box.h],
      to: notes[index].to ?? [(laidOut.anchor[0] - box.x) / box.w, (laidOut.anchor[1] - box.y) / box.h]
    }

    dragging.current = true
    setLive(index)
    const node = event.currentTarget as HTMLElement
    node.setPointerCapture(event.pointerId)

    const move = (moved: PointerEvent) => {
      edit(index, { ...seat, [end]: fractionIn(rect, box, moved.clientX, moved.clientY) })
    }
    const drop = () => {
      node.releasePointerCapture(event.pointerId)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', drop)
      setLive(null)
      // Cleared a tick late, so the click this pointerup is about to raise
      // still sees the drag.
      window.setTimeout(() => {
        dragging.current = false
      }, 0)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', drop)
  }

  /** A new line, pointing at a fraction of the picture, with its text out to
   *  whichever side has more room. Shared with the panel's own button, which
   *  drops one down the middle. */
  const addAt = (at: [number, number]) => addNote(frame.id, at, notes)

  /** Clicking the picture adds a note there. Anywhere else on the overlay is
   *  a miss and does nothing — the frame's own edges are the only thing that
   *  make a fraction mean anything, which is why the box is drawn and why the
   *  bar has a button for people who would rather not guess. */
  const add = (event: React.PointerEvent) => {
    if (dragging.current) return
    const rect = host.current?.getBoundingClientRect()
    if (!rect) return
    const at = fractionIn(rect, box, event.clientX, event.clientY)
    if (at[0] < -0.02 || at[0] > 1.02 || at[1] < -0.02 || at[1] > 1.02) return
    addAt(at)
  }

  /** Hands the source over: to the clipboard if this page is allowed one, and
   *  to a panel you can select out of if it is not. Either way it goes to the
   *  console, which is the one place it can always be got at. */
  const place = (x: number, y: number) => ({
    left: `calc(${x} * var(--px))`,
    top: `calc(${y} * var(--px))`
  })

  return (
    <div className="mech-pins" ref={host} onPointerDown={add}>
      {/* The picture's own edges, which is what every fraction is measured
          against. Without it you are guessing where the box ends on a still
          that does not fill its slot. */}
      <div
        className="mech-pins-box"
        style={{
          ...place(box.x, box.y),
          width: `calc(${box.w} * var(--px))`,
          height: `calc(${box.h} * var(--px))`
        }}
      >
        <span>click anywhere in here to add a line</span>
      </div>

      {laid.map((leader, i) => {
        const tip = notes[i].at ? pointIn(box, notes[i].at) : leader.tip
        // `to` is the corner the leader runs into, which is the corner the
        // card grows away from — so the grip belongs on the same spot rather
        // than out at the far end the text used to be set from.
        const text = notes[i].to ? pointIn(box, notes[i].to) : leader.anchor
        return (
          <div key={i} className="mech-pin-note" data-live={live === i} data-loose={!notes[i].at}>
            <button
              className="mech-pin-tip"
              style={place(tip[0], tip[1])}
              onPointerDown={grab(i, 'at')}
              title="Drag to the spot this line points at"
              aria-label="Move the point"
            />
            <div className="mech-pin-chip" style={place(text[0], text[1])} onPointerDown={(e) => e.stopPropagation()}>
              <span className="mech-pin-grip" onPointerDown={grab(i, 'to')} title="Drag the label" />
              {/* The handle, which never appears on the readout — see `Note`
                  in notes.ts. Narrow on purpose: the room in this chip belongs
                  to the sentence next to it. */}
              <input
                className="mech-pin-name"
                value={notes[i].label}
                spellCheck={false}
                onChange={(event) => edit(i, { label: event.target.value })}
                aria-label="Name for this line"
              />
              <input
                className="mech-pin-say"
                value={notes[i].value}
                spellCheck={false}
                placeholder="what the card says"
                onChange={(event) => edit(i, { value: event.target.value })}
                aria-label="What the card says"
              />
              <input
                className="mech-pin-fold"
                value={notes[i].fold ?? ''}
                placeholder="fold"
                spellCheck={false}
                onChange={(event) => edit(i, { fold: event.target.value || undefined })}
                aria-label="Fold this line is evidence for"
              />
              <button
                className="mech-pin-drop"
                onClick={() => write(notes.filter((_, at) => at !== i))}
                aria-label="Remove this line"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}

      <div className="mech-pins-bar" onPointerDown={(event) => event.stopPropagation()}>
        <span className="mech-pins-id">{frame.id}</span>
        <span className="mech-pins-hint">{notes.length} line{notes.length === 1 ? '' : 's'} · drag the dot and the label</span>
        <button
          className="mech-pins-add"
          onClick={() => {
            // Down the middle, stepped, so pressing it three times does not
            // stack three lines on one spot.
            sound.select()
            addAt([0.5, 0.3 + (notes.length % 4) * 0.14])
          }}
        >
          + line
        </button>
        <span className="mech-pins-hint">copy and revert are on the tuning panel</span>
        <button onClick={onClose}>done · P</button>
      </div>

    </div>
  )
}
