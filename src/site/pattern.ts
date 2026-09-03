/* The background wallpaper's one moving part.
 *
 * `.site-pattern` (tokens.css) is a fixed layer, so by default it sits dead
 * still while the page moves over it. Writing `--pattern-shift` slides its
 * background-position, which is what makes it drift against the content —
 * cheap, because moving a background-position on a fixed layer repaints one
 * composited layer and touches no layout.
 *
 * It lives here rather than in either screen because both drive it and
 * neither owns it: the stage scrolls a virtual scroll (Gallery.tsx) and a
 * case study scrolls the document (ProjectPage.tsx). Both express their
 * position in *screens travelled*, so one drift number means the same thing
 * on either.
 *
 * The axis is the caller's to pick, and the two screens do not agree on it —
 * the stage travels sideways along a row of cases, a case study runs down a
 * page. Drift across the direction of travel reads as a mistake rather than
 * as depth, so each drives the axis it actually moves on. */

/** How far the wallpaper has drifted, in px, on each axis. Screens call this
 *  per frame and pass 0 for the axis they do not move on. */
export function setPatternShift(x: number, y: number) {
  const root = document.documentElement.style
  root.setProperty('--pattern-shift-x', `${x.toFixed(1)}px`)
  root.setProperty('--pattern-shift-y', `${y.toFixed(1)}px`)
}

/** Park it. Called when a screen that drives the drift unmounts, so the next
 *  one doesn't inherit a stale offset it never set. */
export function clearPatternShift() {
  const root = document.documentElement.style
  root.removeProperty('--pattern-shift-x')
  root.removeProperty('--pattern-shift-y')
}

/* Where the tuning panel writes its settings — the gallery's store, because
   the panel lives in the 3D chunk and that is the one it already keeps (see
   `STORE_KEY` in Gallery3D.tsx). A case study reads it from here rather than
   importing anything from that chunk: the whole point of splitting it out is
   that a page which shows no 3D never downloads it.

   Read once on mount, not subscribed to. The panel is only on the stage, so
   there is nothing on this side that could change mid-visit — going back and
   turning it on means coming back through the stage anyway. */
const STORE_KEY = 'gallery.tuning.v2'

export function readPatternSettings(): { parallax: boolean; drift: number } {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      const store = raw as Record<string, unknown>
      return {
        parallax: store.patternParallax === true,
        drift: typeof store.patternDrift === 'number' ? store.patternDrift : 0
      }
    }
  } catch {
    // An unavailable or malformed store just means the experiment is off,
    // which is its default anyway.
  }
  return { parallax: false, drift: 0 }
}
