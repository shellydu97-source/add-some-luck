import { z } from 'zod'
import { parseSse } from '../../server/sse.mjs'
import { hasAiConsent } from './consent'
import { getSupabaseClient } from '../cloud/supabaseClient'
import type { AiConversationMessage, AiModule, AiReading, AiUsageSnapshot } from '../models/types'

export interface AiResponseMeta {
  provider: 'deepseek'
  model: string
  promptVersion: string
}

export interface AiReadingResponse {
  reading: AiReading
  usage?: AiUsageSnapshot
  meta: AiResponseMeta
}

export interface AiReadingRequest {
  module: AiModule
  category?: string
  timeRange?: string
  useGod?: string
  action: 'interpret' | 'followup'
  question: string
  followUpQuestion?: string
  context: Record<string, unknown>
  messages?: Pick<AiConversationMessage, 'role' | 'content'>[]
}

export class AiRequestError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'AiRequestError' }
}

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new AiRequestError(response.status, typeof payload.error === 'string' ? payload.error : '智能解读暂时不可用')
  return payload
}

export async function getAiServiceStatus(signal?: AbortSignal): Promise<{ available: boolean; requiresLogin: boolean }> {
  const response = await fetch('/api/ai/health', { signal, headers: { Accept: 'application/json' } })
  const payload = await readResponse(response)
  return { available: payload.available === true, requiresLogin: payload.requiresLogin === true }
}

const readingSchema=z.object({directAnswer:z.string().min(1),basis:z.array(z.string()).optional(),summary:z.string().optional(),sections:z.array(z.object({title:z.string(),content:z.string(),evidence:z.array(z.string())})).optional(),uncertainty:z.array(z.string()).optional(),advice:z.array(z.string()).optional(),suggestedQuestions:z.array(z.string()).optional(),incomplete:z.boolean().optional()})
const responseSchema=z.object({reading:readingSchema,usage:z.object({promptTokens:z.number().optional(),completionTokens:z.number().optional(),totalTokens:z.number().optional(),cachedTokens:z.number().optional(),reasoningTokens:z.number().optional()}).optional(),meta:z.object({provider:z.literal('deepseek'),model:z.string(),promptVersion:z.string()})})
function validatedResponse(value:unknown):AiReadingResponse { const parsed=responseSchema.safeParse(value);if(!parsed.success)throw new AiRequestError(502,'智能解读返回格式不完整，请重试');return parsed.data }
export async function requestAiReading(input:AiReadingRequest,signal?:AbortSignal,onDelta?:(text:string)=>void,sessionConsent=false):Promise<AiReadingResponse> {
  if(!hasAiConsent() && !sessionConsent) throw new AiRequestError(403,'请先同意将本次问题和排盘发送给 DeepSeek 处理')
  const client=await getSupabaseClient()
  const session=client ? (await client.auth.getSession()).data.session : null
  const response=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'text/event-stream',...(session?.access_token ? {Authorization:`Bearer ${session.access_token}`} : {})},body:JSON.stringify({...input,stream:true,messages:input.messages?.slice(-12).map(m=>({...m,content:m.content.slice(0,2000)}))}),signal})
  if(!response.ok) await readResponse(response)
  if(!response.headers.get('content-type')?.includes('text/event-stream')) return validatedResponse(await readResponse(response))
  for await(const event of parseSse(response.body,signal)) {
    let data:unknown
    try {data=JSON.parse(event.data)} catch {throw new AiRequestError(502,'智能解读数据流格式异常')}
    if(event.event==='delta') onDelta?.(z.object({text:z.string()}).parse(data).text)
    if(event.event==='error') throw new AiRequestError(502,z.object({error:z.string()}).parse(data).error)
    if(event.event==='done') return validatedResponse(data)
  }
  throw new AiRequestError(502,'智能解读连接中断，回答未完成，请重试')
}
