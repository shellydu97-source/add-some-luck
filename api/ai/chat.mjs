import { handleAiChat } from '../../server/ai-handler.mjs'
import { readConfig } from '../../server/config.mjs'
readConfig()
export default {
  fetch(request) {
    return handleAiChat(request, process.env, { clientIp: request.headers.get('x-real-ip') || 'unknown' })
  },
}
