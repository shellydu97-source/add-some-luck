import { normalizeDegrees } from './math'
import type { AstrologyBody, MajorAspect, ZodiacSign } from './types'

export const ZODIAC_SIGNS: ZodiacSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
export const zodiacLabels: Record<ZodiacSign, string> = {
  aries: '白羊座', taurus: '金牛座', gemini: '双子座', cancer: '巨蟹座', leo: '狮子座', virgo: '处女座',
  libra: '天秤座', scorpio: '天蝎座', sagittarius: '射手座', capricorn: '摩羯座', aquarius: '水瓶座', pisces: '双鱼座',
}
export const zodiacSymbols: Record<ZodiacSign, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
}
export const bodyLabels: Record<AstrologyBody, string> = {
  sun: '太阳', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星',
  saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星',
}
export const bodySymbols: Record<AstrologyBody, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
}
export const aspectLabels: Record<MajorAspect, string> = {
  conjunction: '合相', opposition: '冲相', square: '刑相', trine: '拱相', sextile: '六合',
}

export function zodiacPosition(longitude: number) {
  const normalized = normalizeDegrees(longitude)
  const sign = ZODIAC_SIGNS[Math.floor(normalized / 30)] as ZodiacSign
  return { sign, degreeInSign: normalized % 30 }
}

export function formatDegree(value: number, fractionDigits = 2) { return `${value.toFixed(fractionDigits)}°` }
