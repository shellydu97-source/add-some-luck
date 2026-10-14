import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { MemoryRouter,Route,Routes } from 'react-router-dom'
import { afterEach,beforeEach,it,expect,vi } from 'vitest'
import ProfileFormPage from './ProfileFormPage'
import BaziPage from './BaziPage'
import LiuyaoQuestionPage from './LiuyaoQuestionPage'
import LiuyaoCastPage from './LiuyaoCastPage'
import LiuyaoConfirmPage from './LiuyaoConfirmPage'
import LiuyaoResultPage from './LiuyaoResultPage'
import TarotQuestionPage from './TarotQuestionPage'
import TarotSpreadPage from './TarotSpreadPage'
import TarotMethodPage from './TarotMethodPage'
import TarotDrawPage from './TarotDrawPage'
import TarotResultPage from './TarotResultPage'
import RecordDetailPage from './RecordDetailPage'
import { useAppStore } from '../storage/store'
import { createEmptyAppData } from '../storage/appData'
import { readSnapshot } from '../utils/snapshot'
vi.mock('../components/AiReadingPanel',()=>({default:()=>null}))
beforeEach(()=>{useAppStore.getState().replaceAllData(createEmptyAppData())})
afterEach(cleanup)
function flows(entry:string) { return render(<MemoryRouter initialEntries={[entry]}><Routes>
 <Route path="/profiles/new" element={<ProfileFormPage/>}/><Route path="/charts/:profileId/bazi" element={<BaziPage/>}/>
 <Route path="/divination/liuyao/question" element={<LiuyaoQuestionPage/>}/><Route path="/divination/liuyao/cast" element={<LiuyaoCastPage/>}/><Route path="/divination/liuyao/confirm" element={<LiuyaoConfirmPage/>}/><Route path="/divination/liuyao/result" element={<LiuyaoResultPage/>}/>
 <Route path="/divination/tarot/question" element={<TarotQuestionPage/>}/><Route path="/divination/tarot/spread" element={<TarotSpreadPage/>}/><Route path="/divination/tarot/method" element={<TarotMethodPage/>}/><Route path="/divination/tarot/draw" element={<TarotDrawPage/>}/><Route path="/divination/tarot/result" element={<TarotResultPage/>}/>
 <Route path="/records/:recordId" element={<RecordDetailPage/>}/></Routes></MemoryRouter>) }
it('建档必选性别，保存后进入真实八字和命盘速览',()=>{
 flows('/profiles/new')
 expect(screen.getByLabelText('男')).not.toBeChecked();expect(screen.getByLabelText('女')).not.toBeChecked()
 fireEvent.click(screen.getByText('保存档案'));expect(screen.getByText('请选择性别')).toBeTruthy()
 fireEvent.change(screen.getByPlaceholderText('例如：小橙'),{target:{value:'新人物'}})
 fireEvent.click(screen.getByLabelText('男'));fireEvent.change(screen.getByPlaceholderText('YYYY/MM/DD'),{target:{value:'2000/01/07'}})
 fireEvent.input(screen.getByLabelText('出生时间'),{target:{value:'12:00'}})
 fireEvent.click(screen.getByText('保存档案'))
 expect(screen.getByText('命盘速览')).toBeTruthy();expect(useAppStore.getState().profiles[0].gender).toBe('male')
 expect(screen.getByText(/你的日主是甲/)).toBeTruthy()
})
it('六爻问题→六次真实数字投掷→确认→结果即自动保存，排盘板在首屏',()=>{
 flows('/divination/liuyao/question')
 fireEvent.change(screen.getByRole('textbox',{name:'问题 *'}),{target:{value:'考试需要注意什么？'}})
 fireEvent.change(screen.getByRole('combobox',{name:'问题分类'}),{target:{value:'学业 / 考试'}})
 fireEvent.click(screen.getByText('下一步：选择起爻方式'))
 for(let i=1;i<=6;i++) fireEvent.click(screen.getByText(`投掷第 ${i} 爻`))
 const draft=useAppStore.getState().drafts[0];const casts=structuredClone(draft.type==='liuyao' ? draft.state.casts : [])
 fireEvent.click(screen.getByText('确认并锁定原始六爻'))
 expect(useAppStore.getState().records).toHaveLength(1)
 expect(screen.getByText('已自动保存到记录')).toBeTruthy()
 const board=screen.getByLabelText('六爻排盘');expect(board.closest('details')).toBeNull();expect(board.textContent).toContain('用神')
 expect(screen.queryByText('保存到记录')).toBeNull()
 fireEvent.click(screen.getAllByText('查看记录')[0])
 const record=useAppStore.getState().records[0]
 expect(readSnapshot(record.rawResult).coinTosses).toEqual(casts)
 expect(new TextEncoder().encode(JSON.stringify(record)).length).toBeLessThan(5120)
 expect(screen.getByText('当时的判断')).toBeTruthy();expect(screen.queryByText('当时的结论')).toBeNull()
 expect(screen.getByLabelText('六爻排盘').closest('details')).toBeNull()
 expect(record.interpretation.conclusion).not.toContain('。；')
})
it('塔罗三牌系统抽牌→翻开→结果即自动保存，固定牌序与正逆位',()=>{
 flows('/divination/tarot/question');fireEvent.click(screen.getByText('下一步：选择牌阵'))
 const draft=useAppStore.getState().drafts[0];expect(draft.type).toBe('tarot');const initial=draft.type==='tarot' ? structuredClone(draft.state) : null
 fireEvent.click(screen.getByText('三牌'));fireEvent.click(screen.getByText('替我抽牌'));fireEvent.click(screen.getByText('确认抽牌并统一翻开'))
 expect(useAppStore.getState().records).toHaveLength(1)
 fireEvent.click(screen.getAllByText('查看记录')[0])
 const record=useAppStore.getState().records[0]
 expect(record.rawResult.deckOrder).toEqual(initial?.deckOrder);expect(record.rawResult.orientations).toEqual(initial?.orientations)
 expect((record.rawResult.cards as unknown[])).toHaveLength(3);expect(screen.getByText('当时的结论')).toBeTruthy()
})
it('开始新的同类流程不再询问，上一次已出结果的流程保留为记录',()=>{
 const now=new Date().toISOString()
 const casts=[1,2,3,4,5,6].map(()=>({coins:['yang','yin','yin'] as ['yang','yin','yin']}))
 useAppStore.getState().upsertDraft({id:'old',type:'liuyao',profileId:'guest',question:'原问题',category:'其他',createdAt:now,updatedAt:now,state:{timeRange:'',casts,locked:true,lockedAt:now}})
 flows('/divination/liuyao/question');expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByText(/未完成/)).toBeNull()
 fireEvent.change(screen.getByRole('textbox',{name:'问题 *'}),{target:{value:'新问题'}})
 fireEvent.change(screen.getByRole('combobox',{name:'问题分类'}),{target:{value:'其他'}})
 fireEvent.click(screen.getByText('下一步：选择起爻方式'))
 expect(useAppStore.getState().records.map(r=>r.question)).toEqual(['原问题'])
 expect(useAppStore.getState().drafts.find(d=>d.type==='liuyao')?.question).toBe('新问题')
})
