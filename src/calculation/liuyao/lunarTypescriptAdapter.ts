import { Solar } from 'lunar-typescript'
import type { LiuyaoCalendarContext } from './types'

export const LIUYAO_CALENDAR_ENGINE_VERSION = 'lunar-typescript@1.8.6'

function shanghaiParts(isoDateTime: string) {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) throw new Error('起卦时间无效。')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute'), second: read('second') }
}

export function getLiuyaoCalendarContext(isoDateTime: string): LiuyaoCalendarContext {
  const local = shanghaiParts(isoDateTime)
  const lunar = Solar.fromYmdHms(local.year, local.month, local.day, local.hour, local.minute, local.second).getLunar()
  return {
    localDateTime: `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')} ${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}:${String(local.second).padStart(2, '0')}`,
    monthBranch: lunar.getMonthZhiExact(),
    dayGanZhi: lunar.getDayInGanZhiExact2(),
    dayStem: lunar.getDayGanExact2(),
    xunKong: lunar.getDayXunKongExact2(),
  }
}
