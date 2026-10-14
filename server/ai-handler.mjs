import { sseEvent } from './sse.mjs'
import { PROMPT_VERSION, validateAiRequest } from './ai-core.mjs'
import { requestDeepSeek, openDeepSeekStream } from './deepseek-client.mjs'
import { AiError } from './ai-errors.mjs'

const counters = new Map()
export function aiConfig(env) {
  const positive = (key, fallback) => Number.isSafeInteger(Number(env[key])) && Number(env[key]) > 0 ? Number(env[key]) : fallback
  return {
    apiKey: env.DEEPSEEK_API_KEY?.trim() || '', model: env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash',
    apiUrl: env.DEEPSEEK_API_URL?.trim() || 'https://api.deepseek.com/chat/completions',
    supabaseUrl: env.SUPABASE_URL?.replace(/\/$/, '') || '', supabaseKey: env.SUPABASE_PUBLISHABLE_KEY || '',
    anonymous: env.AI_ALLOW_ANONYMOUS === 'true', dailyLimit: positive('AI_DAILY_REQUEST_LIMIT', 1000),
    userDailyLimit: positive('AI_USER_DAILY_LIMIT', 30), perIpHourlyLimit: positive('AI_PER_IP_HOURLY_LIMIT', 60),
  }
}
export function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
export function aiHealth(env) {
  const c = aiConfig(env)
  const requiresLogin = Boolean(c.supabaseUrl || c.supabaseKey) || !c.anonymous
  return { available: Boolean(c.apiKey && ((c.supabaseUrl && c.supabaseKey) || (!requiresLogin && c.anonymous))), requiresLogin, provider: 'deepseek' }
}
function consumeMemory(c, ip, now, store, includeDaily) {
  const hour = Math.floor(now / 3_600_000)
  const day = new Date(now).toISOString().slice(0, 10)
  const keys = [[`ip:${ip}:${hour}`, c.perIpHourlyLimit], ...(includeDaily ? [[`day:${day}`, c.dailyLimit]] : [])]
  for (const [key, entry] of store) if (entry.expires <= now) store.delete(key)
  if (keys.some(([key, limit]) => (store.get(key)?.count ?? 0) >= limit)) throw new AiError(429, '智能解读使用较多，请稍后再试')
  for (const [key] of keys) store.set(key, { count: (store.get(key)?.count ?? 0) + 1, expires: key.startsWith('ip:') ? (hour + 1) * 3_600_000 : Date.parse(`${day}T00:00:00Z`) + 86_400_000 })
}
export function nodeClientIp(request, env) {
  return env.TRUST_PROXY === 'true' ? request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown' : request.socket.remoteAddress || 'unknown'
}
async function parseBody(request) {
  if (Number(request.headers.get('content-length')) > 160_000) throw new AiError(413, '请求内容过大')
  const reader = request.body?.getReader()
  let size = 0
  const chunks = []
  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 160_000) { await reader.cancel(); throw new AiError(413, '请求内容过大') }
      chunks.push(value)
    }
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder().decode(bytes)) }
  catch { throw new AiError(400, '请求内容不是有效 JSON') }
}
export async function handleAiChat(request, env, deps = {}) {
  try {
    if (request.method !== 'POST') throw new AiError(405, '不支持的请求方式')
    const origin = request.headers.get('origin')
    if (origin) {
      let allowed = false
      try {
        const source = new URL(origin), destination = new URL(request.url)
        allowed = source.host === destination.host || (['localhost', '127.0.0.1'].includes(source.hostname) && ['localhost', '127.0.0.1'].includes(destination.hostname))
      } catch { /* malformed origins fail closed */ }
      if (!allowed) throw new AiError(403, '请求来源不被允许')
    }
    const c = aiConfig(env)
    const configured = Boolean(c.supabaseUrl && c.supabaseKey)
    const fetcher = deps.fetch ?? fetch
    let authHeaders
    let refundQuota = async () => undefined
    if (c.supabaseUrl || c.supabaseKey) {
      if (!configured) throw new AiError(503, '智能解读需要登录后使用')
      const authorization = request.headers.get('authorization')
      if (!/^Bearer \S+$/i.test(authorization ?? '')) throw new AiError(401, '登录后可以使用智能解读')
      authHeaders = { Authorization: authorization, apikey: c.supabaseKey, 'Content-Type': 'application/json' }
      const user = await fetcher(`${c.supabaseUrl}/auth/v1/user`, { headers: authHeaders, signal: AbortSignal.timeout(10_000) })
      if (!user.ok || !(await user.json().catch(() => ({}))).id) throw new AiError(401, '登录已过期，请重新登录')
    } else if (!c.anonymous) throw new AiError(503, '智能解读需要登录后使用')
    if (!c.apiKey) throw new AiError(503, '智能解读尚未配置，请稍后再试')
    const input = validateAiRequest(await parseBody(request))
    consumeMemory(c, deps.clientIp || 'unknown', (deps.now ?? Date.now)(), deps.counters ?? counters, !configured)
    if (configured) {
      const quota = await fetcher(`${c.supabaseUrl}/rest/v1/rpc/consume_ai_quota`, { method: 'POST', headers: authHeaders, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ p_daily_limit: c.userDailyLimit, p_global_daily_limit: c.dailyLimit }) })
      if (quota.status === 401) throw new AiError(401, '登录已过期，请重新登录')
      if (!quota.ok) throw new AiError(503, '智能解读限额服务暂不可用')
      if (await quota.json() !== true) throw new AiError(429, '今天的智能解读额度已用完，请明天再试')
      // A failed generation that showed nothing to the user gives the quota back.
      refundQuota = () => fetcher(`${c.supabaseUrl}/rest/v1/rpc/refund_ai_quota`, { method: 'POST', headers: authHeaders, signal: AbortSignal.timeout(10_000), body: '{}' }).catch(() => undefined)
    }
    const meta = { provider:'deepseek',model:c.model,promptVersion:PROMPT_VERSION }
    if (input.stream) {
      let source
      try { source = await (deps.openStream ?? openDeepSeekStream)(input,c,{signal:request.signal}) }
      catch (error) { await refundQuota(); throw error }
      let delivered = false
      const iterator = source.events[Symbol.asyncIterator]()
      const encoder = new TextEncoder()
      let closed = false, heartbeat
      const finish = () => {closed=true;clearInterval(heartbeat)}
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(': connected\n\n'))
          heartbeat=setInterval(()=>{if(!closed)controller.enqueue(encoder.encode(': keep-alive\n\n'))},15000)
        },
        async pull(controller) {
          if(closed) return
          try {
            const {value,done}=await iterator.next()
            if(closed) return
            if(done) {finish();controller.close();return}
            if(value.type==='done') {controller.enqueue(encoder.encode(sseEvent('done',{reading:value.reading,usage:value.usage,meta})));finish();controller.close();await iterator.return?.()}
            else {delivered=true;controller.enqueue(encoder.encode(sseEvent('delta',{text:value.text})))}
          } catch(error) {
            if(closed) return
            if(!delivered) await refundQuota()
            const message=error?.name==='TimeoutError' || error?.name==='AbortError' ? '智能解读响应超时，请重试' : error instanceof AiError ? error.message : '智能解读连接中断，请重试'
            controller.enqueue(encoder.encode(sseEvent('error',{error:message})));finish();controller.close()
          }
        },
        async cancel() {finish();source.cancel();await iterator.return?.()},
      })
      return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'}})
    }
    let result
    try { result = await (deps.generate ?? requestDeepSeek)(input, c, {signal:request.signal}) }
    catch (error) { await refundQuota(); throw error }
    return json({ ...result, meta: { provider: 'deepseek', model: c.model, promptVersion: PROMPT_VERSION } })
  } catch (error) {
    const status = error instanceof AiError ? error.status : 502
    const message = error instanceof AiError ? error.message : ['AbortError','TimeoutError'].includes(error?.name) ? '智能解读响应超时，请稍后重试' : '智能解读暂时不可用'
    return json({ error: message }, status)
  }
}
