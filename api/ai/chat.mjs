import { PROMPT_VERSION, validateAiRequest } from '../../server/ai-core.mjs'
import { readConfig } from '../../server/config.mjs'
import { requestDeepSeek } from '../../server/deepseek-client.mjs'

const config = readConfig()
const counters = new Map()
const MAX_BODY_BYTES = 160_000

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
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
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const originHost = new URL(origin).host
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    return originHost === requestHost
      || (['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)
        && ['127.0.0.1', 'localhost'].includes(requestHost.split(':')[0]))
  } catch {
    return false
  }
}

async function parseRequest(request) {
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_BODY_BYTES) throw new Error('请求内容过大')
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error('请求内容过大')
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('请求内容不是有效 JSON')
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: '不支持的请求方式' }, 405)
    if (!isAllowedOrigin(request)) return json({ error: '请求来源不被允许' }, 403)
    if (!config.apiKey) return json({ error: '智能解读尚未配置，请稍后再试' }, 503)
    if (!consumeRateLimit(request)) return json({ error: '今天的智能解读使用较多，请稍后再试' }, 429)

    try {
      const input = validateAiRequest(await parseRequest(request))
      const result = await requestDeepSeek(input, config)
      return json({
        ...result,
        meta: { provider: 'deepseek', model: config.model, promptVersion: PROMPT_VERSION },
      })
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? '智能解读响应超时，请稍后重试'
        : error instanceof Error ? error.message : '智能解读暂时不可用'
      const status = /请求|缺少|请输入|不支持/.test(message) ? 400 : 502
      console.error('[ai]', message)
      return json({ error: message }, status)
    }
  },
}
