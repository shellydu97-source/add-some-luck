import { describe, expect, it } from 'vitest'
import {
  auditReading,
  buildDeepSeekGenerationOptions,
  buildDeepSeekMessages,
  buildDeepSeekRevisionMessages,
  buildDeepSeekRevisionOptions,
  combineDeepSeekUsage,
  inferResponsePreferences,
  sanitizeReading,
  validateAiRequest,
} from './ai-core.mjs'

describe('AI request boundary', () => {
  it('rejects unsupported modules and missing facts', () => {
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
      messages: Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: String(index) })),
    })
    expect(request.messages).toHaveLength(14)
    const messages = buildDeepSeekMessages(request)
    expect(messages[0].content).toContain('不得篡改任何输入事实')
    expect(messages[0].content).toContain('不得自行计算、补齐、延长时间轴')
    expect(messages[0].content).toContain('用神')
    expect(messages[0].content).toContain('不得仅凭卦象替用户决定继续、离开')
    expect(messages[0].content).toContain('历史对话当作连续上下文')
    expect(messages[0].content).toContain('不得重新复述整份排盘')
    expect(messages[0].content).toContain('不得迎合')
    expect(messages[0].content).toContain('不要用“别担心”')
    expect(messages[1].content).toContain('乾为天')
    expect(messages[1].content).toContain('唯一事实来源')
    expect(messages.at(-1).content).toContain('用神为什么这样选')
    expect(messages.slice(2, -1).some((item) => item.role === 'assistant')).toBe(true)
  })

  it('keeps first reading evidence-first while allowing a warmer follow-up', () => {
    const first = buildDeepSeekMessages(validateAiRequest({ module: 'bazi', action: 'interpret', context: { pillars: ['甲子'] } }))
    const followup = buildDeepSeekMessages(validateAiRequest({ module: 'bazi', action: 'followup', followUpQuestion: '我有点担心，能说得直白些吗？', context: { pillars: ['甲子'] } }))
    expect(first[0].content).toContain('证据优先')
    expect(followup[0].content).toContain('可以承认用户的担心或犹豫')
    expect(followup.at(-1).content).toContain('直接解决这个新增问题')
    expect(followup[0].content).toContain('正常的表达要求必须执行')
    expect(followup[0].content).toContain('不要用“您”')
  })

  it('requires follow-ups to add depth instead of recycling generic advice', () => {
    const messages = buildDeepSeekMessages(validateAiRequest({
      module: 'liuyao',
      action: 'followup',
      question: '减肥能成功吗',
      followUpQuestion: '大概什么时候能到目标体重？',
      context: { originalHexagram: '地山谦', changedHexagram: '水山蹇', movingLines: [5] },
      messages: [
        { role: 'assistant', content: '需要保持耐心，遇到阻碍时灵活调整。' },
        { role: 'user', content: '能说具体一点吗？' },
        { role: 'assistant', content: '需要长期坚持，并保持灵活。' },
      ],
    }))
    expect(messages[0].content).toContain('至少推进一个新层次')
    expect(messages[0].content).toContain('不要只用泛泛的')
    expect(messages.at(-1).content).toContain('大概什么时候能到目标体重')
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

  it('treats plain language as a style request instead of a request for a shorter answer', () => {
    const request = validateAiRequest({
      module: 'bazi',
      action: 'followup',
      question: '看看近几年的工作、事业和财运',
      followUpQuestion: '能不能大白话一些？再详细一点，把工作、事业、财运结合起来，也看长远一点。',
      context: { pillars: ['甲子'], luckCycles: [] },
      messages: [{ role: 'user', content: '详细一些，整体一些' }],
    })
    const preferences = inferResponsePreferences(request)
    expect(preferences).toMatchObject({
      plainLanguage: true,
      detailed: true,
      concise: false,
      longTerm: true,
      compareOrCombine: true,
    })
    expect(preferences.topics).toEqual(expect.arrayContaining(['工作', '事业', '财运']))
    const messages = buildDeepSeekMessages(request)
    expect(messages[0].content).toContain('大白话与详细不冲突')
    expect(messages[0].content).toContain('先分别回答工作、事业、财运')
    expect(messages[0].content).toContain('近期、中期、较长期')
    expect(messages[0].content).toContain('不要把它当成新的术数问题')
  })

  it('enables high-effort thinking without unsupported sampling controls', () => {
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

  it('uses a restrained non-thinking pass for final factual editing', () => {
    const options = buildDeepSeekRevisionOptions()
    expect(options).toMatchObject({
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 8_000,
    })
    expect(options).not.toHaveProperty('reasoning_effort')
  })

  it('catches invented years, precise timing, reassurance and guaranteed outcomes', () => {
    const request = validateAiRequest({
      module: 'liuyao',
      action: 'interpret',
      question: '这件工作要不要继续',
      context: { originalHexagram: '水天需', changedHexagram: '地天泰', movingLines: [5] },
    })
    const reading = sanitizeReading({
      directAnswer: '别担心，结果会变好，至少再撑1-2个月后。',
      summary: '2029年一定能成。',
      sections: [],
      uncertainty: [],
      advice: [],
      suggestedQuestions: [],
    })
    const violations = auditReading(request, reading)
    expect(violations).toEqual(expect.arrayContaining([
      '包含安慰、哄用户或简单吉凶标签',
      '包含保证式或命定式结论',
      '把象征性趋势写成了确定结果',
      '出现输入中没有的年份：2029',
    ]))
    expect(violations.some((item) => item.includes('1-2个月'))).toBe(true)
    const revisionMessages = buildDeepSeekRevisionMessages(request, reading, violations)
    expect(revisionMessages.at(-1).content).toContain('没有通过事实与表达审查')
    expect(revisionMessages.at(-1).content).toContain('删除所有无法从不可变 JSON 直接核对')
  })

  it('combines usage from the first draft and factual revision', () => {
    expect(combineDeepSeekUsage(
      { promptTokens: 10, completionTokens: 20, totalTokens: 30, reasoningTokens: 8 },
      { promptTokens: 40, completionTokens: 50, totalTokens: 90, reasoningTokens: 12 },
    )).toMatchObject({
      promptTokens: 50,
      completionTokens: 70,
      totalTokens: 120,
      reasoningTokens: 20,
    })
  })

  it('does not mistake an uncertainty sentence for a guaranteed outcome', () => {
    const request = validateAiRequest({
      module: 'liuyao',
      action: 'interpret',
      question: '这件事结果如何',
      context: { originalHexagram: '水天需' },
    })
    const reading = sanitizeReading({
      directAnswer: '目前更支持先观察条件。',
      summary: '保留选择空间。',
      sections: [],
      uncertainty: ['现有卦象不能保证一定会顺利，也不能确定最终结果。', '当前结果没有2029年的逐年数据，2033年后无法判断。'],
      advice: ['结合现实信息再决定。'],
      suggestedQuestions: [],
    })
    expect(auditReading(request, reading)).toEqual([])
  })

  it('catches Bazi terms and birth-time assumptions that are absent from calculation facts', () => {
    const request = validateAiRequest({
      module: 'bazi',
      action: 'interpret',
      question: '事业怎么看',
      context: { pillars: ['甲子', '乙丑', '丙寅', '丁卯'] },
    })
    const reading = sanitizeReading({
      directAnswer: '当前印星能托住事业。',
      summary: '保持观察。',
      sections: [],
      uncertainty: ['原局旺衰喜忌未明确，以上基于一般命理规则。', '出生时间未知，缺少时柱。'],
      advice: [],
      suggestedQuestions: [],
    })
    const violations = auditReading(request, reading)
    expect(violations).toEqual(expect.arrayContaining([
      '承认使用输入之外的通用规则重新计算',
      '擅自假设出生时间未知或缺少时柱',
    ]))
    expect(violations.some((item) => item.includes('印星'))).toBe(true)
    expect(violations.some((item) => item.includes('旺衰'))).toBe(true)
  })

  it.each(['tarot', 'liuyao', 'meihua', 'bazi', 'astrology'])(
    'applies the shared conversational rules to %s',
    (module) => {
      const messages = buildDeepSeekMessages(validateAiRequest({
        module,
        action: 'followup',
        question: '这次结果怎么看',
        followUpQuestion: '请简单好懂但详细地讲，并且不要重复上一轮。',
        context: { fixedResult: '不可修改' },
        messages: [{ role: 'assistant', content: '上一轮已经解释过的内容。' }],
      }))
      expect(messages[0].content).toContain('会说人话')
      expect(messages[0].content).toContain('只保留能推进答案的新信息')
      expect(messages[0].content).toContain('不得只是替换近义词')
      expect(messages.at(-1).content).toContain('简单好懂但详细地讲')
    },
  )

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
