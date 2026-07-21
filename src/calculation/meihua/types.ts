export type MeihuaMethod = 'time' | 'specified_time' | 'numbers' | 'three_numbers' | 'text' | 'object_count' | 'sound_count'
export type MeihuaTrigramKey = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun'
export type MeihuaFiveElement = '木' | '火' | '土' | '金' | '水'
export type MeihuaRelationLabel = '比和' | '体生用' | '用生体' | '体克用' | '用克体'

export interface MeihuaTrigram {
  key: MeihuaTrigramKey
  number: number
  name: string
  symbol: string
  bits: string
  element: MeihuaFiveElement
  theme: string
}

export interface MeihuaHexagram {
  number: number
  name: string
  upper: MeihuaTrigram
  lower: MeihuaTrigram
  judgment: string
  lineTexts: [string, string, string, string, string, string]
}

export interface MeihuaCalendarContext {
  localDateTime: string
  ianaTimeZone: 'Asia/Shanghai'
  lunarYear: string
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
  yearBranch: string
  hourBranch: string
  yearNumber: number
  monthNumber: number
  dayNumber: number
  hourNumber: number
}

export interface MeihuaBodyUseRelation {
  label: MeihuaRelationLabel
  bodyElement: MeihuaFiveElement
  useElement: MeihuaFiveElement
  summary: string
}

export interface MeihuaCalculationResult {
  method: MeihuaMethod
  sourceNumbers: {
    upperTotal: number
    lowerTotal: number
    movingTotal: number
    firstNumber?: number
    secondNumber?: number
    thirdNumber?: number
    specifiedLocalDateTime?: string
    sourceText?: string
    normalizedText?: string
    characterCount?: number
    observedCount?: number
  }
  calendar?: MeihuaCalendarContext
  original: MeihuaHexagram
  mutual: MeihuaHexagram
  changed: MeihuaHexagram
  movingLine: number
  movingLineText: string
  bodyTrigram: MeihuaTrigram
  useTrigram: MeihuaTrigram
  bodyPosition: 'upper' | 'lower'
  usePosition: 'upper' | 'lower'
  bodyUseRelation: MeihuaBodyUseRelation
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
}
