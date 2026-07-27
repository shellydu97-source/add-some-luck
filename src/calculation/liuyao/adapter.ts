import type { CoinToss } from '../../models/types'
import { randomInteger, webCryptoRandomSource, type RandomUint32Source } from '../random'
import {
  branchElements, hexagramByTrigrams, hexagramDefinitions, naJiaByTrigram,
  palaceSequences, trigramByBits, trigramDefinitions,
} from './data'
import { getLiuyaoCalendarContext, LIUYAO_CALENDAR_ENGINE_VERSION } from './lunarTypescriptAdapter'
import type {
  FiveElement, HexagramDefinition, LiuyaoCalculationResult, LiuyaoHiddenSpirit,
  LiuyaoLineEnvironment, LiuyaoShenSha, SixRelation, SixSpirit, TrigramDefinition,
  YinYang, YaoValue,
} from './types'

export const LIUYAO_ADAPTER_VERSION = 'liuyao-calculation-adapter-1.3.0'
export const LIUYAO_RULE_VERSION = 'three-coins-yin-2-yang-3-najia-eight-palaces-fushen-1.3.0'
export const LIUYAO_COIN_CONVENTION_VERSION = 'fixed-coin-art-yin-2-yang-3-v2' as const

export const coinSideDefinitions = {
  yin: { value: 2 },
  yang: { value: 3 },
} as const

const generation: Record<FiveElement, FiveElement> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const overcoming: Record<FiveElement, FiveElement> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
const spiritCycle: SixSpirit[] = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']
const spiritStart: Record<string, number> = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 }
const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const branchClashes: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
const branchCombines: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
const sheepBladeByDayStem: Record<string, string> = {
  甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子',
}
const travelHorseByDayBranch: Record<string, string> = {
  申: '寅', 子: '寅', 辰: '寅',
  寅: '申', 午: '申', 戌: '申',
  巳: '亥', 酉: '亥', 丑: '亥',
  亥: '巳', 卯: '巳', 未: '巳',
}
const peachBlossomByDayBranch: Record<string, string> = {
  申: '酉', 子: '酉', 辰: '酉',
  寅: '卯', 午: '卯', 戌: '卯',
  巳: '午', 酉: '午', 丑: '午',
  亥: '子', 卯: '子', 未: '子',
}

export function createDigitalCoinToss(source: RandomUint32Source = webCryptoRandomSource): CoinToss {
  return { coins: [0, 1, 2].map(() => randomInteger(2, source) === 0 ? 'yin' : 'yang') as CoinToss['coins'] }
}

export function coinTossToLine(toss: CoinToss) {
  const value = toss.coins.reduce<number>((sum, side) => sum + coinSideDefinitions[side].value, 0) as YaoValue
  const yinYang: YinYang = value === 6 || value === 8 ? 'yin' : 'yang'
  const moving = value === 6 || value === 9
  const changedYinYang: YinYang = moving ? (yinYang === 'yang' ? 'yin' : 'yang') : yinYang
  const label = value === 6 ? '老阴 · 动' : value === 7 ? '少阳 · 静' : value === 8 ? '少阴 · 静' : '老阳 · 动'
  return { value, label, yinYang, moving, changedYinYang }
}

function trigramFor(lines: YinYang[]): TrigramDefinition {
  const bits = lines.map((line) => line === 'yang' ? '1' : '0').join('')
  const trigram = trigramByBits.get(bits)
  if (!trigram) throw new Error(`无法识别八卦：${bits}`)
  return trigram
}

function relationFor(lineElement: FiveElement, palaceElement: FiveElement): SixRelation {
  if (lineElement === palaceElement) return '兄弟'
  if (generation[lineElement] === palaceElement) return '父母'
  if (generation[palaceElement] === lineElement) return '子孙'
  if (overcoming[lineElement] === palaceElement) return '官鬼'
  return '妻财'
}

function naJiaAt(trigram: TrigramDefinition, lineIndex: number) {
  const half = lineIndex <= 3 ? 'lower' : 'upper'
  const offset = lineIndex <= 3 ? lineIndex - 1 : lineIndex - 4
  return naJiaByTrigram[trigram.key][half][offset]!
}

