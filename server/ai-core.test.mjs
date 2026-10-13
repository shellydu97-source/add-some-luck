import { describe,expect,it } from 'vitest'
import { buildDeepSeekMessages,buildDeepSeekGenerationOptions,serverShanghaiDate,sanitizeReading,validateAiRequest } from './ai-core.mjs'
describe('AI facts and reasoning boundary',()=>{
 it('rejects unsupported or empty source',()=>{expect(()=>validateAiRequest({module:'fortune'})).toThrow();expect(()=>validateAiRequest({module:'tarot',context:{}})).toThrow()})
 it.each([['tarot','RWS'],['liuyao','增删卜易'],['meihua','梅花易数'],['bazi','格局']])('constrains %s to its supplied system',(module,rule)=>{
  const prompt=buildDeepSeekMessages({module,question:'会成功吗',context:{fixed:'确定排盘'},action:'interpret'},{now:new Date('2026-10-11T16:01:00Z')})
  expect(prompt[0].content).toContain(rule);expect(prompt[0].content).toContain('2026-10-12');expect(prompt[0].content).toContain('第一句直接回答');expect(prompt[0].content).toContain('不得修改原始结果');expect(prompt[0].content).toContain('不确定之处');expect(prompt[0].content).toContain('医疗诊断');expect(prompt[0].content).toContain('约二百至四百字')
 })
 it('puts fixed context once before actual bounded turns and current question',()=>{
  const messages=buildDeepSeekMessages({module:'liuyao',action:'followup',question:'最初',followUpQuestion:'为什么？',category:'工作',timeRange:'两周',useGod:'官鬼',context:{marker:'unique-context'},messages:[{role:'assistant',content:'先前回答'},{role:'user',content:'上一问'}]})
  expect(messages.filter(m=>m.content.includes('unique-context'))).toHaveLength(1)
  expect(messages[1].content).toContain('工作');expect(messages[1].content).toContain('官鬼');expect(messages.at(-1).content).toContain('为什么')
 })
 it('server date crosses Shanghai midnight',()=>expect(serverShanghaiDate(new Date('2026-10-11T16:00:00Z'))).toBe('2026-10-12'))
 it('uses low effort initially and high only for detailed followups',()=>{
  expect(buildDeepSeekGenerationOptions({action:'interpret',question:'详细分析'})).toMatchObject({thinking:{type:'enabled'},reasoning_effort:'low',max_tokens:1500})
  expect(buildDeepSeekGenerationOptions({action:'followup',followUpQuestion:'还有呢'}).reasoning_effort).toBe('low')
  expect(buildDeepSeekGenerationOptions({action:'followup',followUpQuestion:'请逐项详细分析'})).toMatchObject({reasoning_effort:'high',max_tokens:2500})
  expect(buildDeepSeekGenerationOptions({}, {json:true}).response_format).toEqual({type:'json_object'})
 })
 it('plain responses omit unused fields while legacy sections survive',()=>{
  expect(sanitizeReading({directAnswer:'回答',sections:[],summary:''})).toEqual({directAnswer:'回答'})
  expect(sanitizeReading({directAnswer:'旧回答',sections:[{title:'依据',content:'内容',evidence:['事实']}],summary:'旧摘要'}).sections[0].evidence).toEqual(['事实'])
 })
})
