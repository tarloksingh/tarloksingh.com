import { useEffect, useState } from 'react'
import Browse from './Browse'
import Home from './Home'
import Mech from './Mech'
import './V3.css'

/* Three screens, and fifty lines of routing between them.

   `/v3` is the wall, `/v3/index` is the browse view, and `/v3/p/<project>` is
   a project. Real URLs rather than component state, for the same reason the
   current site bothers: a portfolio is made to be linked to, and the back
   button has to work. */

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

  if (screen.name === 'project') {
    // Deliberately not keyed on the project. Remounting would make every move
    // between two projects a fresh boot; the readout retargets instead, and
    // owns that transition itself.
    return (
      <Mech
        id={screen.project}
        onProject={(project) => go({ name: 'project', project })}
        onHome={() => go({ name: 'home' })}
      />
    )
  }

  if (screen.name === 'browse') {
    // Keyed on the project so arriving from a tile mounts the browse view
    // already pinned, rather than opening on a drift and jumping.
    return <Browse key={screen.project ?? 'none'} initial={screen.project} onHome={() => go({ name: 'home' })} />
  }

  return (
    <Home
      onOpen={(project) => go({ name: 'project', project })}
      onBrowse={() => go({ name: 'browse', project: null })}
    />
  )
}
