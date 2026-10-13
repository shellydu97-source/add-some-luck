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
})