function environmentFor(branch: string, monthBranch: string, dayBranch: string, xunKong: string): LiuyaoLineEnvironment {
  return {
    isVoid: xunKong.includes(branch),
    isMonthBuild: branch === monthBranch,
    isMonthBreak: branchClashes[monthBranch] === branch,
    isMonthCombine: branchCombines[monthBranch] === branch,
    isDaySame: branch === dayBranch,
    isDayClash: branchClashes[dayBranch] === branch,
    isDayCombine: branchCombines[dayBranch] === branch,
  }
}

function naJiaLinesForHexagram(hexagram: HexagramDefinition) {
  const lower = trigramDefinitions[hexagram.lower]
  const upper = trigramDefinitions[hexagram.upper]
  return Array.from({ length: 6 }, (_, arrayIndex) => {
    const index = arrayIndex + 1
    const naJia = naJiaAt(index <= 3 ? lower : upper, index)
    const branch = naJia[1]!
    const element = branchElements[branch]
    if (!element) throw new Error('纳甲地支五行映射不完整。')
    return {
      index,
      naJia,
      stem: naJia[0]!,
      branch,
      element,
      relation: relationFor(element, hexagram.palaceElement),
    }
  })
}

function hiddenSpiritsFor(original: HexagramDefinition, presentRelations: Set<SixRelation>) {
  const pureName = palaceSequences[original.palace][0]!
  const pureHexagram = hexagramDefinitions.find((hexagram) => hexagram.name === pureName)
  if (!pureHexagram) throw new Error('无法找到本宫首卦。')
  const hiddenByLine = new Map<number, LiuyaoHiddenSpirit>()
  const placedRelations = new Set<SixRelation>()
  for (const line of naJiaLinesForHexagram(pureHexagram)) {
    if (presentRelations.has(line.relation) || placedRelations.has(line.relation)) continue
    hiddenByLine.set(line.index, {
      relation: line.relation,
      naJia: line.naJia,
      stem: line.stem,
      branch: line.branch,
      element: line.element,
    })
    placedRelations.add(line.relation)
  }
  return hiddenByLine
}

function guaShenFor(original: HexagramDefinition, rawLines: Array<{ yinYang: YinYang }>, lineBranches: string[]) {
  const shiYinYang = rawLines[original.shiLine - 1]!.yinYang
  const startBranch = shiYinYang === 'yang' ? '子' as const : '午' as const
  const startIndex = earthlyBranches.indexOf(startBranch)
  const branch = earthlyBranches[(startIndex + original.shiLine - 1) % earthlyBranches.length]!
  return {
    branch,
    startBranch,
    shiLine: original.shiLine,
    shiYinYang,
    presentAtLines: lineBranches.flatMap((lineBranch, index) => lineBranch === branch ? [index + 1] : []),
  }
}

function shiShenFor(original: HexagramDefinition, lineBranches: string[]) {
  const holdingBranch = lineBranches[original.shiLine - 1]!
  const lineIndex = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].findIndex((pair) => pair.includes(holdingBranch)) + 1
  if (lineIndex < 1) throw new Error('无法根据世爻地支确定世身。')
  return { holdingBranch, lineIndex, branch: lineBranches[lineIndex - 1]! }
}

function shenShaFor(dayStem: string, dayBranch: string, lineBranches: string[]): LiuyaoShenSha[] {
  const entries: Array<[LiuyaoShenSha['name'], string | undefined]> = [
    ['羊刃', sheepBladeByDayStem[dayStem]],
    ['驿马', travelHorseByDayBranch[dayBranch]],
    ['咸池', peachBlossomByDayBranch[dayBranch]],
  ]
  return entries.flatMap(([name, branch]) => branch ? [{
    name,
    branch,
    presentAtLines: lineBranches.flatMap((lineBranch, index) => lineBranch === branch ? [index + 1] : []),
  }] : [])
}

