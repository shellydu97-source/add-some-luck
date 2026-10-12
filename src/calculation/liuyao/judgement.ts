import type { Gender } from '../../models/types'
import type { FiveElement, LiuyaoCalculationResult, LiuyaoLine, SixRelation } from './types'
// 《增删卜易》《卜筮正宗》通行生克口径；计分是透明参考模型，不等同于传统断卦的唯一结论。
export const LIUYAO_JUDGEMENT_VERSION = 'liuyao-usegod-season-moving-1.0.0'
export type UseGod = SixRelation | '世爻' | '应爻'
export const USE_GOD_OPTIONS: UseGod[] = ['父母', '兄弟', '子孙', '妻财', '官鬼', '世爻', '应爻']
export const JUDGEMENT_WEIGHTS = { strong: 2, weak: -1, monthBreak: -2, void: -1, daySupport: 1, dayControl: -1, originMoving: 2, avoidMoving: -2, returnGenerate: 2, returnControl: -2, advance: 1, retreat: -1, transformedBad: -1 } as const
export const GENERATES: Record<FiveElement, FiveElement> = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' }
export const CONTROLS: Record<FiveElement, FiveElement> = { 木:'土', 土:'水', 水:'火', 火:'金', 金:'木' }
export const BRANCH_ELEMENT: Record<string, FiveElement> = { 寅:'木', 卯:'木', 巳:'火', 午:'火', 申:'金', 酉:'金', 亥:'水', 子:'水', 辰:'土', 戌:'土', 丑:'土', 未:'土' }
const clash: Record<string,string> = { 子:'午', 午:'子', 丑:'未', 未:'丑', 寅:'申', 申:'寅', 卯:'酉', 酉:'卯', 辰:'戌', 戌:'辰', 巳:'亥', 亥:'巳' }
const combine: Record<string,string> = { 子:'丑', 丑:'子', 寅:'亥', 亥:'寅', 卯:'戌', 戌:'卯', 辰:'酉', 酉:'辰', 巳:'申', 申:'巳', 午:'未', 未:'午' }
export const TOMB: Record<FiveElement,string> = { 水:'辰', 土:'辰', 木:'未', 火:'戌', 金:'丑' }
export const EXTINCTION: Record<FiveElement,string> = { 金:'寅', 木:'申', 水:'巳', 土:'巳', 火:'亥' }
const advancePairs = ['亥子','寅卯','巳午','申酉','丑辰','辰未','未戌','戌丑']
export function seasonState(element: FiveElement, month: FiveElement): '旺'|'相'|'休'|'囚'|'死' {
  if (element === month) return '旺'
  if (GENERATES[month] === element) return '相'
  if (GENERATES[element] === month) return '休'
  if (CONTROLS[element] === month) return '囚'
  return '死'
}
export function defaultUseGod(category?: string, gender?: Gender): UseGod | undefined {
  if (category === '感情') return gender === 'male' ? '妻财' : gender === 'female' ? '官鬼' : undefined
  if (category?.includes('工作') || category?.includes('事业')) return '官鬼'
  if (category?.includes('学业') || category?.includes('考试')) return '父母'
  if (category === '财运') return '妻财'
  return '世爻'
}
export interface GodState { season: ReturnType<typeof seasonState>; dayRelation: string; flags: string[] }
export interface GodGroup { element: FiveElement; lines: { index: number; state: GodState; moving: boolean }[] }
export interface LiuyaoJudgement {
  useGod: { relation: UseGod; lines: number[]; source: 'present'|'hidden'|'self' }
  useGodState?: GodState
  originGod?: GodGroup
  avoidGod?: GodGroup
  movingEffects: string[]
  auxiliaryFlags: string[]
  tendency: '较有利'|'有阻力'|'变数较大'|'信息不足'
  reasons: string[]
  uncertainty: string
  advice: string
  ruleVersion: string
}
export function godState(result: LiuyaoCalculationResult, branch: string, element: FiveElement, moving: boolean): GodState {
  const { monthBranch, dayBranch, xunKong } = result.calendar
  const season = seasonState(element, BRANCH_ELEMENT[monthBranch])
  const day = BRANCH_ELEMENT[dayBranch]
  const dayRelation = [day === element ? '日扶' : GENERATES[day] === element ? '日生' : CONTROLS[day] === element ? '日克' : GENERATES[element] === day ? '生日辰' : '克日辰', clash[dayBranch] === branch ? '日冲' : '', combine[dayBranch] === branch ? '日合' : ''].filter(Boolean).join('、')
  const flags: string[] = []
  if (clash[monthBranch] === branch) flags.push('月破')
  if (xunKong.includes(branch)) flags.push('旬空')
  if (!moving && clash[dayBranch] === branch) flags.push(['旺','相'].includes(season) ? '暗动' : '日破')
  if (dayBranch === TOMB[element]) flags.push('入墓')
  return { season, dayRelation, flags }
}
export function movingTransformation(line: LiuyaoLine, voidBranches: string): string[] {
  const out: string[] = []
  if (GENERATES[line.changedElement] === line.element) out.push('回头生')
  if (CONTROLS[line.changedElement] === line.element) out.push('回头克')
  if (advancePairs.includes(line.branch + line.changedBranch)) out.push('化进神')
  if (advancePairs.includes(line.changedBranch + line.branch)) out.push('化退神')
  if (voidBranches.includes(line.changedBranch)) out.push('化空')
  if (line.changedBranch === TOMB[line.element]) out.push('化墓')
  if (line.changedBranch === EXTINCTION[line.element]) out.push('化绝')
  return out
}
export function judgeLiuyao(result: LiuyaoCalculationResult, category?: string, override?: UseGod, gender?: Gender): LiuyaoJudgement {
  const selected = override ?? defaultUseGod(category, gender)
  const base: LiuyaoJudgement = { useGod: { relation: selected ?? '世爻', lines: [], source: 'present' }, movingEffects: [], auxiliaryFlags: [...result.original.specialTypes], tendency: '信息不足', reasons: [], uncertainty: '这是通行规则的参考推断，不保证结果或精确应期；还需结合现实条件。', advice: '核实关键条件，制定备选方案，再观察事情的实际进展。', ruleVersion: LIUYAO_JUDGEMENT_VERSION }
  if (!selected) return { ...base, reasons: ['感情占问需要确认性别或手动选择用神。'] }
  let candidates = result.lines.filter((line) => selected === '世爻' ? line.shiYing === '世' : selected === '应爻' ? line.shiYing === '应' : line.relation === selected)
  let hidden = false
  if (!candidates.length) { hidden = true; candidates = result.lines.filter((line) => line.hiddenSpirit?.relation === selected) }
  const getSpirit = (line: LiuyaoLine) => hidden ? line.hiddenSpirit! : line
  candidates.sort((a,b) => {
    const priority = (line: LiuyaoLine) => (line.shiYing === '世' ? 100 : 0) + (line.moving ? 50 : 0) + (['旺','相'].includes(godState(result, getSpirit(line).branch, getSpirit(line).element, false).season) ? 10 : 0)
    return priority(b) - priority(a) || a.index - b.index
  })
  const use = candidates[0]
  if (!use) return { ...base, reasons: ['本卦和伏神均未找到所选用神，请检查问题分类或改选。'] }
  const spirit = getSpirit(use)
  const state = godState(result, spirit.branch, spirit.element, !hidden && use.moving)
  base.useGod = { relation: selected, lines: [use.index], source: hidden ? 'hidden' : selected === '世爻' || selected === '应爻' ? 'self' : 'present' }
  base.useGodState = state
  const group = (element: FiveElement): GodGroup => ({ element, lines: result.lines.filter(l => l.element === element).map(l => ({ index:l.index, moving:l.moving || godState(result,l.branch,l.element,false).flags.includes('暗动'), state:godState(result,l.branch,l.element,l.moving) })) })
  const origin = (Object.keys(GENERATES) as FiveElement[]).find(e => GENERATES[e] === spirit.element)!
  const avoid = (Object.keys(CONTROLS) as FiveElement[]).find(e => CONTROLS[e] === spirit.element)!
  base.originGod = group(origin); base.avoidGod = group(avoid)
  base.reasons.push(`${selected}${hidden ? '伏藏于' : '取'}第 ${use.index} 爻（${spirit.branch}${spirit.element}）${candidates.length > 1 ? '；多现时依持世、发动、旺相顺序取舍' : ''}。`)
  base.reasons.push(`月建${result.calendar.monthBranch}，用神${state.season}；日辰${result.calendar.dayGanZhi}：${state.dayRelation}${state.flags.length ? '；' + state.flags.join('、') : ''}。`)
  const w = JUDGEMENT_WEIGHTS
  let score = ['旺','相'].includes(state.season) ? w.strong : w.weak
  if (state.flags.includes('月破')) score += w.monthBreak
  if (state.flags.includes('旬空') || state.flags.includes('入墓') || state.flags.includes('日破')) score += w.void
  if (state.dayRelation.includes('日生') || state.dayRelation.includes('日扶')) score += w.daySupport
  if (state.dayRelation.includes('日克')) score += w.dayControl
  if (hidden) {
    const relation = GENERATES[use.element] === spirit.element ? '飞神生伏神' : CONTROLS[use.element] === spirit.element ? '飞神克伏神' : GENERATES[spirit.element] === use.element ? '伏神生飞神' : CONTROLS[spirit.element] === use.element ? '伏神克飞神' : '飞伏比和'
    base.reasons.push(`第 ${use.index} 爻飞神${use.branch}${use.element}：${relation}。`)
    score += relation === '飞神生伏神' ? 1 : relation === '飞神克伏神' ? -2 : 0
  }
  for (const line of result.lines) {
    const active = line.moving || godState(result,line.branch,line.element,false).flags.includes('暗动')
    if (!active) continue
    const effects = line.moving ? movingTransformation(line,result.calendar.xunKong) : ['暗动']
    if (line.index !== use.index || hidden) {
      if (GENERATES[line.element] === spirit.element) { effects.push('原神动生用神'); score += w.originMoving }
      if (CONTROLS[line.element] === spirit.element) { effects.push('忌神动克用神'); score += w.avoidMoving }
    }
    if (!hidden && line.index === use.index && line.moving) {
      if (effects.includes('回头生')) score += w.returnGenerate
      if (effects.includes('回头克')) score += w.returnControl
      if (effects.includes('化进神')) score += w.advance
      if (effects.includes('化退神')) score += w.retreat
      for (const flag of ['化空','化墓','化绝']) if (effects.includes(flag)) score += w.transformedBad
    }
    if (effects.length) base.movingEffects.push(`第 ${line.index} 爻${line.naJia}${line.element}${line.moving ? '→' + line.changedNaJia + line.changedElement : ''}：${effects.join('、')}`)
  }
  if (result.movingLines.length) {
    if (result.lines.every(l => l.branch === l.changedBranch)) base.auxiliaryFlags.push('伏吟')
    if (result.lines.every(l => clash[l.branch] === l.changedBranch)) base.auxiliaryFlags.push('反吟')
  }
  if (base.movingEffects.length) base.reasons.push(base.movingEffects.join('；'))
  else if (!hidden) base.reasons.push(result.movingLines.length ? '动爻未形成直接生克用神的关系。' : '无动爻，主要依据用神日月状态判断。')
  base.reasons = base.reasons.slice(0,4)
  const selfEffect = (text:string) => !hidden && text.startsWith(`第 ${use.index} 爻`)
  const mixed = base.movingEffects.some(s=>s.includes('生用神') || selfEffect(s) && s.includes('回头生')) && base.movingEffects.some(s=>s.includes('克用神') || selfEffect(s) && s.includes('回头克'))
  base.tendency = mixed || score > -2 && score < 2 ? '变数较大' : score >= 2 ? '较有利' : '有阻力'
  if (category === '健康') { base.uncertainty += '世爻代表自身，官鬼为病、子孙为医药，仅为传统象意；身体不适应及时就医。'; base.advice = '以正规检查和医生建议为准，不据卦象调整药物。' }
  return base
}
