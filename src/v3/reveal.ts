import { useEffect, type RefObject } from 'react'

/* ---- draw it in when it is reached ----

   One shared IntersectionObserver rather than one per element: a project
   screen has a dozen of these and a dozen observers is a dozen callbacks the
   browser has to service for the same scroll.

   All it does is flip an attribute. The motion is a CSS transition on
   `[data-arrive]`, scoped in Mech.css to the narrow layout — on the wide one
   the whole page is on screen at once and there is nothing to reveal.

   Nothing re-hides on the way back up. Scrolling up to re-read a paragraph
   should find it there rather than watching it arrive a second time.

   The attribute is `data-arrive`, not `data-reveal`: v2 already claims that
   one globally in `src/site/base.css`, and both stylesheets ship in the same
   bundle. A bare `data-*` selector is a namespace shared by every stylesheet
   on the page, which is a thing to remember in a repo that is two sites. */

export const useReveal = (root: RefObject<HTMLElement | null>, on: boolean) => {
  useEffect(() => {
    const host = root.current
    if (!on || !host || typeof IntersectionObserver === 'undefined') return

    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          ;(entry.target as HTMLElement).dataset.arrived = 'true'
          watch.unobserve(entry.target)
        }
      },
      // A little before the top edge reaches the fold, so a block has begun
      // arriving by the time it is properly in view.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    )

    const observe = () => {
      for (const node of host.querySelectorAll<HTMLElement>('[data-arrive]')) {
        if (node.dataset.arrived !== 'true') watch.observe(node)
      }
    }

    observe()
    /* The write-up is rebuilt whenever the readout swings to another project,
       so the set of things to watch is not fixed for the life of the screen.
       Cheaper than threading a dependency through every caller, and it only
       ever runs on a subtree change. */
    const changes = new MutationObserver(observe)
    changes.observe(host, { childList: true, subtree: true })

    return () => {
      watch.disconnect()
      changes.disconnect()
    }
  }, [root, on])
}
