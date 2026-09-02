import { useEffect, useRef, useState, memo } from 'react'

/* ---- the panel coming alive ----

   The grid behind the readout used to simply be there: one blurred CSS
   gradient that faded up over 1400ms while the compass span and the leaders
   drew themselves in. Everything else about the boot is a machine switching
   on a piece at a time, and the surface all of it is printed on was the one
   part that just appeared.

   So the grid's own cells are dealt in, once, as a ring travelling out from
   the middle of the window. Each cell strikes bright, holds for a frame and
   decays to nothing, and what is left underneath when the last of them has
   gone is `.mech-grid` — the same 46-unit pitch, the same accent, so the
   effect reads as the panel's cells lighting up rather than as a second grid
   laid over the first.

   Two things it deliberately is not. It is not a canvas: a thousand `<i>`
   elements each running one composited keyframe is work the compositor does
   off the main thread, and the main thread on this exact beat is busy with a
   WebGL context, a shader compile and a GLB. And it is not per-frame: there
   is no rAF here at all, only a delay per cell, so the ripple costs nothing
   once it has been laid out.

   Boot only, and it takes itself down — see `booting` in Mech.tsx. */

/** The grid's own pitch, in frame units. Same number as `.mech-grid`'s
 *  `background-size`, and it has to stay that way: the whole point is that
 *  these are that grid's cells. */
const CELL = 46

/** How long the front takes to travel from the middle of the window to its
 *  furthest corner, in milliseconds.
 *
 *  **This is quoted as a crossing, not as a speed, and that is the whole
 *  point.** It used to be milliseconds *per ring* (34), which is a speed — and
 *  a speed means the effect is a different effect on every window, because a
 *  wider one has more of the grid's cells between the middle and the corner.
 *  A phone has about seventeen rings and crossed in 570ms; a 2560-wide desktop
 *  has twenty-seven and took 920ms. What actually changes is not the duration,
 *  it is the *shape*: a cell is lit for `mech-tile`'s 420ms, so the band on
 *  screen at any moment was 71% of a phone's radius and 46% of that desktop's.
 *  One reads as the panel coming up all at once, the other as a thin ring
 *  crawling out. Same code, two effects, and only one of them was ever looked
 *  at while it was being tuned.
 *
 *  Normalised against the window's own corner, the band is 420/570 of the
 *  radius everywhere and the ripple is the same gesture at every size. 570
 *  because that is what a handset was already doing, which is the one this was
 *  tuned on and the one that reads right.
 *
 *  It also makes the pitch loop below irrelevant to timing — the delay is a
 *  *ratio* of cells to cells, so opening the pitch up to come in under `MOST`
 *  can no longer speed the wave up as a side effect. That used to need a
 *  correction factor and now needs nothing. */
const SPAN = 570

/** How much of a cell's delay is thrown away, so the ring has a ragged edge
 *  rather than arriving as a perfect circle. */
const SCATTER = 60

/** A ceiling on the DOM this is allowed to cost. A very large window at a
 *  small `--px` can ask for a few thousand cells; past this the ripple is
 *  drawn at double pitch instead, which nobody can tell apart at that size.
 *
 *  **A phone is not one of those windows and must not be treated as one.**
 *  This briefly dropped to 200 on narrow, to cut the boot's paint — a handset
 *  asks for about five hundred cells and got a hundred and fifty. It reads
 *  worse in two ways that are worth writing down, because both are about the
 *  *cell*, not the count. A 63-unit box scaling from 0.2 to 1.04 travels twice
 *  as far as a 31-unit one over the same 420ms, so the ripple reads as slower
 *  while taking exactly as long. And the front advances in nine steps across a
 *  phone instead of seventeen, which reads as chunky rather than as a wave.
 *  The pitch is the effect. Find the milliseconds somewhere else. */
const MOST = 1600

/** How long the layer stays in the document, in milliseconds. It takes itself
 *  down rather than being unmounted with the boot flag: cutting the layer at
 *  the boot took the outer edge of the ripple off mid-flash.
 *
 *  The ripple now has a known ceiling on any window — `SPAN` to the corner,
 *  plus `SCATTER` of jitter, plus the 420ms a cell is lit, so a shade over a
 *  second — where it used to depend on how many of the grid's cells the window
 *  happened to be wide. This is comfortably past that and nothing depends on
 *  the exact number: by then every cell has animated to nothing and the layer
 *  is invisible either way. */
const LIFE = 1900

function MechTiles() {
  const box = useRef<HTMLDivElement>(null)
  const [grid, setGrid] = useState<{ cols: number; rows: number; cell: number } | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), LIFE)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /* `--px` is a `min()` over a rem and two viewport terms, and
       `getComputedStyle` hands back the expression rather than the value —
       the same problem `useTypeScale` has in Mech.tsx. So a cell is measured
       instead of worked out: one throwaway element sized in the real unit,
       read once, removed. */
    const probe = document.createElement('i')
    probe.style.cssText = `position:absolute;width:calc(${CELL} * var(--px));height:0;visibility:hidden`
    el.appendChild(probe)
    let cell = probe.getBoundingClientRect().width
    probe.remove()
    if (cell < 4) return

    let cols = Math.ceil(el.clientWidth / cell) + 1
    let rows = Math.ceil(el.clientHeight / cell) + 1
    while (cols * rows > MOST) {
      cell *= 2
      cols = Math.ceil(cols / 2) + 1
      rows = Math.ceil(rows / 2) + 1
    }
    setGrid({ cols, rows, cell })
  }, [])

  if (done) return null

  return (
    <div
      className="mech-tiles"
      ref={box}
      aria-hidden
      /* The column count and the cell size are the two things the stylesheet
         cannot work out for itself — one is measured, the other follows from
         it — so they are handed over as custom properties and the grid is laid
         out in CSS like everything else. */
      style={grid ? { ['--cols' as string]: grid.cols, ['--cell' as string]: `${grid.cell}px` } : undefined}
    >
      {grid &&
        (() => {
          /* The corner, in cells. Every delay below is a fraction of this, so
             the front reaches the furthest cell at `SPAN` on any window — see
             the note on it. Measured from the same centre the cells are, which
             is the middle of the grid rather than the middle of the viewport;
             the two differ by up to half a cell and the grid is what is being
             lit. */
          const reach = Math.hypot((grid.cols - 1) / 2, (grid.rows - 1) / 2) || 1
          return Array.from({ length: grid.cols * grid.rows }, (_, i) => {
            const x = i % grid.cols
            const y = Math.floor(i / grid.cols)
            /* Rings out from the middle of the window rather than rows down
               it. A sweep across a grid reads as a wipe — a thing passing over
               the panel; a ring out from the centre reads as the panel itself
               coming up, which is what the rest of the boot is doing. */
            const away = Math.hypot(x - (grid.cols - 1) / 2, y - (grid.rows - 1) / 2)
            const delay = (away / reach) * SPAN + Math.random() * SCATTER
            return <i key={i} style={{ animationDelay: `${Math.round(delay)}ms` }} />
          })
        })()}
    </div>
  )
}

/* Memoised for the same reason `MechHud` is: it takes no props and has
   nothing to say about the readout's state, but the screen around it
   re-renders on every phase of the boot. */
export default memo(MechTiles)
