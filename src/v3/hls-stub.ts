/* ---- hls.js, which this site does not use ----

   Aliased over `hls.js` in `vite.config.ts`. It is not a hidden feature and it
   is not a risk: nothing here is ever handed an HLS playlist.

   **Why it is needed.** Four pieces show a clip on a surface — the till's
   monitor, the handset's glass, StitchFam's picture frame, Plus One's phone —
   and all four use drei's `useVideoTexture`. That hook loads the HLS *class*
   with `await import('hls.js')` and only when the source ends in `.m3u8`,
   which is exactly right. But `core/VideoTexture.js` also does

       import { Events } from 'hls.js'

   at the top of the module, for one enum member, and a static import of a
   constant defeats the dynamic import next to it: the whole 500 KB library
   lands in whatever chunk `useVideoTexture` lands in. Here that is
   `MechProduct`, which `MechSlots` imports for every bay in the bank — so
   home's boot was carrying a video-streaming library for a format the site
   never serves. It was invisible for as long as v2 was in the build, because
   `src/site/products.tsx` imported the same pieces and Rollup split the shared
   dependency into a chunk of its own that neither screen fetched eagerly.

   Every clip on this site is a local `.mp4` under `public/videos/`.

   `isSupported()` returns false rather than the constructor throwing, because
   that is the branch drei already handles: `getHls` returns `null` and the hook
   goes on to build the `VideoTexture` from the `<video>` element directly,
   which is the whole of what any of these pieces need. So if an `.m3u8` ever
   does turn up, it degrades to "no HLS" instead of taking the screen down —
   and the `Events` proxy below means it does not matter which member drei
   reads. Read the note on the leva alias in `vite.config.ts`: this is the
   second place dev and prod could diverge, and it is aliased in *both* so they
   cannot. */

/** drei reads `Events.MEDIA_ATTACHED`. The proxy answers any member with its
 *  own name, which is what hls.js's enum values are anyway, so a future drei
 *  version reading a different one still gets a string rather than
 *  `undefined`. */
export const Events: Record<string, string> = new Proxy(
  {},
  { get: (_target, key) => String(key) }
) as Record<string, string>

export default class Hls {
  /** The branch drei handles gracefully. */
  static isSupported() {
    return false
  }
}
