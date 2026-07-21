import { Lunar, LunarYear, Solar } from 'lunar-typescript'
import { parseDateParts } from '../../utils/date'
import { calculateMajorAspects } from './aspects'
import { zodiacPosition } from './format'
import { calculatePlacidusHouses, placeInHouse } from './houses'
import { calculateRawPlanetPositions } from './planets'
import type { AstrologyBirthInput, AstrologyCalculationFailure, AstrologyCalculationResult, AstrologyNormalizedInput, CalendarDateValue, DailyPlanetRange, HouseCusp } from './types'

export const ASTROLOGY_ENGINE_VERSION = '2.1.19' as const
export const ASTROLOGY_ADAPTER_VERSION = 'astrology-product-adapter-1.0.0' as const
export const ASTROLOGY_RULE_VERSION = 'cn-v1-tropical-geocentric-true-ecliptic-placidus-1.0.0' as const
export const ASTROLOGY_TIMEZONE = 'Asia/Shanghai' as const

function failure(code: AstrologyCalculationFailure['error']['code'], message: string): AstrologyCalculationFailure {
  return { ok: false, error: { code, message } }
}

function calendarDate(solar: Solar): CalendarDateValue { return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() } }

function normalizeCalendar(input: AstrologyBirthInput) {
  const sourceDate = parseDateParts(input.rawBirthDate)
  if (!sourceDate) return failure('invalid_date', '出生日期格式无效，请使用 YYYY/MM/DD。')
  try {
    if (input.calendarType === 'solar') {
      const solar = Solar.fromYmd(sourceDate.year, sourceDate.month, sourceDate.day)
      if (solar.getYear() !== sourceDate.year || solar.getMonth() !== sourceDate.month || solar.getDay() !== sourceDate.day) {
        return failure('invalid_date', '该公历日期不存在。')
      }
      return { sourceDate, solarDate: calendarDate(solar) }
    }
    const lunarMonthNumber = input.lunarLeapMonth ? -sourceDate.month : sourceDate.month
    const lunarMonth = LunarYear.fromYear(sourceDate.year).getMonth(lunarMonthNumber)
    if (!lunarMonth) return input.lunarLeapMonth
      ? failure('invalid_leap_month', `${sourceDate.year} 年不存在闰 ${sourceDate.month} 月。`)
      : failure('invalid_lunar_date', '该农历月份不存在。')
    if (sourceDate.day < 1 || sourceDate.day > lunarMonth.getDayCount()) return failure('invalid_lunar_date', `该农历月只有 ${lunarMonth.getDayCount()} 天。`)
    const lunar = Lunar.fromYmd(sourceDate.year, lunarMonthNumber, sourceDate.day)
    if (lunar.getYear() !== sourceDate.year || lunar.getMonth() !== lunarMonthNumber || lunar.getDay() !== sourceDate.day) {
      return failure('invalid_lunar_date', '该农历日期无法通过回转校验。')
    }
    return { sourceDate, solarDate: calendarDate(lunar.getSolar()) }
  } catch (error) {
    return failure('invalid_date', `日期转换失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function validateLocation(input: AstrologyBirthInput) {
  const location = input.birthLocation
  if (!location) {
    const country = input.countryCode?.trim().toLowerCase()
    if (country && !['cn', '中国', '中国大陆', 'china'].includes(country)) return failure('unsupported_location', '暂未支持该地区真实星盘计算；V1 仅支持中国大陆城市。')
    return failure('location_unconfirmed', '出生地点尚未确认。请编辑人物并从本地城市搜索结果中选择具体城市。')
  }
  if (location.userConfirmed !== true || location.ianaTimeZone !== ASTROLOGY_TIMEZONE) return failure('location_unconfirmed', '出生地点缺少用户确认或固定时区信息。')
  if (location.latitude < 15 || location.latitude > 55 || location.longitude < 73 || location.longitude > 136) {
    return failure('unsupported_location', '该坐标不在本轮支持的中国大陆范围内。')
  }
  return location
}

function parseExactTime(value?: string) {
  const match = value?.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : undefined
}

function localToUtc(date: CalendarDateValue, hour: number, minute: number) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, hour - 8, minute, 0, 0))
}

function metadata(normalizedInput: AstrologyNormalizedInput, warnings: string[]) {
  return {
    engine: 'astronomy-engine' as const,
    engineVersion: ASTROLOGY_ENGINE_VERSION,
    adapterVersion: ASTROLOGY_ADAPTER_VERSION,
    ruleVersion: ASTROLOGY_RULE_VERSION,
    coordinateDataVersion: normalizedInput.location.coordinateDataVersion,
    calculatedAt: new Date().toISOString(),
    settings: { timezone: ASTROLOGY_TIMEZONE, zodiac: 'tropical' as const, center: 'geocentric' as const, ecliptic: 'true-of-date' as const, houseSystem: 'placidus' as const },
    normalizedInput,
    warnings,
  }
}

function calculateDayRanges(start: Date): DailyPlanetRange[] {
  const hourlySamples = Array.from({ length: 24 }, (_, hour) => calculateRawPlanetPositions(new Date(start.getTime() + hour * 3_600_000)))
  const samples = [...hourlySamples, calculateRawPlanetPositions(new Date(start.getTime() + 86_400_000 - 1))]
  return samples[0]!.map((first, bodyIndex) => {
    const positions = samples.map((sample) => sample[bodyIndex]!).filter(Boolean)
    const zodiacSamples = positions.map((position) => zodiacPosition(position.longitudeDeg))
    const signCandidates = [...new Set(zodiacSamples.map((position) => position.sign))]
    const degrees = zodiacSamples.map((position) => position.degreeInSign)
    const retrogradeStates = positions.map((position) => position.retrograde)
    return {
      body: first.body,
      signCandidates,
      signAmbiguous: signCandidates.length > 1,
      degreeInSignRange: signCandidates.length === 1 ? { min: Math.min(...degrees), max: Math.max(...degrees) } : undefined,
      longitudeStartDeg: first.longitudeDeg,
      longitudeEndDeg: positions.at(-1)!.longitudeDeg,
      motionStatus: retrogradeStates.every(Boolean) ? 'retrograde' : retrogradeStates.every((value) => !value) ? 'direct' : 'changes',
    }
  })
}

export function calculateAstrology(input: AstrologyBirthInput): AstrologyCalculationResult {
  const location = validateLocation(input)
  if ('ok' in location) return location
  const calendar = normalizeCalendar(input)
  if ('ok' in calendar) return calendar
  const exactTime = parseExactTime(input.rawBirthTime)
  const timeKnown = input.timeAccuracy === 'exact_minute'
  if (timeKnown && !exactTime) return failure('invalid_time', '出生时间格式无效，请使用 HH:mm。')

  try {
    if (!timeKnown) {
      const start = localToUtc(calendar.solarDate, 0, 0)
      const endExclusive = new Date(start.getTime() + 86_400_000)
      const normalizedInput: AstrologyNormalizedInput = {
        sourceCalendar: input.calendarType,
        sourceDate: { ...calendar.sourceDate, isLeapMonth: input.calendarType === 'lunar' ? input.lunarLeapMonth : undefined },
        solarDate: calendar.solarDate,
        timeKnown: false,
        timezone: ASTROLOGY_TIMEZONE,
        location,
        utcDayInterval: { start: start.toISOString(), endExclusive: endExclusive.toISOString() },
      }
      const warning = input.timeAccuracy === 'unknown'
        ? '出生时间未知：仅按完整自然日计算行星星座与度数范围，不生成单一精确度数、ASC、MC、宫头、落宫或精确相位。'
        : '出生时间不是精确分钟：本轮未实现时段区间，按未知时间保守处理，不取时间中点。'
      return { ok: true, precision: 'day-range', ...metadata(normalizedInput, [warning]), planetRanges: calculateDayRanges(start) }
    }

    const utcDateTime = localToUtc(calendar.solarDate, exactTime!.hour, exactTime!.minute)
    const houseResult = calculatePlacidusHouses(utcDateTime, location.latitude, location.longitude)
    if (!houseResult.ok) return failure('placidus_unavailable', houseResult.message)
    const planets = calculateRawPlanetPositions(utcDateTime).map((planet) => ({
      ...planet,
      ...zodiacPosition(planet.longitudeDeg),
      house: placeInHouse(planet.longitudeDeg, houseResult.cusps),
    }))
    const houses = houseResult.cusps.map((longitudeDeg, index) => ({
      house: (index + 1) as HouseCusp['house'], longitudeDeg, ...zodiacPosition(longitudeDeg),
    }))
    const normalizedInput: AstrologyNormalizedInput = {
      sourceCalendar: input.calendarType,
      sourceDate: { ...calendar.sourceDate, isLeapMonth: input.calendarType === 'lunar' ? input.lunarLeapMonth : undefined },
      solarDate: calendar.solarDate,
      timeKnown: true,
      localTime: { ...exactTime!, precision: 'minute' },
      timezone: ASTROLOGY_TIMEZONE,
      location,
      utcDateTime: utcDateTime.toISOString(),
    }
    return {
      ok: true,
      precision: 'exact',
      ...metadata(normalizedInput, []),
      planets,
      ascendant: { longitudeDeg: houseResult.ascendant, ...zodiacPosition(houseResult.ascendant) },
      midheaven: { longitudeDeg: houseResult.midheaven, ...zodiacPosition(houseResult.midheaven) },
      houses,
      aspects: calculateMajorAspects(planets),
    }
  } catch (error) {
    return failure('calculation_failed', `星盘基础计算失败：${error instanceof Error ? error.message : String(error)}`)
  }
}
