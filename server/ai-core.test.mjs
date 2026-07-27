import { describe, expect, it } from 'vitest'
import {
  buildDeepSeekGenerationOptions,
  buildDeepSeekMessages,
  sanitizeReading,
  validateAiRequest,
} from './ai-core.mjs'

describe('AI request boundary', () => {
  it('rejects unsupported modules and missing original results', () => {
    expect(() => validateAiRequest({ module: 'fortune', context: {} })).toThrow('不支持')
    expect(() => validateAiRequest({ module: 'tarot' })).toThrow('缺少')
  })

  it('keeps bounded conversation context as real multi-turn messages', () => {
    const request = validateAiRequest({
      module: 'liuyao',
      action: 'followup',
      question: '工作怎么选',
      followUpQuestion: '用神为什么这样选？',
      context: { originalHexagram: '乾为天' },
      messages: Array.from({ length: 20 }, (_, index) => ({
        role: index % 2 ? 'assistant' : 'user',
        content: String(index),
      })),
    })
    expect(request.messages).toHaveLength(14)
    const messages = buildDeepSeekMessages(request)
    expect(messages[0].content).toContain('你正在进行六爻解读')
    expect(messages[0].content).toContain('不得修改原始结果')
    expect(messages[0].content).toContain('实事求是，保持客观')
    expect(messages[0].content).toContain('只有用户明确要求')
    expect(messages[0].content).toContain('不要重复上一轮')
    expect(messages[1].content).toContain('乾为天')
    expect(messages.at(-1).content).toContain('用神为什么这样选')
    expect(messages.slice(2, -1).some((item) => item.role === 'assistant')).toBe(true)
  })

  it.each([
    ['tarot', '塔罗'],
    ['liuyao', '六爻'],
    ['meihua', '梅花易数'],
    ['bazi', '八字'],
    ['astrology', '占星'],
  ])('gives %s its native interpretation freedom with one shared source boundary', (module, label) => {
    const messages = buildDeepSeekMessages(validateAiRequest({
      module,
      action: 'interpret',
      question: '请完整分析',
      context: { fixedResult: '不可修改' },
    }))
    expect(messages[0].content).toContain(`你正在进行${label}解读`)
    expect(messages[0].content).toContain('不预设结论')
    expect(messages[0].content).toContain('不要为了让用户高兴而说好话')
    expect(messages[0].content).toContain('当前是首次回答')
    expect(messages[0].content).toContain('约二百至四百字')
    expect(messages[0].content).toContain('不得逐项解释第几爻')
    expect(messages[0].content).toContain('依据留在内部思考')
    expect(messages[1].content).toContain('不可修改')
  })

  it('does not pre-script conclusions, sections or a fact-review prompt', () => {
    const messages = buildDeepSeekMessages(validateAiRequest({
      module: 'bazi',
      action: 'interpret',
      question: '我会有几个小孩，是男的还是女的？',
      context: { pillars: ['甲子', '乙丑', '丙寅', '丁卯'] },
    }))
    const prompt = messages.map((item) => item.content).join('\n')
    expect(prompt).toContain('不预设结论')
    expect(prompt).toContain('先说答案，再说必要依据')
    expect(prompt).not.toContain('directAnswer')
    expect(prompt).not.toContain('suggestedQuestions')
    expect(prompt).not.toContain('没有通过事实与表达审查')
  })

  it('enables one high-effort thinking response without sampling controls', () => {
    const options = buildDeepSeekGenerationOptions()
    expect(options).toMatchObject({
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      max_tokens: 16_000,
    })
    expect(options).not.toHaveProperty('temperature')
    expect(options).not.toHaveProperty('top_p')
    expect(options).not.toHaveProperty('response_format')
  })

  it('sanitizes a detailed structured reading without over-truncating it', () => {
    const reading = sanitizeReading({
      directAnswer: '先直接回答。',
      summary: '',
      sections: [{ title: '依据', content: '来自动爻。', evidence: ['第六爻动'] }],
      uncertainty: [],
      advice: ['结合现实情况'],
      suggestedQuestions: ['世应关系怎么看？'],
    })
    expect(reading.sections[0].evidence).toEqual(['第六爻动'])
    expect(reading.summary).toBe('')
    expect(reading.advice).toEqual(['结合现实情况'])
  })
})
