import { createPortal } from 'react-dom'
import { Leva } from 'leva'
import DriftWall from './DriftWall'
import { wallItems } from './model'
import { useWallTuning } from './wallTuning'

/* The v3 home screen: the whole body of work drifting past, and two words of
   chrome over the top of it.

   Every clip plays, all the time. Nothing pauses on hover and the wall does
   not follow the pointer — it drifts at its own pace regardless of what the
   viewer is doing. Clicking a tile crosses to the browse screen with that
   project already up.

   Every one of those numbers is on a slider in development. What the sliders
   set does not reach a visitor until it is pasted into `WALL_DEFAULTS` — see
   `wallTuning.ts`. */

interface Props {
  onOpen: (projectId: string) => void
  onBrowse: () => void
}

export default function Home({ onOpen, onBrowse }: Props) {
  const wall = useWallTuning()

  return (
    <div className="v3 v3-home">
      {/* Development only, and portalled to `body` for the same reason the
          gallery's panel is: rendered in place it would sit inside the
          wall's stacking context and paint under the chrome. */}
      {typeof document !== 'undefined'
        ? createPortal(
            <Leva
              collapsed
              hidden={!import.meta.env.DEV}
              titleBar={{ title: 'Wall tuning' }}
              theme={{
                colors: { elevation1: '#161616', elevation2: '#1d1d1d', elevation3: '#292929' },
                sizes: { rootWidth: 'min(340px, calc(100vw - 20px))' }
              }}
            />,
            document.body
          )
        : null}

      <div className="v3-wall">
        <DriftWall items={wallItems} {...wall} onSelect={(item) => item.id && onOpen(item.id)} />
      </div>

      <header className="v3-head v3-over">
        <span className="v3-wordmark">Tarlok Singh</span>
      </header>

      <div className="v3-enter v3-over">
        <button className="v3-chip v3-small" onClick={onBrowse}>
          index
        </button>
      </div>

      <footer className="v3-foot v3-over">
        <a className="v3-email" href="mailto:hello@tarloksingh.com">
          hello@tarloksingh.com
        </a>
      </footer>
    </div>
  )
}
