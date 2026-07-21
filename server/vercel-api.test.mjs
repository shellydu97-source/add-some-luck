import { describe, expect, it } from 'vitest'
import chatHandler from '../api/ai/chat.mjs'
import healthHandler from '../api/ai/health.mjs'

describe('Vercel AI functions', () => {
  it('reports whether the server-side key is configured without exposing it', async () => {
    const response = healthHandler.fetch(new Request('https://example.test/api/ai/health'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.provider).toBe('deepseek')
    expect(typeof payload.available).toBe('boolean')
    expect(JSON.stringify(payload)).not.toContain('sk-')
  })

  it('rejects cross-site browser calls before contacting the provider', async () => {
    const response = await chatHandler.fetch(new Request('https://example.test/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host: 'example.test',
        origin: 'https://other.test',
      },
      body: '{}',
    }))

    expect(response.status).toBe(403)
  })
})
