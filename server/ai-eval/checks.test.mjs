import {describe,it,expect} from 'vitest'
import {evaluateAnswer} from './checks.mjs'
import cases from './cases.json'
import fixtures from './fixtures.json'
import {validateAiRequest} from '../ai-core.mjs'
describe('manual evaluation fixtures and heuristic checks',()=>{
 it('12 valid cases cover four modules and hostile requests',()=>{
  expect(cases).toHaveLength(12);expect(new Set(cases.map(c=>c.module)).size).toBe(4)
  for(const entry of cases)expect(()=>validateAiRequest({...entry,context:fixtures[entry.module]})).not.toThrow()
 })
 it('detects positive absolutes and extra symbols, acknowledges heuristic limits',()=>{
  const context={original:{name:'火泽睽'},cards:[{nameZh:'宝剑三'}]}
  expect(evaluateAnswer('你一定成功，乾为天与世界都支持你。',context)).toMatchObject({absoluteTerms:['一定'],extraHexagrams:['乾为天'],extraCards:['世界'],needsManualReview:true})
  expect(evaluateAnswer('无法保证一定成功，应继续核实。',context).absoluteTerms).toEqual([])
  expect(evaluateAnswer('排盘事实如下。',context).directFirst).toBe(false)
 })
 it('flags report-style headings and unexplained jargon in the opening',()=>{
  const plain=evaluateAnswer('这次面试机会不小。用神（代表工作的那一爻）状态还行。',{})
  expect(plain).toMatchObject({reportStyle:[],unexplainedJargon:[]})
  const report=evaluateAnswer('能过。用神月建日辰旬空都提到了。\n\n不确定之处：时间不明。',{})
  expect(report.reportStyle).toEqual(['不确定之处']);expect(report.unexplainedJargon).toHaveLength(4);expect(report.needsManualReview).toBe(true)
 })
})
