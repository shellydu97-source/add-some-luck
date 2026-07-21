import { Lunar, LunarYear, Solar, type EightChar } from 'lunar-typescript'
import { parseDateParts } from '../../utils/date'
import {
  BRANCH_ELEMENTS,
  HIDDEN_STEMS,
  STEM_META,
  getNaYin,
  getTenGod,
  getTwelveStage,
  getXun,
  getXunKong,
  isEarthlyBranch,
  isHeavenlyStem,
} from './rules'
import type {
  AvailablePillar,
  BaziBirthInput,
  BaziCalculationFailure,
  BaziCalculationResult,
  BaziFlowDateResult,
  BaziFlowPeriod,
  BaziLuckYearDetailsResult,
  BaziLuckResult,
  BaziPillar,
  CalendarDateValue,
  FiveElement,
  HeavenlyStem,
  NormalizedBaziInput,
  PillarKey,
} from './types'

export const BAZI_ENGINE_VERSION = '1.8.6'
export const BAZI_ADAPTER_VERSION = '1.0.0'
export const BAZI_RULE_VERSION = 'bazi-v1-cn-shanghai-lichun-jie-sect2-yun-sect1'
export const BAZI_TIMEZONE = 'Asia/Shanghai' as const

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'time']
const FIVE_ELEMENTS: FiveElement[] = ['木', '火', '土', '金', '水']

function failure(code: BaziCalculationFailure['error']['code'], message: string): BaziCalculationFailure {
  return { ok: false, error: { code, message } }
}

function parseTime(value?: string) {
  if (!value) return undefined
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null
}

function calendarDate(solar: Solar): CalendarDateValue {
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }
}

function normalizeCalendar(input: BaziBirthInput, hour: number, minute: number, second: number) {
  const sourceDate = parseDateParts(input.rawBirthDate)
  if (!sourceDate) return failure('invalid_date', '出生日期格式无效，请使用 YYYY/MM/DD。')

  try {
    if (input.calendarType === 'solar') {
      const solar = Solar.fromYmdHms(sourceDate.year, sourceDate.month, sourceDate.day, hour, minute, second)
      if (solar.getYear() !== sourceDate.year || solar.getMonth() !== sourceDate.month || solar.getDay() !== sourceDate.day) {
        return failure('invalid_date', '该公历日期不存在。')
      }
      return { sourceDate, solar, lunar: solar.getLunar() }
    }

    if (sourceDate.month < 1 || sourceDate.month > 12 || sourceDate.day < 1 || sourceDate.day > 30) {
      return failure('invalid_lunar_date', '农历月份需在 1—12，日期需在 1—30 之间。')
    }
    const lunarMonthNumber = input.lunarLeapMonth ? -sourceDate.month : sourceDate.month
    const lunarMonth = LunarYear.fromYear(sourceDate.year).getMonth(lunarMonthNumber)
    if (!lunarMonth) {
      return input.lunarLeapMonth
        ? failure('invalid_leap_month', `${sourceDate.year} 年不存在闰 ${sourceDate.month} 月。`)
        : failure('invalid_lunar_date', '该农历月份不存在。')
    }
    if (sourceDate.day > lunarMonth.getDayCount()) {
      return failure('invalid_lunar_date', `该农历月只有 ${lunarMonth.getDayCount()} 天。`)
    }
    const lunar = Lunar.fromYmdHms(sourceDate.year, lunarMonthNumber, sourceDate.day, hour, minute, second)
    if (lunar.getYear() !== sourceDate.year || lunar.getMonth() !== lunarMonthNumber || lunar.getDay() !== sourceDate.day) {
      return failure('invalid_lunar_date', '该农历日期无法通过回转校验。')
    }
    return { sourceDate, solar: lunar.getSolar(), lunar }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return failure('unsupported_date', `日期转换失败：${message}`)
  }
}

function getRawPillars(eightChar: EightChar): Record<PillarKey, string> {
  return {
    year: eightChar.getYear(),
    month: eightChar.getMonth(),
    day: eightChar.getDay(),
    time: eightChar.getTime(),
  }
}

function eightCharAt(date: CalendarDateValue, hour: number, minute: number, second: number) {
  const lunar = Solar.fromYmdHms(date.year, date.month, date.day, hour, minute, second).getLunar()
  const eightChar = lunar.getEightChar()
  eightChar.setSect(2)
  return { lunar, eightChar, raw: getRawPillars(eightChar) }
}

