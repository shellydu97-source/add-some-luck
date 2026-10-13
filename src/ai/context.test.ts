import { describe,it,expect } from 'vitest'
import { buildBaziContext,buildLiuyaoContext,buildMeihuaContext,buildTarotContext,buildRecordContext } from './context'
import { calculateBazi,analyzeBaziNatal } from '../calculation/bazi'
import { calculateLiuyao,createCastFromValues } from '../calculation/liuyao'
import { calculateMeihuaBySpecifiedTime } from '../calculation/meihua'
import { judgeMeihua } from '../calculation/meihua/judgement'
import { getTarotKnowledge } from '../data/tarotMeanings'
import { getTarotCard } from '../calculation/tarotMock'
import { createRecord,createBasicInterpretation } from '../utils/record'
import type { TarotReadingCard } from '../calculation/tarotInterpretation'
const size=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length
const time='2026-10-12T04:00:00Z'
describe('AI compact context budgets and source facts',()=>{
 it('bazi under 12KB; only current luck and neighbors, three annual entries',()=>{
  const r=calculateBazi({calendarType:'solar',rawBirthDate:'1988/07/15',rawBirthTime:'11:30',daylightSavingStatus:'applied',timeAccuracy:'exact_minute',gender:'male',lunarLeapMonth:false})
  if(!r.ok)throw new Error(r.error.message)
  const context=buildBaziContext(r,analyzeBaziNatal(r),new Date(time))
  expect(size(context)).toBeLessThan(12*1024);expect(context.luckCycles).toHaveLength(3);expect(context.annual.map(v=>v.year)).toEqual([2026,2027,2028]);expect(context.correction?.daylightSavingMinutes).toBe(-60)
  expect(context.luckCycles.every(c=>!('annual' in c))).toBe(true);expect(context.fiveElements.weighted).toBeTruthy()
 })
 it('liuyao six moving lines under 8KB and only moving texts, judgement retained',()=>{
  const r=calculateLiuyao(createCastFromValues([9,9,9,9,9,9]),time)
  const context=buildLiuyaoContext(r,{castAt:time,category:'工作 / 事业',timeRange:'两周'})
  expect(size(context)).toBeLessThan(8*1024);expect(context.judgement.useGod.relation).toBe('官鬼');expect(context.movingTexts).toHaveLength(6);expect(context.original).not.toHaveProperty('lineTexts');expect(context).not.toHaveProperty('coinTosses')
 })
 it('meihua under 8KB keeps body mutual changed judgement',()=>{
  const r=calculateMeihuaBySpecifiedTime('2026-10-12T12:00');const context=buildMeihuaContext(r,judgeMeihua(r,time),time)
  expect(size(context)).toBeLessThan(8*1024);expect(context.body.name).toBe('离');expect(context.judgement.changedRelation).toBe('用生体');expect(context.original).not.toHaveProperty('lineTexts')
 })
 it('five tarot cards under 8KB; current meanings for AI without changing saved snapshots',()=>{
  const ids=['major-00','major-01','major-02','major-03','major-04']
  const cards=ids.map((id,i)=>({id,nameZh:getTarotCard(id)!.nameZh,orientation:'upright',position:`位置${i}`,basicMeaning:getTarotKnowledge(id)!.uprightMeaning})) as TarotReadingCard[]
  expect(size(buildTarotContext('dual-path',cards,time))).toBeLessThan(8*1024)
  const record=createRecord({type:'tarot',rawResult:{spread:'dual-path',cards:cards.map(c=>({...c,basicMeaning:'旧牌义'}))},interpretation:createBasicInterpretation('原始','')})
  const before=JSON.stringify(record.rawResult);expect(JSON.stringify(buildRecordContext(record))).not.toContain('旧牌义');expect(JSON.stringify(record.rawResult)).toBe(before)
 })
})
