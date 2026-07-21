import type { CalendarType } from '../models/types'

export const MIN_BIRTH_YEAR = 1900

export interface DateParts {
  year: number
  month: number
  day: number
}

export function parseDateParts(value: string): DateParts | undefined {
  const match = value.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!match) return undefined
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function formatDateParts(parts: DateParts) {
  return `${String(parts.year).padStart(4, '0')}/${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}`
}

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function daysInMonth(year: number, month: number, calendarType: CalendarType) {
  if (calendarType === 'lunar') return 30
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function compareDateParts(left: DateParts, right: DateParts) {
  return left.year - right.year || left.month - right.month || left.day - right.day
}

export function getTodayParts(): DateParts {
  const today = new Date()
  return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }
}

export function validateDateInput(value: string, options: {
  calendarType: CalendarType
  minYear?: number
  maxYear?: number
  allowFuture?: boolean
}) {
  if (!value.trim()) return '请填写日期'
  const parts = parseDateParts(value)
  if (!parts) return '请按 YYYY/MM/DD 输入日期'
  const today = getTodayParts()
  const minYear = options.minYear ?? MIN_BIRTH_YEAR
  const maxYear = options.maxYear ?? today.year
  if (parts.year < minYear || parts.year > maxYear) return `年份需在 ${minYear}—${maxYear} 之间`
  if (parts.month < 1 || parts.month > 12) return '月份需在 1—12 之间'
  const maxDay = daysInMonth(parts.year, parts.month, options.calendarType)
  if (parts.day < 1 || parts.day > maxDay) {
    return options.calendarType === 'lunar' ? '农历日期需在 1—30 日之间' : `该月最多有 ${maxDay} 天`
  }
  if (!options.allowFuture && compareDateParts(parts, today) > 0) return '日期不能晚于今天'
  return ''
}

export function normalizeDateInput(value: string) {
  const parts = parseDateParts(value)
  return parts ? formatDateParts(parts) : value.trim()
}

export function shiftDate(parts: DateParts, amount: number, unit: 'day' | 'week' | 'month') {
  const date = new Date(parts.year, parts.month - 1, parts.day)
  if (unit === 'month') date.setMonth(date.getMonth() + amount)
  else date.setDate(date.getDate() + amount * (unit === 'week' ? 7 : 1))
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
}
