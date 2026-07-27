import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateAiRequest } from './ai-core.mjs'
import { requestDeepSeek } from './deepseek-client.mjs'

const config = {
  apiKey: 'test-key',
  apiUrl: 'https://example.test/chat',
  model: 'deepseek-v4-flash',
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
  it('uses one deep-thinking request and returns it without a forced rewrite', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse())
    vi.stubGlobal('fetch', fetchMock)
    const request = validateAiRequest({
      module: 'liuyao',
      action: 'interpret',
      question: '这份工作要不要继续',
      context: { originalHexagram: '水天需' },
    })

    const result = await requestDeepSeek(request, config)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.thinking).toEqual({ type: 'enabled' })
    expect(body.reasoning_effort).toBe('high')
    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('response_format')
    expect(result.reading.directAnswer).toContain('我会这样分析')
    expect(result.reading.directAnswer).toContain('本卦为水天需')
    expect(result.reading.directAnswer).not.toContain('**')
    expect(result.reading.directAnswer).not.toContain('###')
    expect(result.reading.sections).toEqual([])
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
    const request = validateAiRequest({
      module: 'bazi',
      action: 'interpret',
      question: '事业如何',
      context: { pillars: ['甲子'] },
    })
    const result = await requestDeepSeek(request, config)
    expect(result.reading.directAnswer).toBe('结构化回答也可以正常显示。')
    expect(result.reading.summary).toBe('简要结论。')
  })
})
