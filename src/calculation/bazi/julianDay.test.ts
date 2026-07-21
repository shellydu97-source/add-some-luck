import { describe, expect, it } from 'vitest'
import { calculateBazi } from './lunarTypescriptAdapter'
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './rules'

// 独立格里高利历 -> 儒略日 -> 干支日公式。甲子纪元不读取 lunar-typescript 输出。
function gregorianJulianDayNumber(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

function independentGanZhiDay(year: number, month: number, day: number) {
  const index = ((gregorianJulianDayNumber(year, month, day) + 49) % 60 + 60) % 60
  return `${HEAVENLY_STEMS[index % 10]}${EARTHLY_BRANCHES[index % 12]}`
}

const DATES = [
  [1901, 1, 1], [1901, 2, 19], [1912, 2, 29], [1949, 10, 1], [1950, 2, 17],
  [1976, 9, 24], [1984, 2, 4], [1990, 5, 17], [1999, 12, 31], [2000, 1, 1],
  [2000, 1, 7], [2000, 2, 29], [2001, 1, 1], [2012, 2, 29], [2020, 1, 25],
  [2023, 3, 22], [2024, 2, 4], [2024, 2, 10], [2024, 2, 29], [2024, 12, 31],
  [2038, 1, 19], [2052, 9, 23], [2084, 2, 6], [2099, 12, 31], [2100, 2, 9],
  [2100, 3, 1], [2100, 12, 31], [1969, 7, 20], [1970, 1, 1], [1988, 8, 8],
] as const

describe('独立儒略日干支日黄金期望', () => {
  it.each(DATES)('%i-%i-%i 日柱', (year, month, day) => {
    const result = calculateBazi({
      calendarType: 'solar', rawBirthDate: `${year}/${month}/${day}`, lunarLeapMonth: false,
      rawBirthTime: '12:00', timeAccuracy: 'exact_minute', gender: 'male',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pillars.day.status).toBe('available')
    if (result.pillars.day.status === 'available') expect(result.pillars.day.ganZhi).toBe(independentGanZhiDay(year, month, day))
  })
})

