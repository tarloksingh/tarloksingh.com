import DriftWall from './DriftWall'
import { wallItems } from './model'

/* The v3 home screen: the whole body of work drifting past, and two words of
   chrome over the top of it.

   Every clip plays, all the time. Nothing pauses on hover and the wall does
   not follow the pointer — it drifts at its own pace regardless of what the
   viewer is doing. Clicking a tile crosses to the browse screen with that
   project already up. */

interface Props {
  onOpen: (projectId: string) => void
  onBrowse: () => void
}

export default function Home({ onOpen, onBrowse }: Props) {
  return (
    <div className="v3 v3-home">
      <div className="v3-wall">
        <DriftWall
          items={wallItems}
          columns={6}
          tileWidth={210}
          tileHeight={124}
          gap={18}
          radius={7}
          tilt={34}
          turn={-26}
          roll={7}
          perspective={700}
          depth={110}
          speed={16}
          direction="up"
          variance={0.4}
          parallax={0}
          pauseOnHover={false}
          holdHoveredColumn={false}
          play="always"
          lift={34}
          fade={0.2}
          dim={0.62}
          overlayColor="#000000"
          onSelect={(item) => item.id && onOpen(item.id)}
        />
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
