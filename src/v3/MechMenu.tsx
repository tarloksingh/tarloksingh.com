import { useEffect } from 'react'
import { TAGS } from '../data/projects'
import { entries } from './model'
import { sound } from './sound'
import SplitReveal from './SplitReveal'

/* ---- the index sheet ----

   Ten projects is too many for a tag row to stand in for and too many to
   spell out along the header or a bottom-edge strip — both existed once, on
   the wide layout, and neither one told you where you actually were. So the
   whole index folds into one control, on both layouts now: every project,
   named, the tags that are actually worth a shortcut, and the way home.

   Every line of it draws itself in a character at a time, staggered down the
   list — the same `SplitReveal` the taglines and the section titles are set
   with, which is the one bit of motion this site has that reads as *writing*
   rather than as sliding. A sheet that is simply there the instant it opens
   is a sheet; a sheet that types itself is part of the same machine as the
   readout behind it. */

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
        <span>
          <SplitReveal text="index" run="menu" />
        </span>
        <button className="mech-menu-close" onClick={onClose} aria-label="Close menu">
          close
        </button>
      </div>

      <ul className="mech-menu-list">
        {entries.map((entry, i) => (
          <li key={entry.project.id}>
            <button aria-current={entry.project.id === shownId} onClick={() => go(entry.project.id)}>
              <span className="mech-menu-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="mech-menu-name">
                <SplitReveal
                  text={entry.project.title.toLowerCase()}
                  run={entry.project.id}
                  delay={0.06 + i * 0.045}
                />
              </span>
              <span className="mech-menu-year">{entry.year}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* The tags keep the job they have on the desktop header: each one steps
          to the next project carrying it, so the row is a way through the work
          rather than a legend for it. */}
      <nav className="mech-menu-tags">
        {/* Trimmed to the tags actually worth a shortcut on a phone — the
           full row read as clutter above a list that already names every
           project by title. */}
        {TAGS.filter((tag) => !['work', 'video games', 'hardware', '3d', 'film'].includes(tag)).map((tag, i) => {
          const along = entries.filter((item) => item.project.tags.includes(tag))
          const next = along[(along.findIndex((item) => item.project.id === shownId) + 1) % Math.max(along.length, 1)]
          if (!next || (along.length === 1 && next.project.id === shownId)) return null
          return (
            <button key={tag} onClick={() => go(next.project.id)}>
              <SplitReveal text={tag} run="menu" delay={0.6 + i * 0.03} />
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
        <SplitReveal text="home" run="menu" delay={0.8} />
      </button>
    </div>
  )
}
