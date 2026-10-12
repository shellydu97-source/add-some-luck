import { describe, expect, it } from 'vitest'
import { onRequest as chatHandler } from '../functions/api/ai/chat.js'
import { onRequest as healthHandler } from '../functions/api/ai/health.js'

describe('Cloudflare Pages AI functions', () => {
  it('只报告服务是否可用，不返回服务端密钥', async () => {
    const response = healthHandler({
      request: new Request('https://example.pages.dev/api/ai/health'),
      env: { DEEPSEEK_API_KEY: 'test-secret', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test-public' },
    })
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload).toEqual({ available: true, requiresLogin: true, provider: 'deepseek' })
    expect(JSON.stringify(payload)).not.toContain('test-secret')
  })

  it('在联系模型前拒绝跨站请求', async () => {
    const response = await chatHandler({
      request: new Request('https://example.pages.dev/api/ai/chat', {
        method: 'POST',
        headers: { origin: 'https://other.example' },
        body: '{}',
      }),
      env: { DEEPSEEK_API_KEY: 'test-secret' },
    })
    expect(response.status).toBe(403)
  })

  it('未配置密钥时明确返回不可用', async () => {
    const response = await chatHandler({
      request: new Request('https://example.pages.dev/api/ai/chat', { method: 'POST', body: '{}' }),
      env: {},
    })
    expect(response.status).toBe(503)
  })
})
