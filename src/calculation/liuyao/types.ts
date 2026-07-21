import type { CoinSide, CoinToss } from '../../models/types'

export type YaoValue = 6 | 7 | 8 | 9
export type YinYang = 'yin' | 'yang'
export type TrigramKey = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun'
export type FiveElement = '木' | '火' | '土' | '金' | '水'
export type SixRelation = '兄弟' | '父母' | '子孙' | '官鬼' | '妻财'
export type SixSpirit = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武'

export interface TrigramDefinition {
  key: TrigramKey
  name: string
  symbol: string
  bits: string
  element: FiveElement
}

export interface HexagramDefinition {
  number: number
  name: string
  upper: TrigramKey
  lower: TrigramKey
  palace: TrigramKey
  palaceName: string
  palaceElement: FiveElement
  palaceSequence: number
  shiLine: number
  yingLine: number
  judgment: string
  lineTexts: [string, string, string, string, string, string]
  basicMeaning: string
}

export interface LiuyaoLine {
  index: number
  coins: [CoinSide, CoinSide, CoinSide]
  value: YaoValue
  label: string
  yinYang: YinYang
  moving: boolean
  changedYinYang: YinYang
  naJia: string
  stem: string
  branch: string
  element: FiveElement
  relation: SixRelation
  spirit: SixSpirit
  shiYing?: '世' | '应'
  changedNaJia: string
  changedElement: FiveElement
  changedRelation: SixRelation
}

export interface LiuyaoCalendarContext {
  localDateTime: string
  monthBranch: string
  dayGanZhi: string
  dayStem: string
  xunKong: string
}

export interface LiuyaoCalculationResult {
  original: HexagramDefinition
  changed: HexagramDefinition
  lowerTrigram: TrigramDefinition
  upperTrigram: TrigramDefinition
  changedLowerTrigram: TrigramDefinition
  changedUpperTrigram: TrigramDefinition
  movingLines: number[]
  lines: LiuyaoLine[]
  calendar: LiuyaoCalendarContext
  casts: CoinToss[]
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
}
