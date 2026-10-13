import { securityHeaders } from '../../server/security-headers.mjs'
export async function onRequest(context) {
  const response = await context.next()
  const result = new Response(response.body,response)
  for(const [key,value] of Object.entries(securityHeaders(context.env.SUPABASE_URL ?? context.env.VITE_SUPABASE_URL))) result.headers.set(key,value)
  return result
}
