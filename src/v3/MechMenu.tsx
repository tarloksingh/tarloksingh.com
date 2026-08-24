import { useEffect } from 'react'
import { TAGS } from '../data/projects'
import { entries } from './model'
import { sound } from './sound'

/* ---- the menu, on a phone ----

   The header's two rows — a signature, a tag row and a strip naming every
   project — are the instrument panel's own index, and they fit across a
   nineteen-hundred-unit frame because that is what they were drawn for. At
   three hundred and ninety points they are a paragraph of tiny words above
   the thing you came to look at, which is what they had become.

   So on a narrow screen the whole index folds into one control and opens as a
   sheet: every project, spelled out at a size a thumb can hit, the tags
   underneath, and the way home. This is the one place on the site where a
   button opens a second button, and it is the trade a phone actually wants —
   the alternative is spending a third of the screen on navigation for a
   screen whose whole job is one large subject.

   Desktop never mounts this. See `.mech-projects` in Mech.tsx for what it
   replaces. */

interface Props {
  shownId: string
  onProject: (id: string) => void
  onHome: () => void
  onClose: () => void
}

export default function MechMenu({ shownId, onProject, onHome, onClose }: Props) {
  // The page behind is a scroll container on narrow layouts, and a sheet you
  // can scroll the page under is a sheet that is not really over anything.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (id: string) => {
    sound.select()
    onProject(id)
    onClose()
  }

  return (
    <div className="mech-menu" role="dialog" aria-label="Projects" aria-modal="true">
      <div className="mech-menu-head">
        <span>index</span>
        <button className="mech-menu-close" onClick={onClose} aria-label="Close menu">
          close
        </button>
      </div>

      <ul className="mech-menu-list">
        {entries.map((entry, i) => (
          <li key={entry.project.id}>
            <button aria-current={entry.project.id === shownId} onClick={() => go(entry.project.id)}>
              <span className="mech-menu-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="mech-menu-name">{entry.project.title.toLowerCase()}</span>
              <span className="mech-menu-year">{entry.year}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* The tags keep the job they have on the desktop header: each one steps
          to the next project carrying it, so the row is a way through the work
          rather than a legend for it. */}
      <nav className="mech-menu-tags">
        {TAGS.filter((tag) => tag !== 'work').map((tag) => {
          const along = entries.filter((item) => item.project.tags.includes(tag))
          const next = along[(along.findIndex((item) => item.project.id === shownId) + 1) % Math.max(along.length, 1)]
          if (!next || (along.length === 1 && next.project.id === shownId)) return null
          return (
            <button key={tag} onClick={() => go(next.project.id)}>
              {tag}
            </button>
          )
        })}
      </nav>

      <button
        className="mech-menu-home"
        onClick={() => {
          sound.select()
          onHome()
        }}
      >
        home
      </button>
    </div>
  )
}
