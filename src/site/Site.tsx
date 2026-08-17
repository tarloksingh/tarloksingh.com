import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Home from './Home'
import Loader from './Loader'
import MusicPlayer from './MusicPlayer'
import ProjectIndex from './Index'
import { buildHelixCards, helixPosters } from './Helix'
import { projectById } from '../data/projects'
import { currentRoute, onPopState, push, sameRoute } from './router'
import type { Route } from './router'
import './tokens.css'
import './base.css'
import './Site.css'

/* The shell. Owns the route, the transition between routes, and the two
   things that must survive one — the music, and the index.

   A case study is a long ordinary document and drags in nothing the stage
   needs, so it is split out: someone who only ever looks at the home page
   never downloads it. */
const ProjectPage = lazy(() => import('./ProjectPage'))

/** How long the curtain takes to cover the page, before the swap. */
const COVER = 0.62
const REVEAL = 0.72

export default function Site() {
  const [route, setRoute] = useState<Route>(() => currentRoute())
  const [loading, setLoading] = useState(true)
  const [indexOpen, setIndexOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // Set when returning to the stage from a case study, so the drum is already
  // turned to that project when the curtain lifts.
  const [arriveAt, setArriveAt] = useState<string | null>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const curtainLabelRef = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')

  // Built once here rather than inside Home, because the loader has to know
  // what it is waiting for before Home has mounted.
  const posters = useMemo(() => {
    const count = typeof window !== 'undefined' && window.innerWidth < 760 ? 14 : 24
    return helixPosters(buildHelixCards(count))
  }, [])

  // A case study scrolls; the stage does not. The document's overflow is the
  // one thing that genuinely differs between them, so the shell owns it.
  useEffect(() => {
    document.body.classList.toggle('is-fixed', route.name === 'home')
  }, [route])

  // The curtain's resting pose, set here rather than in the stylesheet — see
  // the comment on `.st-curtain` for why declaring it in CSS silently breaks
  // the transition.
  useEffect(() => {
    if (curtainRef.current) gsap.set(curtainRef.current, { yPercent: 100 })
  }, [])

  const navigate = useCallback(
    (next: Route, options: { history?: boolean } = {}) => {
      if (sameRoute(next, route) || timelineRef.current?.isActive()) return

      const label =
        next.name === 'project' ? (projectById(next.id)?.title ?? '') : 'Tarlok Singh'
      setPendingLabel(label)
      setBusy(true)

      const curtain = curtainRef.current
      const text = curtainLabelRef.current
      if (!curtain || !text) {
        setRoute(next)
        setBusy(false)
        return
      }

      const commit = () => {
        // Everything that must be true the instant the page is hidden: the
        // route swaps, the document is at the top, and — when returning to
        // the stage — the drum knows where to be. Doing any of it after the
        // curtain starts lifting shows the change happening.
        if (options.history !== false) push(next)
        setArriveAt(next.name === 'home' && route.name === 'project' ? route.id : null)
        setRoute(next)
        window.scrollTo(0, 0)
      }

      timelineRef.current = gsap
        .timeline({ onComplete: () => setBusy(false) })
        .set(curtain, { visibility: 'visible' })
        .fromTo(
          curtain,
          { yPercent: 100 },
          { yPercent: 0, duration: COVER, ease: 'expo.inOut' }
        )
        .add(commit)
        .fromTo(
          text,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out' },
          `-=${COVER * 0.42}`
        )
        .to(text, { opacity: 0, y: -20, duration: 0.32, ease: 'power2.in' }, '+=0.16')
        .to(curtain, { yPercent: -100, duration: REVEAL, ease: 'expo.inOut' }, '-=0.18')
        .set(curtain, { visibility: 'hidden' })
    },
    [route]
  )

  // The back button is a first-class way to leave a case study, so it gets
  // the same transition — just without pushing another entry.
  useEffect(() => onPopState((next) => navigate(next, { history: false })), [navigate])

  const openProject = useCallback(
    (id: string) => {
      setIndexOpen(false)
      navigate({ name: 'project', id })
    },
    [navigate]
  )

  const goHome = useCallback(() => {
    setIndexOpen(false)
    navigate({ name: 'home' })
  }, [navigate])

  // Stable identity on purpose. The loader holds timers and a count of how
  // much has decoded; a fresh callback on every render of this component
  // would tear that effect down and start the whole count again.
  const loaderDone = useCallback(() => setLoading(false), [])

  return (
    <>
      {route.name === 'home' ? (
        <Home
          onOpen={openProject}
          onIndex={() => setIndexOpen(true)}
          locked={busy || indexOpen}
          arriveAt={arriveAt}
        />
      ) : (
        <Suspense fallback={<div className="st-holding" />}>
          <ProjectPage
            id={route.id}
            onBack={goHome}
            onOpen={openProject}
            onIndex={() => setIndexOpen(true)}
          />
        </Suspense>
      )}

      <ProjectIndex
        open={indexOpen}
        onClose={() => setIndexOpen(false)}
        onOpen={openProject}
        currentId={route.name === 'project' ? route.id : null}
      />

      <MusicPlayer />

      {/* The page turn. Named, so a transition tells you where you are going
          rather than merely that something is happening. */}
      <div className="st-curtain" ref={curtainRef} aria-hidden="true">
        <span className="st-curtain-label" ref={curtainLabelRef}>
          {pendingLabel}
        </span>
      </div>

      {loading ? <Loader preload={posters} onDone={loaderDone} /> : null}

      <div className="grain" aria-hidden="true" />
    </>
  )
}
