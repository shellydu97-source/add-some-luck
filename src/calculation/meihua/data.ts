import zhouyiTexts from '../../data/zhouyiTexts.json'
import type { MeihuaHexagram, MeihuaTrigram, MeihuaTrigramKey } from './types'

export const meihuaTrigrams: Record<MeihuaTrigramKey, MeihuaTrigram> = {
  qian: { key: 'qian', number: 1, name: '乾', symbol: '☰', bits: '111', element: '金', theme: '主动、刚健与开创' },
  dui: { key: 'dui', number: 2, name: '兑', symbol: '☱', bits: '110', element: '金', theme: '沟通、愉悦与交换' },
  li: { key: 'li', number: 3, name: '离', symbol: '☲', bits: '101', element: '火', theme: '显现、依附与辨明' },
  zhen: { key: 'zhen', number: 4, name: '震', symbol: '☳', bits: '100', element: '木', theme: '发动、惊醒与行动' },
  xun: { key: 'xun', number: 5, name: '巽', symbol: '☴', bits: '011', element: '木', theme: '进入、渗透与顺应' },
  kan: { key: 'kan', number: 6, name: '坎', symbol: '☵', bits: '010', element: '水', theme: '风险、反复与深度' },
  gen: { key: 'gen', number: 7, name: '艮', symbol: '☶', bits: '001', element: '土', theme: '停止、边界与沉淀' },
  kun: { key: 'kun', number: 8, name: '坤', symbol: '☷', bits: '000', element: '土', theme: '承载、配合与积累' },
}

export const meihuaTrigramOrder: MeihuaTrigramKey[] = ['qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun']
export const meihuaTrigramByBits = new Map(Object.values(meihuaTrigrams).map((trigram) => [trigram.bits, trigram]))

const kingWenNumbers: Record<MeihuaTrigramKey, number[]> = {
  qian: [1, 10, 13, 25, 44, 6, 33, 12],
  dui: [43, 58, 49, 17, 28, 47, 31, 45],
  li: [14, 38, 30, 21, 50, 64, 56, 35],
  zhen: [34, 54, 55, 51, 32, 40, 62, 16],
  xun: [9, 61, 37, 42, 57, 59, 53, 20],
  kan: [5, 60, 63, 3, 48, 29, 39, 8],
  gen: [26, 41, 22, 27, 18, 4, 52, 23],
  kun: [11, 19, 36, 24, 46, 7, 15, 2],
}

const names = [
  '乾为天', '坤为地', '水雷屯', '山水蒙', '水天需', '天水讼', '地水师', '水地比', '风天小畜', '天泽履', '地天泰', '天地否', '天火同人', '火天大有', '地山谦', '雷地豫',
  '泽雷随', '山风蛊', '地泽临', '风地观', '火雷噬嗑', '山火贲', '山地剥', '地雷复', '天雷无妄', '山天大畜', '山雷颐', '泽风大过', '坎为水', '离为火', '泽山咸', '雷风恒',
  '天山遁', '雷天大壮', '火地晋', '地火明夷', '风火家人', '火泽睽', '水山蹇', '雷水解', '山泽损', '风雷益', '泽天夬', '天风姤', '泽地萃', '地风升', '泽水困', '水风井',
  '泽火革', '火风鼎', '震为雷', '艮为山', '风山渐', '雷泽归妹', '雷火丰', '火山旅', '巽为风', '兑为泽', '风水涣', '水泽节', '风泽中孚', '雷山小过', '水火既济', '火水未济',
] as const

const hexagrams: MeihuaHexagram[] = []
for (const upperKey of meihuaTrigramOrder) {
  kingWenNumbers[upperKey].forEach((number, lowerIndex) => {
    const text = zhouyiTexts[number - 1]!
    hexagrams.push({
      number,
      name: names[number - 1]!,
      upper: meihuaTrigrams[upperKey],
      lower: meihuaTrigrams[meihuaTrigramOrder[lowerIndex]!],
      judgment: text.judgment,
      lineTexts: text.lineTexts as MeihuaHexagram['lineTexts'],
    })
  })
}

export const meihuaHexagrams = [...hexagrams].sort((a, b) => a.number - b.number)
export const meihuaHexagramByTrigrams = new Map(meihuaHexagrams.map((hexagram) => [`${hexagram.upper.key}:${hexagram.lower.key}`, hexagram]))

export function trigramFromNumber(value: number) {
  const normalized = ((value - 1) % 8 + 8) % 8
  return meihuaTrigrams[meihuaTrigramOrder[normalized]!]
}

export function hexagramFromBits(bitsBottomToTop: string) {
  if (!/^[01]{6}$/.test(bitsBottomToTop)) throw new Error('六爻阴阳数据不完整。')
  const lower = meihuaTrigramByBits.get(bitsBottomToTop.slice(0, 3))
  const upper = meihuaTrigramByBits.get(bitsBottomToTop.slice(3, 6))
  if (!lower || !upper) throw new Error('无法识别八卦结构。')
  const hexagram = meihuaHexagramByTrigrams.get(`${upper.key}:${lower.key}`)
  if (!hexagram) throw new Error('六十四卦映射不完整。')
  return hexagram
}
