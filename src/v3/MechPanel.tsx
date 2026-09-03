import { useEffect, useState } from 'react'
import { Leva, LevaPanel } from 'leva'
import type { StoreType } from 'leva/dist/declarations/src/types'

/* ---- the dev panel ----

   One panel, with tabs, showing only what the screen you are on can actually
   change.

   What this replaces was four Leva windows stacked down the right-hand edge:
   the default one titled "Subject tuning", plus Labels, plus Piece, plus
   Cast. Three problems, all of them the same problem. They were all mounted
   at once regardless of which screen was up, so the home page offered you a
   panel of controls for a project screen's subject — and titled it "Subject
   tuning", which does not say whose subject. They stacked past the bottom of
   the window with no way to reach what fell off, because a Leva panel grows
   to its content and the page behind it does not scroll. And a panel called
   "Cast" ended up holding the camera and the ground as well, because there
   was nowhere else to put them.

   So: a tab strip, one store per tab, and the caller decides which tabs exist
   for the screen it is on. Each tab is a `LevaPanel` with its own store —
   which is also why every tuning hook here creates one with `useCreateStore`
   rather than writing into Leva's default.

   Development only; `Mech.tsx` renders it behind `import.meta.env.DEV`. */

export interface PanelTab {
  id: string
  label: string
  store: StoreType
}

const THEME = {
  colors: { elevation1: '#141414', elevation2: '#1b1b1b', elevation3: '#272727' },
  sizes: { rootWidth: '100%' }
}

const REMEMBER = 'v3.panel.tab'
const REMEMBER_HIDDEN = 'v3.panel.hidden'

export default function MechPanel({ tabs }: { tabs: PanelTab[] }) {
  /* Remembered across reloads, and across moving between screens where the
     same tab exists. Tuning is a loop of change-something, reload, look —
     landing back on a different tab every time is most of the friction in
     that loop. */
  const [active, setActive] = useState<string>(() => {
    try {
      return window.localStorage.getItem(REMEMBER) ?? ''
    } catch {
      return ''
    }
  })

  /* Minimised, also remembered. The panel sits over the top right of every
     screen, which is exactly where a slot's own name and number land on a
     narrower window — collapsing it out of the way should not have to be
     redone on every reload. */
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(REMEMBER_HIDDEN) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(REMEMBER_HIDDEN, hidden ? '1' : '0')
    } catch {
      /* private mode; the state just will not be remembered */
    }
  }, [hidden])

  // H toggles the panel — the same guard every single-key shortcut on this
  // screen uses (see the pin editor's 'P' in Mech.tsx): not while something
  // is being typed into, and not with a modifier held.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'h' && event.key !== 'H') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const on = event.target as HTMLElement | null
      if (on && (on.tagName === 'INPUT' || on.tagName === 'TEXTAREA' || on.isContentEditable)) return
      setHidden((was) => !was)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The remembered tab may not exist on this screen — that is the whole point
  // of the tabs being per-screen — so fall back to the first one that does.
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]

  useEffect(() => {
    if (!current) return
    try {
      window.localStorage.setItem(REMEMBER, current.id)
    } catch {
      /* private mode; the tab just will not be remembered */
    }
  }, [current])

  if (tabs.length === 0 || !current) return null

  /* Leva's *default* store, hidden.

     Nothing here writes into it — every tuning hook makes its own with
     `useCreateStore`, which is the whole reason this panel can be tabbed.
     But home mounts the pieces built for eight of the projects
     (`MechSlots.tsx` → `MechProduct`'s `Piece`), and several of those
     components register controls of their own on the default store the
     gallery they came from was written against. The moment one does, Leva
     injects its own floating root and drops an "Objects" panel over the top
     right of the screen, on top of this one.

     Rendering it once, hidden, is how Leva is told not to. It is not a
     second panel — it is the absence of one. Kept mounted in both branches
     below, minimised or not, for exactly that reason. */
  if (hidden) {
    return (
      <>
        <Leva hidden />
        <button className="mech-panel-restore" onClick={() => setHidden(false)} title="Show the tool panel (H)">
          tools
        </button>
      </>
    )
  }

  return (
    <div className="mech-panel">
      <Leva hidden />
      <div className="mech-panel-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === current.id}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <button className="mech-panel-hide" onClick={() => setHidden(true)} title="Hide the tool panel (H)">
          ×
        </button>
      </div>

      {/* Every store stays mounted; only the current one is shown.
          Unmounting a `LevaPanel` throws away its folder open/closed state,
          so switching tabs and coming back would collapse everything you had
          opened. `hidden` keeps it alive and out of the way. */}
      {tabs.map((tab) => (
        <div key={tab.id} className="mech-panel-body" hidden={tab.id !== current.id}>
          <LevaPanel store={tab.store} fill flat titleBar={false} theme={THEME} />
        </div>
      ))}
    </div>
  )
}
