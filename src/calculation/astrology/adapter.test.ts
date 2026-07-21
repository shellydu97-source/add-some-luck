import { describe, expect, it } from 'vitest'
import expected from '../../../astrology-spike/references/raw/shanghai-normal/expected.json'
import type { ConfirmedBirthLocation } from '../../models/types'
import { calculateAstrology } from './adapter'
import { calculateMajorAspects } from './aspects'
import { calculatePlacidusHouses, placeInHouse } from './houses'

const shanghai: ConfirmedBirthLocation = {
  canonicalName: '上海市', province: '上海市', city: '上海市', latitude: 31.22222, longitude: 121.45806,
  ianaTimeZone: 'Asia/Shanghai', coordinateSource: 'GeoNames CN country dump',
  coordinateDataVersion: 'geonames-cn-2026-07-14-7b90b81d1b61', userConfirmed: true,
}

function difference(first: number, second: number) { return Math.abs(((first - second + 540) % 360) - 180) }

describe('真实星盘产品 adapter', () => {
  it('继续通过 spike 的上海黄金样本', () => {
    const result = calculateAstrology({
      calendarType: 'solar', rawBirthDate: '2000/01/01', lunarLeapMonth: false,
      rawBirthTime: '20:00', timeAccuracy: 'exact_minute', birthLocation: shanghai,
    })
    expect(result.ok).toBe(true)
    if (!result.ok || result.precision !== 'exact') throw new Error('应生成精确星盘。')
    expect(result.planets).toHaveLength(10)
    for (const planet of result.planets) {
      expect(difference(planet.longitudeDeg, expected.swetest.planets[planet.body].longitudeDeg) * 60).toBeLessThanOrEqual(1)
      expect(planet.retrograde).toBe(expected.swetest.planets[planet.body].speedDegPerDay < 0)
    }
    expect(result.houses).toHaveLength(12)
    result.houses.forEach((house, index) => expect(difference(house.longitudeDeg, expected.swetest.houses[index]) * 60).toBeLessThanOrEqual(1))
    expect(difference(result.ascendant.longitudeDeg, expected.swetest.ascendant) * 60).toBeLessThanOrEqual(1)
    expect(difference(result.midheaven.longitudeDeg, expected.swetest.midheaven) * 60).toBeLessThanOrEqual(1)
  })

  it('地点未确认时不猜测旧文本坐标', () => {
    expect(calculateAstrology({ calendarType: 'solar', rawBirthDate: '2000/01/01', lunarLeapMonth: false, rawBirthTime: '20:00', timeAccuracy: 'exact_minute', birthPlaceText: '上海市' }))
      .toMatchObject({ ok: false, error: { code: 'location_unconfirmed' } })
  })

  it('明确拒绝海外地点', () => {
    expect(calculateAstrology({ calendarType: 'solar', rawBirthDate: '2000/01/01', lunarLeapMonth: false, rawBirthTime: '20:00', timeAccuracy: 'exact_minute', countryCode: 'US', birthPlaceText: 'New York' }))
      .toMatchObject({ ok: false, error: { code: 'unsupported_location' } })
  })

  it('未知时间只返回全天范围，并能标记月亮跨星座歧义', () => {
    const result = calculateAstrology({ calendarType: 'solar', rawBirthDate: '2000/01/03', lunarLeapMonth: false, timeAccuracy: 'unknown', birthLocation: shanghai })
    expect(result.ok).toBe(true)
    if (!result.ok || result.precision !== 'day-range') throw new Error('应生成全天范围。')
    expect(result.normalizedInput.localTime).toBeUndefined()
    expect('ascendant' in result).toBe(false)
    expect(result.planetRanges.find((planet) => planet.body === 'moon')?.signAmbiguous).toBe(true)
  })

  it('只知道时段时不使用中点伪装精确结果', () => {
    const result = calculateAstrology({ calendarType: 'solar', rawBirthDate: '2000/01/01', lunarLeapMonth: false, rawBirthTime: '08:00', timeAccuracy: 'approximate_period', birthLocation: shanghai })
    expect(result).toMatchObject({ ok: true, precision: 'day-range', normalizedInput: { timeKnown: false } })
  })

  it('精确时间字段无效时返回明确错误', () => {
    expect(calculateAstrology({ calendarType: 'solar', rawBirthDate: '2000/01/01', lunarLeapMonth: false, rawBirthTime: '25:00', timeAccuracy: 'exact_minute', birthLocation: shanghai }))
      .toMatchObject({ ok: false, error: { code: 'invalid_time' } })
  })
})

describe('宫位和相位固定规则', () => {
  it('精确位于宫头时归入后一个宫位，并正确跨 0 度', () => {
    const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]
    expect(placeInHouse(20, cusps)).toBe(2)
    expect(placeInHouse(0, cusps)).toBe(1)
  })

  it('Placidus 无法计算时明确失败且不回退', () => {
    expect(calculatePlacidusHouses(new Date('2024-06-21T00:00:00Z'), 89, 116.39723)).toMatchObject({ ok: false, code: 'placidus_unavailable' })
  })

  it('只生成五种十星体主要相位', () => {
    const aspects = calculateMajorAspects([
      { body: 'sun', longitudeDeg: 0 }, { body: 'moon', longitudeDeg: 0 }, { body: 'mercury', longitudeDeg: 60 },
      { body: 'venus', longitudeDeg: 90 }, { body: 'mars', longitudeDeg: 120 }, { body: 'jupiter', longitudeDeg: 180 },
    ])
    expect(new Set(aspects.map((aspect) => aspect.type))).toEqual(new Set(['conjunction', 'sextile', 'square', 'trine', 'opposition']))
  })
})
