import type { CSSProperties } from 'react'
import { MENU_VINE } from './frames'
import './Menu.css'

/* The three words every screen on the site answers to: Home, Work, Contact.
 * One component rather than one written into each screen, so the two never
 * quietly drift apart — before this, the stage's own nav and a case study's
 * were two hand-written copies of the same three links, and only one of them
 * had the vine's sprigs on it.
 *
 * No `.u-link` here, and no plain bar under the current item — `MenuVine`
 * below is the underline: a vine as long as the word, growing out from under
 * its left edge and closing in a bud past its right, in the same hand as the
 * frames and the sprigs. It is the only thing a menu item draws. A `Sprig`
 * used to grow above and below the word as well and a single flower stood in
 * for the rule, and both read as clutter round the word rather than as a mark
 * under it.
 *
 * `current` is the whole of what tells the two live sections apart; a case
 * study always answers `'work'`, since reading one is being in the work the
 * same way standing at the drum is. Contact never marks — it leaves the page
 * rather than being a third place on it, on every screen this appears on. */

function MenuVine() {
  return (
    /* The box keeps its ratio and takes the word's own width (`.mn-vine`,
       Menu.css), so the vine is as long as the word it belongs to and a
       longer word gets a proportionally larger drawing rather than a
       stretched one. `preserveAspectRatio="none"` would fit any width
       exactly, and squash the bud and the leaves doing it. */
    <svg className="mn-vine" viewBox="0 0 100 26" fill="none" focusable="false" aria-hidden="true">
      {MENU_VINE.map((d, i) => (
        <path key={d} d={d} pathLength="1" strokeDasharray="1" style={{ '--sp-i': i } as CSSProperties} />
      ))}
    </svg>
  )
}

interface MenuProps {
  /** Which of the two live sections this screen is standing in. */
  current: 'home' | 'work'
  onHome: () => void
  onWork: () => void
  /** Lets each screen still pin the nav where it belongs — fixed on the
   *  stage, sitting in a sticky bar on a case study — without the placement
   *  becoming part of what "the menu" means. */
  className?: string
}

export default function Menu({ current, onHome, onWork, className }: MenuProps) {
  return (
    <nav className={className ? `mn ${className}` : 'mn'} aria-label="Main">
      <button
        type="button"
        className="mn-item"
        data-on={current === 'home'}
        aria-current={current === 'home' ? 'true' : undefined}
        onClick={onHome}
      >
        home
        <MenuVine />
      </button>
      <button
        type="button"
        className="mn-item"
        data-on={current === 'work'}
        aria-current={current === 'work' ? 'true' : undefined}
        onClick={onWork}
      >
        work
        <MenuVine />
      </button>
      {/* Never marked: see the note above. */}
      <a className="mn-item" href="mailto:tarloksinghfilms@gmail.com">
        contact
        <MenuVine />
      </a>
    </nav>
  )
}
