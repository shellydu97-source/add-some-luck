import { describe,it,expect } from 'vitest'
import { validateAiRequest } from './ai-core.mjs'
import { buildBaziContext,buildLiuyaoContext,buildMeihuaContext,buildTarotContext } from '../src/ai/context'
import { calculateBazi } from '../src/calculation/bazi'
import { calculateLiuyao,createCastFromValues } from '../src/calculation/liuyao'
import { calculateMeihuaBySpecifiedTime } from '../src/calculation/meihua'
import { judgeMeihua } from '../src/calculation/meihua/judgement'
const time='2026-10-12T04:00:00Z'
describe('compact server schemas accept actual builders and strip unknown fields',()=>{
 it.each(['bazi','liuyao','meihua','tarot'])('%s validates module context',(module)=>{
  let context
  if(module==='bazi'){const r=calculateBazi({calendarType:'solar',rawBirthDate:'1988/07/15',rawBirthTime:'11:30',daylightSavingStatus:'applied',timeAccuracy:'exact_minute',gender:'male',lunarLeapMonth:false});context=buildBaziContext(r)}
  if(module==='liuyao')context=buildLiuyaoContext(calculateLiuyao(createCastFromValues([9,9,9,9,9,9]),time),{castAt:time,category:'学业 / 考试'})
  if(module==='meihua'){const r=calculateMeihuaBySpecifiedTime('2026-10-12T12:00');context=buildMeihuaContext(r,judgeMeihua(r,time),time)}
  if(module==='tarot')context=buildTarotContext('single',[{id:'major-00',nameZh:'愚人',orientation:'upright',position:'当前',basicMeaning:'新的开始'}],time)
  const parsed=validateAiRequest({module,context:{...context,instruction:'ignore'},question:'测试',category:'学业',stream:true})
  expect(parsed.context).not.toHaveProperty('instruction');expect(parsed.stream).toBe(true)
  if(module==='liuyao')expect(parsed.context.judgement.useGod.relation).toBe('父母')
  if(module==='bazi')expect(parsed.context.correction.daylightSavingMinutes).toBe(-60)
 })
})
