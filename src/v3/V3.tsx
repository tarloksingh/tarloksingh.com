import { useEffect, useState } from 'react'
import Browse from './Browse'
import Mech from './Mech'
import './V3.css'

/* Two screens, and fifty lines of routing between them.

   `/v3` is home, `/v3/index` is the browse view, and `/v3/p/<project>` is a
   project. Real URLs rather than component state, for the same reason the
   current site bothers: a portfolio is made to be linked to, and the back
   button has to work.

   Home and a project are the *same component* — `Mech`, with `id` either a
   project or `null`. They used to be two, and the seam showed: opening a
   project unmounted an entire screen and built another one, so the dashboard,
   the compass and the grid all blinked out and came back, and the machine
   restarted every time you pressed anything. One component means the
   background never repaints, the boot happens once, and going into a project
   is the readout retargeting — which is what it always looked like it was
   supposed to be. See the note on `Props.id` in `Mech.tsx`. */

type Screen =
  | { name: 'home' }
  | { name: 'browse'; project: string | null }
  | { name: 'project'; project: string }

const parse = (pathname: string): Screen => {
  const project = /^\/v3\/p\/([a-z0-9-]+)\/?$/i.exec(pathname)
  if (project) return { name: 'project', project: project[1] }
  const browse = /^\/v3\/index(?:\/([a-z0-9-]+))?\/?$/i.exec(pathname)
  return browse ? { name: 'browse', project: browse[1] ?? null } : { name: 'home' }
}

const href = (screen: Screen) => {
  if (screen.name === 'home') return '/v3'
  if (screen.name === 'project') return `/v3/p/${screen.project}`
  return screen.project ? `/v3/index/${screen.project}` : '/v3/index'
}

export default function V3() {
  const [screen, setScreen] = useState<Screen>(() => parse(window.location.pathname))

  useEffect(() => {
    const onPop = () => setScreen(parse(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = (next: Screen) => {
    const url = href(next)
    if (window.location.pathname !== url) window.history.pushState({}, '', url)
    setScreen(next)
  }

  if (screen.name === 'browse') {
    // Keyed on the project so arriving from a tile mounts the browse view
    // already pinned, rather than opening on a drift and jumping.
    return <Browse key={screen.project ?? 'none'} initial={screen.project} onHome={() => go({ name: 'home' })} />
  }

  /* Deliberately not keyed on anything. Remounting would make every move —
     home to a project, one project to the next — a fresh boot; the readout
     retargets instead, and owns that transition itself. */
  return (
    <Mech
      id={screen.name === 'project' ? screen.project : null}
      onProject={(project) => go({ name: 'project', project })}
      onHome={() => go({ name: 'home' })}
    />
  )
}
