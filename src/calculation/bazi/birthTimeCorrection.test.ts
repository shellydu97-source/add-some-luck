import { describe, expect, it } from 'vitest'
import { calculateBaziWithOptions, correctBirthTime, shanghaiHasDaylightSaving } from './birthTimeCorrection'
import { calculateBazi } from './lunarTypescriptAdapter'
import type { BaziBirthInput } from './types'
const input: BaziBirthInput = { calendarType: 'solar', rawBirthDate: '1988/07/15', rawBirthTime: '11:30', lunarLeapMonth: false, timeAccuracy: 'exact_minute', gender: 'male' }
function pillars(value: BaziBirthInput) {
  const result = calculateBaziWithOptions(value)
  if (!result.ok) throw new Error(result.error.message)
  return Object.values(result.pillars).map((p) => p.status === 'available' ? p.ganZhi : p.status)
}
describe('八字可选输入校正', () => {
  it('夏令时与标准钟表时间明确分开', () => {
    expect(pillars({ ...input, daylightSavingStatus: 'applied' })).toEqual(['戊辰', '己未', '辛未', '癸巳'])
    expect(pillars({ ...input, daylightSavingStatus: 'not_applied' })).toEqual(['戊辰', '己未', '辛未', '甲午'])
  })
  it('乌鲁木齐真太阳时影响时柱', () => {
    const value = { ...input, rawBirthDate: '1990/03/10', rawBirthTime: '10:00', birthLocation: { canonicalName: '乌鲁木齐市', province: '新疆', city: '乌鲁木齐市', latitude: 43.8, longitude: 87.6, ianaTimeZone: 'Asia/Shanghai' as const, coordinateSource: 'test', coordinateDataVersion: 'test', userConfirmed: true as const } }
    expect(pillars({ ...value, useTrueSolarTime: 'on' })[3]).toBe('戊辰')
    expect(pillars({ ...value, useTrueSolarTime: 'off' })[3]).toBe('己巳')
  })
  it('晚子时只替换日时柱并刷新十神', () => {
    const value = { ...input, rawBirthDate: '2000/01/07', rawBirthTime: '23:30' }
    expect(pillars({ ...value, dayBoundaryRule: 'zi-23' }).slice(2)).toEqual(['乙丑', '丙子'])
    expect(pillars(value).slice(2)).toEqual(['甲子', '丙子'])
  })
  it.each([[1986,'05-04','09-14'],[1987,'04-12','09-13'],[1988,'04-17','09-11'],[1989,'04-16','09-17'],[1990,'04-15','09-16'],[1991,'04-14','09-15']])('IANA %s 夏令时边界与重复小时', (year,start,end) => {
    expect(shanghaiHasDaylightSaving(new Date(`${year}-${start}T12:00:00Z`))).toBe(true)
    expect(shanghaiHasDaylightSaving(new Date(`${year}-${end}T01:30:00Z`))).toBe(true)
    expect(shanghaiHasDaylightSaving(new Date(`${year}-${end}T12:00:00Z`))).toBe(false)
  })
  it('默认结果不变，未知时间不校正，校正跨日', () => {
    expect(pillars(input)).toEqual(Object.values((calculateBazi(input) as Extract<ReturnType<typeof calculateBazi>, {ok:true}>).pillars).map(p => p.status === 'available' ? p.ganZhi : p.status))
    expect(correctBirthTime({ ...input, timeAccuracy: 'unknown', useTrueSolarTime: 'on', daylightSavingStatus: 'applied' }).notes).toEqual([])
    expect(correctBirthTime({ ...input, rawBirthTime: '00:30', daylightSavingStatus: 'applied' }).correctedLocal).toBe('1988-07-14 23:30')
  })
})