function availablePillar(ganZhi: string, dayStem: HeavenlyStem): AvailablePillar {
  const gan = ganZhi.slice(0, 1)
  const zhi = ganZhi.slice(1, 2)
  if (!isHeavenlyStem(gan) || !isEarthlyBranch(zhi)) throw new Error(`无效干支：${ganZhi}`)
  const naYin = getNaYin(ganZhi)
  const xun = getXun(ganZhi)
  const xunKong = getXunKong(ganZhi)
  if (!naYin || !xun || !xunKong) throw new Error(`缺少干支静态规则：${ganZhi}`)
  const hiddenStems = HIDDEN_STEMS[zhi]
  return {
    status: 'available', ganZhi, gan, zhi, hiddenStems,
    stemTenGod: gan === dayStem ? '日主' : getTenGod(dayStem, gan),
    hiddenTenGods: hiddenStems.map((stem) => getTenGod(dayStem, stem)),
    fiveElements: { stem: STEM_META[gan].element, branch: BRANCH_ELEMENTS[zhi] },
    naYin,
    twelveStage: getTwelveStage(dayStem, zhi),
    selfStage: getTwelveStage(gan, zhi),
    xun,
    xunKong,
  }
}

function makePillars(
  first: Record<PillarKey, string>,
  last: Record<PillarKey, string>,
  timeKnown: boolean,
  unknownTimeDateBoundary: boolean,
): Record<PillarKey, BaziPillar> {
  const dayValue = first.day === last.day ? first.day : ''
  const dayStemValue = dayValue.slice(0, 1)
  if (!isHeavenlyStem(dayStemValue)) throw new Error('无法确定日主天干。')
  const pillars = {} as Record<PillarKey, BaziPillar>
  for (const key of PILLAR_KEYS) {
    if (key === 'time' && !timeKnown) {
      pillars.time = { status: 'unavailable', reason: '出生时间未知，V1 不补默认时间，不生成时柱。' }
      continue
    }
    if (first[key] !== last[key]) {
      pillars[key] = {
        status: 'ambiguous',
        candidates: [...new Set([first[key], last[key]])],
        reason: unknownTimeDateBoundary
          ? '出生日期落在立春或节交接日，缺少出生时间，无法确定交接前后。'
          : '出生时间仅精确到分钟，该分钟内发生立春或节交接，需要秒级时间才能确定。',
      }
      continue
    }
    pillars[key] = availablePillar(first[key], dayStemValue)
  }
  return pillars
}

function buildLuck(eightChar: EightChar, gender: BaziBirthInput['gender']): BaziLuckResult {
  const yun = eightChar.getYun(gender === 'male' ? 1 : 0, 1)
  const luckStart = yun.getStartSolar()
  const cycles = yun.getDaYun(9).filter((item) => item.getIndex() > 0).map((item) => ({
    index: item.getIndex(),
    ganZhi: item.getGanZhi(),
    startYear: item.getStartYear(), endYear: item.getEndYear(),
    startAge: item.getStartAge(), endAge: item.getEndAge(),
    startSolarDateTime: luckStart.nextYear((item.getIndex() - 1) * 10).toYmdHms(),
    xun: item.getXun(), xunKong: item.getXunKong(),
    annual: item.getLiuNian().map((year) => ({
      year: year.getYear(), age: year.getAge(), ganZhi: year.getGanZhi(), xun: year.getXun(), xunKong: year.getXunKong(),
    })),
  }))
  return {
    direction: yun.isForward() ? 'forward' : 'backward',
    directionLabel: yun.isForward() ? '顺排' : '逆排',
    startOffset: { years: yun.getStartYear(), months: yun.getStartMonth(), days: yun.getStartDay(), hours: yun.getStartHour() },
    startSolarDateTime: yun.getStartSolar().toYmdHms(),
    cycles,
  }
}

function countFiveElements(pillars: Record<PillarKey, BaziPillar>) {
  const counts = Object.fromEntries(FIVE_ELEMENTS.map((element) => [element, 0])) as Record<FiveElement, number>
  for (const pillar of Object.values(pillars)) {
    if (pillar.status !== 'available') continue
    counts[pillar.fiveElements.stem]++
    counts[pillar.fiveElements.branch]++
  }
  return counts
}

export function validateBaziBirthDate(input: Pick<BaziBirthInput, 'calendarType' | 'rawBirthDate' | 'lunarLeapMonth'>) {
  const normalized = normalizeCalendar({ ...input, rawBirthTime: '', timeAccuracy: 'unknown', gender: 'female' }, 12, 0, 0)
  return 'error' in normalized ? normalized.error.message : ''
}

