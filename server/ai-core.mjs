const MODULE_RULES = {
  tarot: '以提供的牌阵位置、牌名、正逆位、关键词和基础牌义为固定牌面。不得改牌、补牌、重抽或改变正逆位；可以运用塔罗知识，结合各位置之间的关系完整回答用户的问题。',
  liuyao: '以提供的本卦、变卦、动爻、月建、日辰、旬空、世应、六亲、六神和纳甲为固定排盘。不得改变卦名、爻位或任何排盘字段；可以运用六爻知识选择和讨论用神、旺衰、生克、世应与动变，但要说清判断依据。',
  meihua: '以提供的起卦依据、本卦、互卦、变卦、动爻、体卦、用卦及五行生克关系为固定结果。不得改换起卦方式、输入或卦象；可以运用梅花易数知识完整分析体用、生克、卦象和事情发展。',
  bazi: '以提供的四柱、藏干、十神、五行、纳音、长生、旬空、大运时间轴、干支关系和神煞为固定命盘。不得改动四柱、出生信息或已有运势时间轴；出生时间未知时不得补造时柱。可以运用八字知识综合解读用户关心的问题。',
  astrology: '以提供的行星、星座、宫位、相位和出生信息为固定星盘。不得改动星体位置、宫位或相位；出生时间未知时不得补造上升、天顶、宫位或行星落宫。可以运用占星知识进行综合解读。',
}

export const AI_MODULES = Object.freeze(Object.keys(MODULE_RULES))
export const PROMPT_VERSION = 'ai-reading-v1.4.0'
export const DEEPSEEK_REQUEST_TIMEOUT_MS = 120_000

function text(value, maxLength = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function stringArray(value, maxItems = 10, maxLength = 700) {
  return Array.isArray(value)
    ? value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : []
}

export function validateAiRequest(input) {
  if (!input || typeof input !== 'object') throw new Error('请求内容无效')
  const module = text(input.module, 20)
  if (!AI_MODULES.includes(module)) throw new Error('不支持的解读类型')
  const action = input.action === 'followup' ? 'followup' : 'interpret'
  if (!input.context || typeof input.context !== 'object' || Array.isArray(input.context)) {
    throw new Error('缺少排盘或牌面数据')
  }
  const serializedContext = JSON.stringify(input.context)
  if (serializedContext.length > 100_000) throw new Error('排盘数据过大')

  const messages = Array.isArray(input.messages)
    ? input.messages.slice(-14).map((item) => ({
        role: item?.role === 'assistant' ? 'assistant' : 'user',
        content: text(item?.content, 6000),
      })).filter((item) => item.content)
    : []

  const followUpQuestion = text(input.followUpQuestion, 1500)
  if (action === 'followup' && !followUpQuestion) throw new Error('请输入追问内容')

  return {
    module,
    action,
    question: text(input.question, 1500),
    followUpQuestion,
    context: input.context,
    messages,
  }
}

export function buildDeepSeekGenerationOptions() {
  return {
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
    response_format: { type: 'json_object' },
    max_tokens: 16_000,
  }
}

export function extractDeepSeekUsage(usage) {
  if (!usage) return undefined
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    cachedTokens: usage.prompt_cache_hit_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
  }
}

