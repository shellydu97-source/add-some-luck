import { describe, expect, it } from 'vitest'
import { validateDateInput } from './date'

describe('日期输入校验', () => {
  it('公历校验真实日期并禁止未来出生日期', () => {
    expect(validateDateInput('2025/02/29', { calendarType: 'solar', minYear: 1900, allowFuture: false })).toContain('最多')
    expect(validateDateInput('2999/01/01', { calendarType: 'solar', minYear: 1900, allowFuture: false })).toBeTruthy()
  })

  it('农历只校验 1—12 月和 1—30 日', () => {
    expect(validateDateInput('2020/12/30', { calendarType: 'lunar', minYear: 1900, allowFuture: true })).toBe('')
    expect(validateDateInput('2020/12/31', { calendarType: 'lunar', minYear: 1900, allowFuture: true })).toContain('1—30')
  })
})
