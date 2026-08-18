import { useEffect, useMemo, useRef } from 'react'
import BlurText from '../components/BlurText'
import Reveal from './Reveal'
import MediaFigure, { shapeOf, spanFor } from './MediaFigure'
import { projectById, projects } from '../data/projects'
import './ProjectPage.css'

/* A case study. An ordinary long document, deliberately — the stage is the
   place for spectacle, and a page you are meant to *read* should not fight
   you for control of the scrollbar.

   What carries the aesthetic through instead is the setting: the same paper,
   the same ink, the same two typefaces, the same reveal on everything as it
   arrives, and a masthead built like the opening spread of a printed article
   rather than a hero banner with a headline dropped on it. */

interface ProjectPageProps {
  id: string
  onBack: () => void
  onOpen: (projectId: string) => void
  onIndex: () => void
  /** The old-film experiment — see `noir` in Site.tsx, which owns the toggle. */
  noir?: boolean
}

export default function ProjectPage({ id, onBack, onOpen, onIndex, noir }: ProjectPageProps) {
  const project = projectById(id)
  const progressRef = useRef<HTMLSpanElement>(null)

  const next = useMemo(() => {
    const at = projects.findIndex((p) => p.id === id)
    return projects[(at + 1) % projects.length]
  }, [id])

  /* The rule across the top fills as you read. Driven from a rAF rather than
     the scroll event, so the write happens once per frame however fast the
     events arrive, and the read of `scrollY` is never interleaved with a
     write to a style — which is what turns a progress bar into layout
     thrash. Kept at the display's own framerate even in noir: it is a direct
     readout of scroll position, the same reason the gallery's row and panels
     stay smooth there — see the note on `noir` in Gallery.tsx. */
  useEffect(() => {
    let raf = 0
    let queued = false
    const draw = () => {
      queued = false
      const el = progressRef.current
      if (!el) return
      const span = document.body.scrollHeight - window.innerHeight
      const at = span > 0 ? Math.min(1, window.scrollY / span) : 0
      el.style.transform = `scaleX(${at.toFixed(4)})`
    }
    const onScroll = () => {
      if (queued) return
      queued = true
      raf = requestAnimationFrame(draw)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [id])

  if (!project) return null

  const numbered = project.sections.filter((section) => section.text || section.media.length > 0)

  return (
    <main className="pp" data-noir={noir}>
      {/* The old-film experiment's grain and vignette — see `.pp[data-noir]`
          in ProjectPage.css. Fixed, so they sit over the viewport rather than
          scrolling with a hundred-paragraph document. */}
      <div className="pp-grain" aria-hidden="true" />
      <div className="pp-vignette" aria-hidden="true" />

      <div className="pp-progress" aria-hidden="true">
        <span className="pp-progress-fill" ref={progressRef} />
      </div>

      <header className="pp-bar">
        <button type="button" className="pp-mark-name" onClick={onBack}>
          Tarlok Singh
        </button>
        <nav className="pp-menu" aria-label="Main">
          <button type="button" className="u-link" onClick={onBack}>
            Home
          </button>
          <button type="button" className="u-link" onClick={onIndex}>
            Work
          </button>
          <a className="u-link" href="mailto:tarloksinghfilms@gmail.com">
            Contact
          </a>
        </nav>
      </header>

      {/* ---- masthead ---- */}

      <section className="pp-masthead" style={{ ['--accent' as string]: project.accent }}>
        <p className="u-label pp-kicker">{project.company}</p>
        <h1 className="pp-title">
          <BlurText
            text={project.title}
            animateBy="chars"
            direction="bottom"
            distance={54}
            delay={62}
            stepDuration={1.4}
            ease="power3.out"
            blur={false}
            startDelay={0.08}
          />
        </h1>
        <p className="pp-tagline">{project.tagline}</p>

        <Reveal className="pp-facts" delay={0.12} from={20}>
          <dl>
            <div>
              <dt className="u-label">Role</dt>
              <dd>{project.role}</dd>
            </div>
            <div>
              <dt className="u-label">Timeline</dt>
              <dd>{project.timeline}</dd>
            </div>
            <div>
              <dt className="u-label">Studio</dt>
              <dd>{project.company}</dd>
            </div>
          </dl>
        </Reveal>
      </section>

      {project.hero ? (
        <Reveal className="pp-hero" delay={0.05} from={34}>
          <MediaFigure media={project.hero} span={12} eager />
        </Reveal>
      ) : null}

      {/* ---- the lead ---- */}

      <section className="pp-lead">
        <Reveal as="div" className="u-body">
          {project.intro.split('\n\n').map((para, i) => (
            <p key={i} className="u-lead">
              {para.trim()}
            </p>
          ))}
        </Reveal>
      </section>

      {project.restricted ? (
        <Reveal className="pp-restricted">
          <p className="u-label">Under NDA</p>
          <p className="u-lead">{project.restricted}</p>
        </Reveal>
      ) : null}

      {/* ---- sections ---- */}

      {project.sections.map((section) => {
        const number = numbered.indexOf(section)
        return (
          <section className="pp-section" key={section.id + section.title}>
            <div className="pp-section-head">
              {number >= 0 ? (
                <Reveal as="span" className="u-label pp-section-num" from={12}>
                  {String(number + 1).padStart(2, '0')}
                </Reveal>
              ) : null}
              {section.title ? (
                <Reveal as="h2" className="pp-section-title" from={22}>
                  {section.title}
                </Reveal>
              ) : null}
            </div>

            <div className="pp-section-body">
              {section.text ? (
                <Reveal className="pp-prose u-body" delay={0.06}>
                  {section.text.split('\n\n').map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </Reveal>
              ) : null}

              {section.tags?.length ? (
                <Reveal as="ul" className="pp-tags" delay={0.06} from={18}>
                  {section.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </Reveal>
              ) : null}

              {section.links?.length ? (
                <Reveal as="div" className="pp-links" delay={0.06} from={18}>
                  {section.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      className="pp-link"
                      target={link.kind === 'download' ? undefined : '_blank'}
                      rel="noreferrer"
                      download={link.kind === 'download' ? '' : undefined}
                    >
                      <span className="u-link">{link.label}</span>
                      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                        {link.kind === 'download' ? (
                          <path d="M12 4v12M6 12l6 6 6-6M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        ) : (
                          <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        )}
                      </svg>
                    </a>
                  ))}
                </Reveal>
              ) : null}

              {section.media.length > 0 ? (
                <div className="pp-media">
                  {section.media.map((media, i) => (
                    // Each figure carries its own small delay so a row of
                    // three arrives in sequence rather than as one block.
                    <Reveal
                      key={media.id}
                      delay={(i % 3) * 0.07}
                      from={30}
                      className={shapeOf(media.aspect)}
                      style={{ gridColumn: `span ${spanFor(media.aspect, section.media.length)}` }}
                    >
                      <MediaFigure media={media} span={spanFor(media.aspect, section.media.length)} />
                    </Reveal>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        )
      })}

      {/* ---- next ---- */}

      <footer className="pp-next">
        <Reveal as="p" className="u-label">
          Next project
        </Reveal>
        <Reveal delay={0.06} from={30}>
          <button type="button" className="pp-next-hit" onClick={() => onOpen(next.id)}>
            <span className="pp-next-title">{next.title}</span>
            <span className="pp-next-tagline">{next.tagline}</span>
            {next.hero ? (
              <span className="pp-next-thumb" aria-hidden="true">
                <img src={next.hero.poster ?? next.hero.src} alt="" loading="lazy" decoding="async" />
              </span>
            ) : null}
          </button>
        </Reveal>
        <Reveal as="div" className="pp-colophon" delay={0.1}>
          <span className="u-label">Designed &amp; engineered by Tarlok Singh</span>
          <a className="u-link" href="mailto:tarloksinghfilms@gmail.com">
            tarloksinghfilms@gmail.com
          </a>
        </Reveal>
      </footer>
    </main>
  )
}
