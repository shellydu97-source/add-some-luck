import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildDeepSeekMessages, PROMPT_VERSION, sanitizeReading, validateAiRequest } from './ai-core.mjs'
import { readConfig } from './config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const config = readConfig(root)
const apiOnly = process.argv.includes('--api-only')
const portArgument = process.argv.find((item) => item.startsWith('--port='))?.split('=')[1]
const requestedPort = Number(portArgument || config.port)
const counters = new Map()

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

function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim()
    || request.socket.remoteAddress
    || 'unknown'
}

function consumeRateLimit(request) {
  const now = new Date()
  const dayKey = `day:${now.toISOString().slice(0, 10)}`
  const hourKey = `ip:${clientIp(request)}:${now.toISOString().slice(0, 13)}`
  const daily = counters.get(dayKey) ?? 0
  const hourly = counters.get(hourKey) ?? 0
  if (daily >= config.dailyLimit || hourly >= config.perIpHourlyLimit) return false
  counters.set(dayKey, daily + 1)
  counters.set(hourKey, hourly + 1)
  if (counters.size > 2000) {
    for (const key of counters.keys()) {
      if (key !== dayKey && key !== hourKey) counters.delete(key)
      if (counters.size < 1000) break
    }
  }
  return true
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return true
  try {
    const originHost = new URL(origin).hostname
    const requestHost = (request.headers.host || '').split(':')[0]
    return originHost === requestHost || (['127.0.0.1', 'localhost'].includes(originHost) && ['127.0.0.1', 'localhost'].includes(requestHost))
  } catch {
    return false
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > 160_000) {
        reject(new Error('请求内容过大'))
        request.destroy()
      } else chunks.push(chunk)
    })
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(new Error('请求内容不是有效 JSON')) }
    })
    request.on('error', reject)
  })
}

async function requestDeepSeek(input) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    const providerResponse = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildDeepSeekMessages(input),
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        temperature: input.action === 'followup' ? 0.55 : 0.4,
        max_tokens: input.action === 'followup' ? 2200 : 3000,
      }),
      signal: controller.signal,
    })
    const payload = await providerResponse.json().catch(() => ({}))
    if (!providerResponse.ok) {
      const detail = payload?.error?.message || `上游服务返回 ${providerResponse.status}`
      console.error('[deepseek]', detail)
      throw new Error('智能解读服务暂时无法连接，请稍后重试')
    }
    const content = payload?.choices?.[0]?.message?.content
    if (!content) throw new Error('智能解读没有返回内容')
    let parsed
    try { parsed = JSON.parse(content) }
    catch {
      console.error('[deepseek] 返回内容不是有效 JSON')
      throw new Error('智能解读返回异常，请重新生成')
    }
    const reading = sanitizeReading(parsed)
    return {
      reading,
      usage: payload.usage ? {
        promptTokens: payload.usage.prompt_tokens,
        completionTokens: payload.usage.completion_tokens,
        totalTokens: payload.usage.total_tokens,
        cachedTokens: payload.usage.prompt_cache_hit_tokens,
      } : undefined,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/ai/health') {
    return json(response, 200, { available: Boolean(config.apiKey), provider: 'deepseek' })
  }
  if (request.method !== 'POST' || url.pathname !== '/api/ai/chat') return false
  if (!isAllowedOrigin(request)) return json(response, 403, { error: '请求来源不被允许' })
  if (!config.apiKey) return json(response, 503, { error: '智能解读尚未配置，请稍后再试' })
  if (!consumeRateLimit(request)) return json(response, 429, { error: '今天的智能解读使用较多，请稍后再试' })
  try {
    const input = validateAiRequest(await readJsonBody(request))
    const result = await requestDeepSeek(input)
    return json(response, 200, {
      ...result,
      meta: { provider: 'deepseek', model: config.model, promptVersion: PROMPT_VERSION },
    })
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? '智能解读响应超时，请稍后重试'
      : error instanceof Error ? error.message : '智能解读暂时不可用'
    const status = message.includes('请求') || message.includes('缺少') || message.includes('请输入') || message.includes('不支持') ? 400 : 502
    console.error('[ai]', message)
    return json(response, status, { error: message })
  }
}

function serveStatic(response, url) {
  if (!fs.existsSync(dist)) return json(response, 503, { error: '尚未构建前端，请先运行 pnpm build' })
  const pathname = decodeURIComponent(url.pathname)
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
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`)
  const handled = await handleApi(request, response, url)
  if (handled !== false) return
  if (apiOnly || url.pathname.startsWith('/api/')) return json(response, 404, { error: '未找到该接口' })
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: '不支持的请求方式' })
  serveStatic(response, url)
})

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
