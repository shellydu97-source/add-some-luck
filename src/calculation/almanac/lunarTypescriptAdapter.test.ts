import { describe, expect, it } from 'vitest'
import { calculateAlmanac } from './lunarTypescriptAdapter'

describe('calculateAlmanac', () => {
  it('returns a complete general almanac for a known date', () => {
    const result = calculateAlmanac('2026/08/20')
    expect(result.solarDate).toBe('2026年8月20日')
    expect(result.lunarDate).toBe('七月初八')
    expect(result.pillars).toEqual({ year: '丙午', month: '丙申', day: '丙寅' })
    expect(result.dayOfficer).toBe('破')
    expect(result.tianShen).toEqual({ name: '天刑', luck: '凶' })
    expect(result.chong).toContain('猴')
    expect(result.yi.length).toBeGreaterThan(0)
    expect(result.ji.length).toBeGreaterThan(0)
  })
  it('rejects invalid dates', () => expect(() => calculateAlmanac('2026-02-31')).toThrow('不存在'))
})
