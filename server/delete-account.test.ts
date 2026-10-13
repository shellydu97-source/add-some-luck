import { it,expect,vi } from 'vitest'
import { createDeleteAccountHandler } from '../supabase/functions/delete-account/handler'
const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'anon-test',SUPABASE_SERVICE_ROLE_KEY:'server-only-test',APP_ORIGIN:'https://app.example'}
const request=(body:object={confirmation:'DELETE_MY_ACCOUNT'},token='Bearer valid')=>new Request('https://project.supabase.co/functions/v1/delete-account',{method:'POST',headers:{Origin:env.APP_ORIGIN,Authorization:token,'Content-Type':'application/json'},body:JSON.stringify(body)})
it('拒绝无登录、无确认与非法来源，未调用管理删除',async()=>{
 const fetcher=vi.fn();const handle=createDeleteAccountHandler(env,fetcher)
 expect((await handle(request({},''))).status).toBe(401)
 expect((await handle(request({}))).status).toBe(400)
 expect((await handle(new Request('https://example',{method:'POST',headers:{Origin:'https://evil.example'}}))).status).toBe(403)
 expect(fetcher).not.toHaveBeenCalled()
})
it('从认证服务取得当前用户，忽略伪造用户id，服务端删除并级联业务数据',async()=>{
 const uid='a1234567-1234-1234-1234-123456789abc'
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:uid})).mockResolvedValueOnce(Response.json({}))
 const response=await createDeleteAccountHandler(env,fetcher)(request({confirmation:'DELETE_MY_ACCOUNT',user_id:'victim'}))
 expect(response.status).toBe(200)
 expect(fetcher.mock.calls[1][0]).toBe(`${env.SUPABASE_URL}/auth/v1/admin/users/${uid}`)
 expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer server-only-test')
 expect(await response.json()).toEqual({deleted:true})
})
it('失效会话和删除失败不宣称成功',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:401}))
 expect((await createDeleteAccountHandler(env,fetcher)(request())).status).toBe(401);expect(fetcher).toHaveBeenCalledTimes(1)
 const failed=vi.fn().mockResolvedValueOnce(Response.json({id:'a1234567-1234-1234-1234-123456789abc'})).mockResolvedValueOnce(new Response(null,{status:500}))
 expect((await createDeleteAccountHandler(env,failed)(request())).status).toBe(502)
})
