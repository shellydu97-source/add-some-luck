interface Env { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string; APP_ORIGIN: string }
// User id is always resolved by Auth from the bearer token, never accepted from a body.
// Existing user_app_data and ai_usage foreign keys delete atomically via ON DELETE CASCADE.
export function createDeleteAccountHandler(env: Env, requestFetch: typeof fetch = fetch) {
 return async (request: Request) => {
  const origin = request.headers.get('Origin')
  const cors = { 'Access-Control-Allow-Origin':env.APP_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin' }
  const reply = (status:number,body:object) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
  if(!env.APP_ORIGIN || (origin && origin!==env.APP_ORIGIN)) return reply(403,{error:'Origin not allowed'})
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors})
  if(request.method!=='POST') return reply(405,{error:'Method not allowed'})
  const authorization=request.headers.get('Authorization')
  if(!authorization?.match(/^Bearer \S+$/)) return reply(401,{error:'Authentication required'})
  if(!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return reply(503,{error:'Account service unavailable'})
  try {
   const body=await request.json()
   if(body?.confirmation!=='DELETE_MY_ACCOUNT') return reply(400,{error:'Confirmation required'})
   const verified=await requestFetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:authorization,apikey:env.SUPABASE_ANON_KEY},signal:AbortSignal.timeout(15_000)})
   if(!verified.ok) return reply(401,{error:'Session expired'})
   const user=await verified.json()
   if(typeof user.id!=='string' || !/^[0-9a-f-]{36}$/i.test(user.id)) return reply(401,{error:'Invalid identity'})
   const deleted=await requestFetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{method:'DELETE',headers:{Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,apikey:env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({should_soft_delete:false}),signal:AbortSignal.timeout(15_000)})
   if(!deleted.ok) return reply(502,{error:'Deletion failed; account data remains available'})
   return reply(200,{deleted:true})
  } catch { return reply(502,{error:'Deletion not confirmed; retry or contact support'}) }
 }
}
