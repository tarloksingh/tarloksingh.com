/* The dark the butterflies are resting on, and how it comes apart.

   The flock cannot be the curtain itself. Its positions live in a texture on
   the GPU, so nothing on the CPU knows where any one butterfly is, and the
   wings are a concave shape besides — tiling enough of them to be genuinely
   opaque would take tens of thousands.

   So the page is hidden by this: one flat sheet of the background colour,
   which is eroded rather than faded. Torn patches of it are taken away in a
   scattered order, everywhere at once, over the same seconds the flock is
   lifting off — no wipe, no ring, no front sweeping across the screen. A flat
   fade would read as a cross-dissolve between two screens; this reads as the
   dark being carried off, which is the point.

   The sheet is only ever erased into, never repainted, so a whole reveal
   costs one stamp per patch however long it runs. */

/** Roughly how far apart the torn patches sit, in pixels. */
const PITCH = 120
/** Radius of one stamp. Well over `PITCH`, so the patches overlap and nothing
 *  is left behind but the page. */
const TEAR = 150
/** Stamps per patch. One disc leaves an arc; three leave a torn edge. */
const STAMPS = 3

export interface Veil {
  /** Re-lays the sheet for a new size. Safe on every resize event. */
  resize(width: number, height: number, dpr: number): void
  /** 0 whole, 1 entirely gone. */
  erode(progress: number): void
}

interface Patch {
  x: number
  y: number
  /** 0..1 — when in the reveal this one goes. */
  at: number
  stamps: [number, number, number][]
  taken: boolean
}

/** Two octaves of ripple across the screen, 0..1. Not noise in any rigorous
 *  sense — just enough structure that patches go in company rather than as
 *  isolated dots. */
function gust(x: number, y: number) {
  const a = Math.sin(x * 0.0042 + y * 0.0031)
  const b = Math.sin(x * 0.0017 - y * 0.0069 + 2.1)
  const v = 0.5 + 0.28 * a + 0.22 * b
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** One tear: solid core, long soft shoulder. */
function buildTear(dpr: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.ceil(TEAR * 2 * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  const gradient = ctx.createRadialGradient(TEAR, TEAR, 0, TEAR, TEAR, TEAR)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
  gradient.addColorStop(0.28, 'rgba(0, 0, 0, 1)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, TEAR * 2, TEAR * 2)
  return canvas
}

export function createVeil(canvas: HTMLCanvasElement, background: string): Veil {
  const ctx = canvas.getContext('2d')!
  let tear: HTMLCanvasElement | null = null
  let tearDpr = 0
  let patches: Patch[] = []

  const resize = (w: number, h: number, dpr: number) => {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (dpr !== tearDpr) {
      tear = buildTear(dpr)
      tearDpr = dpr
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = background
    ctx.fillRect(0, 0, w, h)

    patches = []
    const cols = Math.ceil(w / PITCH) + 2
    const rows = Math.ceil(h / PITCH) + 2
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col - 0.5) * PITCH + (row % 2) * PITCH * 0.5 + (Math.random() - 0.5) * PITCH * 0.6
        const y = (row - 0.5) * PITCH + (Math.random() - 0.5) * PITCH * 0.6
        patches.push({
          x,
          y,
          /* Mostly the gust, with enough of the dice in it that no edge of
             the pattern ever resolves into a line. Nothing goes in the first
             eighth: the flock is already lifting by then, so the first patch
             of dark to come away looks like something the wings did. */
          at: 0.12 + 0.78 * (0.6 * gust(x, y) + 0.4 * Math.random()),
          stamps: Array.from({ length: STAMPS }, () => [
            (Math.random() - 0.5) * TEAR * 0.8,
            (Math.random() - 0.5) * TEAR * 0.8,
            0.6 + Math.random() * 0.45
          ]) as [number, number, number][],
          taken: false
        })
      }
    }
  }

  const erode = (progress: number) => {
    if (progress <= 0 || !tear) return
    ctx.globalCompositeOperation = 'destination-out'
    for (const patch of patches) {
      if (patch.taken || progress < patch.at) continue
      patch.taken = true
      for (const [ox, oy, scale] of patch.stamps) {
        const size = TEAR * 2 * scale
        ctx.drawImage(tear, patch.x + ox - size / 2, patch.y + oy - size / 2, size, size)
      }
    }
  }

  return { resize, erode }
}
