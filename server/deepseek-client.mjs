import {
  buildDeepSeekGenerationOptions,
  buildDeepSeekMessages,
  DEEPSEEK_REQUEST_TIMEOUT_MS,
  extractDeepSeekUsage,
  sanitizeReading,
} from './ai-core.mjs'

async function complete(messages, options, config, signal) {
  const providerResponse = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      ...options,
    }),
    signal,
  })
  const payload = await providerResponse.json().catch(() => ({}))
  if (!providerResponse.ok) {
    console.error('[deepseek]', payload?.error?.message || providerResponse.status)
    throw new Error('智能解读服务暂时无法连接，请稍后重试')
  }
  const content = payload?.choices?.[0]?.message?.content
  if (!content) {
    console.error('[deepseek] 没有正文', {
      finishReason: payload?.choices?.[0]?.finish_reason,
      usage: extractDeepSeekUsage(payload?.usage),
    })
    throw new Error('智能解读没有返回内容')
  }
  let reading
  try {
    reading = sanitizeReading(JSON.parse(content))
  } catch {
    reading = sanitizeReading({
      directAnswer: content
        .replace(/\*\*(.*?)\*\*/gs, '$1')
        .replace(/__(.*?)__/gs, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .trim(),
      summary: '',
      sections: [],
      uncertainty: [],
      advice: [],
      suggestedQuestions: [],
    })
  }
  return {
    reading,
    usage: extractDeepSeekUsage(payload.usage),
  }
}

export async function requestDeepSeek(input, config) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_REQUEST_TIMEOUT_MS)
  try {
    return await complete(
      buildDeepSeekMessages(input),
      buildDeepSeekGenerationOptions(),
      config,
      controller.signal,
    )
  } finally {
    clearTimeout(timeout)
  }
}
