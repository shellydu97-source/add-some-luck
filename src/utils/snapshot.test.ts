import { describe,it,expect } from 'vitest'
import { compactSnapshot,readSnapshot } from './snapshot'
import { calculateLiuyao,createCastFromValues } from '../calculation/liuyao'
import { judgeLiuyao } from '../calculation/liuyao/judgement'
import { createRecord } from './record'
it('六爻快照无损压缩，保留排盘和判断，新记录小于5KB',()=>{
 const r=calculateLiuyao(createCastFromValues([6,9,6,9,6,9]),'2026-10-12T04:00:00Z')
 const raw={...r,coinTosses:r.casts,lockedAt:'2026-10-12T04:00:00Z',judgement:judgeLiuyao(r,'学业 / 考试')}
 const record=createRecord({type:'liuyao',question:'考试能通过吗？',rawResult:raw,interpretation:{headline:'判断',conclusion:'参考',evidence:[],support:[],conflicts:[],advice:[],uncertainty:''}})
 expect(readSnapshot(record.rawResult)).toEqual({...raw,savedInterpretation:{headline:"判断",conclusion:"参考",evidence:[],support:[],conflicts:[],advice:[],uncertainty:""}})
 console.log('snapshot bytes',new TextEncoder().encode(JSON.stringify(record)).length)
 expect(new TextEncoder().encode(JSON.stringify(record)).length).toBeLessThan(5120)
 expect(record.ruleVersion).toBe(r.ruleVersion)
 expect(record.calculationVersion).toBe(r.adapterVersion)
})
describe('兼容快照',()=>{
 it('旧卦原文不变',()=>{const raw={original:{number:1,judgment:'旧文本'},judgement:{tendency:'旧判断'}};expect(readSnapshot(raw)).toEqual(raw)})
 it('通用字段数组数字布尔可无损还原',()=>{const raw={a:[1,'one',null,false,{v:'one'}]};expect(readSnapshot(compactSnapshot(raw))).toEqual(raw)})
})

it('带人物的六爻新记录按UTF-8预算验收，覆盖静卦及多动爻',async()=>{
 const {seedProfiles}=await import('../mocks/profiles')
 for(const values of [[7,7,7,7,7,7],[6,6,6,6,6,6],[9,9,9,9,9,9],[6,9,6,9,6,9],[8,7,6,9,8,7]]) {
  const r=calculateLiuyao(createCastFromValues(values as (6|7|8|9)[]),'2026-10-12T04:00:00Z'),j=judgeLiuyao(r,'学业 / 考试')
  const record=createRecord({profile:seedProfiles[0],type:'liuyao',question:'考试需要注意什么？',rawResult:{...r,coinTosses:r.casts,lockedAt:'2026-10-12T04:00:00Z',judgement:j},interpretation:{headline:j.tendency,conclusion:j.reasons.join('；'),evidence:j.reasons,support:[],conflicts:j.auxiliaryFlags,advice:[j.advice],uncertainty:j.uncertainty}})
  expect(new TextEncoder().encode(JSON.stringify(record)).length).toBeLessThan(5120)
 }
})
it('梅花序号还原正确上下卦和原文，AI上下文兼容新记录',async()=>{
 const {calculateMeihuaBySpecifiedTime}=await import('../calculation/meihua')
 const r=calculateMeihuaBySpecifiedTime('2026-10-12T12:00')
 expect(readSnapshot(compactSnapshot(r as unknown as Record<string,unknown>))).toEqual(r)
})
it('压缩对Unicode、负数、长重复串无损，损坏编码拒绝',async()=>{
 const {compressSnapshot,decompressSnapshot}=await import('./snapshotCodec')
 const text=JSON.stringify({text:'🧡你好abc'.repeat(1000),n:-123,empty:[],yes:true})
 expect(decompressSnapshot(compressSnapshot(text))).toBe(text)
 expect(()=>decompressSnapshot(btoa(String.fromCharCode(1,0,1,0)))).toThrow()
})
it('新压缩记录导出再导入保持原始快照与当时结论',async()=>{
 const {serializeExport,parseImport}=await import('../storage/dataTransfer')
 const {createEmptyAppData}=await import('../storage/appData')
 const r=calculateLiuyao(createCastFromValues([7,8,9,6,7,8]),'2026-10-12T04:00:00Z')
 const record=createRecord({type:'liuyao',rawResult:{...r,coinTosses:r.casts},interpretation:{headline:'保留结论',conclusion:'保存时的内容',evidence:['当时依据'],support:[],conflicts:[],advice:['当时建议'],uncertainty:''}})
 const data={...createEmptyAppData(),records:[record]}
 const restored=parseImport(serializeExport(data))
 expect(restored.records[0].rawResult).toEqual(record.rawResult)
 expect(readSnapshot(restored.records[0].rawResult).savedInterpretation).toEqual(readSnapshot(record.rawResult).savedInterpretation)
})
