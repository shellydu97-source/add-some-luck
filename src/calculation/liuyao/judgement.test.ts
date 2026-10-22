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
  it('乾初爻动变姤问工作：午火官鬼休；子水忌神动而回头克、化空，克制无力',()=>{
    const r=calculateLiuyao(createCastFromValues([9,7,7,7,7,7]),time)
    expect([r.original.name,r.changed.name]).toEqual(['乾为天','天风姤'])
    expect(judgeLiuyao(r,'工作 / 事业')).toMatchObject({useGod:{relation:'官鬼',lines:[4]},useGodState:{season:'休'},tendency:'变数较大',score:-1,movingEffects:[expect.stringContaining('忌神虽动但回头克、化空，克制无力')]})
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

// 第二轮补充手推案例：原神/忌神自身强弱、忌神持世、世应、用神临日月、两现取舍。
describe('六爻规则补强（liuyao-usegod-season-moving-1.1.0）',()=>{
  const time='2026-10-12T04:00:00Z'
  it('地山谦问工作（辛酉日）：官鬼午火休且克日辰，世爻亥水子孙为忌神持世，有阻力',()=>{
    const r=calculateLiuyao(createCastFromValues([8,8,7,8,8,8]),'2026-10-14T05:00:00Z')
    expect([r.original.name,r.calendar.dayGanZhi]).toEqual(['地山谦','辛酉'])
    const j=judgeLiuyao(r,'工作 / 事业')
    expect(j).toMatchObject({useGod:{relation:'官鬼',lines:[2]},useGodState:{season:'休'},tendency:'有阻力',score:-2})
    expect(j.reasons).toEqual(expect.arrayContaining([expect.stringContaining('忌神持世'),expect.stringContaining('世克应')]))
  })
  it('观变萃问工作：原神卯木动而化墓，生扶无力，不加分',()=>{
    const r=calculateLiuyao(createCastFromValues([8,8,8,6,7,9]),'2026-10-12T12:05:00.000Z')
    expect([r.original.name,r.changed.name]).toEqual(['风地观','泽地萃'])
    const j=judgeLiuyao(r,'工作 / 事业')
    expect(j.movingEffects).toEqual([expect.stringContaining('原神虽动但化墓，生扶无力')])
    expect(j).toMatchObject({score:-1,tendency:'变数较大'})
  })
  it('乾为天问考试：父母两现取持世戌土，戌临月建再加分',()=>{
    const r=calculateLiuyao(createCastFromValues([7,7,7,7,7,7]),time)
    const j=judgeLiuyao(r,'学业 / 考试')
    expect(j.useGod.lines).toEqual([6]);expect(j.score).toBe(4)
    expect(j.reasons).toEqual(expect.arrayContaining([expect.stringContaining('临月建'),expect.stringContaining('世应比和')]))
  })
  it('既济变咸问考试：丑土原神旬空但逢日冲暗动，冲空则实，全额生扶',()=>{
    const r=calculateLiuyao(createCastFromValues([9,8,7,6,7,8]),time)
    const j=judgeLiuyao(r,'学业 / 考试')
    expect(j.movingEffects).toEqual(expect.arrayContaining([expect.stringContaining('第 2 爻己丑土：暗动、原神动生用神')]))
    expect(j.score).toBe(5)
  })
  it('发动的原神休囚只算一半；用神两现时不空不破的优先',()=>{
    const r=base()
    r.lines.forEach(l=>{l.relation='父母';l.moving=false;l.hiddenSpirit=undefined;l.shiYing=undefined})
    r.lines[0].shiYing='世';r.lines[3].shiYing='应'
    // 两个官鬼：第 2 爻午火落空，第 5 爻巳火不空，应取第 5 爻。
    r.calendar={...r.calendar,monthBranch:'戌',dayBranch:'辰',xunKong:'午未'}
    r.lines[1]={...r.lines[1],relation:'官鬼',branch:'午',element:'火'}
    r.lines[4]={...r.lines[4],relation:'官鬼',branch:'巳',element:'火'}
    // 原神卯木发动，戌月木囚，变出亥水不构成化空墓绝或回头克。
    r.lines[2]={...r.lines[2],relation:'妻财',branch:'卯',element:'木',moving:true,changedBranch:'亥',changedElement:'水'}
    const j=judgeLiuyao(r,'工作 / 事业')
    expect(j.useGod.lines).toEqual([5])
    expect(j.movingEffects.join()).toContain('原神动生用神（囚，力弱）')
  })
})
