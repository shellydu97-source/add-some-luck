import { buildDeepSeekGenerationOptions,buildDeepSeekMessages,DEEPSEEK_REQUEST_TIMEOUT_MS,extractDeepSeekUsage,sanitizeReading,structuredReadingSchema } from './ai-core.mjs'
import { AiError } from './ai-errors.mjs'
import { parseSse } from './sse.mjs'
function lifetime(signal) {
  const controller = new AbortController()
  const cancel = () => controller.abort(signal?.reason)
  if (signal?.aborted) cancel()
  else signal?.addEventListener('abort',cancel,{once:true})
  const timer = setTimeout(()=>controller.abort(new DOMException('Timeout','TimeoutError')),DEEPSEEK_REQUEST_TIMEOUT_MS)
  return { signal:controller.signal, abort:()=>controller.abort(), dispose:()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel)} }
}
export function plainReading(content) {
  return sanitizeReading({directAnswer:content.replace(/\*\*(.*?)\*\*/gs,'$1').replace(/__(.*?)__/gs,'$1').replace(/^\s{0,3}#{1,6}\s+/gm,'').trim()})
}
// Pull the answer text out of a truncated or malformed JSON reply instead of showing raw JSON.
function directAnswerFromBrokenJson(content) {
  const matched=/"directAnswer"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(content)
  if(!matched) return ''
  try { return JSON.parse(`"${matched[1]}"`) }
  catch { return matched[1].replace(/\\n/g,'\n').replace(/\\"/g,'"') }
}
export function parseProviderReading(content) {
  let parsed
  try { parsed=JSON.parse(content) } catch { parsed=undefined }
  if(parsed && typeof parsed === 'object') {
    // Legacy structured output (sections/summary) also remains supported for older integrations.
    if(Array.isArray(parsed.sections) || typeof parsed.summary === 'string') return sanitizeReading(parsed)
    const structured=structuredReadingSchema.safeParse(parsed)
    if(structured.success) return structured.data
  }
  if(content.trim().startsWith('{')) {
    const answer=directAnswerFromBrokenJson(content).trim()
    if(!answer) throw new AiError(502,'智能解读返回格式不完整，请重新生成')
    return {...plainReading(answer),...(parsed ? {} : {incomplete:true})}
  }
  return plainReading(content)
}
async function provider(input,config,signal,stream) {
  const result = await fetch(config.apiUrl,{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,messages:buildDeepSeekMessages(input,{json:!stream}),...buildDeepSeekGenerationOptions(input,{json:!stream}),...(stream ? {stream:true,stream_options:{include_usage:true}} : {})}),signal})
  if (!result.ok) { await result.body?.cancel();throw new AiError(502,'智能解读服务暂时无法连接，请稍后重试') }
  return result
}
export async function requestDeepSeek(input,config,{signal}={}) {
  const life=lifetime(signal)
  try {
    const response=await provider(input,config,life.signal,false)
    const payload=await response.json()
    const content=payload?.choices?.[0]?.message?.content
    if(!content?.trim()) throw new AiError(502,payload?.choices?.[0]?.finish_reason === 'length' ? '回答被截断且没有正文，请重新生成' : '智能解读没有返回内容')
    const incomplete=payload.choices[0].finish_reason !== 'stop'
    return {reading:{...parseProviderReading(content),...(incomplete ? {incomplete:true} : {})},usage:extractDeepSeekUsage(payload.usage)}
  } finally { life.dispose() }
}
// Return only answer deltas. Never forward reasoning_content or provider error details.
export async function openDeepSeekStream(input,config,{signal}={}) {
  const life=lifetime(signal)
  let response
  try { response=await provider(input,config,life.signal,true) }
  catch(error) {life.dispose();throw error}
  return { cancel:life.abort, events:(async function*(){
    let answer='',usage,finished=false,reason
    try {
      for await(const event of parseSse(response.body,life.signal)) {
        if(event.data === '[DONE]') {finished=true;break}
        let payload
        try {payload=JSON.parse(event.data)} catch {throw new AiError(502,'智能解读数据流格式异常')}
        if(payload.error) throw new AiError(502,'智能解读生成中断，请重试')
        const choice=payload.choices?.[0]
        if(payload.usage) usage=extractDeepSeekUsage(payload.usage)
        if(choice?.finish_reason) reason=choice.finish_reason
        const delta=choice?.delta?.content
        if(typeof delta === 'string' && delta) {
          answer+=delta
          if(answer.length>20000) throw new AiError(502,'智能解读内容超出限制，请缩小问题范围')
          yield {type:'delta',text:delta}
        }
      }
      if(life.signal.aborted) throw life.signal.reason
      if(!finished) throw new AiError(502,'智能解读连接中断，请重试')
      if(!answer.trim()) throw new AiError(502,reason === 'length' ? '回答被截断且没有正文，请重新生成' : '智能解读没有返回内容')
      yield {type:'done',reading:{...plainReading(answer),...(reason && reason!=='stop' ? {incomplete:true} : {})},usage}
    } finally {await response.body?.cancel().catch(()=>{});life.dispose()}
  })() }
}
