import { Solar } from 'lunar-typescript'
import { daysInMonth, parseDateParts } from '../../utils/date'
import type { AlmanacResult } from './types'

export function calculateAlmanac(date: string): AlmanacResult {
  const parts = parseDateParts(date)
  if (!parts) throw new Error('请按 YYYY/MM/DD 选择日期。')
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month, 'solar')) throw new Error('所选日期不存在。')
  const solar = Solar.fromYmd(parts.year, parts.month, parts.day)
  if (solar.getYear() !== parts.year || solar.getMonth() !== parts.month || solar.getDay() !== parts.day) throw new Error('所选日期不存在。')
  const lunar = solar.getLunar()
  const festivals = [...solar.getFestivals(), ...lunar.getFestivals(), ...lunar.getOtherFestivals()]
  const solarTerm = lunar.getJieQi()
  return {
    solarDate: `${parts.year}年${parts.month}月${parts.day}日`, week: solar.getWeekInChinese(),
    lunarDate: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`, lunarYear: `${lunar.getYearInGanZhi()}年`, zodiac: lunar.getYearShengXiao(),
    pillars: { year: lunar.getYearInGanZhiExact(), month: lunar.getMonthInGanZhiExact(), day: lunar.getDayInGanZhiExact() },
    festivals: Array.from(new Set(festivals.filter(Boolean))), solarTerm: solarTerm || undefined,
    yi: lunar.getDayYi(), ji: lunar.getDayJi(), dayOfficer: lunar.getZhiXing(),
    tianShen: { name: lunar.getDayTianShen(), luck: lunar.getDayTianShenLuck() }, xiu: { name: lunar.getXiu(), luck: lunar.getXiuLuck() },
    chong: lunar.getDayChongDesc(), sha: lunar.getDaySha(),
    positions: { xi: lunar.getDayPositionXiDesc(), fu: lunar.getDayPositionFuDesc(), cai: lunar.getDayPositionCaiDesc() },
    pengZu: [lunar.getPengZuGan(), lunar.getPengZuZhi()], taiShen: lunar.getDayPositionTai(),
    jiShen: lunar.getDayJiShen(), xiongSha: lunar.getDayXiongSha(),
  }
}
