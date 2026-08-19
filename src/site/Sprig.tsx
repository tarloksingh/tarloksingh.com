import type { CSSProperties } from 'react'
import { SPRIG, VSPRIG } from './frames'
import './Sprig.css'

/* Two small vines, one on each side of whatever this is dropped into — or,
 * with `vertical`, one above and one below.
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
interface SprigProps {
  /** Grow above and below the host instead of to either side of it. For the
   *  menu: three items sit close enough together, eighteen pixels apart, that
   *  a sprig reaching sideways off one runs into the word next to it — see
   *  `VSPRIG` in frames.ts, which is the same drawing turned to grow this
   *  way. */
  vertical?: boolean
}

export default function Sprig({ vertical = false }: SprigProps) {
  const sides = vertical ? ['sp-t', 'sp-b'] : ['sp-l', 'sp-r']
  const paths = vertical ? VSPRIG : SPRIG
  return (
    <span className={vertical ? 'sp sp--y' : 'sp'} aria-hidden="true">
      {sides.map((side) => (
        <svg
          key={side}
          className={side}
          viewBox={vertical ? '0 0 44 100' : '0 0 100 44'}
          fill="none"
          focusable="false"
        >
          {paths.map((d, i) => (
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
