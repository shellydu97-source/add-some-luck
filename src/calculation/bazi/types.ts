import type { CalendarType, Gender, SystemChoice, TimeAccuracy } from '../../models/types'

export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'
export type FiveElement = '木' | '火' | '土' | '金' | '水'
export type YinYang = '阴' | '阳'
export type TenGod = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印'
export type TwelveStage = '长生' | '沐浴' | '冠带' | '临官' | '帝旺' | '衰' | '病' | '死' | '墓' | '绝' | '胎' | '养'
export type PillarKey = 'year' | 'month' | 'day' | 'time'

export interface BaziBirthInput {
  calendarType: CalendarType
  rawBirthDate: string
  lunarLeapMonth: boolean
  rawBirthTime?: string
  timeAccuracy: TimeAccuracy
  gender: Gender
  timezone?: string
  birthPlaceText?: string
  useTrueSolarTime?: SystemChoice
}

export interface CalendarDateValue {
  year: number
  month: number
  day: number
  isLeapMonth?: boolean
}

export interface NormalizedBaziInput {
  sourceCalendar: CalendarType
  sourceDate: CalendarDateValue
  solarDate: CalendarDateValue
  lunarDate: CalendarDateValue & { isLeapMonth: boolean }
  localTime?: { hour: number; minute: number; second: 0; precision: 'minute' }
  timeKnown: boolean
  timezone: 'Asia/Shanghai'
  trueSolarTime: false
  dayRollover: 'eight-char-sect-2'
  yearBoundary: 'exact-lichun'
  monthBoundary: 'exact-jie'
  luckStartMethod: 'yun-sect-1'
}

export interface AvailablePillar {
  status: 'available'
  ganZhi: string
  gan: HeavenlyStem
  zhi: EarthlyBranch
  hiddenStems: HeavenlyStem[]
  stemTenGod: TenGod | '日主'
  hiddenTenGods: TenGod[]
  fiveElements: { stem: FiveElement; branch: FiveElement }
  naYin: string
  twelveStage: TwelveStage
  selfStage: TwelveStage
  xun: string
  xunKong: string
}

export interface AmbiguousPillar {
  status: 'ambiguous'
  candidates: string[]
  reason: string
}

export interface UnavailablePillar {
  status: 'unavailable'
  reason: string
}

export type BaziPillar = AvailablePillar | AmbiguousPillar | UnavailablePillar

export interface BaziAnnualItem {
  year: number
  age: number
  ganZhi: string
  xun: string
  xunKong: string
}

export interface BaziLuckMonthItem {
  index: number
  name: string
  ganZhi: string
  xun: string
  xunKong: string
  startSolarDateTime: string
  endSolarDateTime: string
}

export interface BaziFlowPeriodAvailable {
  status: 'available'
  ganZhi: string
  xun: string
  xunKong: string
}

export interface BaziFlowPeriodAmbiguous {
  status: 'ambiguous'
  candidates: string[]
  reason: string
}

export type BaziFlowPeriod = BaziFlowPeriodAvailable | BaziFlowPeriodAmbiguous

export interface BaziFlowDateSuccess {
  ok: true
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
  solarDate: string
  lunarDate: string
  year: BaziFlowPeriod
  month: BaziFlowPeriod
  day: BaziFlowPeriod
}

export interface BaziLuckYearDetailsSuccess {
  ok: true
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
  year: BaziAnnualItem
  months: BaziLuckMonthItem[]
}

export interface BaziLuckCycle {
  index: number
  ganZhi: string
  startYear: number
  endYear: number
  startAge: number
  endAge: number
  startSolarDateTime: string
  xun: string
  xunKong: string
  annual: BaziAnnualItem[]
}

export interface BaziLuckResult {
  direction: 'forward' | 'backward'
  directionLabel: '顺排' | '逆排'
  startOffset: { years: number; months: number; days: number; hours: number }
  startSolarDateTime: string
  cycles: BaziLuckCycle[]
}

export interface BaziCalculationSuccess {
  ok: true
  engine: 'lunar-typescript'
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
  calculatedAt: string
  normalizedInput: NormalizedBaziInput
  pillars: Record<PillarKey, BaziPillar>
  fiveElementCounts: Record<FiveElement, number>
  luck?: BaziLuckResult
  warnings: string[]
}

export type BaziErrorCode =
  | 'invalid_date'
  | 'invalid_time'
  | 'invalid_lunar_date'
  | 'invalid_leap_month'
  | 'unsupported_date'
  | 'calculation_failed'

export interface BaziCalculationFailure {
  ok: false
  error: { code: BaziErrorCode; message: string }
}

export type BaziCalculationResult = BaziCalculationSuccess | BaziCalculationFailure
export type BaziFlowDateResult = BaziFlowDateSuccess | BaziCalculationFailure
export type BaziLuckYearDetailsResult = BaziLuckYearDetailsSuccess | BaziCalculationFailure
