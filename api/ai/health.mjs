import { readConfig } from '../../server/config.mjs'

const config = readConfig()

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export default {
  fetch(request) {
    if (request.method !== 'GET') return json({ error: '不支持的请求方式' }, 405)
    return json({ available: Boolean(config.apiKey), provider: 'deepseek' })
  },
}
