import { handleAiChat } from '../../../server/ai-handler.mjs'
export function onRequest({ request, env }) {
  return handleAiChat(request, env, { clientIp: request.headers.get('cf-connecting-ip') || 'unknown' })
}
