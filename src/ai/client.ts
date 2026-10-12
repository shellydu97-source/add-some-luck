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

export async function requestAiReading(input: AiReadingRequest, signal?: AbortSignal): Promise<AiReadingResponse> {
  const client = await getSupabaseClient()
  const session = client ? (await client.auth.getSession()).data.session : null
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify({ ...input, messages: input.messages?.slice(-12).map((item) => ({ ...item, content: item.content.slice(0, 2000) })) }),
    signal,
  })
  return await readResponse(response) as unknown as AiReadingResponse
}

