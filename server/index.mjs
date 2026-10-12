import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { aiHealth, handleAiChat, nodeClientIp } from './ai-handler.mjs'
import { Readable } from 'node:stream'
import { readConfig } from './config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const config = readConfig(root)
const apiOnly = process.argv.includes('--api-only')
const portArgument = process.argv.find((item) => item.startsWith('--port='))?.split('=')[1]
const requestedPort = Number(portArgument || config.port)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
}

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/ai/health') return json(response, 200, aiHealth(process.env))
  if (url.pathname !== '/api/ai/chat') return false
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value)
  const standard = new Request(url, { method: request.method, headers, ...(request.method !== 'GET' && request.method !== 'HEAD' ? { body: Readable.toWeb(request), duplex: 'half' } : {}) })
  const result = await handleAiChat(standard, process.env, { clientIp: nodeClientIp(request, process.env) })
  response.writeHead(result.status, Object.fromEntries(result.headers))
  response.end(await result.text())
}

function serveStatic(response, url) {
  if (!fs.existsSync(dist)) return json(response, 503, { error: '尚未构建前端，请先运行 pnpm build' })
  let pathname
  try { pathname = decodeURIComponent(url.pathname) }
  catch { return json(response, 400, { error: '请求路径编码无效' }) }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const target = path.resolve(dist, relative)
  const safeTarget = target.startsWith(`${dist}${path.sep}`) || target === path.join(dist, 'index.html')
    ? target
    : path.join(dist, 'index.html')
  const file = safeTarget && fs.existsSync(safeTarget) && fs.statSync(safeTarget).isFile()
    ? safeTarget
    : path.join(dist, 'index.html')
  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  })
  fs.createReadStream(file).pipe(response)
}

const server = http.createServer(async (request, response) => {
  try {
    let url
    try { url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`) }
    catch { return json(response, 400, { error: '请求地址无效' }) }
    // Validate paths before routing, including API-only deployments.
    try { decodeURIComponent(url.pathname) }
    catch { return json(response, 400, { error: '请求路径编码无效' }) }
    const handled = await handleApi(request, response, url)
    if (handled !== false) return
    if (apiOnly || url.pathname.startsWith('/api/')) return json(response, 404, { error: '未找到该接口' })
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: '不支持的请求方式' })
    serveStatic(response, url)
  } catch (error) {
    console.error('[server] 请求处理失败', error)
    if (!response.headersSent) json(response, 500, { error: '服务器暂时不可用' })
    else response.end()
  }
})

process.on('unhandledRejection', (error) => console.error('[server] 未处理的异步错误', error))

function listen(port, attempts = 0) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempts < 20) listen(port + 1, attempts + 1)
    else {
      console.error('[server]', error)
      process.exitCode = 1
    }
  })
  const host = apiOnly ? '127.0.0.1' : config.host
  server.listen(port, host, () => {
    const actualPort = server.address().port
    console.log(`[server] ${apiOnly ? 'AI 代理' : '预览'}已启动：http://127.0.0.1:${actualPort}/`)
    console.log(`[server] 智能解读：${config.apiKey ? '已配置' : '未配置（其余功能可正常使用）'}`)
  })
}

listen(requestedPort)
