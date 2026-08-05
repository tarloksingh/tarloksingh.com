/**
 * Mobile tuner — a dev-only overlay for moving and resizing things on the
 * narrow layout without writing CSS.
 *
 * Pick an element, drag it or work the sliders, press Save. The values go to
 * the dev server, which writes them into `src/mobile-tweaks.css` inside a
 * max-width: 700px query — so a session here can only ever change the phone
 * layout, and the result is committable CSS rather than something living in
 * localStorage.
 *
 * Never mounts in a production build: `main.tsx` imports it behind
 * `import.meta.env.DEV`, and the import is dropped when that folds to false.
 */

type Decls = Record<string, string>
type Tweaks = Record<string, Decls>

const ENDPOINT = '/__mobile-tweaks'
const MOBILE_MAX = 700

let tweaks: Tweaks = {}
let selector: string | null = null
let selected: Element | null = null
let dirty = false
const history: string[] = []

/* ---- applying values live ---- */

// The same CSS the server will write, injected now so the page reacts as the
// slider moves. The real stylesheet arrives over HMR on Save and matches.
const liveStyle = document.createElement('style')
liveStyle.id = 'mobile-tuner-live'

function apply() {
  const rules = Object.entries(tweaks)
    .map(([sel, decls]) => {
      const body = Object.entries(decls)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(' ')
      return `:root ${sel} { ${body} }`
    })
    .join('\n')
  liveStyle.textContent = `@media screen and (max-width: ${MOBILE_MAX}px) {\n${rules}\n}`
}

function setProp(prop: string, value: string | null) {
  if (!selector) return
  history.push(JSON.stringify(tweaks))
  if (history.length > 40) history.shift()

  const decls = { ...(tweaks[selector] ?? {}) }
  if (value === null) delete decls[prop]
  else decls[prop] = value

  if (Object.keys(decls).length) tweaks[selector] = decls
  else delete tweaks[selector]

  dirty = true
  apply()
  renderControls()
}

const get = (prop: string) => (selector ? tweaks[selector]?.[prop] : undefined)

/* ---- naming the thing you clicked ---- */

/** A selector stable enough to live in a stylesheet. Prefers a class that
 *  picks out exactly one element; falls back to the full class list, then to
 *  a positional path. Whatever it lands on, the panel shows how many elements
 *  match so a too-broad pick is visible before it is saved. */
