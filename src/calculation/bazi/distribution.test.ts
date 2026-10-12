import { describe,it,expect } from 'vitest'
import { analyzeBaziNatal, DISTRIBUTION_WEIGHTS, activeBaziYear } from './analysis'
import { calculateBazi } from './lunarTypescriptAdapter'
describe('八字两种分布和神煞来源',()=>{
  it('显干、藏干分层，月支加权不改八字出现次数',()=>{
    const r=calculateBazi({calendarType:'solar',rawBirthDate:'2000/01/07',rawBirthTime:'12:00',timeAccuracy:'exact_minute',gender:'male',lunarLeapMonth:false})
    if(!r.ok) throw new Error(r.error.message)
    const a=analyzeBaziNatal(r)
    expect(DISTRIBUTION_WEIGHTS).toEqual({stem:1,hidden:[1,0.5,0.3],month:1.5})
    const total=Object.values(r.pillars).reduce((sum,p)=>sum+(p.status==='available'?p.hiddenStems.reduce((s,_,i)=>s+DISTRIBUTION_WEIGHTS.hidden[i],1):0),0)
    const month=r.pillars.month
    const extra=month.status==='available'?month.hiddenStems.reduce((s,_,i)=>s+DISTRIBUTION_WEIGHTS.hidden[i]*0.5,0):0
    expect(Object.values(a.weightedElementCounts).reduce((s,v)=>s+v,0)).toBeCloseTo(total+extra)
    expect(Object.values(r.fiveElementCounts).reduce((s,v)=>s+v,0)).toBe(8)
  })
  it('年支日支命中可并存，不合并查法',()=>{
    const r=calculateBazi({calendarType:'solar',rawBirthDate:'1997/08/30',rawBirthTime:'10:00',timeAccuracy:'exact_minute',gender:'female',lunarLeapMonth:false})
    if(!r.ok)throw new Error(r.error.message)
    const a=analyzeBaziNatal(r)
    expect(a.shenSha.some(s=>s.basis.includes('按年支'))).toBe(true)
    expect(a.shenSha.some(s=>s.basis.includes('按日支'))).toBe(true)
  })
})

it('流年在立春精确时刻切换，而非公历元旦',()=>{ expect(activeBaziYear(new Date('2024-01-15T04:00:00Z'))).toBe(2023); expect(activeBaziYear(new Date('2024-02-04T08:26:00Z'))).toBe(2023); expect(activeBaziYear(new Date('2024-02-04T08:28:00Z'))).toBe(2024) })
