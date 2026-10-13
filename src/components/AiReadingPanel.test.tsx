import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest'
import AiReadingPanel from './AiReadingPanel'
import { acceptAiConsent } from '../ai/consent'
import { useAppStore } from '../storage/store'
import { createRecord,createBasicInterpretation } from '../utils/record'
import { migrateToV13 } from '../storage/migrations'
import type { TarotDraft } from '../models/types'
vi.mock('../cloud/accountContext',()=>({useCloudAccount:()=>({session:null})}))
vi.mock('../cloud/supabaseClient',()=>({getSupabaseClient:async()=>null}))
let streams:ReadableStreamDefaultController<Uint8Array>[],fetcher:ReturnType<typeof vi.fn>
const encoder=new TextEncoder()
const draft:TarotDraft={id:'d',type:'tarot',profileId:'guest',question:'测试问题',createdAt:'2026-10-12T04:00:00Z',updatedAt:'2026-10-12T04:00:00Z',state:{isChoice:false,phase:'revealed',spread:'single',deckOrder:[],orientations:{},selected:[],cursor:0,revealed:true}}
function frame(type:string,data:unknown,index=0){streams[index].enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`))}
function finish(answer='首句回答。后续说明。',index=0){frame('done',{reading:{directAnswer:answer},meta:{provider:'deepseek',model:'test',promptVersion:'v3'}},index);streams[index].close()}
function chats(){return fetcher.mock.calls.filter(c=>c[0]==='/api/ai/chat')}
function mount(props:Partial<Parameters<typeof AiReadingPanel>[0]>={}){return render(<MemoryRouter><AiReadingPanel module="tarot" question="测试问题" context={{source:'fixed'}} draftId="d" {...props}/></MemoryRouter>)}
beforeEach(()=>{
 localStorage.clear();useAppStore.setState({profiles:[],records:[],drafts:[structuredClone(draft)],activeProfileId:''})
 streams=[];fetcher=vi.fn((url)=>{
  if(url==='/api/ai/health')return Promise.resolve(Response.json({available:true,requiresLogin:false}))
  return Promise.resolve(new Response(new ReadableStream<Uint8Array>({start(c){streams.push(c)},cancel(){}}),{headers:{'Content-Type':'text/event-stream'}}))
 });vi.stubGlobal('fetch',fetcher)
})
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear()})
describe('AI panel privacy, streaming, save and followups',()=>{
 it('blocks first transmission until consent, renders deltas, keeps results in draft then explicitly saves',async()=>{
  const ensure=vi.fn(()=>{const record=createRecord({type:'tarot',question:'测试问题',rawResult:{fixed:'cards'},interpretation:createBasicInterpretation('本地','')});useAppStore.getState().createRecordSnapshot(record,'d');return record.id})
  mount({ensureRecord:ensure});await waitFor(()=>expect(screen.getByText('结合问题生成解读')).toBeEnabled())
  fireEvent.click(screen.getByText('结合问题生成解读'));expect(chats()).toHaveLength(0)
  fireEvent.click(screen.getByText('暂不使用'));expect(chats()).toHaveLength(0)
  fireEvent.click(screen.getByText('结合问题生成解读'));fireEvent.click(screen.getByText('同意并继续'));await waitFor(()=>expect(chats()).toHaveLength(1))
  await act(async()=>frame('delta',{text:'逐步显示的答案。'}));expect(screen.getByText('逐步显示的答案。')).toBeTruthy();expect(screen.getByText('停止生成')).toBeTruthy()
  expect(useAppStore.getState().records).toHaveLength(0);expect(ensure).not.toHaveBeenCalled()
  await act(async()=>finish());await waitFor(()=>expect(screen.getByText('保存结果与解读到记录')).toBeTruthy())
  expect(useAppStore.getState().drafts[0].ai?.interpretations).toHaveLength(1)
  const reloaded=migrateToV13(JSON.parse(JSON.stringify(useAppStore.getState())))
  expect(reloaded.drafts[0].ai?.interpretations[0].directAnswer).toContain('首句回答')
  fireEvent.click(screen.getByText('保存结果与解读到记录'));expect(ensure).toHaveBeenCalledTimes(1);expect(useAppStore.getState().records[0].aiInterpretations).toHaveLength(1)
  fireEvent.change(screen.getByPlaceholderText('继续问，我会结合刚才的结果回答'),{target:{value:'为什么？'}});fireEvent.click(screen.getByText('发送'));await waitFor(()=>expect(chats()).toHaveLength(2))
  await act(async()=>finish('追问回答。',1));await waitFor(()=>expect(useAppStore.getState().records[0].aiMessages).toHaveLength(2))
  expect(useAppStore.getState().records).toHaveLength(1)
 })
 it('stops partial generation, never saves partial answers and permits retry',async()=>{
  acceptAiConsent();mount();await waitFor(()=>expect(screen.getByText('结合问题生成解读')).toBeEnabled());fireEvent.click(screen.getByText('结合问题生成解读'));await waitFor(()=>expect(chats()).toHaveLength(1))
  await act(async()=>frame('delta',{text:'部分答案'}));fireEvent.click(screen.getByText('停止生成'));await waitFor(()=>expect(screen.getByText('已停止生成，部分回答未保存。')).toBeTruthy())
  expect(useAppStore.getState().drafts[0].ai).toBeUndefined();expect(useAppStore.getState().records).toHaveLength(0)
  fireEvent.click(screen.getByText('重新生成'));await waitFor(()=>expect(chats()).toHaveLength(2));await act(async()=>finish('重试完整回答。',1));await waitFor(()=>expect(useAppStore.getState().drafts[0].ai?.interpretations).toHaveLength(1))
 })
 it('unmount aborts and does not save; save during stream gets the eventual complete answer',async()=>{
  acceptAiConsent();const view=mount();await waitFor(()=>expect(screen.getByText('结合问题生成解读')).toBeEnabled());fireEvent.click(screen.getByText('结合问题生成解读'));await waitFor(()=>expect(chats()).toHaveLength(1))
  view.unmount();expect(chats()[0][1].signal.aborted).toBe(true);expect(useAppStore.getState().drafts[0].ai).toBeUndefined()
  mount();await waitFor(()=>expect(screen.getByText('结合问题生成解读')).toBeEnabled());fireEvent.click(screen.getByText('结合问题生成解读'));await waitFor(()=>expect(chats()).toHaveLength(2))
  const r=createRecord({type:'tarot',rawResult:{fixed:'cards'},interpretation:createBasicInterpretation('固定','')});act(()=>useAppStore.getState().createRecordSnapshot(r,'d'))
  await act(async()=>finish('保存后完成的回答。',1));await waitFor(()=>expect(useAppStore.getState().records[0].aiInterpretations).toHaveLength(1))
  expect(useAppStore.getState().records[0].rawResult).toEqual({fixed:'cards'})
 })
 it('adding a question to an empty record updates only the mutable field',async()=>{
  const r=createRecord({type:'tarot',rawResult:{fixed:'cards'},interpretation:createBasicInterpretation('固定','')});useAppStore.setState({records:[r]})
  mount({question:'',recordId:r.id,allowQuestionInput:true});fireEvent.change(screen.getByLabelText('你最想了解什么'),{target:{value:'后来补充的问题'}})
  const saved=useAppStore.getState().records[0];expect(saved.question).toBeUndefined();expect(saved.questionAddedLater).toBe('后来补充的问题');expect(saved.rawResult).toEqual(r.rawResult)
 })
})

it('legacy structured saved answers remain visible without rewriting them',async()=>{
 const record=createRecord({type:'tarot',question:'旧问题',rawResult:{fixed:'old cards'},interpretation:createBasicInterpretation('原始','')})
 record.aiInterpretations=[{id:'legacy',module:'tarot',question:'旧问题',createdAt:'2026-10-01T04:00:00Z',provider:'deepseek',model:'old',promptVersion:'old',directAnswer:'旧回答',summary:'旧摘要',sections:[{title:'旧依据',content:'旧详细内容',evidence:['旧事实']}],uncertainty:['旧不确定说明'],advice:['旧建议'],suggestedQuestions:[]}]
 useAppStore.setState({records:[record]});const before=JSON.stringify(record)
 mount({recordId:record.id});expect(screen.getByText('旧回答')).toBeTruthy();expect(screen.getByText('旧摘要')).toBeTruthy();expect(screen.getByText('旧不确定说明')).toBeTruthy()
 fireEvent.click(screen.getByText('查看已保存的详细分析'));expect(screen.getByText('旧详细内容')).toBeTruthy();expect(screen.getByText('旧事实')).toBeTruthy();expect(JSON.stringify(useAppStore.getState().records[0])).toBe(before)
})
