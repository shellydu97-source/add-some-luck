import { describe, expect, it } from 'vitest'
import { calculateMeihuaBySpecifiedTime, calculateMeihuaByNumbers } from './adapter'
import { elementRelation, judgeMeihua } from './judgement'
describe('梅花体互变与卦气', () => {
  it.each([['木','木','比和'],['木','水','用生体'],['木','火','体生用'],['木','土','体克用'],['木','金','用克体']] as const)('%s 对 %s 为 %s', (a,b,r) => expect(elementRelation(a,b)).toBe(r))
  it('上海固定案例：睽、既济、噬嗑，火休失令', () => {
    const result = calculateMeihuaBySpecifiedTime('2026-10-12T12:00')
    expect([result.original.name,result.mutual.name,result.changed.name,result.movingLine,result.bodyTrigram.name,result.useTrigram.name]).toEqual(['火泽睽','水火既济','火雷噬嗑',2,'离','兑'])
    expect(judgeMeihua(result,'2026-10-12T04:00:00Z')).toMatchObject({ originalRelation:'体克用',monthBranch:'戌',bodySeason:'休',inSeason:false,mutualRelations:[{ name:'离',relation:'比和' },{ name:'坎',relation:'用克体' }],changedRelation:'用生体',changedUseName:'震' })
  })
  it('无历法起卦使用锁定时刻，冬水得令', () => {
    const result = calculateMeihuaByNumbers(6,1)
    expect(judgeMeihua(result,'2026-12-12T04:00:00Z')).toMatchObject({bodySeason:'旺',inSeason:true})
  })
})
