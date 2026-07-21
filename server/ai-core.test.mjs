import { describe, expect, it } from 'vitest'
import { buildDeepSeekMessages, sanitizeReading, validateAiRequest } from './ai-core.mjs'

describe('AI request boundary', () => {
  it('rejects unsupported modules and missing facts', () => {
    expect(() => validateAiRequest({ module: 'fortune', context: {} })).toThrow('不支持')
    expect(() => validateAiRequest({ module: 'tarot' })).toThrow('缺少')
  })

  it('keeps only bounded conversation context', () => {
    const request = validateAiRequest({
      module: 'liuyao',
      action: 'followup',
      question: '工作怎么选',
      followUpQuestion: '用神为什么这样选？',
      context: { originalHexagram: '乾为天' },
      messages: Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: String(index) })),
    })
    expect(request.messages).toHaveLength(10)
    const messages = buildDeepSeekMessages(request)
    expect(messages[0].content).toContain('不得篡改任何输入事实')
    expect(messages[0].content).toContain('用神')
    expect(messages[0].content).toContain('更自然、耐心、有温度')
    expect(messages[0].content).toContain('不得迎合')
    expect(messages[1].content).toContain('乾为天')
  })

  it('keeps first reading evidence-first while allowing a warmer follow-up', () => {
    const first = buildDeepSeekMessages(validateAiRequest({ module: 'bazi', action: 'interpret', context: { pillars: ['甲子'] } }))
    const followup = buildDeepSeekMessages(validateAiRequest({ module: 'bazi', action: 'followup', followUpQuestion: '我有点担心，能说得直白些吗？', context: { pillars: ['甲子'] } }))
    expect(first[0].content).toContain('证据优先')
    expect(followup[0].content).toContain('可以承认用户的担心或犹豫')
    expect(followup[1].content).toContain('自然、直接回答本次追问')
  })

  it('keeps Meihua interpretation bound to fixed hexagrams and body-use facts', () => {
    const messages = buildDeepSeekMessages(validateAiRequest({
      module: 'meihua', action: 'interpret', question: '接下来留意什么',
      context: { original: '天地否', mutual: '风山渐', changed: '天山遁', movingLine: 3, body: '乾金', use: '坤土', relation: '用生体' },
    }))
    expect(messages[0].content).toContain('本卦、互卦、变卦')
    expect(messages[0].content).toContain('时间、数字、文字字数、物数或声音次数')
    expect(messages[0].content).toContain('不得把体用生克直接写成绝对成败')
    expect(messages[1].content).toContain('天地否')
    expect(messages[1].content).toContain('用生体')
  })

  it('sanitizes structured readings', () => {
    const reading = sanitizeReading({
      directAnswer: '先看现状。',
      summary: '保持克制。',
      sections: [{ title: '依据', content: '来自动爻。', evidence: ['第六爻动'] }],
      uncertainty: ['未自动选用神'],
      advice: ['先核对现实条件'],
      suggestedQuestions: ['世应关系怎么看？'],
    })
    expect(reading.sections[0].evidence).toEqual(['第六爻动'])
    expect(reading.advice).toEqual(['先核对现实条件'])
  })
})