export function getSolarTermDateTime(year: number, name: string) {
  const table = Solar.fromYmd(year, 7, 1).getLunar().getJieQiTable()
  const aliasNames: Record<string, string> = {
    DA_XUE: '大雪', DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒',
    LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰', QING_MING: '清明',
    LI_XIA: '立夏', MANG_ZHONG: '芒种', XIAO_SHU: '小暑', LI_QIU: '立秋',
    BAI_LU: '白露', HAN_LU: '寒露', LI_DONG: '立冬',
  }
  const match = Object.entries(table).find(([key, solar]) => (aliasNames[key] ?? key) === name && solar.getYear() === year)
  return match?.[1].toYmdHms()
}

function flowPeriod(first: string, last: string, reason: string): BaziFlowPeriod {
  if (first !== last) return { status: 'ambiguous', candidates: [...new Set([first, last])], reason }
  const xun = getXun(first)
  const xunKong = getXunKong(first)
  if (!xun || !xunKong) throw new Error(`缺少流运干支规则：${first}`)
  return { status: 'available', ganZhi: first, xun, xunKong }
}

export function calculateBaziFlowDate(rawDate: string): BaziFlowDateResult {
  const date = parseDateParts(rawDate)
  if (!date) return failure('invalid_date', '日期格式无效，请使用 YYYY/MM/DD。')
  try {
    const firstSolar = Solar.fromYmdHms(date.year, date.month, date.day, 0, 0, 0)
    const lastSolar = Solar.fromYmdHms(date.year, date.month, date.day, 23, 59, 59)
    if (firstSolar.getYear() !== date.year || firstSolar.getMonth() !== date.month || firstSolar.getDay() !== date.day) {
      return failure('invalid_date', '该公历日期不存在。')
    }
    const first = firstSolar.getLunar()
    const last = lastSolar.getLunar()
    const noon = Solar.fromYmdHms(date.year, date.month, date.day, 12, 0, 0).getLunar()
    return {
      ok: true,
      engineVersion: BAZI_ENGINE_VERSION,
      adapterVersion: BAZI_ADAPTER_VERSION,
      ruleVersion: BAZI_RULE_VERSION,
      solarDate: `${String(date.year).padStart(4, '0')}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`,
      lunarDate: noon.toString(),
      year: flowPeriod(first.getYearInGanZhiExact(), last.getYearInGanZhiExact(), '当天发生立春交接，未指定时刻，流年干支存在两个候选。'),
      month: flowPeriod(first.getMonthInGanZhiExact(), last.getMonthInGanZhiExact(), '当天发生节令交接，未指定时刻，流月干支存在两个候选。'),
      day: flowPeriod(first.getDayInGanZhiExact2(), last.getDayInGanZhiExact2(), '当天干支跨界，未指定时刻，流日干支存在两个候选。'),
    }
  } catch (error) {
    return failure('calculation_failed', `流日计算失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function flowMonthBoundaries(year: number) {
  const terms = [
    [year, '立春'], [year, '惊蛰'], [year, '清明'], [year, '立夏'], [year, '芒种'], [year, '小暑'],
    [year, '立秋'], [year, '白露'], [year, '寒露'], [year, '立冬'], [year, '大雪'],
    [year + 1, '小寒'], [year + 1, '立春'],
  ] as const
  return terms.map(([termYear, name]) => {
    const value = getSolarTermDateTime(termYear, name)
    if (!value) throw new Error(`缺少 ${termYear} 年 ${name} 的节气时刻`)
    return value
  })
}

export function calculateBaziLuckYearDetails(input: BaziBirthInput, selectedYear: number): BaziLuckYearDetailsResult {
  const parsedTime = parseTime(input.rawBirthTime)
  if (!parsedTime || input.timeAccuracy === 'unknown') return failure('invalid_time', '出生时间未知，无法生成精确大运与流月。')
  const normalized = normalizeCalendar(input, parsedTime.hour, parsedTime.minute, 0)
  if ('error' in normalized) return normalized

  try {
    const solarDate = calendarDate(normalized.solar)
    const first = eightCharAt(solarDate, parsedTime.hour, parsedTime.minute, 0)
    const last = eightCharAt(solarDate, parsedTime.hour, parsedTime.minute, 59)
    if (PILLAR_KEYS.some((key) => first.raw[key] !== last.raw[key])) {
      return failure('calculation_failed', '出生分钟跨越换柱边界，无法生成伪精确运势时间轴。')
    }
    const yun = first.eightChar.getYun(input.gender === 'male' ? 1 : 0, 1)
    const daYun = yun.getDaYun(9).find((item) => item.getIndex() > 0 && selectedYear >= item.getStartYear() && selectedYear <= item.getEndYear())
    const liuNian = daYun?.getLiuNian().find((item) => item.getYear() === selectedYear)
    if (!liuNian) return failure('unsupported_date', '所选年份不在当前大运时间轴范围内。')
    const boundaries = flowMonthBoundaries(selectedYear)
    return {
      ok: true,
      engineVersion: BAZI_ENGINE_VERSION,
      adapterVersion: BAZI_ADAPTER_VERSION,
      ruleVersion: BAZI_RULE_VERSION,
      year: {
        year: liuNian.getYear(), age: liuNian.getAge(), ganZhi: liuNian.getGanZhi(),
        xun: liuNian.getXun(), xunKong: liuNian.getXunKong(),
      },
      months: liuNian.getLiuYue().map((month, index) => ({
        index: month.getIndex(), name: `${month.getMonthInChinese()}月`, ganZhi: month.getGanZhi(),
        xun: month.getXun(), xunKong: month.getXunKong(),
        startSolarDateTime: boundaries[index], endSolarDateTime: boundaries[index + 1],
      })),
    }
  } catch (error) {
    return failure('calculation_failed', `流月计算失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

export function calculateBazi(input: BaziBirthInput): BaziCalculationResult {
  const parsedTime = parseTime(input.rawBirthTime)
  if (parsedTime === null) return failure('invalid_time', '出生时间格式无效，请使用 HH:mm。')
  const timeKnown = Boolean(parsedTime && input.timeAccuracy !== 'unknown')
  const hour = timeKnown && parsedTime ? parsedTime.hour : 12
  const minute = timeKnown && parsedTime ? parsedTime.minute : 0
  const normalized = normalizeCalendar(input, hour, minute, 0)
  if ('error' in normalized) return normalized

  try {
    const solarDate = calendarDate(normalized.solar)
    const lunar = normalized.lunar
    const normalizedInput: NormalizedBaziInput = {
      sourceCalendar: input.calendarType,
      sourceDate: { ...normalized.sourceDate, isLeapMonth: input.calendarType === 'lunar' ? input.lunarLeapMonth : undefined },
      solarDate,
      lunarDate: { year: lunar.getYear(), month: Math.abs(lunar.getMonth()), day: lunar.getDay(), isLeapMonth: lunar.getMonth() < 0 },
      localTime: timeKnown && parsedTime ? { ...parsedTime, second: 0, precision: 'minute' } : undefined,
      timeKnown,
      timezone: BAZI_TIMEZONE,
      trueSolarTime: false,
      dayRollover: 'eight-char-sect-2',
      yearBoundary: 'exact-lichun',
      monthBoundary: 'exact-jie',
      luckStartMethod: 'yun-sect-1',
    }

    const first = timeKnown && parsedTime
      ? eightCharAt(solarDate, parsedTime.hour, parsedTime.minute, 0)
      : eightCharAt(solarDate, 0, 0, 0)
    const last = timeKnown && parsedTime
      ? eightCharAt(solarDate, parsedTime.hour, parsedTime.minute, 59)
      : eightCharAt(solarDate, 23, 59, 59)
    const pillars = makePillars(first.raw, last.raw, timeKnown, !timeKnown)
    const warnings: string[] = []
    if (!timeKnown) warnings.push('出生时间未知：仅输出可确定的三柱，不生成时柱和精确起运时间。')
    if (input.timeAccuracy === 'approximate_period' || input.timeAccuracy === 'known_shichen') warnings.push('出生时间不是精确分钟：时柱和起运结果应降低可信度。')
    if (input.timezone && input.timezone !== BAZI_TIMEZONE) warnings.push(`V1 忽略档案中的时区 ${input.timezone}，固定按 ${BAZI_TIMEZONE} 计算。`)
    if (input.useTrueSolarTime === 'on') warnings.push('V1 固定关闭真太阳时，未使用档案中的真太阳时选项。')
    if (Object.values(pillars).some((pillar) => pillar.status === 'ambiguous')) warnings.push('当前时间精度跨越换柱边界，相关柱不输出伪精确结果。')

    const canCalculateLuck = timeKnown && Object.values(pillars).every((pillar) => pillar.status === 'available')
    return {
      ok: true,
      engine: 'lunar-typescript',
      engineVersion: BAZI_ENGINE_VERSION,
      adapterVersion: BAZI_ADAPTER_VERSION,
      ruleVersion: BAZI_RULE_VERSION,
      calculatedAt: new Date().toISOString(),
      normalizedInput,
      pillars,
      fiveElementCounts: countFiveElements(pillars),
      luck: canCalculateLuck ? buildLuck(first.eightChar, input.gender) : undefined,
      warnings,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return failure('calculation_failed', `八字基础排盘失败：${message}`)
  }
}
