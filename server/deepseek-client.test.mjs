import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateAiRequest } from './ai-core.mjs'
import { requestDeepSeek } from './deepseek-client.mjs'

const config = {
  apiKey: 'test-key',
  apiUrl: 'https://example.test/chat',
  model: 'deepseek-v4-flash',
}

function providerResponse() {
  return Response.json({
    choices: [{
      finish_reason: 'stop',
      message: {
        content: JSON.stringify({
          directAnswer: '结合这次卦象，我会这样分析。',
          summary: '',
          sections: [{
            title: '卦象依据',
            content: '完整说明本卦、变卦和动爻之间的关系。',
            evidence: ['本卦：水天需'],
          }],
          uncertainty: [],
          advice: [],
          suggestedQuestions: [],
        }),
      },
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
    expect(result.reading.directAnswer).toContain('我会这样分析')
    expect(result.usage).toMatchObject({
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      reasoningTokens: 50,
    })
  })
})
