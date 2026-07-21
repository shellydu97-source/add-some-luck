import { describe, expect, it } from 'vitest'
import {
  BAZI_ADAPTER_VERSION, BAZI_ENGINE_VERSION, BAZI_RULE_VERSION,
  calculateBazi, calculateBaziFlowDate, calculateBaziLuckYearDetails, validateBaziBirthDate,
} from './lunarTypescriptAdapter'
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './rules'

function solar(date: string, time: string, gender: 'male' | 'female' = 'male') {
  return calculateBazi({ calendarType: 'solar', rawBirthDate: date, lunarLeapMonth: false, rawBirthTime: time, timeAccuracy: time ? 'exact_minute' : 'unknown', gender })
}

function pillar(result: ReturnType<typeof calculateBazi>, key: 'year' | 'month' | 'day' | 'time') {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  const value = result.pillars[key]
  expect(value.status).toBe('available')
  if (value.status !== 'available') throw new Error(`${key} 不可用`)
  return value.ganZhi
}

function independentGanZhiDay(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  const julian = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
  const index = ((julian + 49) % 60 + 60) % 60
  return `${HEAVENLY_STEMS[index % 10]}${EARTHLY_BRANCHES[index % 12]}`
}

describe('lunar-typescript 隔离 adapter 与 V1 边界', () => {
  it('立春精确时刻换年，分钟内不伪装秒级精度', () => {
    const before = solar('2024/02/04', '16:26')
    const crossingMinute = solar('2024/02/04', '16:27')
    const after = solar('2024/02/04', '16:28')
    expect([pillar(before, 'year'), pillar(before, 'month')]).toEqual(['癸卯', '乙丑'])
    expect(crossingMinute.ok && crossingMinute.pillars.year).toMatchObject({ status: 'ambiguous', candidates: ['癸卯', '甲辰'] })
    expect(crossingMinute.ok && crossingMinute.pillars.month).toMatchObject({ status: 'ambiguous', candidates: ['乙丑', '丙寅'] })
    expect([pillar(after, 'year'), pillar(after, 'month')]).toEqual(['甲辰', '丙寅'])
  })

  it('十二节精确时刻换月', () => {
    const before = solar('2024/03/05', '10:21')
    const crossingMinute = solar('2024/03/05', '10:22')
    const after = solar('2024/03/05', '10:23')
    expect(pillar(before, 'month')).toBe('丙寅')
    expect(crossingMinute.ok && crossingMinute.pillars.month).toMatchObject({ status: 'ambiguous', candidates: ['丙寅', '丁卯'] })
    expect(pillar(after, 'month')).toBe('丁卯')
  })

  it.each([
    ['2000/01/07', '22:59', '甲子', '乙亥'],
    ['2000/01/07', '23:00', '甲子', '丙子'],
    ['2000/01/07', '23:59', '甲子', '丙子'],
    ['2000/01/08', '00:00', '乙丑', '丙子'],
  ])('%s %s 使用 EightChar sect 2', (date, time, expectedDay, expectedTime) => {
    const result = solar(date, time)
    expect([pillar(result, 'day'), pillar(result, 'time')]).toEqual([expectedDay, expectedTime])
  })

  it('出生时间未知只输出三柱，无时柱和精确起运', () => {
    const result = solar('2000/01/07', '')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([result.pillars.year.status, result.pillars.month.status, result.pillars.day.status, result.pillars.time.status]).toEqual(['available', 'available', 'available', 'unavailable'])
    expect(result.luck).toBeUndefined()
  })

  it('未知时间且落在立春日时，年月柱显式不确定', () => {
    const result = solar('2024/02/04', '')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pillars.year.status).toBe('ambiguous')
    expect(result.pillars.month.status).toBe('ambiguous')
    expect(result.pillars.day.status).toBe('available')
  })

  it('真实校验农历闰月和月长', () => {
    expect(validateBaziBirthDate({ calendarType: 'lunar', rawBirthDate: '2023/02/01', lunarLeapMonth: true })).toBe('')
    expect(validateBaziBirthDate({ calendarType: 'lunar', rawBirthDate: '2024/02/01', lunarLeapMonth: true })).toContain('不存在闰 2 月')
    expect(validateBaziBirthDate({ calendarType: 'lunar', rawBirthDate: '2023/02/30', lunarLeapMonth: true })).toContain('只有 29 天')
  })

  it.each([
    ['2024/06/01', 'male', 'forward'], ['2024/06/01', 'female', 'backward'],
    ['2023/06/01', 'male', 'backward'], ['2023/06/01', 'female', 'forward'],
  ] as const)('阳男阴女顺、阴男阳女逆：%s %s', (date, gender, direction) => {
    const result = solar(date, '12:00', gender)
    expect(result.ok && result.luck?.direction).toBe(direction)
  })

  it('起运固定使用传统 sect 1', () => {
    const result = solar('1990/05/17', '08:30', 'male')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.luck?.startOffset).toEqual({ years: 6, months: 7, days: 20, hours: 0 })
    expect(result.luck?.startSolarDateTime).toBe('1997-01-06 08:30:00')
    expect(result.luck?.cycles).toHaveLength(8)
    expect(result.luck?.cycles.every((cycle) => cycle.annual.length === 10)).toBe(true)
    expect(result.luck?.cycles[0]?.startSolarDateTime).toBe('1997-01-06 08:30:00')
    expect(result.luck?.cycles[1]?.startSolarDateTime).toBe('2007-01-06 08:30:00')
  })

  it('流月按十二节生成，并保存每个月的精确起止节气时刻', () => {
    const input = { calendarType: 'solar' as const, rawBirthDate: '1990/05/17', lunarLeapMonth: false, rawBirthTime: '08:30', timeAccuracy: 'exact_minute' as const, gender: 'male' as const }
    const result = calculateBaziLuckYearDetails(input, 1997)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.year).toMatchObject({ year: 1997, ganZhi: '丁丑' })
    expect(result.months).toHaveLength(12)
    expect(result.months[0]).toMatchObject({ name: '正月', ganZhi: '壬寅' })
    expect(result.months[11]).toMatchObject({ name: '腊月', ganZhi: '癸丑' })
    expect(result.months[0].startSolarDateTime).toMatch(/^1997-02-04 /)
    expect(result.months[0].endSolarDateTime).toMatch(/^1997-03-05 /)
    expect(result.months[11].endSolarDateTime).toMatch(/^1998-02-04 /)
  })

  it('流年和流月在立春交界日返回候选，不用中午伪装全天结果', () => {
    const result = calculateBaziFlowDate('2024/02/04')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.year).toMatchObject({ status: 'ambiguous', candidates: ['癸卯', '甲辰'] })
    expect(result.month).toMatchObject({ status: 'ambiguous', candidates: ['乙丑', '丙寅'] })
    expect(result.day.status).toBe('available')
  })

  it('普通日期输出节令流年、流月，并用独立儒略日公式核对流日', () => {
    const result = calculateBaziFlowDate('2024/06/01')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.year).toMatchObject({ status: 'available', ganZhi: '甲辰' })
    expect(result.month).toMatchObject({ status: 'available', ganZhi: '己巳' })
    expect(result.day).toMatchObject({ status: 'available', ganZhi: independentGanZhiDay(2024, 6, 1) })
  })

  it('结果保存引擎、adapter 和规则版本', () => {
    const result = solar('1997/08/30', '09:30', 'female')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect({ engine: result.engine, engineVersion: result.engineVersion, adapterVersion: result.adapterVersion, ruleVersion: result.ruleVersion }).toEqual({
      engine: 'lunar-typescript', engineVersion: BAZI_ENGINE_VERSION, adapterVersion: BAZI_ADAPTER_VERSION, ruleVersion: BAZI_RULE_VERSION,
    })
  })

  it('V1 固定 Asia/Shanghai 且关闭真太阳时', () => {
    const result = calculateBazi({
      calendarType: 'solar', rawBirthDate: '1997/08/30', lunarLeapMonth: false, rawBirthTime: '09:30',
      timeAccuracy: 'exact_minute', gender: 'female', timezone: 'America/New_York', useTrueSolarTime: 'on',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.normalizedInput).toMatchObject({ timezone: 'Asia/Shanghai', trueSolarTime: false })
    expect(result.warnings.join(' ')).toContain('America/New_York')
    expect(result.warnings.join(' ')).toContain('关闭真太阳时')
  })
})
