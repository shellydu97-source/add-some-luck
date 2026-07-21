function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function onRequest({ request, env }) {
  if (request.method !== 'GET') return json({ error: '不支持的请求方式' }, 405)
  return json({ available: Boolean(env.DEEPSEEK_API_KEY), provider: 'deepseek' })
}
