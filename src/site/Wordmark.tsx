import { NAME_BOX, NAME_OUTLINE } from './nameGlyphs'

/* The signature, standing still.
 *
 * The same letterforms the opening writes out stroke by stroke (see `.in-name`
 * in Intro.tsx) — reused here rather than set in a typeface, because the mark
 * *is* the signature and a serif approximation of it would read as a second,
 * competing version of the same name. This is only the finished outline: no
 * mask, no pen, no animation. Intro.tsx keeps that machinery, since drawing it
 * is the one place it means anything.
 *
 * Filled with `currentColor`, so it takes the ink of whatever chrome it is
 * sitting in, and sized off `--wordmark-w` alone — the height follows from the
 * viewBox, which is the only measurement a mark needs. */

const [x, y, w, h] = NAME_BOX

export default function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`${x} ${y} ${w} ${h}`}
      style={{ width: 'var(--wordmark-w, 8.2rem)', height: 'auto' }}
      role="img"
      aria-label="Tarlok Singh"
    >
      <path d={NAME_OUTLINE} fill="currentColor" />
    </svg>
  )
}
