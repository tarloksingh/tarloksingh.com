/* ---- put the raw models through what capsule-c1 already went through ----
 *
 *  `node scripts/compress-models.mjs [--dry]`
 *
 *  Four of the seven GLBs this site fetches shipped exactly as they came out
 *  of Sketchfab: float32 positions, float32 normals, float32 tangents, and
 *  uncompressed PNG for every surface. `scripts/perf/models.mjs` puts the gap
 *  in one line — **capsule-c1.glb carries 81,000 triangles in 439 KB, and
 *  akira's rider carried 136,000 in 4.4 MB.** Home's first load on a phone was
 *  12 MB of model, all of it starting after the cover lifts.
 *
 *  This closes that and nothing more: Draco for the geometry, WebP for the
 *  textures. Two things it deliberately does not do —
 *
 *  - **No `simplify`.** `gltf-transform optimize` would run one, and a
 *    decimated mesh is a different model. Draco compresses the vertices that
 *    are there, so a bay and a project screen go on sharing one file with no
 *    second pipeline to keep in step. A bay-specific LOD would only be worth
 *    building if *decode* were the bottleneck, and 81k triangles arriving in
 *    439 KB says it is not — Draco decodes in a worker pool.
 *  - **No resize.** Every texture in the set is already 1024², sensible for a
 *    surface seen at ~900px on a project screen. WebP is the win; the pixel
 *    count is not the problem.
 *
 *  `adam-face.glb` is not in the list. It is meshopt + quantized already and
 *  carries 47 morph targets — Draco and morph targets are not a combination
 *  worth discovering on a face. Its own defect is separate and is written up
 *  under *two loose ends* in `PERFORMANCE.md`: `-vn 8` normals, which needs a
 *  re-export and not a re-pack.
 *
 *  **The masters are in git**, at the commit before this first ran:
 *
 *      git show 3cd5482:public/models/gta-v-rifle.glb > /tmp/master.glb
 *
 *  Nothing in the app changes for a Draco file: `/draco/` is served locally
 *  and `useGLTF(src, DRACO_PATH)` is already wired in `MechSlots.tsx`,
 *  `MechModel.tsx` and `ModelFrame.tsx`.
 *
 *  After any run, check triangle counts with `models.mjs` — they must be
 *  **identical** — and then look at the four subjects on screen. */
