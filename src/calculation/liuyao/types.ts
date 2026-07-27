import type { CoinSide, CoinToss } from '../../models/types'

export type YaoValue = 6 | 7 | 8 | 9
export type YinYang = 'yin' | 'yang'
export type TrigramKey = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun'
export type FiveElement = '木' | '火' | '土' | '金' | '水'
export type SixRelation = '兄弟' | '父母' | '子孙' | '官鬼' | '妻财'
export type SixSpirit = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武'
export type HexagramPalaceStage = '本宫' | '一世' | '二世' | '三世' | '四世' | '五世' | '游魂' | '归魂'
export type HexagramSpecialType = '六冲' | '六合'

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
  palaceStage: HexagramPalaceStage
  specialTypes: HexagramSpecialType[]
  shiLine: number
  yingLine: number
  judgment: string
  lineTexts: [string, string, string, string, string, string]
  basicMeaning: string
}

export interface LiuyaoHiddenSpirit {
  relation: SixRelation
  naJia: string
  stem: string
  branch: string
  element: FiveElement
}

export interface LiuyaoLineEnvironment {
  isVoid: boolean
  isMonthBuild: boolean
  isMonthBreak: boolean
  isMonthCombine: boolean
  isDaySame: boolean
  isDayClash: boolean
  isDayCombine: boolean
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
  hiddenSpirit?: LiuyaoHiddenSpirit
  environment: LiuyaoLineEnvironment
  changedNaJia: string
  changedStem: string
  changedBranch: string
  changedElement: FiveElement
  changedRelation: SixRelation
  changedShiYing?: '世' | '应'
  changedEnvironment: LiuyaoLineEnvironment
}

export interface LiuyaoCalendarContext {
  localDateTime: string
  monthBranch: string
  dayGanZhi: string
  dayStem: string
  dayBranch: string
  xunKong: string
}

export interface LiuyaoGuaShen {
  branch: string
  startBranch: '子' | '午'
  shiLine: number
  shiYinYang: YinYang
  presentAtLines: number[]
}

export interface LiuyaoShiShen {
  holdingBranch: string
  lineIndex: number
  branch: string
}

export interface LiuyaoShenSha {
  name: '羊刃' | '驿马' | '咸池'
  branch: string
  presentAtLines: number[]
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
  guaShen: LiuyaoGuaShen
  shiShen: LiuyaoShiShen
  shenSha: LiuyaoShenSha[]
  casts: CoinToss[]
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
}
