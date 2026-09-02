import { useEffect, useRef, useState, memo } from 'react'
import { NARROW_QUERY } from './narrow'

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

/** Milliseconds a ring out from the middle.
 *
 *  It is set against how long a cell stays lit, not against how long the
 *  whole thing should take, and that ratio is the entire difference between a
 *  ring travelling out and the window simply filling in. A cell is visible for
 *  `mech-tile`'s 420ms; at this spacing that is a band about a dozen cells
 *  deep, with a bright core two or three cells thick at the front of it and
 *  the rest a tail. At 19 — where this started — the band was twenty-two
 *  cells and there is no window wide enough for that to read as anything but
 *  a grid coming on all at once.
 *
 *  The furthest corner of a wide window is around twenty-three rings, so this
 *  plus that 420 lands just inside `LIFE`. */
const RING = 34

/** How much of a cell's delay is thrown away, so the ring has a ragged edge
 *  rather than arriving as a perfect circle. */
const SCATTER = 60

/** A ceiling on the DOM this is allowed to cost. A very large window at a
 *  small `--px` can ask for a few thousand cells; past this the ripple is
 *  drawn at double pitch instead, which nobody can tell apart at that size.
 *
 *  **A phone gets a much lower one, and it is not about the DOM.** The layer
 *  these sit in carries a `mask-image`, and a masked layer is re-rastered as
 *  a whole whenever anything inside it changes — so the cells are not the
 *  independently composited elements the note above assumes, they are a few
 *  hundred boxes repainting into one bitmap sixty times a second. On the
 *  exact beat the main thread is compiling shaders and parsing a GLB. A
 *  handset window asks for about five hundred cells at the grid's own pitch;
 *  200 buys exactly one halving out of the loop below — a 92-unit pitch and
 *  about a hundred and fifty of them, which is the same wave over the same
 *  grid with every other line taken out, and is the trade the paragraph above
 *  already sanctions. Not lower: two halvings is a 184-unit cell, three and a
 *  half of them across a phone, and what is left is not a ripple over a grid
 *  but a handful of big squares. The narrow rules in Mech.css take the
 *  shadow's blur off them as well, which is the other half of this — a
 *  blurred shadow is most of what a cell costs to raster. */
const MOST = matchMedia(NARROW_QUERY).matches ? 200 : 1600

/** How long the layer stays in the document, in milliseconds. It takes itself
 *  down rather than being unmounted with the boot flag: the furthest cell is
 *  around twenty-five rings out, so the last of them is still decaying a
 *  little past `BOOT_MS`, and cutting the layer at the boot took the outer
 *  edge of the ripple off mid-flash. Comfortably longer than the ripple can
 *  be, and nothing depends on the exact number — by then every cell has
 *  animated to nothing and the layer is invisible either way. */
const LIFE = 1900

function MechTiles() {
  const box = useRef<HTMLDivElement>(null)
  const [grid, setGrid] = useState<{ cols: number; rows: number; cell: number; zoom: number } | null>(null)
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
    /* How far the pitch had to be opened up to come in under the budget, so
       `RING` can be scaled by it below. Without that the ring is quoted in
       *cells* and a coarser grid has fewer of them across the same window —
       the wave crosses in half the time and what is left is the grid flashing
       on, which is precisely the thing `RING`'s note says it must not be. At
       double pitch the delays double and the front travels the same number of
       pixels a second as it does everywhere else. */
    let zoom = 1
    while (cols * rows > MOST) {
      cell *= 2
      zoom *= 2
      cols = Math.ceil(cols / 2) + 1
      rows = Math.ceil(rows / 2) + 1
    }
    setGrid({ cols, rows, cell, zoom })
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
        Array.from({ length: grid.cols * grid.rows }, (_, i) => {
          const x = i % grid.cols
          const y = Math.floor(i / grid.cols)
          /* Rings out from the middle of the window rather than rows down it.
             A sweep across a grid reads as a wipe — a thing passing over the
             panel; a ring out from the centre reads as the panel itself
             coming up, which is what the rest of the boot is doing. */
          const away = Math.hypot(x - (grid.cols - 1) / 2, y - (grid.rows - 1) / 2)
          const delay = away * RING * grid.zoom + Math.random() * SCATTER
          return <i key={i} style={{ animationDelay: `${Math.round(delay)}ms` }} />
        })}
    </div>
  )
}

/* Memoised for the same reason `MechHud` is: it takes no props and has
   nothing to say about the readout's state, but the screen around it
   re-renders on every phase of the boot. */
export default memo(MechTiles)