import { execFileSync } from 'node:child_process'
import { statSync, copyFileSync, rmSync, readFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DIR = 'public/models'

/* **The CLI is fetched on demand, not kept as a devDependency.**
 * `@gltf-transform/cli` is ~4 MB before its own tree (draco, sharp) and takes
 * minutes to install, and Vercel runs `npm install` on every deploy — a long
 * time to pay on every push for a tool that runs when a model is added.
 *
 * So it uses `node_modules/.bin/gltf-transform` if it happens to be there and
 * falls back to `npx --yes` if not. That order matters more than it looks:
 * npx re-resolves the package on *every* invocation, and this makes sixteen
 * of them (four passes over four models), which turns a job of about a minute
 * into ten or fifteen. If you are going to run this, install it first:
 *
 *     npm install --no-save @gltf-transform/cli@4
 *     node scripts/compress-models.mjs
 *     npm uninstall @gltf-transform/cli      # keep it out of the deploy
 *
 * `--no-save` is the point of that first line — it must not reach
 * `package.json`. The version is pinned either way, so a future major cannot
 * quietly change what the models are packed with. */
const LOCAL = 'node_modules/.bin/gltf-transform'
const run = (args) =>
  existsSync(LOCAL)
    ? execFileSync(LOCAL, args, { stdio: ['ignore', 'ignore', 'inherit'] })
    : execFileSync('npx', ['--yes', '@gltf-transform/cli@4', ...args], { stdio: ['ignore', 'ignore', 'inherit'] })

/** `webp` is false where the textures already are — re-encoding WebP to WebP
 *  is a second lossy pass for no bytes. Akira's rider is the only one; its
 *  0.5 MB of surface was never the problem, its 4.4 MB of float32 was. */
const MODELS = [
  { file: 'gta-v-rifle.glb', webp: true },
  { file: 'iphone-17-pro-max.glb', webp: true },
  { file: 'rdr2-revolver.glb', webp: true },
  { file: 'akira-rider.glb', webp: false }
]

/** Whether a GLB already names Draco in its `extensionsUsed`.
 *
 *  **A guard, not a convenience.** Both passes here are lossy — Draco
 *  quantizes positions to 14 bits, WebP re-encodes — so a second run over one
 *  file quantizes the quantized and re-encodes the re-encoded. It does not
 *  error, and the file gets slightly *smaller*, which is exactly the shape of
 *  a mistake nobody notices.
 *
 *  It reads the **whole** JSON chunk off the GLB header: 12 bytes of container
 *  header, a `uint32` chunk length at offset 12, the JSON at offset 20. A
 *  first attempt sniffed the leading 8 KB instead and failed open on
 *  `gta-v-rifle.glb`, because `extensionsUsed` is written after the accessor
 *  and mesh tables. A guard that silently does not guard is worse than none. */
const packed = (path) => {
  const buf = readFileSync(path)
  if (buf.length < 20 || buf.toString('latin1', 0, 4) !== 'glTF') return false
  const json = buf.toString('latin1', 20, 20 + buf.readUInt32LE(12))
  try {
    return (JSON.parse(json).extensionsUsed ?? []).includes('KHR_draco_mesh_compression')
  } catch {
    return json.includes('KHR_draco_mesh_compression')
  }
}

/* **Every intermediate lives outside `public/`.** Vite copies that directory
   verbatim into `dist`, so anything left behind there ships. An early version
   worked in place, and the run that wrote glTF JSON by accident (see the
   `.glb` note below) scattered a `.bin` and thirty loose PNG and WebP
   sidecars next to the models — which `git checkout` does not clean up,
   because they are untracked. They sat there through several builds. */
const WORK = mkdtempSync(join(tmpdir(), 'glb-'))

const dry = process.argv.includes('--dry')
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'

let before = 0
let after = 0

for (const { file, webp } of MODELS) {
  const src = `${DIR}/${file}`
  const was = statSync(src).size
  before += was

  if (dry) {
    console.log(`${file.padEnd(26)} ${mb(was).padStart(9)}   (dry run)`)
    after += was
    continue
  }

  if (packed(src)) {
    console.log(`${file.padEnd(26)} ${mb(was).padStart(9)}   already Draco, skipped`)
    after += was
    continue
  }

  /* **Both temp names have to end in `.glb`.** gltf-transform picks its
     container off the extension, so a `.tmp` output is written as glTF JSON
     with its buffers and images as siblings it then never writes — which
     comes back as a 30 KB model and reads as a spectacular compression ratio
     rather than as the total data loss it is. */
  const tmp = join(WORK, `a-${file}`)
  const tmp2 = join(WORK, `b-${file}`)

  /* `prune` first, so nothing unreferenced is compressed and then carried;
     `dedup` because Sketchfab exports repeat accessors across primitives. */
  run(['prune', src, tmp])
  run(['dedup', tmp, tmp2])
  rmSync(tmp)

  if (webp) {
    /* Every slot, including normal and metallicRoughness. Those two are data
       rather than colour and are the usual argument for staying lossless —
       but they are read here off a 1024² source through a subject a few
       degrees off axis, not sampled for a lighting bake, and they were the
       two heaviest maps in the set. 90 rather than the default, because a
       normal map is where a low quality setting shows first. */
    run(['webp', tmp2, tmp, '--quality', '90'])
    rmSync(tmp2)
  } else {
    copyFileSync(tmp2, tmp)
    rmSync(tmp2)
  }

  /* Defaults: 14-bit positions, 10-bit normals, 12-bit texcoords. Those are
     what capsule-c1 was packed at, and it is the sharpest thing on the site. */
  run(['draco', tmp, tmp2])
  rmSync(tmp)
  /* Copy rather than rename: `WORK` is in `os.tmpdir()`, not necessarily the
     same filesystem as the repo. This is the only write into `public/` the
     whole script makes. */
  copyFileSync(tmp2, src)
  rmSync(tmp2)

  const now = statSync(src).size
  after += now
  console.log(`${file.padEnd(26)} ${mb(was).padStart(9)} → ${mb(now).padStart(9)}   −${Math.round((1 - now / was) * 100)}%`)
}

rmSync(WORK, { recursive: true, force: true })
console.log(`\n${mb(before)} → ${mb(after)} across ${MODELS.length} files`)
