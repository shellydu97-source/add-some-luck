import { Lunar, Solar } from 'lunar-typescript'
import type { BaziBirthInput, BaziCalculationResult } from './types'
import { calculateBazi as frozenCalculate, calculateBaziLuckYearDetails as frozenLuck } from './lunarTypescriptAdapter'

export const CORRECTED_BAZI_RULE_VERSION = 'bazi-v1.1-cn-shanghai-lichun-jie-dst-tst-option'
export interface BirthTimeCorrection {
  originalLocal: string
  correctedLocal: string
  daylightSavingMinutes: number
  trueSolarMinutes: number
  notes: string[]
  requiresDaylightSavingChoice: boolean
}
function birthLocal(input: BaziBirthInput) {
  const parts = input.rawBirthDate.split(/[/-]/).map(Number)
  const [hour, minute] = (input.rawBirthTime || '12:00').split(':').map(Number)
  const solar = input.calendarType === 'lunar'
    ? Lunar.fromYmdHms(parts[0], input.lunarLeapMonth ? -parts[1] : parts[1], parts[2], hour, minute, 0).getSolar()
    : Solar.fromYmdHms(parts[0], parts[1], parts[2], hour, minute, 0)
  return new Date(Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(), hour, minute))
}
// Probe both candidate offsets: this also detects the repeated hour at DST end.
export function shanghaiHasDaylightSaving(wall: Date) {
  const formatter = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', timeZoneName: 'longOffset' })
  return [8, 9].some((offset) => formatter.formatToParts(new Date(wall.getTime() - offset * 3600000)).some((p) => p.type === 'timeZoneName' && p.value === 'GMT+09:00'))
}
function localText(date: Date) { return date.toISOString().slice(0, 16).replace('T', ' ') }
export function correctBirthTime(input: BaziBirthInput): BirthTimeCorrection {
  const wall = birthLocal(input)
  const originalLocal = `${input.rawBirthDate.replaceAll('/', '-')} ${input.rawBirthTime || '时间未知'}`
  const known = !!input.rawBirthTime && input.timeAccuracy !== 'unknown'
  const requiresDaylightSavingChoice = known && shanghaiHasDaylightSaving(wall)
  const daylightSavingMinutes = requiresDaylightSavingChoice && input.daylightSavingStatus === 'applied' ? -60 : 0
  const notes: string[] = []
  let corrected = new Date(wall.getTime() + daylightSavingMinutes * 60000)
  if (daylightSavingMinutes) notes.push('夏令时校正 −60 分钟')
  let trueSolarMinutes = 0
  if (known && input.useTrueSolarTime === 'on') {
    if (!input.birthLocation) throw new Error('开启真太阳时需要选择出生城市。')
    // NOAA equation of time approximation; longitude relative to UTC+8 meridian.
    const year = corrected.getUTCFullYear()
    const day = (Date.UTC(year, corrected.getUTCMonth(), corrected.getUTCDate()) - Date.UTC(year, 0, 1)) / 86400000 + 1
    const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000
    const gamma = 2 * Math.PI / daysInYear * (day - 1 + (corrected.getUTCHours() - 12) / 24)
    const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma))
    trueSolarMinutes = (input.birthLocation.longitude - 120) * 4 + equation
    corrected = new Date(corrected.getTime() + Math.round(trueSolarMinutes) * 60000)
    notes.push(`真太阳时校正 ${Math.round(trueSolarMinutes)} 分钟（经度差与均时差）`)
  }
  return { originalLocal, correctedLocal: localText(corrected), daylightSavingMinutes, trueSolarMinutes, notes, requiresDaylightSavingChoice }
}
function prepare(input: BaziBirthInput) {
  const correction = correctBirthTime(input)
  const changed = correction.notes.length > 0
  const next = changed ? { ...input, calendarType: 'solar' as const, lunarLeapMonth: false, rawBirthDate: correction.correctedLocal.slice(0, 10).replaceAll('-', '/'), rawBirthTime: correction.correctedLocal.slice(11), useTrueSolarTime: 'off' as const } : input
  return { correction, next }
}
export function calculateBaziWithOptions(input: BaziBirthInput): BaziCalculationResult {
  // Keep invalid-input reporting and the frozen default adapter intact.
  const baseline = frozenCalculate(input)
  if (!baseline.ok) return baseline
  try {
    const { correction, next } = prepare(input)
    const result = correction.notes.length ? frozenCalculate(next) : baseline
    if (!result.ok) return result
    const zi = input.dayBoundaryRule === 'zi-23' && result.normalizedInput.timeKnown
    if (zi && next.rawBirthTime?.startsWith('23:')) {
      const date = birthLocal(next)
      date.setUTCDate(date.getUTCDate() + 1)
      date.setUTCHours(0)
      const after = frozenCalculate({ ...next, calendarType: 'solar', lunarLeapMonth: false, rawBirthDate: localText(date).slice(0, 10).replaceAll('-', '/'), rawBirthTime: localText(date).slice(11) })
      if (!after.ok) return after
      // Year/month/luck use the actual corrected instant, only day/time use next-day 子时.
      result.pillars.day = after.pillars.day
      result.pillars.time = after.pillars.time
      result.fiveElementCounts = { 木:0, 火:0, 土:0, 金:0, 水:0 }
      for (const pillar of Object.values(result.pillars)) if (pillar.status === 'available') { result.fiveElementCounts[pillar.fiveElements.stem]++; result.fiveElementCounts[pillar.fiveElements.branch]++ }
      const day = after.pillars.day
      if (day.status === 'available') {
        // Recalculate all ten-god/stage fields against the selected day master.
        const { refreshDayMaster } = dayMasterHelpers
        refreshDayMaster(result, day.gan)
      }
    }
    if (correction.notes.length || zi) {
      result.normalizedInput.trueSolarTime = input.useTrueSolarTime === 'on'
      result.normalizedInput.dayRollover = zi ? 'zi-23' : 'eight-char-sect-2'
      result.ruleVersion = CORRECTED_BAZI_RULE_VERSION
      result.birthTimeCorrection = correction
      result.dayBoundaryRule = zi ? 'zi-23' : 'system_default'
      result.warnings = result.warnings.filter((w) => !w.includes('固定关闭真太阳时'))
    }
    return result
  } catch (error) { return { ok: false, error: { code: 'calculation_failed', message: error instanceof Error ? error.message : String(error) } } }
}
import { getTenGod, getTwelveStage } from './rules'
import type { BaziCalculationSuccess, HeavenlyStem } from './types'
const dayMasterHelpers = { refreshDayMaster(result: BaziCalculationSuccess, stem: HeavenlyStem) {
  for (const [key, pillar] of Object.entries(result.pillars)) if (pillar.status === 'available') {
    pillar.stemTenGod = key === 'day' ? '日主' : getTenGod(stem, pillar.gan)
    pillar.hiddenTenGods = pillar.hiddenStems.map((s) => getTenGod(stem, s))
    pillar.twelveStage = getTwelveStage(stem, pillar.zhi)
  }
} }
export function calculateBaziLuckYearWithOptions(input: BaziBirthInput, year: number) {
  try { return frozenLuck(prepare(input).next, year) }
  catch (error) { return { ok:false as const, error:{code:'calculation_failed' as const,message:error instanceof Error ? error.message : String(error)} } }
}
