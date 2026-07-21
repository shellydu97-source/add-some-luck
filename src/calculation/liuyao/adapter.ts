import type { CoinToss } from '../../models/types'
import { randomInteger, webCryptoRandomSource, type RandomUint32Source } from '../random'
import { branchElements, hexagramByTrigrams, naJiaByTrigram, trigramByBits, trigramDefinitions } from './data'
import { getLiuyaoCalendarContext, LIUYAO_CALENDAR_ENGINE_VERSION } from './lunarTypescriptAdapter'
import type { FiveElement, LiuyaoCalculationResult, SixRelation, SixSpirit, TrigramDefinition, YinYang, YaoValue } from './types'

export const LIUYAO_ADAPTER_VERSION = 'liuyao-calculation-adapter-1.2.0'
export const LIUYAO_RULE_VERSION = 'three-coins-yin-2-yang-3-najia-eight-palaces-1.2.0'
export const LIUYAO_COIN_CONVENTION_VERSION = 'fixed-coin-art-yin-2-yang-3-v2' as const

export const coinSideDefinitions = {
  yin: { value: 2 },
  yang: { value: 3 },
} as const

const generation: Record<FiveElement, FiveElement> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const overcoming: Record<FiveElement, FiveElement> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
const spiritCycle: SixSpirit[] = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']
const spiritStart: Record<string, number> = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 }

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

  const lines = rawLines.map((line, arrayIndex) => {
    const index = arrayIndex + 1
    const trigram = index <= 3 ? lowerTrigram : upperTrigram
    const changedTrigram = index <= 3 ? changedLowerTrigram : changedUpperTrigram
    const naJia = naJiaAt(trigram, index)
    const changedNaJia = naJiaAt(changedTrigram, index)
    const stem = naJia[0]!
    const branch = naJia[1]!
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
      changedNaJia,
      changedElement,
      changedRelation: relationFor(changedElement, original.palaceElement),
    }
  })

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
