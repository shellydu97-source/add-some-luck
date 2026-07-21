import type { CalendarType, ConfirmedBirthLocation, TimeAccuracy } from '../../models/types'

export type AstrologyBody = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
export type ZodiacSign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'
export type MajorAspect = 'conjunction' | 'opposition' | 'square' | 'trine' | 'sextile'

export interface AstrologyBirthInput {
  calendarType: CalendarType
  rawBirthDate: string
  lunarLeapMonth: boolean
  rawBirthTime?: string
  timeAccuracy: TimeAccuracy
  birthPlaceText?: string
  countryCode?: string
  birthLocation?: ConfirmedBirthLocation
}

export interface CalendarDateValue { year: number; month: number; day: number }

export interface AstrologyNormalizedInput {
  sourceCalendar: CalendarType
  sourceDate: CalendarDateValue & { isLeapMonth?: boolean }
  solarDate: CalendarDateValue
  timeKnown: boolean
  localTime?: { hour: number; minute: number; precision: 'minute' }
  timezone: 'Asia/Shanghai'
  location: ConfirmedBirthLocation
  utcDateTime?: string
  utcDayInterval?: { start: string; endExclusive: string }
}

export interface PlanetPosition {
  body: AstrologyBody
  longitudeDeg: number
  longitudeSpeedDegPerDay: number
  retrograde: boolean
  sign: ZodiacSign
  degreeInSign: number
  house: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export interface DailyPlanetRange {
  body: AstrologyBody
  signCandidates: ZodiacSign[]
  signAmbiguous: boolean
  degreeInSignRange?: { min: number; max: number }
  longitudeStartDeg: number
  longitudeEndDeg: number
  motionStatus: 'direct' | 'retrograde' | 'changes'
}

export interface AnglePosition {
  longitudeDeg: number
  sign: ZodiacSign
  degreeInSign: number
}

export interface HouseCusp extends AnglePosition {
  house: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export interface AspectResult {
  first: AstrologyBody
  second: AstrologyBody
  type: MajorAspect
  exactAngleDeg: 0 | 60 | 90 | 120 | 180
  separationDeg: number
  orbDeg: number
  maxOrbDeg: number
}

interface CalculationMetadata {
  engine: 'astronomy-engine'
  engineVersion: '2.1.19'
  adapterVersion: 'astrology-product-adapter-1.0.0'
  ruleVersion: 'cn-v1-tropical-geocentric-true-ecliptic-placidus-1.0.0'
  coordinateDataVersion: string
  calculatedAt: string
  settings: {
    timezone: 'Asia/Shanghai'
    zodiac: 'tropical'
    center: 'geocentric'
    ecliptic: 'true-of-date'
    houseSystem: 'placidus'
  }
  normalizedInput: AstrologyNormalizedInput
  warnings: string[]
}

export interface PreciseAstrologyResult extends CalculationMetadata {
  ok: true
  precision: 'exact'
  planets: PlanetPosition[]
  ascendant: AnglePosition
  midheaven: AnglePosition
  houses: HouseCusp[]
  aspects: AspectResult[]
}

export interface DayRangeAstrologyResult extends CalculationMetadata {
  ok: true
  precision: 'day-range'
  planetRanges: DailyPlanetRange[]
}

export type AstrologyErrorCode =
  | 'location_unconfirmed'
  | 'unsupported_location'
  | 'invalid_date'
  | 'invalid_lunar_date'
  | 'invalid_leap_month'
  | 'invalid_time'
  | 'placidus_unavailable'
  | 'calculation_failed'

export interface AstrologyCalculationFailure {
  ok: false
  error: { code: AstrologyErrorCode; message: string }
}

export type AstrologyCalculationResult = PreciseAstrologyResult | DayRangeAstrologyResult | AstrologyCalculationFailure

export type HouseCalculationResult =
  | { ok: true; ascendant: number; midheaven: number; armc: number; trueObliquity: number; cusps: [number, number, number, number, number, number, number, number, number, number, number, number] }
  | { ok: false; code: 'placidus_unavailable'; message: string }
