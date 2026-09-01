import { MENU } from './model'
import { hasSubject } from './MechSlots'
import type { Tag } from '../data/projects'

/* ---- what the bank is made of ----

   The roster, flattened into what a slot draws, plus the field scale the
   cluster reads it against. It is its own module because two components need
   it now: `MechBank.tsx` draws the slots, and `MechCluster.tsx` reads the same
   rows for the counts and the field dials. A `const` in one component's file
   that another component imports is a circular import waiting to happen the
   first time the traffic goes the other way.

   Everything here is worked out once, on the module. Eleven slots re-deriving
   their own tags and roles on every pointer move is real work on the one
   interaction this screen has. */

export type Field = 'design' | 'code' | 'film' | 'games' | 'product'

/** The scale, in the order it is printed. Three, not five — `games` and
 *  `film` dropped off the dial row entirely rather than being left to
 *  overflow the rail's own width. */
export const FIELDS: Field[] = ['product', 'code', 'design']

/** What each field reads on the dial row — not always the field's own key.
 *  `design` prints as "brand" here: the row is Product / Code / Brand, and the
 *  underlying `Field` stays `design` because that is still what `FIELD_OF`
 *  maps `3d` tags onto. Cosmetic, and kept separate from the key on purpose —
 *  the key is a fact about the data, the label is a fact about this scale. */
export const FIELD_LABEL: Record<Field, string> = {
  design: 'brand',
  code: 'code',
  film: 'film',
  games: 'games',
  product: 'product'
}

/** Which field each of a project's tags falls under.
 *
 *  An editorial mapping, and it has to be — `TAGS` in projects.ts is a filter
 *  row written for browsing, and this is a five-mark scale on an instrument.
 *  Kept here rather than on the data because it is a fact about *this readout*
 *  and not about the projects. */
export const FIELD_OF: Record<Tag, Field> = {
  '3d': 'design',
  tools: 'code',
  film: 'film',
  motion: 'film',
  music: 'film',
  'video games': 'games',
  hardware: 'product',
  work: 'product'
}

/** A role, split into the things it actually is. "Founder & Product Designer"
 *  is two jobs printed as one string, and the display cycles them. */
export const rolesOf = (role: string): string[] =>
  role
    .split(/[&,/]/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)

export interface Slot {
  id: string
  title: string
  tagline: string
  company: string
  timeline: string
  year: number
  fields: Field[]
  /** What I did on it, one job per entry — what the left display reads out
   *  while this slot is up. */
  roles: string[]
  /** No material yet: Visa is under an NDA, Solomon's write-up is still to
   *  come. The slot says so rather than being left out of the bank — both are
   *  real work, and a gap at position 01 would read as a bug. */
  restricted: boolean
  /** Whether there is a subject to stand in the slot — a model or a piece.
   *  Visa is the only one without, and its slot says so rather than being left
   *  out of the bank. */
  solid: boolean
}

/** `MENU`'s own order, which is a decision about what to lead with rather than
 *  a sort — see `MENU_IDS` in model.ts. So slot 01 is the work that should be
 *  seen first, and the number on a slot means something. */
export const SLOTS: Slot[] = MENU.map((item) => ({
  id: item.project.id,
  title: item.project.title,
  tagline: item.project.tagline,
  company: item.project.company,
  timeline: item.project.timeline,
  year: item.project.year,
  fields: [...new Set(item.project.tags.map((tag) => FIELD_OF[tag]).filter(Boolean))],
  roles: rolesOf(item.project.role),
  restricted: Boolean(item.project.restricted),
  solid: hasSubject(item.project.id)
}))

/** Where a project sits in the bank, or `null` if it is not in it. */
export const slotOf = (id: string | null) => {
  if (!id) return null
  const at = SLOTS.findIndex((slot) => slot.id === id)
  return at < 0 ? null : at
}
