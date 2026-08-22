import { useEffect, useState } from 'react'
import Browse from './Browse'
import Home from './Home'
import './V3.css'

/* Two screens, and forty lines of routing between them.

   `/v3` is the wall; `/v3/index` is the browse view. Real URLs rather than
   component state, for the same reason the current site bothers: a portfolio
   is made to be linked to, and the back button has to work. */

type Screen = { name: 'home' } | { name: 'browse'; project: string | null }

const parse = (pathname: string): Screen => {
  const match = /^\/v3\/index(?:\/([a-z0-9-]+))?\/?$/i.exec(pathname)
  return match ? { name: 'browse', project: match[1] ?? null } : { name: 'home' }
}

const href = (screen: Screen) =>
  screen.name === 'home' ? '/v3' : screen.project ? `/v3/index/${screen.project}` : '/v3/index'

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

  return (
    <Home
      onOpen={(project) => go({ name: 'browse', project })}
      onBrowse={() => go({ name: 'browse', project: null })}
    />
  )
}
