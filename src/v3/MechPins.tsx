import { useRef, useState } from 'react'
import { boxOf, leadersFor, pointIn, type Box } from './leaders'
import { pins, type Note } from './notes'
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

/** Where a brand new note's text lands before anyone has dragged it: out to
 *  the side there is more room on, and a little above the spot. */
const AWAY = 0.42

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
      to: notes[index].to ?? [(laidOut.end - box.x) / box.w, (laidOut.elbow[1] - box.y) / box.h]
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

  /** Clicking the picture adds a note there. Anywhere else on the overlay is
   *  a miss and does nothing — the frame's own edges are the only thing that
   *  make a fraction mean anything. */
  const add = (event: React.PointerEvent) => {
    if (dragging.current) return
    const rect = host.current?.getBoundingClientRect()
    if (!rect) return
    const at = fractionIn(rect, box, event.clientX, event.clientY)
    if (at[0] < -0.02 || at[0] > 1.02 || at[1] < -0.02 || at[1] > 1.02) return
    const side = at[0] > 0.5 ? 1 : -1
    write([...notes, { label: 'label', value: 'value', at, to: [at[0] + side * AWAY, at[1] - 0.1] }])
  }

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
      />

      {laid.map((leader, i) => {
        const tip = notes[i].at ? pointIn(box, notes[i].at) : leader.tip
        const text = notes[i].to ? pointIn(box, notes[i].to) : [leader.end, leader.elbow[1]]
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
              <input
                value={notes[i].label}
                spellCheck={false}
                onChange={(event) => edit(i, { label: event.target.value })}
                aria-label="Label"
              />
              <input
                value={notes[i].value}
                spellCheck={false}
                onChange={(event) => edit(i, { value: event.target.value })}
                aria-label="Value"
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
        <span className="mech-pins-hint">click the picture to add · drag the dot and the label</span>
        <button
          onClick={() => {
            const text = pins.source(frame.id)
            void navigator.clipboard?.writeText(text)
            // eslint-disable-next-line no-console
            console.log(`[pins] paste into NOTES in src/v3/notes.ts:\n\n${text}`)
          }}
        >
          copy this frame
        </button>
        <button
          onClick={() => {
            const text = pins.source()
            void navigator.clipboard?.writeText(text)
            // eslint-disable-next-line no-console
            console.log(`[pins] every frame pinned in this browser — paste over NOTES in src/v3/notes.ts:\n\n${text}`)
          }}
        >
          copy all
        </button>
        <button onClick={() => pins.clear(frame.id)}>revert</button>
        <button onClick={onClose}>done · P</button>
      </div>
    </div>
  )
}
