import { describe, expect, it } from 'vitest'
import { calculateBazi, getSolarTermDateTime } from './lunarTypescriptAdapter'

// 来源：香港天文台 1901—2100 年公曆與農曆日期對照表文字版。
// https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm
const HKO_CONVERSION_SAMPLES = [
  ['1901/02/19', 1901, 1, 1, false], ['1901/03/20', 1901, 2, 1, false],
  ['1912/02/18', 1912, 1, 1, false], ['1912/03/19', 1912, 2, 1, false],
  ['1950/02/17', 1950, 1, 1, false], ['1950/03/18', 1950, 2, 1, false],
  ['1976/09/24', 1976, 8, 1, true], ['1976/10/23', 1976, 9, 1, false],
  ['2000/02/05', 2000, 1, 1, false], ['2000/07/31', 2000, 7, 1, false],
  ['2023/01/22', 2023, 1, 1, false], ['2023/03/22', 2023, 2, 1, true],
  ['2024/02/10', 2024, 1, 1, false], ['2024/12/31', 2024, 12, 1, false],
  ['2052/09/23', 2052, 8, 1, true], ['2052/10/22', 2052, 9, 1, false],
  ['2084/02/06', 2084, 1, 1, false], ['2084/08/31', 2084, 8, 1, false],
  ['2100/02/09', 2100, 1, 1, false], ['2100/12/31', 2100, 12, 1, false],
] as const

// 来源：香港天文台二十四节气公开 XML，时间为香港时间（UTC+8）。
// https://www.hko.gov.hk/tc/gts/astronomy/data/files/24SolarTerms_2024.xml
const HKO_SOLAR_TERMS_2024 = [
  ['小寒', '2024-01-06 04:49'], ['大寒', '2024-01-20 22:07'], ['立春', '2024-02-04 16:27'], ['雨水', '2024-02-19 12:13'],
  ['惊蛰', '2024-03-05 10:23'], ['春分', '2024-03-20 11:06'], ['清明', '2024-04-04 15:02'], ['谷雨', '2024-04-19 22:00'],
  ['立夏', '2024-05-05 08:10'], ['小满', '2024-05-20 21:00'], ['芒种', '2024-06-05 12:10'], ['夏至', '2024-06-21 04:51'],
  ['小暑', '2024-07-06 22:20'], ['大暑', '2024-07-22 15:44'], ['立秋', '2024-08-07 08:09'], ['处暑', '2024-08-22 22:55'],
  ['白露', '2024-09-07 11:11'], ['秋分', '2024-09-22 20:44'], ['寒露', '2024-10-08 03:00'], ['霜降', '2024-10-23 06:15'],
  ['立冬', '2024-11-07 06:20'], ['小雪', '2024-11-22 03:56'], ['大雪', '2024-12-06 23:17'], ['冬至', '2024-12-21 17:21'],
] as const

function baseInput(rawBirthDate: string) {
  return { calendarType: 'solar' as const, rawBirthDate, lunarLeapMonth: false, rawBirthTime: '', timeAccuracy: 'unknown' as const, gender: 'female' as const }
}

function toEpochSeconds(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) throw new Error(`无效时间：${value}`)
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] ?? 0)) / 1000
}

describe('香港天文台公农历黄金样本', () => {
  it.each(HKO_CONVERSION_SAMPLES)('%s 双向转换', (solarDate, lunarYear, lunarMonth, lunarDay, isLeapMonth) => {
    const solarResult = calculateBazi(baseInput(solarDate))
    expect(solarResult.ok).toBe(true)
    if (!solarResult.ok) return
    expect(solarResult.normalizedInput.lunarDate).toEqual({ year: lunarYear, month: lunarMonth, day: lunarDay, isLeapMonth })

    const lunarResult = calculateBazi({ ...baseInput(`${lunarYear}/${String(lunarMonth).padStart(2, '0')}/${String(lunarDay).padStart(2, '0')}`), calendarType: 'lunar', lunarLeapMonth: isLeapMonth })
    expect(lunarResult.ok).toBe(true)
    if (!lunarResult.ok) return
    expect(`${lunarResult.normalizedInput.solarDate.year}/${String(lunarResult.normalizedInput.solarDate.month).padStart(2, '0')}/${String(lunarResult.normalizedInput.solarDate.day).padStart(2, '0')}`).toBe(solarDate)
  })

  it.each(HKO_SOLAR_TERMS_2024)('2024 %s 时刻与 HKO 公开分钟值相差不超过 60 秒', (name, expected) => {
    const actual = getSolarTermDateTime(2024, name)
    expect(actual).toBeTruthy()
    expect(Math.abs(toEpochSeconds(actual!) - toEpochSeconds(expected))).toBeLessThanOrEqual(60)
  })
})
