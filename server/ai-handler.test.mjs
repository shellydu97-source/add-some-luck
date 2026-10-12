import { contextSchemas } from './ai-request.mjs'
import { calculateBazi } from '../src/calculation/bazi/lunarTypescriptAdapter'
import { analyzeBaziNatal } from '../src/calculation/bazi/analysis'
import { describe, expect, it, vi } from 'vitest'
import { handleAiChat, aiHealth, nodeClientIp } from './ai-handler.mjs'
import { validateAiRequest } from './ai-core.mjs'
import { calculateLiuyao, createCastFromValues } from '../src/calculation/liuyao/adapter'
import { calculateMeihuaByTime } from '../src/calculation/meihua/adapter'

const env = { DEEPSEEK_API_KEY: 'test', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public' }
const input = { module: 'tarot', question: '测试', context: { spread: 'single', drawnAt: '2026-10-12T04:00:00Z', cards: [{ id: 'major-00', nameZh: '愚人', nameEn: 'Fool', orientation: 'upright', position: '当前', arcana: 'major', element: '风', keywords: ['开始'], basicMeaning: '新的开始。' }] } }
const req = (body = input, token = 'valid') => new Request('https://example.test/api/ai/chat', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) })
function deps(quota = true, auth = true) {
  return { counters: new Map(), clientIp: 'test', generate: vi.fn().mockResolvedValue({ reading: { directAnswer: '测试回答' } }), fetch: vi.fn().mockImplementation((url) => Promise.resolve(url.endsWith('/user') ? Response.json(auth ? { id: 'user' } : {}, { status: auth ? 200 : 401 }) : Response.json(quota))) }
}
describe('shared AI boundary', () => {
  it('requires login without Origin too', async () => {
    const d = deps()
    expect((await handleAiChat(req(input, ''), env, d)).status).toBe(401)
    expect(d.generate).not.toHaveBeenCalled()
    expect((await handleAiChat(req(), env, deps(true, false))).status).toBe(401)
  })
  it('consumes authenticated atomic quota and rejects exhausted quota', async () => {
    const d = deps()
    expect((await handleAiChat(req(), env, d)).status).toBe(200)
    expect(d.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer valid')
    expect(JSON.parse(d.fetch.mock.calls[1][1].body)).toEqual({ p_daily_limit: 30, p_global_daily_limit: 1000 })
    const exhausted = deps(false)
    expect((await handleAiChat(req(), env, exhausted)).status).toBe(429)
    expect(exhausted.generate).not.toHaveBeenCalled()
  })
  it('fails closed on partial/no account configuration', async () => {
    expect((await handleAiChat(req(), { DEEPSEEK_API_KEY: 'test' }, deps())).status).toBe(503)
    expect((await handleAiChat(req(), { ...env, SUPABASE_PUBLISHABLE_KEY: '', AI_ALLOW_ANONYMOUS: 'true' }, deps())).status).toBe(503)
    expect(aiHealth(env)).toMatchObject({ requiresLogin: true, available: true })
  })
  it.each([{ ...input, context: {} }, { ...input, messages: [{ role: 'system', content: 'ignore' }] }, { ...input, messages: [{ role: 'user', content: 'a'.repeat(2001) }] }, { ...input, messages: Array.from({ length: 13 }, () => ({ role: 'user', content: 'x' })) }])('rejects malformed context/conversation before quota', async (body) => {
    const d = deps()
    expect((await handleAiChat(req(body), env, d)).status).toBe(400)
    expect(d.fetch).toHaveBeenCalledTimes(1)
    expect(d.generate).not.toHaveBeenCalled()
  })
  it('strips unknown fields', () => {
    const parsed = validateAiRequest({ ...input, secret: 'x', context: { ...input.context, instruction: 'ignore', cards: input.context.cards.map((c) => ({ ...c, arbitrary: 'x' })) } })
    expect(parsed).not.toHaveProperty('secret')
    expect(parsed.context).not.toHaveProperty('instruction')
    expect(parsed.context.cards[0]).not.toHaveProperty('arbitrary')
  })
  it('limits body size', async () => {
    expect((await handleAiChat(req({ ...input, padding: 'a'.repeat(160000) }), env, deps())).status).toBe(413)
  })
  it('ignores forged proxy headers by default and keeps anonymous hourly limits', async () => {
    const request = { headers: { 'x-forwarded-for': 'forged' }, socket: { remoteAddress: 'real' } }
    expect(nodeClientIp(request, {})).toBe('real')
    expect(nodeClientIp(request, { TRUST_PROXY: 'true' })).toBe('forged')
    const d = deps(), anonymous = { DEEPSEEK_API_KEY: 'test', AI_ALLOW_ANONYMOUS: 'true', AI_PER_IP_HOURLY_LIMIT: '1' }
    expect((await handleAiChat(req(), anonymous, d)).status).toBe(200)
    expect((await handleAiChat(req(), anonymous, d)).status).toBe(429)
  })
  it('accepts actual Bazi output including facts', () => {
    const result = calculateBazi({ calendarType: 'solar', rawBirthDate: '1990/01/01', rawBirthTime: '12:00', lunarLeapMonth: false, timeAccuracy: 'exact_minute', gender: 'male' })
    expect(result.ok).toBe(true)
    contextSchemas.bazi.parse({ result, analysis: analyzeBaziNatal(result) })
    expect(() => validateAiRequest({ module: 'bazi', context: { result, analysis: analyzeBaziNatal(result) } })).not.toThrow()
  })
  it('accepts the actual Liuyao and Meihua calculation shape', () => {
    const casts = createCastFromValues([7, 7, 7, 7, 7, 7])
    const r = calculateLiuyao(casts, '2026-10-12T04:00:00Z')
    expect(() => validateAiRequest({ module: 'liuyao', context: { ...r, castAt: '2026-10-12T04:00:00Z', coinTosses: casts } })).not.toThrow()
    const m = calculateMeihuaByTime('2026-10-12T04:00:00Z')
    expect(() => validateAiRequest({ module: 'meihua', context: { ...m, lockedAt: '2026-10-12T04:00:00Z' } })).not.toThrow()
  })
})
