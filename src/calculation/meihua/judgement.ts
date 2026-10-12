import { Solar } from 'lunar-typescript'
import { getMeihuaCalendarContext } from './calendarAdapter'
import { BRANCH_ELEMENT, CONTROLS, GENERATES, seasonState } from '../liuyao/judgement'
import type { MeihuaCalculationResult, MeihuaFiveElement, MeihuaRelationLabel } from './types'
export const MEIHUA_JUDGEMENT_VERSION = 'meihua-body-mutual-changed-season-1.0.0'
// 《梅花易数》通行体用、互变卦与卦气口径；保留体卦，以两个互卦经卦和变用观察过程。
export function elementRelation(body: MeihuaFiveElement, other: MeihuaFiveElement): MeihuaRelationLabel {
  if (body === other) return '比和'
  if (GENERATES[other] === body) return '用生体'
  if (GENERATES[body] === other) return '体生用'
  return CONTROLS[body] === other ? '体克用' : '用克体'
}
const relationWeight: Record<MeihuaRelationLabel,number> = { 比和:1, 用生体:2, 体克用:1, 体生用:-1, 用克体:-2 }
export interface MeihuaJudgement {
  originalRelation: MeihuaRelationLabel
  mutualRelations: { name:string; element:MeihuaFiveElement; relation:MeihuaRelationLabel }[]
  changedRelation: MeihuaRelationLabel
  changedUseName: string
  monthBranch: string
  bodySeason: ReturnType<typeof seasonState>
  inSeason: boolean
  tendency: '较有利'|'有阻力'|'先难后易'|'先易后难'|'变数较大'
  reasons: string[]
  advice: string
  uncertainty: string
  ruleVersion: string
}
export function judgeMeihua(result: MeihuaCalculationResult, lockedAt: string): MeihuaJudgement {
  const local = result.calendar?.localDateTime ?? getMeihuaCalendarContext(lockedAt).localDateTime
  const [date,time] = local.split(' ')
  const [y,m,d] = date.split('-').map(Number)
  const [h,min,sec] = time.split(':').map(Number)
  const monthBranch = Solar.fromYmdHms(y,m,d,h,min,sec || 0).getLunar().getMonthZhiExact()
  const body = result.bodyTrigram.element
  const bodySeason = seasonState(body, BRANCH_ELEMENT[monthBranch])
  const inSeason = ['旺','相'].includes(bodySeason)
  const originalRelation = elementRelation(body,result.useTrigram.element)
  const mutualRelations = [result.mutual.lower,result.mutual.upper].map(t => ({ name:t.name, element:t.element, relation:elementRelation(body,t.element) }))
  const changedUse = result.changed[result.usePosition]
  const changedRelation = elementRelation(body,changedUse.element)
  const first = relationWeight[originalRelation] + (inSeason ? 1 : -1)
  const last = relationWeight[changedRelation] + (inSeason ? 1 : -1)
  const middle = mutualRelations.reduce((s,r) => s + relationWeight[r.relation],0)
  const tendency = first > 0 && last < 0 ? '先易后难' : first < 0 && last > 0 ? '先难后易' : first + last + middle >= 3 ? '较有利' : first + last + middle <= -2 ? '有阻力' : '变数较大'
  return { originalRelation, mutualRelations, changedRelation, changedUseName:changedUse.name, monthBranch, bodySeason, inSeason, tendency,
    reasons:[`本卦${result.bodyTrigram.name}${body}为体，${result.useTrigram.name}${result.useTrigram.element}为用：${originalRelation}${originalRelation === '体克用' ? '，需付出努力和执行成本' : ''}；月建${monthBranch}，体卦${bodySeason}（${inSeason ? '得令' : '失令'}）。`, `互卦过程：${mutualRelations.map(r=>`${r.name}${r.element}与体卦${r.relation}`).join('；')}。`, `变卦用方变为${changedUse.name}${changedUse.element}：${changedRelation}。`],
    advice: tendency === '有阻力' || tendency === '先易后难' ? '先核实外部限制与资源消耗，给后续变化留出余地。' : '把结构提示落实为可检查的行动，持续观察过程和结果。',
    uncertainty:'体用与卦气是传统规则推断，不能保证成败或精确应期。', ruleVersion:MEIHUA_JUDGEMENT_VERSION }
}