export function calculateLiuyao(casts: CoinToss[], lockedAt: string): LiuyaoCalculationResult {
  if (casts.length !== 6) throw new Error('需要六次完整起爻结果。')
  const rawLines = casts.map(coinTossToLine)
  const lowerTrigram = trigramFor(rawLines.slice(0, 3).map((line) => line.yinYang))
  const upperTrigram = trigramFor(rawLines.slice(3).map((line) => line.yinYang))
  const changedLowerTrigram = trigramFor(rawLines.slice(0, 3).map((line) => line.changedYinYang))
  const changedUpperTrigram = trigramFor(rawLines.slice(3).map((line) => line.changedYinYang))
  const original = hexagramByTrigrams.get(`${upperTrigram.key}:${lowerTrigram.key}`)
  const changed = hexagramByTrigrams.get(`${changedUpperTrigram.key}:${changedLowerTrigram.key}`)
  if (!original || !changed) throw new Error('六十四卦映射不完整。')

  const calendar = getLiuyaoCalendarContext(lockedAt)
  const spiritOffset = spiritStart[calendar.dayStem]
  if (spiritOffset === undefined) throw new Error('无法确定日干与六神。')

  const baseLines = rawLines.map((line, arrayIndex) => {
    const index = arrayIndex + 1
    const trigram = index <= 3 ? lowerTrigram : upperTrigram
    const changedTrigram = index <= 3 ? changedLowerTrigram : changedUpperTrigram
    const naJia = naJiaAt(trigram, index)
    const changedNaJia = naJiaAt(changedTrigram, index)
    const stem = naJia[0]!
    const branch = naJia[1]!
    const changedStem = changedNaJia[0]!
    const changedBranch = changedNaJia[1]!
    const element = branchElements[branch]
    const changedElement = branchElements[changedBranch]
    if (!element || !changedElement) throw new Error('纳甲地支五行映射不完整。')
    return {
      index,
      coins: casts[arrayIndex]!.coins,
      ...line,
      naJia,
      stem,
      branch,
      element,
      relation: relationFor(element, original.palaceElement),
      spirit: spiritCycle[(spiritOffset + arrayIndex) % 6]!,
      shiYing: index === original.shiLine ? '世' as const : index === original.yingLine ? '应' as const : undefined,
      environment: environmentFor(branch, calendar.monthBranch, calendar.dayBranch, calendar.xunKong),
      changedNaJia,
      changedStem,
      changedBranch,
      changedElement,
      changedRelation: relationFor(changedElement, original.palaceElement),
      changedShiYing: index === changed.shiLine ? '世' as const : index === changed.yingLine ? '应' as const : undefined,
      changedEnvironment: environmentFor(changedBranch, calendar.monthBranch, calendar.dayBranch, calendar.xunKong),
    }
  })
  const hiddenByLine = hiddenSpiritsFor(original, new Set(baseLines.map((line) => line.relation)))
  const lines = baseLines.map((line) => ({ ...line, hiddenSpirit: hiddenByLine.get(line.index) }))
  const lineBranches = lines.map((line) => line.branch)

  return {
    original,
    changed,
    lowerTrigram,
    upperTrigram,
    changedLowerTrigram,
    changedUpperTrigram,
    movingLines: lines.filter((line) => line.moving).map((line) => line.index),
    lines,
    calendar,
    guaShen: guaShenFor(original, rawLines, lineBranches),
    shiShen: shiShenFor(original, lineBranches),
    shenSha: shenShaFor(calendar.dayStem, calendar.dayBranch, lineBranches),
    casts,
    engineVersion: LIUYAO_CALENDAR_ENGINE_VERSION,
    adapterVersion: LIUYAO_ADAPTER_VERSION,
    ruleVersion: LIUYAO_RULE_VERSION,
  }
}

export function createCastFromValues(values: YaoValue[]): CoinToss[] {
  const coinsByValue: Record<YaoValue, CoinToss['coins']> = {
    6: ['yin', 'yin', 'yin'], 7: ['yang', 'yin', 'yin'], 8: ['yang', 'yang', 'yin'], 9: ['yang', 'yang', 'yang'],
  }
  return values.map((value) => ({ coins: [...coinsByValue[value]] as CoinToss['coins'] }))
}

export { trigramDefinitions }
