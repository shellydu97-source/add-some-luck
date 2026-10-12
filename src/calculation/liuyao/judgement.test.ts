import { describe, expect, it } from 'vitest'
import { calculateLiuyao, createCastFromValues } from './adapter'
import { defaultUseGod, godState, judgeLiuyao, movingTransformation, seasonState, JUDGEMENT_WEIGHTS } from './judgement'
import type { LiuyaoLine, YaoValue } from './types'
const cast = (values: YaoValue[]) => createCastFromValues(values)
const base = () => calculateLiuyao(cast([7,7,7,7,7,7]),'2026-10-12T04:00:00Z')
describe('六爻通行用神和动变规则', () => {
  it.each([['土','旺'],['金','相'],['火','休'],['木','囚'],['水','死']] as const)('戌月%s为%s',(e,s)=>expect(seasonState(e,'土')).toBe(s))
  it.each([['工作 / 事业',undefined,'官鬼'],['学业 / 考试',undefined,'父母'],['财运',undefined,'妻财'],['健康',undefined,'世爻'],['出行',undefined,'世爻'],['其他',undefined,'世爻'],['感情','male','妻财'],['感情','female','官鬼'],['感情',undefined,undefined]] as const)('分类 %s / %s 取 %s',(c,g,u)=>expect(defaultUseGod(c,g)).toBe(u))
  it('月破旬空，静旺日冲为暗动，静衰日冲为日破',()=>{
    const r=base();r.calendar={...r.calendar,monthBranch:'子',dayBranch:'申',xunKong:'寅卯'}
    expect(godState(r,'午','火',false).flags).toContain('月破')
    expect(godState(r,'寅','木',false)).toMatchObject({season:'相',flags:['旬空','暗动']})
    expect(godState(r,'寅','火',false).flags).toContain('日破')
  })
  it('回头生克、进退、空墓绝分别由本变字段推出',()=>{
    const line=base().lines[0]
    const transform=(patch:Partial<LiuyaoLine>,voids='')=>movingTransformation({...line,...patch},voids)
    expect(transform({element:'木',changedElement:'水'})).toContain('回头生')
    expect(transform({element:'木',changedElement:'金'})).toContain('回头克')
    expect(transform({branch:'亥',changedBranch:'子'})).toContain('化进神')
    expect(transform({branch:'子',changedBranch:'亥'})).toContain('化退神')
    expect(transform({element:'木',changedBranch:'未'},'未')).toEqual(expect.arrayContaining(['化空','化墓']))
    expect(transform({element:'木',changedBranch:'申'})).toContain('化绝')
  })
  it('用神多现优先持世，然后发动；不现取伏神并解释飞伏',()=>{
    const r=base(); r.lines.forEach(l=>{l.relation='父母';l.hiddenSpirit=undefined});r.lines[1].relation='妻财';r.lines[1].moving=true;r.lines[5].relation='妻财'
    expect(judgeLiuyao(r,'财运').useGod.lines).toEqual([6])
    r.lines.forEach(l=>l.relation='父母');r.lines[0].hiddenSpirit={relation:'妻财',naJia:'甲寅',stem:'甲',branch:'寅',element:'木'}
    expect(judgeLiuyao(r,'财运')).toMatchObject({useGod:{source:'hidden',lines:[1]},reasons:expect.arrayContaining([expect.stringContaining('飞神')])})
  })
  it('计分权重固定且原始排盘不被判断修改',()=>{
    expect(JUDGEMENT_WEIGHTS).toMatchObject({strong:2,monthBreak:-2,originMoving:2,avoidMoving:-2,returnGenerate:2,returnControl:-2})
    const r=base();const before=JSON.stringify(r);judgeLiuyao(r,'工作 / 事业');expect(JSON.stringify(r)).toBe(before)
  })
})

// 手推案例：同一时刻戌月己未日（子丑空），以下期望由明确纳甲与规则逐条推演。
describe('五个完整手推案例（2026-10-12 上海12:00）',()=>{
  const time='2026-10-12T04:00:00Z'
  it('无动乾卦问考试：六爻父母戌土持世，土旺日扶，较有利',()=>{
    const r=calculateLiuyao(createCastFromValues([7,7,7,7,7,7]),time)
    expect(r.original.name).toBe('乾为天')
    expect(judgeLiuyao(r,'学业 / 考试')).toMatchObject({useGod:{relation:'父母',lines:[6],source:'present'},useGodState:{season:'旺',dayRelation:'日扶'},auxiliaryFlags:['六冲'],tendency:'较有利',movingEffects:[]})
  })
  it('乾初爻动变姤问工作：午火官鬼休，初爻子水动克，阻力',()=>{
    const r=calculateLiuyao(createCastFromValues([9,7,7,7,7,7]),time)
    expect([r.original.name,r.changed.name]).toEqual(['乾为天','天风姤'])
    expect(judgeLiuyao(r,'工作 / 事业')).toMatchObject({useGod:{relation:'官鬼',lines:[4]},useGodState:{season:'休'},tendency:'有阻力',movingEffects:[expect.stringContaining('回头克、化空、忌神动克用神')]})
  })
  it('既济初四爻动变咸问考试：四爻申金父母动，相而日生',()=>{
    const r=calculateLiuyao(createCastFromValues([9,8,7,6,7,8]),time)
    expect([r.original.name,r.changed.name,r.movingLines]).toEqual(['水火既济','泽山咸',[1,4]])
    expect(judgeLiuyao(r,'学业 / 考试')).toMatchObject({useGod:{relation:'父母',lines:[4]},useGodState:{season:'相',dayRelation:'日生'},tendency:'较有利'})
  })
  it('无动晋卦问出行：四爻世酉金，月相日生',()=>{
    const r=calculateLiuyao(createCastFromValues([8,8,8,7,8,7]),time)
    expect(r.original.name).toBe('火地晋')
    expect(judgeLiuyao(r,'出行')).toMatchObject({useGod:{relation:'世爻',lines:[4],source:'self'},useGodState:{season:'相',dayRelation:'日生'},tendency:'较有利'})
  })
  it('无动既济问财：午火妻财伏三爻，月休且飞亥水克伏',()=>{
    const r=calculateLiuyao(createCastFromValues([7,8,7,8,7,8]),time)
    expect(r.original.name).toBe('水火既济')
    expect(judgeLiuyao(r,'财运')).toMatchObject({useGod:{relation:'妻财',lines:[3],source:'hidden'},useGodState:{season:'休'},tendency:'有阻力',reasons:expect.arrayContaining([expect.stringContaining('飞神克伏神')])})
  })
})
