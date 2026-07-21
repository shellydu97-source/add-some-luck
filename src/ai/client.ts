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

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : '智能解读暂时不可用')
  return payload
}

export async function getAiServiceStatus(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch('/api/ai/health', { signal, headers: { Accept: 'application/json' } })
  const payload = await readResponse(response)
  return payload.available === true
}

export async function requestAiReading(input: AiReadingRequest, signal?: AbortSignal): Promise<AiReadingResponse> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  return await readResponse(response) as unknown as AiReadingResponse
}

