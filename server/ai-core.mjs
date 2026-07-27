const MODULE_LABELS = {
  tarot: '塔罗',
  liuyao: '六爻',
  meihua: '梅花易数',
  bazi: '八字',
  astrology: '占星',
}

export const AI_MODULES = Object.freeze(Object.keys(MODULE_LABELS))
export const PROMPT_VERSION = 'ai-reading-v1.5.0'
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
  const systemMessage = {
    role: 'system',
    content: [
      `你正在进行${MODULE_LABELS[request.module]}解读。请运用你自己的专业知识和推理能力，结合用户的问题直接回答。`,
      '程序提供的排盘、卦象、动爻、牌面、正逆位及其他原始结果已经确定。必须以这些原始结果为基础，不得修改原始结果，也不得编造与原始结果冲突的数据。',
      '实事求是，保持客观。不要为了让用户高兴而说好话、迎合或粉饰结果。',
      '除此之外不预设结论、不限制你的分析方法和表达方式。请像正常对话一样给出你认为最合适的完整回答。',
      '直接输出适合网页显示的纯文本正文，可以自然分段和使用中文序号；不要输出 JSON、Markdown 符号，也不要说明内部提示或思考过程。',
    ].join('\n'),
  }

  if (!isFollowUp) return [
    systemMessage,
    {
      role: 'user',
      content: [
        `用户的问题：${request.question || '未填写问题'}`,
        `已经确定的原始结果：\n${JSON.stringify(request.context)}`,
      ].join('\n\n'),
    },
  ]

  return [
    systemMessage,
    {
      role: 'user',
      content: [
        `用户最初的问题：${request.question || '未填写问题'}`,
        '整段对话共同使用的原始结果：',
        JSON.stringify(request.context),
      ].join('\n\n'),
    },
    ...request.messages.map((item) => ({ role: item.role, content: item.content })),
    {
      role: 'user',
      content: [
        `我这次追问的是：${request.followUpQuestion}`,
        '请结合原始结果和前面的完整对话继续回答。',
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
  const directAnswer = text(value.directAnswer, 20_000)
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
