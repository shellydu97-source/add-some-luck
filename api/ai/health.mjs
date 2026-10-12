import { aiHealth, json } from '../../server/ai-handler.mjs'
import { readConfig } from '../../server/config.mjs'
readConfig()
export default {
  fetch(request) {
    return request.method === 'GET' ? json(aiHealth(process.env)) : json({ error: '不支持的请求方式' }, 405)
  },
}
