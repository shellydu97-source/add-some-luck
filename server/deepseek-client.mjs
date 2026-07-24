import {
  auditReading,
  buildDeepSeekGenerationOptions,
  buildDeepSeekMessages,
  buildDeepSeekRevisionMessages,
  buildDeepSeekRevisionOptions,
  combineDeepSeekUsage,
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
  try {
    return {
      reading: sanitizeReading(JSON.parse(content)),
      usage: extractDeepSeekUsage(payload.usage),
    }
  } catch {
    console.error('[deepseek] 返回内容不是有效 JSON')
    throw new Error('智能解读返回异常，请重新生成')
  }
}

export async function requestDeepSeek(input, config) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_REQUEST_TIMEOUT_MS)
  try {
    const first = await complete(
      buildDeepSeekMessages(input),
      buildDeepSeekGenerationOptions(input),
      config,
      controller.signal,
    )
    const initialViolations = auditReading(input, first.reading)
    let revisionReasons = initialViolations.length
      ? initialViolations
      : ['执行发布前的事实核对、客观性检查、去重复和口吻优化']
    if (initialViolations.length) console.warn('[deepseek] 首稿触发质量复核', initialViolations)

    let current = first
    let combinedUsage = first.usage
    for (let revisionIndex = 0; revisionIndex < 2; revisionIndex += 1) {
      const revised = await complete(
        buildDeepSeekRevisionMessages(input, current.reading, revisionReasons),
        buildDeepSeekRevisionOptions(),
        config,
        controller.signal,
      )
      combinedUsage = combineDeepSeekUsage(combinedUsage, revised.usage)
      const remainingViolations = auditReading(input, revised.reading)
      if (!remainingViolations.length) {
        return {
          reading: revised.reading,
          usage: combinedUsage,
        }
      }

      console.warn(`[deepseek] 第 ${revisionIndex + 1} 次修订仍未通过`, remainingViolations)
      current = revised
      revisionReasons = remainingViolations
    }

    throw new Error('智能解读未通过事实核对，请重新生成')
  } finally {
    clearTimeout(timeout)
  }
}
