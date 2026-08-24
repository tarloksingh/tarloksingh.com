import { useEffect, useState } from 'react'
import { LevaPanel } from 'leva'
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

  return (
    <div className="mech-panel">
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
