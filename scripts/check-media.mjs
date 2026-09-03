// Every filename `src/data/projects.ts` quotes must exist under
// `src/assets/<project-id>/`, and every video must have a poster beside it in
// `src/assets/posters/`. A reference that misses is silently dropped at
// runtime, so this is the only thing that surfaces a typo.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'src/data/projects.ts'), 'utf8')

let project = null
const problems = []
let refs = 0

for (const line of source.split('\n')) {
  const id = /^\s{4}id: '([^']+)',$/.exec(line)
  if (id) project = id[1]
  const media = /\{\s*(v|i): '([^']+)'/.exec(line)
  if (!media || !project) continue
  refs++
  const [, kind, filename] = media
  if (!existsSync(join(root, 'src/assets', project, filename))) {
    problems.push(`missing asset   ${project}/${filename}`)
    continue
  }
  if (kind === 'v') {
    const poster = filename.replace(/\.[^.]+$/, '.jpg')
    if (!existsSync(join(root, 'src/assets/posters', project, poster))) {
      problems.push(`missing poster  ${project}/${poster}`)
    }
  }
}

console.log(`checked ${refs} references`)
if (problems.length) {
  problems.forEach((p) => console.log('  ' + p))
  process.exit(1)
}
console.log('all resolve')
