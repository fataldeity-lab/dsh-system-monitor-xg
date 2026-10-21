import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// 服务脚本自身所在目录：克隆下来直接 node dev/dock-align/serve.mjs 就能跑
const ROOT = dirname(fileURLToPath(import.meta.url))
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' }
createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const file = join(ROOT, url.pathname === '/' ? '/mock-sweep.html' : url.pathname)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end('not found')
  }
}).listen(8099, '127.0.0.1', () => console.log('mock server on http://127.0.0.1:8099/'))