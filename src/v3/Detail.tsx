import type { Entry } from './model'

/* The left-hand pane: who made what, and the folds.

   The `roles` section is not a fold — it is lifted out and set as the italic
   line under the title, which is where the Figma puts it. Everything else the
   project wrote stays a fold, in the order it was written. */

interface Props {
  entry: Entry | null
  open: string | null
  onToggle: (id: string) => void
}

export default function Detail({ entry, open, onToggle }: Props) {
  if (!entry) return <div className="v3-detail" />

  const { project } = entry
  const roles = project.sections.find((section) => section.id === 'roles')?.tags ?? []

  const folds = [
    ...(project.intro ? [{ id: 'overview', title: 'project overview', text: project.intro, tags: undefined }] : []),
    ...(project.restricted ? [{ id: 'note', title: 'note', text: project.restricted, tags: undefined }] : []),
    ...project.sections
      .filter((section) => section.id !== 'roles')
      .map((section) => ({ id: section.id, title: section.title.toLowerCase(), text: section.text, tags: section.tags }))
  ]

  return (
    <div className="v3-detail">
      <div className="v3-heading">
        <h2 className="v3-title">{project.title}</h2>
        {roles.length > 0 && <p className="v3-italic v3-role">{roles.join(', ').toLowerCase()}</p>}
      </div>

      <div className="v3-accordion">
        {folds.map((fold) => {
          const isOpen = open === fold.id
          return (
            <div className="v3-fold" key={fold.id} data-open={isOpen}>
              <button className="v3-small" onClick={() => onToggle(fold.id)} aria-expanded={isOpen}>
                <span className="v3-caret" />
                <span>{fold.title}</span>
              </button>

              {isOpen && (
                <div className="v3-fold-body v3-small">
                  {fold.tags ? <div className="v3-tags">{fold.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : fold.text}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
