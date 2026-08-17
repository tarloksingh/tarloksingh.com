import { gsap } from 'gsap'

export interface CrawlOptions {
  /** 1 crawls right, -1 crawls left. */
  direction: 1 | -1
  /** How far the body reaches on each stride, as a multiple of its width. */
  stretch: number
  /** Seconds per full reach-and-pull stride. */
  cycleDuration: number
  /** How much it flattens while reaching. */
  squash: number
}

/**
 * Inchworm locomotion: the body anchors its tail and reaches forward, then
 * anchors its head and drags its tail up behind it, advancing one stride per
 * cycle until it has left the screen.
 *
 * The anchoring is done by flipping transform-origin between the two ends. That
 * alone would make the element jump when the origin moves while it is stretched,
 * so each flip is paired with a translation that cancels the jump exactly:
 * scaled by S about one end, the box sits width*(S-1) away from where it would
 * sit scaled about the other end.
 */
export function crawlOut(el: HTMLElement, options: CrawlOptions) {
  const { direction, stretch, cycleDuration, squash } = options

  const rect = el.getBoundingClientRect()
  const stride = rect.width * (stretch - 1)
  const distance = direction > 0 ? window.innerWidth - rect.left + rect.width : rect.right + rect.width
  const strides = Math.max(1, Math.ceil(distance / stride))

  // Anchor to the floor so the undulation never lifts it off the ground.
  const tailOrigin = direction > 0 ? 'left bottom' : 'right bottom'
  const headOrigin = direction > 0 ? 'right bottom' : 'left bottom'
  const half = cycleDuration / 2
  const bulge = 1 + (1 - squash) * 0.6

  const tl = gsap.timeline()

  // Straighten up out of however the physics left it lying.
  tl.to(el, { rotation: 0, duration: 0.25, ease: 'power2.out' })

  for (let i = 0; i < strides; i += 1) {
    // Reach: tail planted, head extends forward and flattens.
    tl.set(el, { transformOrigin: tailOrigin })
    tl.to(el, { scaleX: stretch, scaleY: squash, duration: half, ease: 'power1.inOut' })

    // Re-anchor to the head, cancelling the origin swap.
    tl.set(el, { transformOrigin: headOrigin, x: `+=${direction * stride}` })

    // Pull: head planted, tail comes up and the body humps.
    tl.to(el, { scaleX: 1, scaleY: bulge, duration: half, ease: 'power1.inOut' })
  }

  return tl
}
