import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestDeepSeek } from './deepseek-client.mjs'

const config = {
  apiKey: 'test-key',
  apiUrl: 'https://example.test/chat',
  model: 'deepseek-flash',
}

function providerResponse(content = '**结合这次卦象，我会这样分析。**\n\n### 卦象依据\n本卦为水天需，重点在等待时机。') {
  return Response.json({
    choices: [{
      finish_reason: 'stop',
      message: { content },
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
      completion_tokens_details: { reasoning_tokens: 50 },
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DeepSeek thinking response', () => {
  it('uses a non-thinking JSON request with text fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse())
    vi.stubGlobal('fetch', fetchMock)
    const request = ({
      module: 'liuyao',
      action: 'interpret',
      question: '这份工作要不要继续',
      messages: [],
      context: { originalHexagram: '水天需' },
    })

    const result = await requestDeepSeek(request, config)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body).not.toHaveProperty('reasoning_effort')
    expect(body.max_tokens).toBe(1200)
    expect(body).not.toHaveProperty('temperature')
    expect(body.response_format).toEqual({type:'json_object'})
    expect(result.reading.directAnswer).toContain('我会这样分析')
    expect(result.reading.directAnswer).toContain('本卦为水天需')
    expect(result.reading.directAnswer).not.toContain('**')
    expect(result.reading.directAnswer).not.toContain('###')
    expect(result.reading.sections).toBeUndefined()
    expect(result.usage).toMatchObject({
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      reasoningTokens: 50,
    })
  })

  it('still accepts a structured provider response for backward compatibility', async () => {
    const structured = JSON.stringify({
      directAnswer: '结构化回答也可以正常显示。',
      summary: '简要结论。',
      sections: [],
      uncertainty: [],
      advice: [],
      suggestedQuestions: [],
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(structured)))
    const request = ({
      module: 'bazi',
      action: 'interpret',
      question: '事业如何',
      messages: [],
      context: { pillars: ['甲子'] },
    })
    const result = await requestDeepSeek(request, config)
    expect(result.reading.directAnswer).toBe('结构化回答也可以正常显示。')
    expect(result.reading.summary).toBe('简要结论。')
  })

  it('does not hard-truncate the initial answer', async () => {
    const longAnswer = `核心结论：可以考虑调整，但不要冲动行动。${'这是用于验证首轮长度控制的完整说明。'.repeat(80)}`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(longAnswer)))
    const request = ({
      module: 'liuyao',
      action: 'interpret',
      question: '是否适合换工作',
      messages: [],
      context: { originalHexagram: '山地剥' },
    })
    const result = await requestDeepSeek(request, config)
    expect(result.reading.directAnswer).toBe(longAnswer)
    expect(result.reading.directAnswer.endsWith('。')).toBe(true)
  })

  it('does not truncate a detailed follow-up answer', async () => {
    const longAnswer = `详细依据如下。${'这是用户明确追问后需要保留的分析内容。'.repeat(80)}`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(longAnswer)))
    const request = ({
      module: 'liuyao',
      action: 'followup',
      question: '是否适合换工作',
      followUpQuestion: '请把动爻依据详细说说',
      messages: [],
      context: { originalHexagram: '山地剥' },
    })
    const result = await requestDeepSeek(request, config)
    expect(result.reading.directAnswer.length).toBeGreaterThan(600)
  })
})

describe('truncated and malformed provider output', () => {
  const request = { module: 'tarot', action: 'interpret', question: 'q', messages: [], context: {} }
  const reply = (content, finish_reason = 'stop') => Response.json({ choices: [{ finish_reason, message: { content } }] })
  it('keeps the text of a truncated JSON answer and marks it incomplete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('{"directAnswer":"这次面试机会不小，\\n先把准备做足', 'length')))
    const result = await requestDeepSeek(request, config)
    expect(result.reading.directAnswer).toBe('这次面试机会不小，\n先把准备做足')
    expect(result.reading.incomplete).toBe(true)
    expect(result.reading.directAnswer).not.toContain('{')
  })
  it('never shows raw JSON when no answer text can be recovered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('{"basis":["只有依据"]')))
    await expect(requestDeepSeek(request, config)).rejects.toThrow('格式不完整')
  })
  it('reports an empty truncated answer clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('', 'length')))
    await expect(requestDeepSeek(request, config)).rejects.toThrow('回答被截断')
  })
})
