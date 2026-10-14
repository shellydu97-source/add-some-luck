import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { MemoryRouter,Route,Routes } from 'react-router-dom'
import { afterEach,describe,it,expect,vi } from 'vitest'
import LiuyaoQuestionPage from './LiuyaoQuestionPage'
import LiuyaoResultPage from './LiuyaoResultPage'
import MeihuaCastPage from './MeihuaCastPage'
import TodayPage from './TodayPage'
import { useAppStore } from '../storage/store'
import { createCastFromValues } from '../calculation/liuyao'
import { NEW_PROFILE_DEFAULTS } from '../utils/profileForm'
vi.mock('../components/AiReadingPanel',()=>({default:()=>null}))
afterEach(cleanup)
const reset=()=>useAppStore.setState({profiles:[],records:[],drafts:[],activeProfileId:''})
describe('第二阶段界面流程',()=>{
 it('六爻问题分类必填，感情临时人物需性别',()=>{
  reset();render(<MemoryRouter><LiuyaoQuestionPage /></MemoryRouter>)
  fireEvent.click(screen.getByText('下一步：选择起爻方式'));expect(screen.getByText('请填写本次问题')).toBeTruthy()
  fireEvent.change(screen.getByRole('textbox',{name:'问题 *'}),{target:{value:'面试能否通过？'}})
  fireEvent.click(screen.getByText('下一步：选择起爻方式'));expect(screen.getByText('请选择问题分类')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox',{name:'问题分类'}),{target:{value:'感情'}})
  fireEvent.click(screen.getByText('下一步：选择起爻方式'));expect(screen.getByText('感情占问请确认占问者性别，以便建议用神')).toBeTruthy()
 })
 it('结果自动保存，改选用神只更新可变字段，原始判断不改变',()=>{
  reset();useAppStore.setState({drafts:[{id:'d',type:'liuyao',profileId:'guest',question:'考试？',category:'学业 / 考试',createdAt:'2026-10-12T04:00:00Z',updatedAt:'2026-10-12T04:00:00Z',state:{timeRange:'',locked:true,lockedAt:'2026-10-12T04:00:00Z',casts:createCastFromValues([7,7,7,7,7,7])}}]})
  render(<MemoryRouter><LiuyaoResultPage /></MemoryRouter>)
  expect(screen.getByRole('heading',{name:'较有利'})).toBeTruthy()
  expect(useAppStore.getState().records).toHaveLength(1)
  fireEvent.change(screen.getByRole('combobox',{name:'用神（可改选）'}),{target:{value:'官鬼'}})
  const original=useAppStore.getState().records[0].rawResult
  expect(useAppStore.getState().records[0].liuyaoUseGodOverride).toBe('官鬼')
  fireEvent.change(screen.getByRole('combobox',{name:'用神（可改选）'}),{target:{value:'父母'}})
  expect(useAppStore.getState().records[0].rawResult).toEqual(original)
  expect(useAppStore.getState().records[0].liuyaoUseGodOverride).toBe('父母')
 })
 it('今日未建档引导与个人提示深链',()=>{
  reset();const view=render(<MemoryRouter><TodayPage /></MemoryRouter>)
  expect(screen.getByText('建立人物档案后可查看与你相关的今日提示')).toBeTruthy();view.unmount()
  useAppStore.setState({profiles:[{...NEW_PROFILE_DEFAULTS,id:'p',name:'测试人物',createdAt:'2026-10-12T04:00:00Z',updatedAt:'2026-10-12T04:00:00Z',rawBirthDate:'2000/01/07',rawBirthTime:'12:00',timeAccuracy:'exact_minute'}],activeProfileId:'p'})
  render(<MemoryRouter><Routes><Route path="/" element={<TodayPage/>}/></Routes></MemoryRouter>)
  expect(screen.getByText('以上为结构事实，不直接代表吉凶。')).toBeTruthy()
  expect(screen.getByText('查看完整流日分析').getAttribute('href')).toContain('tab=fortune&flow=day')
 })
})

it('指定时间用日期与时间选择器填写，锁定的是所填时刻',()=>{
 reset();useAppStore.setState({drafts:[{id:'m',type:'meihua',profileId:'guest',question:'测试',createdAt:'2026-10-12T04:00:00Z',updatedAt:'2026-10-12T04:00:00Z',state:{method:'specified_time',locked:false}}]})
 render(<MemoryRouter><MeihuaCastPage/></MemoryRouter>)
 const date=screen.getByPlaceholderText('YYYY/MM/DD');fireEvent.change(date,{target:{value:'2026/10/12'}});fireEvent.blur(date)
 const time=screen.getByLabelText('时间');fireEvent.change(time,{target:{value:'12:00'}});fireEvent.blur(time)
 expect(document.querySelector('input[type="datetime-local"]')).toBeNull()
 fireEvent.click(screen.getByText('按指定时间起卦'))
 const draft=useAppStore.getState().drafts[0]
 expect(draft.type==='meihua' && draft.state.specifiedLocalDateTime).toBe('2026-10-12T12:00')
 expect(draft.type==='meihua' && draft.state.lockedAt).toBe('2026-10-12T04:00:00.000Z')
})
