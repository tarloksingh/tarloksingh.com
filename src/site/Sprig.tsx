import type { CSSProperties } from 'react'
import { SPRIG } from './frames'
import './Sprig.css'

/* Two small vines, one on each side of whatever this is dropped into.
 *
 * They grow out of the thing while it is hovered, held, or marked as the place
 * you are standing in, and pull back off it when it is not — the same gesture
 * the frame around the name makes, at the size of a word.
 *
 * It draws itself with no JavaScript at all: the paths are normalised to
 * `pathLength="1"` and the dash offset is a CSS transition, so growing is a
 * `:hover` and retracting is the absence of one. That is not a shortcut. There
 * are up to a dozen of these on the page at once and every one of them is idle
 * almost all of the time; giving each a `requestAnimationFrame` loop the way
 * `ProjectFrame` has one would be a dozen loops running to draw nothing.
 *
 * The host has to be a positioned element and has to carry `u-vine` — see
 * Sprig.css, which is where the hover lives, and which explains why the class
 * is on the host rather than here.
 */
export default function Sprig() {
  return (
    <span className="sp" aria-hidden="true">
      {['sp-l', 'sp-r'].map((side) => (
        <svg key={side} className={side} viewBox="0 0 100 44" fill="none" focusable="false">
          {SPRIG.map((d, i) => (
            <path
              key={d}
              d={d}
              /* Normalised, so the dash is written in fractions of each
                 stroke's own length and nothing has to be measured. */
              pathLength="1"
              strokeDasharray="1"
              style={{ '--sp-i': i } as CSSProperties}
            />
          ))}
        </svg>
      ))}
    </span>
  )
}
