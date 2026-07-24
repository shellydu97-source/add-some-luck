import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateAiRequest } from './ai-core.mjs'
import { requestDeepSeek } from './deepseek-client.mjs'

const config = {
  apiKey: 'test-key',
  apiUrl: 'https://example.test/chat',
  model: 'deepseek-v4-flash',
}

function providerResponse(reading, usage = {}) {
  return Response.json({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(reading) } }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
      completion_tokens_details: { reasoning_tokens: 50 },
      ...usage,
    },
  })
}

function reading(directAnswer) {
  return {
    directAnswer,
    summary: '保留选择空间。',
    sections: [{ title: '目前的倾向', content: '现有信息更支持先观察条件。', evidence: ['本卦：水天需'] }],
    uncertainty: ['现有数据不能确定最终结果。'],
    advice: ['核对现实中的岗位条件。'],
    suggestedQuestions: [],
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DeepSeek quality review', () => {
  it('always performs a second publish-ready review and combines usage', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(providerResponse(reading('现阶段更适合先观察。')))
      .mockResolvedValueOnce(providerResponse(reading('现阶段的倾向是先观察，再按现实条件决定。')))
    vi.stubGlobal('fetch', fetchMock)
    const request = validateAiRequest({
      module: 'liuyao',
      action: 'interpret',
      question: '这份工作要不要继续',
      context: { originalHexagram: '水天需' },
    })

    const result = await requestDeepSeek(request, config)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const revisionBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(revisionBody.messages.at(-1).content).toContain('发布前的事实核对')
    expect(revisionBody.thinking).toEqual({ type: 'disabled' })
    expect(revisionBody.temperature).toBe(0.2)
    expect(revisionBody).not.toHaveProperty('reasoning_effort')
    expect(result.reading.directAnswer).toContain('现实条件')
    expect(result.usage).toMatchObject({
      promptTokens: 200,
      completionTokens: 400,
      totalTokens: 600,
      reasoningTokens: 100,
    })
  })

  it('rejects a revision that still guarantees the result', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(providerResponse(reading('结果会顺利。')))
      .mockResolvedValueOnce(providerResponse(reading('最后一定能成功。')))
      .mockResolvedValueOnce(providerResponse(reading('这件事肯定会实现。')))
    vi.stubGlobal('fetch', fetchMock)
    const request = validateAiRequest({
      module: 'meihua',
      action: 'interpret',
      question: '合作结果如何',
      context: { original: '天地否', changed: '天山遁' },
    })

    await expect(requestDeepSeek(request, config)).rejects.toThrow('未通过事实核对')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
