/* ---- what is actually inside every model the bank fetches ----
 *
 *  `node scripts/perf/models.mjs`
 *
 *  No browser needed: the glTF JSON chunk is read straight off the front of
 *  each GLB. Prints bytes, triangles, texture weight and which compression
 *  extension the file declares.
 *
 *  Read it as bytes-per-triangle. `capsule-c1.glb` carries 81k triangles in
 *  439 KB with Draco; `akira-rider.glb` carries 136k in 4.4 MB with nothing.
 *  A file with no extension listed and megabytes of `image/png` in it has
 *  never been through a compression step, and that — not the size of the bay
 *  it is drawn into — is why the rail sits empty on a phone. */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/models')

/** Keep in step with `GLBS` in `src/v3/subjects.ts`, plus the pieces' own
 *  models — `iphone-17-pro-max.glb` is Plus One's bay via `Phone17.tsx` and
 *  is the single heaviest thing home fetches. */
const FILES = [
  'akira-rider.glb', 'adam-face.glb', 'capsule-c1.glb', 'gta-v-rifle.glb',
  'rdr2-revolver.glb', 'wyte-card.glb', 'iphone-17-pro-max.glb'
]

let bytes = 0
for (const f of FILES) {
  const buf = await readFile(`${dir}/${f}`)
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'))
  const acc = json.accessors || []
  let tris = 0
  for (const m of json.meshes || []) for (const p of m.primitives || []) {
    if (p.indices !== undefined && acc[p.indices]) tris += acc[p.indices].count / 3
  }
  const images = json.images || []
  const tex = images.reduce((a, im) => {
    const bv = im.bufferView !== undefined ? json.bufferViews[im.bufferView] : null
    return a + (bv ? bv.byteLength : 0)
  }, 0)
  const png = images.filter((im) => im.mimeType === 'image/png').length
  bytes += buf.length
  console.log(
    f.padEnd(24),
    String(Math.round(buf.length / 1024)).padStart(6) + 'KB',
    'tris ' + String(Math.round(tris)).padStart(7),
    'B/tri ' + String(Math.round(buf.length / Math.max(1, tris))).padStart(3),
    'textures ' + String(Math.round(tex / 1024)).padStart(5) + 'KB',
    `(${png}/${images.length} png)`.padEnd(9),
    (json.extensionsUsed || []).filter((e) => /draco|meshopt|quantiz/i.test(e)).join(',') || 'NO MESH COMPRESSION'
  )
}
console.log(`  ${Math.round((bytes / 1024 / 1024) * 10) / 10} MB across ${FILES.length} files`)
