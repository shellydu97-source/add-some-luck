import { buildDeepSeekMessages, PROMPT_VERSION, sanitizeReading, validateAiRequest } from '../../../server/ai-core.mjs'

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

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function readConfig(env) {
  return {
    apiKey: String(env.DEEPSEEK_API_KEY || '').trim(),
    model: String(env.DEEPSEEK_MODEL || '').trim() || 'deepseek-v4-flash',
    apiUrl: String(env.DEEPSEEK_API_URL || '').trim() || 'https://api.deepseek.com/chat/completions',
    dailyLimit: positiveInteger(env.AI_DAILY_REQUEST_LIMIT, 300),
    perIpHourlyLimit: positiveInteger(env.AI_PER_IP_HOURLY_LIMIT, 60),
  }
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

function consumeRateLimit(request, config) {
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
    return new URL(origin).host === new URL(request.url).host
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

async function requestDeepSeek(input, config) {
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
        temperature: 0.35,
        max_tokens: input.action === 'followup' ? 1200 : 2000,
      }),
      signal: controller.signal,
    })
    const payload = await providerResponse.json().catch(() => ({}))
    if (!providerResponse.ok) {
      console.error('[deepseek]', payload?.error?.message || providerResponse.status)
      throw new Error('智能解读服务暂时无法连接，请稍后重试')
    }
    const content = payload?.choices?.[0]?.message?.content
    if (!content) throw new Error('智能解读没有返回内容')
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('[deepseek] 返回内容不是有效 JSON')
      throw new Error('智能解读返回异常，请重新生成')
    }
    return {
      reading: sanitizeReading(parsed),
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

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: '不支持的请求方式' }, 405)
  if (!isAllowedOrigin(request)) return json({ error: '请求来源不被允许' }, 403)
  const config = readConfig(env)
  if (!config.apiKey) return json({ error: '智能解读尚未配置，请稍后再试' }, 503)
  if (!consumeRateLimit(request, config)) return json({ error: '今天的智能解读使用较多，请稍后再试' }, 429)

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
}
