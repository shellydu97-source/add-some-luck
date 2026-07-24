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
    expect(messages[0].content).toContain('原始字段都是固定事实')
    expect(messages[0].content).toContain('不得改变卦名、爻位或任何排盘字段')
    expect(messages[0].content).toContain('可以运用六爻知识')
    expect(messages[0].content).toContain('把历史对话当作连续上下文')
    expect(messages[1].content).toContain('乾为天')
    expect(messages.at(-1).content).toContain('用神为什么这样选')
    expect(messages.slice(2, -1).some((item) => item.role === 'assistant')).toBe(true)
  })

  it.each([
    ['tarot', '不得改牌、补牌、重抽或改变正逆位', '可以运用塔罗知识'],
    ['liuyao', '不得改变卦名、爻位或任何排盘字段', '可以运用六爻知识'],
    ['meihua', '不得改换起卦方式、输入或卦象', '可以运用梅花易数知识'],
    ['bazi', '不得改动四柱、出生信息或已有运势时间轴', '可以运用八字知识'],
    ['astrology', '不得改动星体位置、宫位或相位', '可以运用占星知识'],
  ])('keeps %s source results fixed while allowing professional interpretation', (module, fixedRule, interpretationRule) => {
    const messages = buildDeepSeekMessages(validateAiRequest({
      module,
      action: 'interpret',
      question: '请完整分析',
      context: { fixedResult: '不可修改' },
    }))
    expect(messages[0].content).toContain(fixedRule)
    expect(messages[0].content).toContain(interpretationRule)
    expect(messages[1].content).toContain('不可修改')
    expect(messages[1].content).toContain('运用你的专业知识直接解读')
  })

  it('does not pre-script conclusions or send answers through a fact-review prompt', () => {
    const messages = buildDeepSeekMessages(validateAiRequest({
      module: 'bazi',
      action: 'interpret',
      question: '我会有几个小孩，是男的还是女的？',
      context: { pillars: ['甲子', '乙丑', '丙寅', '丁卯'] },
    }))
    const prompt = messages.map((item) => item.content).join('\n')
    expect(prompt).toContain('不要因为问题带有不确定性就拒绝回答')
    expect(prompt).not.toContain('只能使用“目前更支持的倾向')
    expect(prompt).not.toContain('没有通过事实与表达审查')
    expect(prompt).not.toContain('删除所有无法从不可变 JSON')
  })

  it('enables one high-effort thinking response without sampling controls', () => {
    const options = buildDeepSeekGenerationOptions()
    expect(options).toMatchObject({
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      max_tokens: 16_000,
    })
    expect(options).not.toHaveProperty('temperature')
    expect(options).not.toHaveProperty('top_p')
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
