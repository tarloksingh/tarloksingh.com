import { button, useControls, useCreateStore } from 'leva'
import { copyText } from './clipboard'
import { CAST } from './heroes'

/* ---- where a cast subject's tag sits ----

   Pointing at a subject on the home stage names the project it opens, and the
   tag it names it with is the project screen's own leader — same three
   circles, same hairline, same type. Where that leader *reaches* was three
   constants and a rule: up and to the left, unless the subject was past the
   middle of the stage, in which case up and to the right.

   Which is a composition for one subject and a guess for five. Mr. Takahashi
   stands high and near, the rider is low and turned away, and the fish sits
   in the top right corner — a fan drawn to one shape has a label over a face
   on one of them and a label off the edge of the frame on another. So the
   same thing that is true of a project's readout is true here: the line that
   names a subject has to touch that subject, and no constant knows where
   that is.

   This is the other half of `notes.ts`, for the stage rather than for a
   picture, and it works the same way: press **P** on the home screen, drag
   the dot to where the line should touch and the label to where it should
   read, and copy the table out. Everything is held in `localStorage` while
   you work and **nothing reaches a visitor until it has been pasted** into
   `CAST_TAGS` below.

   The one real difference from a note is what the numbers are measured
   against. A note is a fraction of the picture's box, because a picture has
   edges. A subject has none — it is a thing standing in a scene, drifting on
   its float, and the only fixed point it has is where the camera happens to
   be projecting it this frame. So these are **frame coordinates offset from
   that point**: the same 1920×1080 units the leaders are drawn in, measured
   out from wherever the subject currently is. Which is what makes the tag
   ride the float instead of being pinned to a patch of screen the subject
   swims away from. */

/** The leader's shape, in frame coordinates. `rise` and `run` are where the
 *  elbow sits when nobody has placed one; `bar` is the horizontal the text
 *  is set on, and stays a constant on purpose — it is the same bar every
 *  leader on the site has, and a per-subject one would make five different
 *  kinds of label. */
export const TAG = { rise: 84, run: 110, bar: 190 }

export interface CastTag {
  /** Where the line touches, offset from the subject's projected position. */
  at: [number, number]
  /** Where it bends and the text is set, in the same offsets. Which side the
   *  bar and the type run off is taken from this — right of the touch point
   *  reads to the right, left of it reads to the left — so there is nothing
   *  else to set. */
  to: [number, number]
}

/** Placed subjects. Anything not named here falls back to the fan — see
 *  `tagFor`. Paste the Tags panel's copy button over this. */
export const CAST_TAGS: Record<string, CastTag> = {}

/** Where a subject's tag goes when nobody has placed it: up, and out toward
 *  whichever side of the stage has the room. `spotX` is the subject's own
 *  position as a fraction of the canvas — 0.55 rather than 0.5 because the
 *  readout is down the left of the screen and a label reaching left from just
 *  past the middle still clears it. */
export const looseTag = (spotX: number): CastTag => {
  const side = spotX > 0.55 ? -1 : 1
  return { at: [0, 0], to: [TAG.run * side, -TAG.rise] }
}

/* ---- the draft ----

   Same shape as `pins` in `notes.ts`, and for the same reasons: a store
   rather than component state, because the editor and the tag are in
   different halves of the tree and both have to see the same drag; and
   localStorage behind it, debounced, because a drag writes on every pointer
   move and the store keeps up where the disk does not need to. */

const STORE_KEY = 'v3.castTags.v1'

type Draft = Record<string, CastTag>

const load = (): Draft => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Draft) : {}
  } catch {
    return {}
  }
}

let draft: Draft = typeof window === 'undefined' ? {} : load()
const listeners = new Set<() => void>()

let save = 0
const persist = () => {
  window.clearTimeout(save)
  save = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(draft))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
  }, 250)
}

const changed = () => {
  for (const listener of listeners) listener()
  persist()
}

const round = (n: number) => Number(n.toFixed(1))

export const castPins = {
  /** The whole draft. Handed to `useSyncExternalStore`, so it has to be the
   *  same object until something actually changes. */
  snapshot: () => draft,

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  set(heroId: string, tag: CastTag) {
    draft = { ...draft, [heroId]: tag }
    changed()
  },

  /** Back to whatever source says for this subject, which for most of them is
   *  nothing at all — so this puts one back on the fan. */
  clear(heroId?: string) {
    if (!heroId) {
      draft = {}
    } else {
      const { [heroId]: gone, ...rest } = draft
      void gone
      draft = rest
    }
    changed()
  },

  /** Every subject placed in this browser, as the source of the table above.
   *  In `CAST` order rather than the order they were dragged, so the constant
   *  reads down the roster. */
  source() {
    const body = CAST.filter((hero) => draft[hero.id])
      .map((hero) => {
        const tag = draft[hero.id]
        return `  ${hero.id}: { at: [${round(tag.at[0])}, ${round(tag.at[1])}], to: [${round(tag.to[0])}, ${round(tag.to[1])}] }`
      })
      .join(',\n')
    return `export const CAST_TAGS: Record<string, CastTag> = {\n${body}\n}`
  }
}

/** What a subject's tag is right now: the draft if this browser has one, the
 *  table if it has been pasted, and the fan if neither. */
export const tagFor = (heroId: string, spotX: number, drafts: Draft = draft): CastTag =>
  drafts[heroId] ?? CAST_TAGS[heroId] ?? looseTag(spotX)

/** Whether this one has actually been placed, or is only sitting where the fan
 *  put it — which is the difference the editor draws as a dashed handle. */
export const isPlaced = (heroId: string, drafts: Draft = draft): boolean =>
  Boolean(drafts[heroId] ?? CAST_TAGS[heroId])

/* ---- the panel half ----

   Split from the overlay by what each half is for, exactly the way the
   project screen's label maker is (see the note at the top of
   `labelTuning.ts`): placing wants to be over the stage, and getting the
   result out wants to be somewhere the native cursor exists and a text
   selection is visible. This is the second half, and it is its own store so
   it is its own tab. */
export function useCastTagTuning() {
  const store = useCreateStore()

  useControls(
    {
      'Place them — press P': button(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }))
      }),
      'Copy for source': button(() => {
        const text = castPins.source()
        void copyText(text)
        // eslint-disable-next-line no-console
        console.log(`[cast tags] paste over CAST_TAGS in src/v3/castTags.ts:\n\n${text}`)
      }),
      'Revert every subject': button(() => castPins.clear())
    },
    { store }
  )

  return store
}
