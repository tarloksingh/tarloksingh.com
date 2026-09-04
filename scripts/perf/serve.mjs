/* `dist/`, with the catch-all rewrite `vercel.json` declares.
 *
 *  Needed because `/p/<id>` is a real URL: without the fallback every deep
 *  link 404s and the measurement quietly runs against an error page that has
 *  no canvases in it, which reads as "the stage never mounted".
 *
 *  **No compression, deliberately.** Adding gzip here would make the JS
 *  numbers look like production and the model numbers look like nothing
 *  changed; leaving it off keeps one honest half and one obviously-inflated
 *  half rather than two half-honest ones. See `fetches` in `cdp.mjs`. */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist')
const PORT = Number(process.env.PERF_PORT || 8100)

const TYPES = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.wasm': 'application/wasm', '.json': 'application/json', '.bin': 'application/octet-stream'
}

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let file = join(root, url)
  try {
    const s = await stat(file)
    if (s.isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(root, 'index.html')
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}).listen(PORT, () => console.log(`dist on http://127.0.0.1:${PORT} (with the SPA rewrite)`))
