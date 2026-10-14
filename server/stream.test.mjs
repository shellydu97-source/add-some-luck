import { afterEach,describe,it,expect,vi } from 'vitest'
import http from 'node:http'
import { once } from 'node:events'
import { parseSse,sseEvent } from './sse.mjs'
import { openDeepSeekStream,requestDeepSeek } from './deepseek-client.mjs'
import { handleAiChat } from './ai-handler.mjs'
import { sendWebResponse } from './node-response.mjs'
const encoder=new TextEncoder()
const config={apiKey:'test',model:'deepseek-flash',apiUrl:'https://example.test'}
const input={module:'tarot',question:'怎么选',action:'interpret',context:{}}
const body=(chunks)=>new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(encoder.encode(chunk));c.close()}})
const providerData=(text,finish=null,usage)=>`data: ${JSON.stringify({choices:[{delta:{content:text,reasoning_content:'PRIVATE REASONING'},finish_reason:finish}],usage})}\n\n`
afterEach(()=>vi.unstubAllGlobals())
describe('incremental SSE and cancellation',()=>{
 it('parses split Unicode bytes, CRLF, comments and multiline events',async()=>{
  const bytes=encoder.encode(': ping\r\nevent: delta\r\ndata: 第一行\r\ndata: 第二行\r\n\r\n')
  const stream=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close()}})
  const events=[];for await(const event of parseSse(stream))events.push(event)
  expect(events).toEqual([{event:'delta',data:'第一行\n第二行'}])
 })
 it('streams first delta before provider completion, excludes reasoning and returns usage',async()=>{
  let source
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({start(c){source=c}}))))
  const stream=await openDeepSeekStream(input,config)
  const iterator=stream.events[Symbol.asyncIterator]()
  source.enqueue(encoder.encode(providerData('首句回答。')))
  expect(await iterator.next()).toEqual({done:false,value:{type:'delta',text:'首句回答。'}})
  source.enqueue(encoder.encode(providerData('后续依据。','stop',{prompt_tokens:10,total_tokens:30})));source.enqueue(encoder.encode('data: [DONE]\n\n'));source.close()
  expect((await iterator.next()).value.text).toBe('后续依据。')
  const done=(await iterator.next()).value
  expect(done).toMatchObject({type:'done',reading:{directAnswer:'首句回答。后续依据。'},usage:{promptTokens:10,totalTokens:30}})
  expect(JSON.stringify(done)).not.toContain('PRIVATE');await iterator.return()
 })
 it('rejects unexpected EOF and records provider length limit as incomplete',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(body([providerData('部分回答')]))))
  const stream=await openDeepSeekStream(input,config);const run=async()=>{for await(const _event of stream.events)void _event}
  await expect(run()).rejects.toThrow('连接中断')
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(body([providerData('部分回答','length'),'data: [DONE]\n\n']))))
  const events=[];for await(const event of (await openDeepSeekStream(input,config)).events)events.push(event)
  expect(events.at(-1).reading.incomplete).toBe(true)
 })
 it('cancels the provider and reader on abort',async()=>{
  const cancel=vi.fn();let providerSignal
  vi.stubGlobal('fetch',vi.fn((_url,options)=>{providerSignal=options.signal;return Promise.resolve(new Response(new ReadableStream({cancel})))}))
  const controller=new AbortController();const stream=await openDeepSeekStream(input,config,{signal:controller.signal});const next=stream.events.next()
  controller.abort()
  await expect(next).rejects.toThrow();expect(providerSignal.aborted).toBe(true);expect(cancel).toHaveBeenCalled()
 })
 it('nonstream JSON validates basis and invalid JSON falls back to text',async()=>{
  const reading={directAnswer:'直接回答',basis:['事实'],uncertainty:['条件不足'],advice:['核实'],suggestedQuestions:[]}
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({choices:[{message:{content:JSON.stringify(reading)},finish_reason:'stop'}]})))
  const {uncertainty:_dropped,...expected}=reading;expect(_dropped).toEqual(['条件不足']);expect((await requestDeepSeek(input,config)).reading).toEqual(expected)
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({choices:[{message:{content:'回答没有被截断。'.repeat(100)},finish_reason:'length'}]})))
  const result=await requestDeepSeek(input,config);expect(result.reading.directAnswer.length).toBeGreaterThan(600);expect(result.reading.incomplete).toBe(true)
 })
})
const requestInput={module:'tarot',stream:true,question:'测试',context:{spread:'single',drawnAt:'2026-10-12',cards:[{id:'major-00',nameZh:'愚人',nameEn:'Fool',orientation:'upright',position:'当前',arcana:'major',element:'风',keywords:['开始'],basicMeaning:'新开始'}]}}
const req=(value=requestInput,token)=>new Request('https://test/api/ai/chat',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify(value)})
describe('shared streaming handler and actual Node pipe',()=>{
 it('auth/quota fail before any streaming generator is opened',async()=>{
  const env={DEEPSEEK_API_KEY:'test',SUPABASE_URL:'https://test',SUPABASE_PUBLISHABLE_KEY:'public'}
  const openStream=vi.fn()
  expect((await handleAiChat(req(),env,{openStream})).status).toBe(401)
  const fetcher=vi.fn(url=>Promise.resolve(url.endsWith('/user')?Response.json({id:'user'}):Response.json(false)))
  expect((await handleAiChat(req(requestInput,'valid'),env,{fetch:fetcher,openStream})).status).toBe(429)
  expect(openStream).not.toHaveBeenCalled()
 })
 it('client cancels shared stream and midstream failure uses error frame',async()=>{
  const cancel=vi.fn();const events=(async function*(){yield {type:'delta',text:'部分'};throw new Error('SECRET provider detail')})()
  const response=await handleAiChat(req(),{DEEPSEEK_API_KEY:'test',AI_ALLOW_ANONYMOUS:'true'},{counters:new Map(),openStream:async()=>({cancel,events})})
  expect(response.headers.get('content-type')).toContain('text/event-stream')
  const text=await response.text();expect(text).toContain('event: error');expect(text).not.toContain('SECRET')
  const another=await handleAiChat(req(),{DEEPSEEK_API_KEY:'test',AI_ALLOW_ANONYMOUS:'true'},{counters:new Map(),openStream:async()=>({cancel,events:(async function*(){yield {type:'delta',text:'部分'}})()})})
  await another.body.cancel();expect(cancel).toHaveBeenCalled()
 })
 it('Node sends bytes without buffering complete response',async()=>{
  let complete
  const source=new ReadableStream({start(c){c.enqueue(encoder.encode(sseEvent('delta',{text:'first'})));complete=()=>{c.enqueue(encoder.encode(sseEvent('done',{reading:{directAnswer:'first'},meta:{provider:'deepseek',model:'test',promptVersion:'test'}})));c.close()}}})
  const server=http.createServer((_request,response)=>{sendWebResponse(new Response(source,{headers:{'Content-Type':'text/event-stream'}}),response).catch(()=>{})})
  server.listen(0,'127.0.0.1');await once(server,'listening')
  const port=server.address().port
  try {
   const response=await fetch(`http://127.0.0.1:${port}`);const reader=response.body.getReader()
   expect(new TextDecoder().decode((await reader.read()).value)).toContain('first')
   complete();let all='';while(true){const next=await reader.read();if(next.done)break;all+=new TextDecoder().decode(next.value)}expect(all).toContain('event: done')
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r))}
 })
})
