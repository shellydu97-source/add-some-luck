import { describe,it,expect,vi,afterEach } from 'vitest'
import { requestAiReading } from './client'
import { acceptAiConsent } from './consent'
vi.mock('../cloud/supabaseClient',()=>({getSupabaseClient:async()=>null}))
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear()})
const input={module:'tarot' as const,action:'interpret' as const,question:'测试',context:{}}
const stream=(frames:string[])=>new Response(new ReadableStream({start(c){for(const frame of frames)c.enqueue(new TextEncoder().encode(frame));c.close()}}),{headers:{'Content-Type':'text/event-stream'}})
describe('AI client consent and stream completion',()=>{
 it('does not fetch without privacy consent',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(requestAiReading(input)).rejects.toThrow('同意');expect(fetcher).not.toHaveBeenCalled()})
 it('delivers delta events and validates a completed response',async()=>{
  acceptAiConsent();const delta=vi.fn()
  const done={reading:{directAnswer:'完整回答'},meta:{provider:'deepseek',model:'test',promptVersion:'v3'}}
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(stream(['event: delta\ndata: {"text":"完整"}\n\n','event: delta\ndata: {"text":"回答"}\n\n',`event: done\ndata: ${JSON.stringify(done)}\n\n`])))
  expect(await requestAiReading(input,undefined,delta)).toEqual(done);expect(delta.mock.calls.flat()).toEqual(['完整','回答'])
 })
 it('partial EOF and error frame reject rather than save completed response',async()=>{
  acceptAiConsent();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(stream(['event: delta\ndata: {"text":"部分"}\n\n'])))
  await expect(requestAiReading(input)).rejects.toThrow('未完成')
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(stream(['event: error\ndata: {"error":"中断"}\n\n'])))
  await expect(requestAiReading(input)).rejects.toThrow('中断')
 })
})

it('invalid completion schema gives a user-facing error',async()=>{
 acceptAiConsent();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(stream(['event: done\ndata: {"reading":{"directAnswer":42}}\n\n'])))
 await expect(requestAiReading(input)).rejects.toThrow('返回格式不完整')
})
