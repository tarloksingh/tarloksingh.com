// Build display-sized copies of every project still, into
// `src/assets/stills/<project>/<name>.jpg` and `.../thumbs/...`.
//
// The masters are camera and render output: 2316×3088, 3024×4032, several
// megabytes each. The stage they land on is 780×730 frame pixels — about 1600
// device pixels on a retina display at the frame's widest — and the rail tile
// beside it is sixty-eight. Handing the browser twelve megapixels for either
// is the whole of the pause between one picture and the next: measured in
// Chrome on this machine, one 2316×3088 webp costs ~256ms to fetch and
// **144ms to decode**, and the decode is on the main thread. At 1600 long edge
// that is a fifth of the pixels.
//
// Two sizes, because they are two different jobs:
//   stills/  1600px  what the readout puts on the stage
//   thumbs/   400px  the rail, the timeline squares, the wall
//
// `sips` rather than ffmpeg or sharp: it is in macOS, it reads webp, and this
// repo already has enough moving parts. It cannot *write* webp, so the output
// is jpeg — same as `posters.sh`, and at these sizes the difference is a few
// tens of kilobytes.
//
//   node scripts/stills.mjs            # only what is missing or stale
//   node scripts/stills.mjs --force    # all of it again
//
// Run `node scripts/media-manifest.mjs` after adding masters, not after this:
// the derivatives keep the master's aspect, which is what the manifest records.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'src/assets')
const STILLS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/** Long edge, in pixels, and the jpeg quality that goes with it. */
const SIZES = [
  { dir: 'stills', edge: 1600, quality: 80 },
  { dir: 'thumbs', edge: 400, quality: 72 }
]

/** Directories under `assets` that hold generated output rather than masters. */
const DERIVED = new Set(['posters', 'clips', 'audio', ...SIZES.map((size) => size.dir)])

const force = process.argv.includes('--force')

const longEdge = (file) => {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' })
  const numbers = [...out.matchAll(/pixel(?:Width|Height):\s*(\d+)/g)].map((match) => Number(match[1]))
  return numbers.length === 2 ? Math.max(...numbers) : 0
}

let made = 0
let kept = 0
let failed = 0

for (const project of readdirSync(assets).sort()) {
  const dir = join(assets, project)
  if (DERIVED.has(project) || !statSync(dir).isDirectory()) continue

  for (const file of readdirSync(dir).sort()) {
    if (!STILLS.has(extname(file).toLowerCase())) continue
    const source = join(dir, file)
    const base = file.replace(/\.[^.]+$/, '')
    const edge = longEdge(source)

    for (const size of SIZES) {
      const out = join(assets, size.dir, project, `${base}.jpg`)
      mkdirSync(dirname(out), { recursive: true })

      // Stale means older than the master, so replacing a photograph and
      // re-running does the right thing without anyone having to remember
      // `--force`.
      if (!force && existsSync(out) && statSync(out).mtimeMs >= statSync(source).mtimeMs) {
        kept += 1
        continue
      }

      try {
        // `-Z` fits the long edge and keeps the aspect — but it will happily
        // enlarge something smaller than the target, which is a bigger file
        // for no more detail. A master under the target is copied at its own
        // size instead.
        const args = ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(size.quality)]
        if (edge > size.edge) args.unshift('-Z', String(size.edge))
        execFileSync('sips', [...args, source, '--out', out], { stdio: 'ignore' })
        made += 1
      } catch {
        console.log(`  FAILED: ${project}/${file} → ${size.dir}`)
        failed += 1
      }
    }
  }
}

const weigh = (name) => {
  const dir = join(assets, name)
  if (!existsSync(dir)) return 0
  let bytes = 0
  for (const project of readdirSync(dir)) {
    const inner = join(dir, project)
    if (!statSync(inner).isDirectory()) continue
    for (const file of readdirSync(inner)) bytes += statSync(join(inner, file)).size
  }
  return bytes
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`
console.log(`stills written: ${made}   kept: ${kept}   failed: ${failed}`)
console.log(`  stills/ ${mb(weigh('stills'))}   thumbs/ ${mb(weigh('thumbs'))}`)
