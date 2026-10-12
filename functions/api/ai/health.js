import { aiHealth, json } from '../../../server/ai-handler.mjs'
export function onRequest({ request, env }) {
  return request.method === 'GET' ? json(aiHealth(env)) : json({ error: '不支持的请求方式' }, 405)
}
