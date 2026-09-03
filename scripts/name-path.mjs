/* Regenerates the outline half of `src/site/nameGlyphs.ts`.
 *
 * The signature is shipped as path data rather than as a webfont: the pen
 * animation masks the letterforms with a hand-drawn stroke authored against
 * *these exact* outlines, so the two must never disagree — and a font that
 * arrives late, falls back, or hints differently would make them disagree.
 * Nothing here runs at build time; run it by hand if the name ever changes.
 *
 *   curl -sL -o /tmp/GreatVibes.ttf \
 *     https://fonts.gstatic.com/s/greatvibes/v21/RWmMoKWR9v4ksMfaWd_JN-XC.ttf
 *   npm i --no-save opentype.js
 *   node scripts/name-path.mjs /tmp/GreatVibes.ttf "Tarlok Singh"
 *
 * Great Vibes is under the SIL Open Font License 1.1.
 */
import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'

const [file, text = 'Tarlok Singh'] = process.argv.slice(2)
if (!file) {
  console.error('usage: node scripts/name-path.mjs <font.ttf> [text]')
  process.exit(1)
}

const buf = readFileSync(file)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

/* Laid out glyph by glyph with kerning, deliberately bypassing `font.getPath`:
   opentype.js cannot read Great Vibes' contextual substitutions and throws on
   the whole run. The default glyphs are the ones the face is drawn to connect
   on, so nothing is lost. Its `toPathData` is also skipped — it emits NaNs for
   this font, which silently truncate the path at the first bad number. */
const SIZE = 1000
const scale = SIZE / font.unitsPerEm
const commands = []
let pen = 0
const glyphs = [...text].map((ch) => font.charToGlyph(ch))
glyphs.forEach((glyph, i) => {
  commands.push(...glyph.getPath(pen, 0, SIZE).commands)
  pen += glyph.advanceWidth * scale
  const next = glyphs[i + 1]
  if (next) pen += font.getKerningValue(glyph, next) * scale
})

const n = (v) => {
  if (!Number.isFinite(v)) throw new Error('non-finite coordinate')
  return Math.round(v)
}
const d = commands
  .map((c) =>
    c.type === 'Z'
      ? 'Z'
      : c.type === 'C'
        ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
        : c.type === 'Q'
          ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
          : `${c.type}${n(c.x)} ${n(c.y)}`
  )
  .join('')

let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
for (const c of commands) {
  if (c.type === 'Z') continue
  for (const [x, y] of [[c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]]) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    x1 = Math.min(x1, x); y1 = Math.min(y1, y)
    x2 = Math.max(x2, x); y2 = Math.max(y2, y)
  }
}

console.log(`// ${text} — Great Vibes at ${SIZE}/em, baseline y=0`)
console.log(`box: [${n(x1)}, ${n(y1)}, ${n(x2 - x1)}, ${n(y2 - y1)}]`)
console.log(`chars: ${d.length}`)
console.log(d)