function selectorFor(el: Element): string {
  const classes = Array.from(el.classList).filter((c) => !c.startsWith('mt-'))

  for (const c of classes) {
    if (document.querySelectorAll(`.${CSS.escape(c)}`).length === 1) return `.${c}`
  }
  if (classes.length) return '.' + classes.map((c) => c).join('.')

  const parts: string[] = []
  let node: Element | null = el
  while (node && node !== document.body && parts.length < 4) {
    const parent: Element | null = node.parentElement
    if (!parent) break
    const index = Array.from(parent.children).indexOf(node) + 1
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`)
    const anchor = Array.from(parent.classList).find(
      (c) => !c.startsWith('mt-') && document.querySelectorAll(`.${CSS.escape(c)}`).length === 1
    )
    if (anchor) return `.${anchor} > ${parts.join(' > ')}`
    node = parent
  }
  return parts.join(' > ')
}

function select(el: Element) {
  selected = el
  selector = selectorFor(el)
  renderControls()
}

/* ---- panel ---- */

const panel = document.createElement('div')
panel.id = 'mt-panel'

const highlight = document.createElement('div')
highlight.id = 'mt-highlight'

const styles = `
#mt-panel {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000;
  background: #11161a; color: #e8eef2; border-top: 1px solid #2b3740;
  font: 12px/1.35 'Helvetica Neue', Helvetica, Arial, sans-serif;
  max-height: 52vh; display: flex; flex-direction: column;
  box-shadow: 0 -8px 32px rgba(0,0,0,0.45);
}
#mt-panel.mt-collapsed .mt-body { display: none; }
#mt-panel.mt-picking { opacity: 0.22; pointer-events: none; }
#mt-panel * { box-sizing: border-box; }
.mt-head {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border-bottom: 1px solid #232e35; flex: 0 0 auto;
}
.mt-title { font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; font-size: 10px; opacity: 0.6; }
.mt-target {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #7fd4a8;
}
.mt-body { overflow-y: auto; padding: 4px 10px 10px; -webkit-overflow-scrolling: touch; }
.mt-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.mt-row label { width: 62px; flex: 0 0 auto; opacity: 0.7; }
.mt-row input[type=range] { flex: 1; min-width: 0; accent-color: #7fd4a8; }
.mt-val { width: 54px; text-align: right; font-family: ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; }
.mt-val.mt-unset { opacity: 0.3; }
.mt-clear {
  width: 20px; height: 20px; flex: 0 0 auto; border-radius: 4px; cursor: pointer;
  background: #1d262c; border: 1px solid #2f3b44; color: #8ea3b0; line-height: 1; font-size: 12px;
}
.mt-clear:disabled { opacity: 0.25; cursor: default; }
button.mt-btn {
  border-radius: 5px; border: 1px solid #33414b; background: #1d262c; color: #e8eef2;
  padding: 5px 9px; font: inherit; cursor: pointer;
}
button.mt-btn:hover { background: #27333b; }
button.mt-btn.mt-primary { background: #1f6f4a; border-color: #2c8a5e; }
button.mt-btn.mt-primary:disabled { background: #1d262c; border-color: #2f3b44; opacity: 0.4; cursor: default; }
.mt-actions { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid #232e35; margin-top: 6px; }
.mt-hint { opacity: 0.45; padding: 8px 0; }
.mt-note { opacity: 0.5; font-size: 11px; padding-top: 6px; }
.mt-warn { color: #e3b341; }
#mt-highlight {
  position: fixed; z-index: 2147482000; pointer-events: none;
  outline: 1px dashed #7fd4a8; background: rgba(127,212,168,0.09); display: none;
}
#mt-toast {
  position: fixed; left: 50%; bottom: 56vh; transform: translateX(-50%);
  z-index: 2147483100; background: #1f6f4a; color: #fff; padding: 6px 12px;
  border-radius: 6px; font: 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;
  opacity: 0; transition: opacity 0.2s; pointer-events: none;
}
#mt-toast.mt-show { opacity: 1; }
`

const toast = document.createElement('div')
toast.id = 'mt-toast'
let toastTimer = 0
function say(message: string, bad = false) {
  toast.textContent = message
  toast.style.background = bad ? '#8a2c2c' : '#1f6f4a'
  toast.classList.add('mt-show')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('mt-show'), 1800)
}

/** Each slider reads its starting point from the element's computed style, so
 *  the handle begins where the element actually is rather than at zero. */
type Control = {
  prop: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  from: (cs: CSSStyleDeclaration, el: Element) => number
}

const CONTROLS: Control[] = [
  { prop: 'font-size', label: 'text size', min: 8, max: 120, step: 1, unit: 'px', from: (cs) => parseFloat(cs.fontSize) || 16 },
  { prop: 'width', label: 'width', min: 5, max: 100, step: 1, unit: '%', from: (_cs, el) => {
      const parent = (el as HTMLElement).parentElement
      const basis = parent?.clientWidth || window.innerWidth
      return Math.round(((el as HTMLElement).offsetWidth / basis) * 100)
    } },
  { prop: 'padding', label: 'padding', min: 0, max: 80, step: 1, unit: 'px', from: (cs) => parseFloat(cs.paddingTop) || 0 },
  { prop: 'gap', label: 'gap', min: 0, max: 80, step: 1, unit: 'px', from: (cs) => parseFloat(cs.rowGap) || 0 },
  { prop: 'margin-top', label: 'space above', min: -80, max: 160, step: 1, unit: 'px', from: (cs) => parseFloat(cs.marginTop) || 0 },
  { prop: 'line-height', label: 'line height', min: 0.8, max: 2.4, step: 0.05, unit: '', from: (cs) => {
      const lh = parseFloat(cs.lineHeight)
      const fs = parseFloat(cs.fontSize) || 16
      return Number.isNaN(lh) ? 1.4 : Math.round((lh / fs) * 100) / 100
    } },
]

const translateOf = (): [number, number] => {
  const raw = get('translate')
  if (!raw) return [0, 0]
  const [x = '0', y = '0'] = raw.split(/\s+/)
  return [parseFloat(x) || 0, parseFloat(y) || 0]
}

const setTranslate = (x: number, y: number) =>
  setProp('translate', x === 0 && y === 0 ? null : `${Math.round(x)}px ${Math.round(y)}px`)

function renderControls() {
  const body = panel.querySelector('.mt-body')!
  const target = panel.querySelector('.mt-target')!

  if (!selected || !selector) {
    target.textContent = 'nothing picked'
    body.innerHTML = `<div class="mt-hint">Press <b>Pick</b>, then tap anything on the page.</div>`
    highlight.style.display = 'none'
    renderActions()
    return
  }

  const matches = document.querySelectorAll(selector).length
  target.textContent = selector

  const cs = getComputedStyle(selected)
  const [tx, ty] = translateOf()
  const scale = parseFloat(get('scale') ?? '1')
  const hidden = get('display') === 'none'

  const row = (
    label: string,
    prop: string,
    min: number,
    max: number,
    step: number,
    value: number,
    unit: string,
    isSet: boolean
  ) => `
    <div class="mt-row" data-prop="${prop}">
      <label>${label}</label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}" />
      <span class="mt-val ${isSet ? '' : 'mt-unset'}">${step < 1 ? value.toFixed(2) : Math.round(value)}${unit}</span>
      <button class="mt-clear" title="clear" ${isSet ? '' : 'disabled'}>×</button>
    </div>`

  body.innerHTML =
    row('left / right', 'translate-x', -240, 240, 1, tx, 'px', !!get('translate')) +
    row('up / down', 'translate-y', -240, 240, 1, ty, 'px', !!get('translate')) +
    row('size', 'scale', 0.3, 2.5, 0.02, scale, '×', !!get('scale')) +
    CONTROLS.map((c) => {
      const set = get(c.prop)
      const value = set ? parseFloat(set) : c.from(cs, selected!)
      return row(c.label, c.prop, c.min, c.max, c.step, value, c.unit, !!set)
    }).join('') +
    `<div class="mt-row">
       <label>hide</label>
       <input type="checkbox" data-prop="display" ${hidden ? 'checked' : ''} />
       <span class="mt-note" style="padding:0">remove it from the phone layout only</span>
     </div>` +
    (matches > 1
      ? `<div class="mt-note mt-warn">This name matches ${matches} elements — they will all move together.</div>`
      : '') +
    `<div class="mt-note">Drag the highlighted element to move it. Arrow keys nudge 1px, hold shift for 10.</div>`

  renderActions()
  drawHighlight()
}

function renderActions() {
  const actions = panel.querySelector('.mt-actions')!
  const count = Object.keys(tweaks).length
  actions.innerHTML = `
    <button class="mt-btn" data-act="pick">Pick element</button>
    <button class="mt-btn" data-act="parent" ${
      selected?.parentElement && selected.parentElement !== document.body ? '' : 'disabled'
    } title="a tap lands on whatever is on top — step out to the container">↑ parent</button>
    <button class="mt-btn mt-primary" data-act="save" ${dirty ? '' : 'disabled'}>${dirty ? 'Save to CSS' : 'Saved'}</button>
    <button class="mt-btn" data-act="undo" ${history.length ? '' : 'disabled'}>Undo</button>
    <button class="mt-btn" data-act="reset" ${selector && tweaks[selector] ? '' : 'disabled'}>Reset this</button>
    <button class="mt-btn" data-act="resetall" ${count ? '' : 'disabled'}>Reset all (${count})</button>`
}

/* ---- highlight box ---- */

let lastDraw = 0
function drawHighlight() {
  if (!selected) {
    highlight.style.display = 'none'
    return
  }
  const r = selected.getBoundingClientRect()
  highlight.style.display = 'block'
  highlight.style.left = `${r.left}px`
  highlight.style.top = `${r.top}px`
  highlight.style.width = `${r.width}px`
  highlight.style.height = `${r.height}px`
}

function tick(now: number) {
  // Throttled: this reads layout, and the page behind it is running WebGL.
  if (selected && now - lastDraw > 120) {
    lastDraw = now
    drawHighlight()
  }
  requestAnimationFrame(tick)
}

/* ---- picking ---- */

let picking = false

function startPicking() {
  picking = true
  panel.classList.add('mt-picking')
  say('Tap an element — esc to cancel')
}

function stopPicking() {
  picking = false
  panel.classList.remove('mt-picking')
}

function onPickClick(event: MouseEvent) {
  if (!picking) return
  event.preventDefault()
  event.stopPropagation()
  const el = document.elementFromPoint(event.clientX, event.clientY)
  stopPicking()
  if (el && !el.closest('#mt-panel')) select(el)
}

/* ---- dragging the selected element ---- */

let drag: { x: number; y: number; tx: number; ty: number } | null = null

/** Events dispatched at the document have `document` as their target, which has
 *  no `closest` — so the check has to be for an Element, not just for null. */
const insidePanel = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('#mt-panel')

function onPointerDown(event: PointerEvent) {
  if (picking || !selected) return
  if (insidePanel(event.target)) return
  const hit = document.elementFromPoint(event.clientX, event.clientY)
  // Only the selected element (or something inside it) starts a drag, so the
  // rest of the page keeps its own click and scroll behaviour.
  if (!hit || (hit !== selected && !selected.contains(hit))) return

  const [tx, ty] = translateOf()
  drag = { x: event.clientX, y: event.clientY, tx, ty }
  event.preventDefault()
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return
  setTranslate(drag.tx + (event.clientX - drag.x), drag.ty + (event.clientY - drag.y))
}

const onPointerUp = () => {
  drag = null
}

/* ---- saving ---- */

async function save() {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tweaks),
    })
    if (!res.ok) throw new Error(await res.text())
    dirty = false
    renderActions()
    say('Written to src/mobile-tweaks.css')
  } catch (err) {
    say('Save failed — is the dev server running?', true)
    console.error('[mobile tuner]', err)
  }
}

/* ---- wiring ---- */

function onBodyInput(event: Event) {
  const input = event.target as HTMLInputElement
  const row = input.closest('.mt-row') as HTMLElement | null
  const prop = row?.dataset.prop ?? input.dataset.prop
  if (!prop) return

  if (prop === 'display') {
    setProp('display', input.checked ? 'none' : null)
    return
  }

  const value = parseFloat(input.value)
  const unit = input.dataset.unit ?? ''

  if (prop === 'translate-x' || prop === 'translate-y') {
    const [tx, ty] = translateOf()
    if (prop === 'translate-x') setTranslate(value, ty)
    else setTranslate(tx, value)
    return
  }
  if (prop === 'scale') {
    setProp('scale', value === 1 ? null : String(value))
    return
  }
  setProp(prop, `${value}${unit === '×' ? '' : unit}`)
}

function onBodyClick(event: Event) {
  const clear = (event.target as Element).closest('.mt-clear')
  if (!clear) return
  const prop = (clear.closest('.mt-row') as HTMLElement)?.dataset.prop
  if (!prop) return
  setProp(prop.startsWith('translate-') ? 'translate' : prop, null)
}

function onActionClick(event: Event) {
  const act = (event.target as HTMLElement).closest('.mt-btn')?.getAttribute('data-act')
  if (!act) return

  if (act === 'pick') startPicking()
  if (act === 'parent' && selected?.parentElement) select(selected.parentElement)
  if (act === 'save') save()
  if (act === 'undo') {
    const prev = history.pop()
    if (prev) {
      tweaks = JSON.parse(prev)
      dirty = true
      apply()
      renderControls()
    }
  }
  if (act === 'reset' && selector) {
    history.push(JSON.stringify(tweaks))
    delete tweaks[selector]
    dirty = true
    apply()
    renderControls()
  }
  if (act === 'resetall') {
    history.push(JSON.stringify(tweaks))
    tweaks = {}
    dirty = true
    apply()
    renderControls()
  }
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && picking) {
    stopPicking()
    return
  }
  if (!selected || picking) return
  if (insidePanel(event.target)) return

  const step = event.shiftKey ? 10 : 1
  const [tx, ty] = translateOf()
  if (event.key === 'ArrowLeft') setTranslate(tx - step, ty)
  else if (event.key === 'ArrowRight') setTranslate(tx + step, ty)
  else if (event.key === 'ArrowUp') setTranslate(tx, ty - step)
  else if (event.key === 'ArrowDown') setTranslate(tx, ty + step)
  else return
  event.preventDefault()
}

export async function mountMobileTuner() {
  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style, liveStyle)

  panel.innerHTML = `
    <div class="mt-head">
      <span class="mt-title">Mobile</span>
      <span class="mt-target">nothing picked</span>
      <button class="mt-btn" data-fold>–</button>
    </div>
    <div class="mt-body"></div>
    <div class="mt-actions"></div>`
  document.body.append(highlight, panel, toast)

  panel.querySelector('[data-fold]')!.addEventListener('click', (e) => {
    panel.classList.toggle('mt-collapsed')
    ;(e.target as HTMLElement).textContent = panel.classList.contains('mt-collapsed') ? '+' : '–'
  })
  panel.querySelector('.mt-body')!.addEventListener('input', onBodyInput)
  panel.querySelector('.mt-body')!.addEventListener('click', onBodyClick)
  panel.querySelector('.mt-actions')!.addEventListener('click', onActionClick)

  document.addEventListener('click', onPickClick, true)
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('pointermove', onPointerMove, true)
  document.addEventListener('pointerup', onPointerUp, true)
  document.addEventListener('keydown', onKey)

  try {
    tweaks = await (await fetch(ENDPOINT)).json()
  } catch {
    tweaks = {}
  }
  apply()
  renderControls()
  requestAnimationFrame(tick)
}
