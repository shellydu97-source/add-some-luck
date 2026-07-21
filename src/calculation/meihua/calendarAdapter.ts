import { Solar } from 'lunar-typescript'
import type { MeihuaCalendarContext } from './types'

export const MEIHUA_CALENDAR_ENGINE_VERSION = 'lunar-typescript-1.8.6'
const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

function shanghaiParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  const values = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  return { year: values.year!, month: values.month!, day: values.day!, hour: values.hour!, minute: values.minute!, second: values.second! }
}

function branchNumber(branch: string) {
  const index = branches.indexOf(branch as typeof branches[number])
  if (index < 0) throw new Error(`无法识别地支：${branch}`)
  return index + 1
}

export function getMeihuaCalendarContext(instant: string | Date): MeihuaCalendarContext {
  const date = instant instanceof Date ? instant : new Date(instant)
  if (Number.isNaN(date.getTime())) throw new Error('起卦时间无效。')
  const parts = shanghaiParts(date)
  const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second).getLunar()
  const lunarMonth = lunar.getMonth()
  const yearBranch = lunar.getYearZhi()
  const hourBranch = lunar.getTimeZhi()
  const padded = (value: number) => String(value).padStart(2, '0')
  return {
    localDateTime: `${parts.year}-${padded(parts.month)}-${padded(parts.day)} ${padded(parts.hour)}:${padded(parts.minute)}:${padded(parts.second)}`,
    ianaTimeZone: 'Asia/Shanghai',
    lunarYear: lunar.getYearInGanZhi(),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: lunar.getDay(),
    isLeapMonth: lunarMonth < 0,
    yearBranch,
    hourBranch,
    yearNumber: branchNumber(yearBranch),
    monthNumber: Math.abs(lunarMonth),
    dayNumber: lunar.getDay(),
    hourNumber: branchNumber(hourBranch),
  }
}

export function shanghaiLocalDateTimeToInstant(value: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!matched) throw new Error('指定时间格式无效。')
  const [, year, month, day, hour, minute, second = '00'] = matched
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`)
  if (Number.isNaN(date.getTime())) throw new Error('指定时间无效。')
  const parts = shanghaiParts(date)
  if (parts.year !== Number(year) || parts.month !== Number(month) || parts.day !== Number(day) || parts.hour !== Number(hour) || parts.minute !== Number(minute) || parts.second !== Number(second)) {
    throw new Error('指定时间无效。')
  }
  return date
}
