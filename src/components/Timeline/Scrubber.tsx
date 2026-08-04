import type { Era } from '../../data/eras'

export default function Scrubber({
  eras,
  activeIndex,
  progress,
  onJump
}: {
  eras: Era[]
  activeIndex: number
  progress: number
  onJump: (index: number) => void
}) {
  const fillPercent = eras.length > 1 ? (progress / (eras.length - 1)) * 100 : 0

  return (
    <div className="scrubber">
      <div className="scrubber-track">
        <div className="scrubber-fill" style={{ width: `${fillPercent}%` }} />
        {eras.map((era, i) => (
          <button
            key={era.id}
            className={`scrubber-marker ${i === activeIndex ? 'is-active' : ''}`}
            style={{ left: `${(i / (eras.length - 1 || 1)) * 100}%` }}
            onClick={() => onJump(i)}
          >
            <span className="scrubber-dot" />
            <span className="scrubber-label">
              {era.label}
              <em>{era.years}</em>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
