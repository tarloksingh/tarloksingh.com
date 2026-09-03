/* ---- clearing every panel at once ----

   Each tuning hook keeps a scratchpad in `localStorage` that is merged *over*
   its `_DEFAULTS` constant, so a stale save shadows freshly pasted source
   until it is cleared — see **A panel's scratchpad beats source** in
   `README.md`. Every panel's **Reset** used to clear only its own key, which
   meant "reset" on one tab left the other seven scratchpads in place and the
   page still did not match the code. There is one list of keys now and one
   button behaviour: Reset on any tab wipes all of them and reloads. */

export const TUNING_KEYS = [
  'v3.cluster.tuning.v1',
  'v3.cast.tuning.v2',
  'v3.castTags.v1',
  'v3.name.tuning.v1',
  'v3.narrow.tuning.v2',
  'v3.model.tuning.v3',
  'v3.model.tuning.v3.rigs',
  'v3.notes.v1',
  'v3.product.tuning.v1',
  'v3.wall.tuning.v1',
  'v3.station.tuning.v1'
] as const

/** Wipe every panel scratchpad and reload, so the page comes back on exactly
 *  what the source constants say. Wired to the Reset button on every tab. */
export function resetAllTuning() {
  try {
    for (const key of TUNING_KEYS) window.localStorage.removeItem(key)
  } catch {
    /* private mode, a locked store — the reload below still gives a clean read */
  }
  window.location.reload()
}
