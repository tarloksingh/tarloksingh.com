import { projectById } from '../data/projects'

/* A router in forty lines, because that is all two routes need.
   `/` is the stage, `/work/<project-id>` is a case study. Real URLs rather
   than component state: a portfolio's whole job is to be linked to, and the
   back button has to work. */

export type Route = { name: 'home' } | { name: 'project'; id: string }

export function parse(pathname: string): Route {
  const match = /^\/work\/([a-z0-9-]+)\/?$/i.exec(pathname)
  // An unknown id falls back to the stage rather than rendering an empty
  // case study — a stale link should land somewhere real.
  if (match && projectById(match[1])) return { name: 'project', id: match[1] }
  return { name: 'home' }
}

export function href(route: Route): string {
  return route.name === 'project' ? `/work/${route.id}` : '/'
}

export function sameRoute(a: Route, b: Route): boolean {
  return a.name === b.name && (a.name !== 'project' || b.name !== 'project' || a.id === b.id)
}

/** Pushes without notifying — the shell drives the visual transition itself
 *  and commits the route at the moment the curtain covers the page. */
export function push(route: Route) {
  const url = href(route)
  if (window.location.pathname !== url) window.history.pushState({}, '', url)
}

export function onPopState(handler: (route: Route) => void) {
  const listener = () => handler(parse(window.location.pathname))
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

export const currentRoute = () => parse(window.location.pathname)