export function buildDeepSeekMessages(request) {
  const isFollowUp = request.action === 'followup'
  const schema = {
    directAnswer: isFollowUp
      ? '先直接回答这一次追问，再按问题需要自然展开；不要回避用户真正想问的内容'
      : '先直接回答用户最关心的内容，再解释结论如何得出',
    summary: '用自然的一句话概括核心回答；如果一句话会造成误解，可以留空',
    sections: [{
      title: '根据本次问题自然拟定的小标题',
      content: '运用相应术数知识进行完整分析，详略由问题决定，不重复凑字数',
      evidence: ['引用这次固定排盘、卦象或牌面中的具体依据'],
    }],
    uncertainty: ['确实需要提醒用户保留判断空间的内容；没有必要时可以为空'],
    advice: ['根据本次解读自然得出的现实建议；没有必要时可以为空'],
    suggestedQuestions: ['最多三个适合继续深入的新问题；没有必要时可以为空'],
  }
  const systemMessage = {
    role: 'system',
    content: [
      '你是一位熟悉八字、六爻、梅花易数、塔罗和占星的专业解读者。你会认真使用自己的术数知识，结合用户的具体问题，给出完整、自然、能让普通人看懂的分析。',
      '程序已经完成排盘、起卦或抽牌。输入 JSON 中的出生信息、四柱、运势时间轴、卦象、动爻、体用、牌面、正逆位和其他原始字段都是固定事实，不得修改、替换或假装成另一份结果。',
      '你可以根据这些固定事实运用专业知识进行判断、推演和解读。不要因为问题带有不确定性就拒绝回答，也不要只讲空泛原则；先尽力回答用户真正关心的内容，确实无法细断的部分再自然说明。',
      '关键判断应能在固定排盘、卦象或牌面中找到依据。不要编造输入里不存在的原始数据，也不要为了迎合用户而偷偷改变原始结果。',
      '语气像懂行的人在和用户认真聊天，不要写成公文、客服话术或审查报告。用户要求大白话、详细、简短、分开讲或综合讲时，直接照做。',
      isFollowUp
        ? [
            '当前是继续追问。把历史对话当作连续上下文，直接理解用户这一次的新问题。',
            '不要机械复述上一轮；需要承接时简短带过，再继续深入分析。',
            '用户要求换一种说法、说详细些或简单些时，按要求重新组织答案。',
          ].join('\n')
        : [
            '当前是首次解读。先给用户真正想知道的答案，再解释关键依据和推理。',
            '不要一上来堆满术语；使用术语时顺手解释成人话。',
          ].join('\n'),
      MODULE_RULES[request.module],
      '只返回有效 JSON，不要使用 Markdown 代码块。',
    ].join('\n'),
  }

  if (!isFollowUp) return [
    systemMessage,
    {
      role: 'user',
      content: [
        '请按以下 JSON 结构返回：',
        JSON.stringify(schema),
        `用户的问题：${request.question || '未填写问题'}`,
        `本次不可修改的原始结果：\n${JSON.stringify(request.context)}`,
        '请基于这份原始结果，运用你的专业知识直接解读并回答用户。',
      ].join('\n\n'),
    },
  ]

  return [
    systemMessage,
    {
      role: 'user',
      content: [
        `用户最初的问题：${request.question || '未填写问题'}`,
        '整段对话共同使用、不可修改的原始结果：',
        JSON.stringify(request.context),
      ].join('\n\n'),
    },
    ...request.messages.map((item) => ({ role: item.role, content: item.content })),
    {
      role: 'user',
      content: [
        `我这次追问的是：${request.followUpQuestion}`,
        '请结合上面的原始结果和完整对话直接回答，并按以下 JSON 结构返回：',
        JSON.stringify(schema),
      ].join('\n\n'),
    },
  ]
}

export function sanitizeReading(value) {
  if (!value || typeof value !== 'object') throw new Error('智能解读返回格式不完整')
  const sections = Array.isArray(value.sections)
    ? value.sections.map((item) => ({
        title: text(item?.title, 80),
        content: text(item?.content, 5000),
        evidence: stringArray(item?.evidence, 12, 700),
      })).filter((item) => item.title && item.content).slice(0, 12)
    : []
  const directAnswer = text(value.directAnswer, 7000)
  const summary = text(value.summary, 1200)
  if (!directAnswer && !summary && sections.length === 0) throw new Error('智能解读没有返回有效内容')
  return {
    directAnswer,
    summary,
    sections,
    uncertainty: stringArray(value.uncertainty, 10, 900),
    advice: stringArray(value.advice, 10, 900),
    suggestedQuestions: stringArray(value.suggestedQuestions, 5, 240),
  }
}
