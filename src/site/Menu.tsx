import type { CSSProperties } from 'react'
import { MINI_BLOOM } from './frames'
import './Menu.css'

/* The three words every screen on the site answers to: Home, Work, Contact.
 * One component rather than one written into each screen, so the two never
 * quietly drift apart — before this, the stage's own nav and a case study's
 * were two hand-written copies of the same three links, and only one of them
 * had the vine's sprigs on it.
 *
 * No `.u-link` here, and no plain bar under the current item — `MenuBloom`
 * below is the underline, a small flower rather than a ruled line, and it
 * sits close enough under the word to read as one mark with it. It is the
 * only thing a menu item draws: a `Sprig` used to grow above and below the
 * word as well, and two flowers over and under a three-letter word read as
 * clutter round it rather than as a mark on it.
 *
 * `current` is the whole of what tells the two live sections apart; a case
 * study always answers `'work'`, since reading one is being in the work the
 * same way standing at the drum is. Contact never marks — it leaves the page
 * rather than being a third place on it, on every screen this appears on. */

function MenuBloom() {
  return (
    <svg className="mn-bloom" viewBox="0 0 40 24" fill="none" focusable="false" aria-hidden="true">
      {MINI_BLOOM.map((d, i) => (
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
        <MenuBloom />
      </button>
      <button
        type="button"
        className="mn-item"
        data-on={current === 'work'}
        aria-current={current === 'work' ? 'true' : undefined}
        onClick={onWork}
      >
        work
        <MenuBloom />
      </button>
      {/* Never marked: see the note above. */}
      <a className="mn-item" href="mailto:tarloksinghfilms@gmail.com">
        contact
        <MenuBloom />
      </a>
    </nav>
  )
}
