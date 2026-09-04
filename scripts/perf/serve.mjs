/* `dist/`, with the catch-all rewrite `vercel.json` declares.
 *
 *  Needed because `/p/<id>` is a real URL: without the fallback every deep
 *  link 404s and the measurement quietly runs against an error page that has
 *  no canvases in it, which reads as "the stage never mounted".
 *
 *  **No compression, deliberately.** Adding gzip here would make the JS
 *  numbers look like production and the model numbers look like nothing
 *  changed; leaving it off keeps one honest half and one obviously-inflated
 *  half rather than two half-honest ones. See `fetches` in `cdp.mjs`.
 *
 *  **Range requests are supported, and that is not optional.** This served
 *  every response as a 200 with the whole body, `Range` header ignored.
 *  Desktop Chrome tolerates that for `<video>`; **iOS Safari does not** — it
 *  opens with `Range: bytes=0-1`, gets a 200, and refuses to decode. Nothing
 *  errors. What you see is a media strip whose clips are blank and, worse,
 *  three project subjects missing altogether: `mecha-station`, `openup` and
 *  `stitchfam` are pieces whose material *is* a video texture
 *  (`MechProduct.tsx`), so a clip that never decodes is a piece that never
 *  appears. That reads exactly like a broken model and is a broken server.
 *
 *  Worth stating plainly because this file is what the site gets checked on
 *  over the tailnet: a bug here impersonates a bug in the app, and it did. */
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
    const head = {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
      /* Advertised on everything. Safari checks for it before it will treat a
         resource as seekable at all. */
      'accept-ranges': 'bytes'
    }

    /* `bytes=start-end`, either end optional. A suffix range (`bytes=-500`)
       is the last N bytes, not a range starting at nothing — getting that
       backwards serves the head of the file for a request for its tail, which
       is how an MP4's moov atom goes missing. */
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (range) {
      const [, rawStart, rawEnd] = range
      let start
      let end
      if (rawStart === '') {
        if (rawEnd === '') return res.writeHead(416).end()
        start = Math.max(0, body.length - Number(rawEnd))
        end = body.length - 1
      } else {
        start = Number(rawStart)
        end = rawEnd === '' ? body.length - 1 : Math.min(Number(rawEnd), body.length - 1)
      }
      if (start > end || start >= body.length) {
        return res.writeHead(416, { 'content-range': `bytes */${body.length}` }).end()
      }
      res.writeHead(206, {
        ...head,
        'content-range': `bytes ${start}-${end}/${body.length}`,
        'content-length': end - start + 1
      })
      /* HEAD carries the headers and no body — Safari sends one first. */
      return res.end(req.method === 'HEAD' ? undefined : body.subarray(start, end + 1))
    }

    res.writeHead(200, { ...head, 'content-length': body.length })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}).listen(PORT, () => console.log(`dist on http://127.0.0.1:${PORT} (with the SPA rewrite)`))
