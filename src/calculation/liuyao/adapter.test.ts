import { describe, expect, it } from 'vitest'
import goldenReferences from '../../../artifacts/liuyao-golden/raw/reference-tools-2026-07-14.json'
import { calculateLiuyao, coinSideDefinitions, coinTossToLine, createCastFromValues } from './adapter'
import { hexagramByTrigrams, hexagramDefinitions, trigramByBits } from './data'
import type { YaoValue } from './types'

const CAST_TIME = '2026-07-14T04:00:00.000Z'
const relationLabels: Record<string, string> = { 子: '子孙', 妻: '妻财', 父: '父母', 官: '官鬼', 兄: '兄弟' }
const spiritLabels: Record<string, string> = { 龍: '青龙', 雀: '朱雀', 陳: '勾陈', 蛇: '腾蛇', 虎: '白虎', 武: '玄武' }

function expectedHexagramNumber(bitsBottomToTop: string) {
  const lower = trigramByBits.get(bitsBottomToTop.slice(0, 3))!
  const upper = trigramByBits.get(bitsBottomToTop.slice(3))!
  return hexagramByTrigrams.get(`${upper.key}:${lower.key}`)!.number
}

describe('六爻正式计算 adapter', () => {
  it('铜钱两面只在计算层固定为阴2、阳3', () => {
    expect(coinSideDefinitions.yin).toEqual({ value: 2 })
    expect(coinSideDefinitions.yang).toEqual({ value: 3 })
  })

  it.each([
    [['yin', 'yin', 'yin'], 6, '老阴 · 动'],
    [['yang', 'yin', 'yin'], 7, '少阳 · 静'],
    [['yang', 'yang', 'yin'], 8, '少阴 · 静'],
    [['yang', 'yang', 'yang'], 9, '老阳 · 动'],
  ] as const)('三枚铜钱组合 %# 映射正确', (coins, value, label) => {
    expect(coinTossToLine({ coins: [...coins] })).toMatchObject({ value, label })
  })

  it.each([
    [['yin', 'yin', 'yin'], 6, 'yin', true],
    [['yang', 'yin', 'yin'], 7, 'yang', false],
    [['yin', 'yang', 'yin'], 7, 'yang', false],
    [['yin', 'yin', 'yang'], 7, 'yang', false],
    [['yang', 'yang', 'yin'], 8, 'yin', false],
    [['yang', 'yin', 'yang'], 8, 'yin', false],
    [['yin', 'yang', 'yang'], 8, 'yin', false],
    [['yang', 'yang', 'yang'], 9, 'yang', true],
  ] as const)('八种铜钱排列 %# 的阴阳与动静一致', (coins, value, yinYang, moving) => {
    expect(coinTossToLine({ coins: [...coins] })).toMatchObject({ value, yinYang, moving })
  })

  it('截图固定案例：三爻阳、四爻阴、五爻老阳、上爻阴得到水天需变地天泰', () => {
    const result = calculateLiuyao(createCastFromValues([7, 7, 7, 8, 9, 8]), '2026-07-16T07:06:00.000Z')
    expect(result.original).toMatchObject({ number: 5, name: '水天需' })
    expect(result.changed).toMatchObject({ number: 11, name: '地天泰' })
    expect(result.movingLines).toEqual([5])
  })

  it('对照保护：仅把初爻改为阴，才会得到水风井变地风升', () => {
    const result = calculateLiuyao(createCastFromValues([8, 7, 7, 8, 9, 8]), '2026-07-16T07:06:00.000Z')
    expect(result.original).toMatchObject({ number: 48, name: '水风井' })
    expect(result.changed).toMatchObject({ number: 46, name: '地风升' })
    expect(result.movingLines).toEqual([5])
  })

  it('用户对照案例：3字、1字2背、1字2背、1字2背、1字2背、3字得到坤为地变山雷颐', () => {
    const result = calculateLiuyao(createCastFromValues([6, 8, 8, 8, 8, 6]), '2026-07-16T05:29:04.000Z')
    expect(result.original).toMatchObject({ number: 2, name: '坤为地' })
    expect(result.changed).toMatchObject({ number: 27, name: '山雷颐' })
    expect(result.movingLines).toEqual([1, 6])
    expect(result.lines.map((line) => line.value)).toEqual([6, 8, 8, 8, 8, 6])
  })

  it('反向录入保护：3背、1背2字、1背2字、1背2字、1背2字、3背会得到乾为天变泽风大过', () => {
    const result = calculateLiuyao(createCastFromValues([9, 7, 7, 7, 7, 9]), '2026-07-16T05:29:04.000Z')
    expect(result.original).toMatchObject({ number: 1, name: '乾为天' })
    expect(result.changed).toMatchObject({ number: 28, name: '泽风大过' })
    expect(result.movingLines).toEqual([1, 6])
  })

  it('64 种本卦二进制组合全部映射到唯一卦序', () => {
    const found = new Set<number>()
    for (let mask = 0; mask < 64; mask += 1) {
      const values = Array.from({ length: 6 }, (_, line) => ((mask >> line) & 1 ? 7 : 8)) as YaoValue[]
      const result = calculateLiuyao(createCastFromValues(values), CAST_TIME)
      found.add(result.original.number)
      expect(result.original.number).toBe(expectedHexagramNumber(values.map((value) => value === 7 ? '1' : '0').join('')))
    }
    expect(found).toEqual(new Set(Array.from({ length: 64 }, (_, index) => index + 1)))
    expect(hexagramDefinitions).toHaveLength(64)
  })

  it('64 种本卦 × 64 种动爻掩码全部得到逐位翻转的变卦', () => {
    for (let originalMask = 0; originalMask < 64; originalMask += 1) {
      for (let movingMask = 0; movingMask < 64; movingMask += 1) {
        const values = Array.from({ length: 6 }, (_, line) => {
          const yang = ((originalMask >> line) & 1) === 1
          const moving = ((movingMask >> line) & 1) === 1
          return (yang ? moving ? 9 : 7 : moving ? 6 : 8) as YaoValue
        })
        const result = calculateLiuyao(createCastFromValues(values), CAST_TIME)
        const changedBits = Array.from({ length: 6 }, (_, line) => (((originalMask ^ movingMask) >> line) & 1) ? '1' : '0').join('')
        expect(result.changed.number).toBe(expectedHexagramNumber(changedBits))
      }
    }
  }, 30000)

  it('12 组黄金案例与 najia 1.2.4、ichingshifa 3.1.9 对照一致', () => {
    expect(goldenReferences.cases).toHaveLength(12)
    for (const golden of goldenReferences.cases) {
      const result = calculateLiuyao(createCastFromValues(golden.values as YaoValue[]), golden.castTime)
      const najia = golden.najia
      const iching = golden.ichingshifa.original
      const changedIChing = golden.ichingshifa.changed

      expect(result.original.name, golden.id).toBe(najia.name)
      expect(result.changed.name, golden.id).toBe(najia.changedName)
      expect(result.original.palaceName, golden.id).toBe(najia.palace)
      expect([result.original.shiLine, result.original.yingLine], golden.id).toEqual(najia.shiYing)
      expect(result.movingLines, golden.id).toEqual(najia.movingLineIndexesZeroBased.map((index) => index + 1))
      expect(result.lines.map((line) => line.relation), golden.id).toEqual(najia.relations)
      expect(result.lines.map((line) => `${line.naJia}${line.element}`), golden.id).toEqual(najia.naJiaWithElement)
      expect(result.lines.map((line) => line.spirit), golden.id).toEqual(najia.spirits.map((spirit) => spirit === '螣蛇' ? '腾蛇' : spirit))
      expect(result.calendar.dayGanZhi, golden.id).toBe(najia.calendar.gz.day)
      expect(result.calendar.monthBranch, golden.id).toBe(najia.calendar.gz.month.slice(1))
      expect(result.calendar.xunKong, golden.id).toBe(najia.calendar.xkong)

      expect(result.lines.map((line) => line.naJia), golden.id).toEqual(iching.naJia)
      expect(result.lines.map((line) => line.element), golden.id).toEqual(iching.elements)
      expect(result.lines.map((line) => line.relation), golden.id).toEqual(iching.relations.map((relation) => relationLabels[relation]))
      expect(result.lines.map((line) => line.spirit), golden.id).toEqual(iching.spirits.map((spirit) => spiritLabels[spirit]))
      expect(result.original.shiLine, golden.id).toBe(iching.shiYing.findIndex((value) => value.includes('世')) + 1)
      expect(result.original.yingLine, golden.id).toBe(iching.shiYing.findIndex((value) => value.includes('應') || value.includes('应')) + 1)
      expect(result.lines.map((line) => line.changedNaJia), golden.id).toEqual(changedIChing.naJia)
    }
  })

  it('六十四卦均有卦辞、六条爻辞和基础卦义', () => {
    expect(hexagramDefinitions.every((hexagram) => hexagram.judgment.length > 0 && hexagram.lineTexts.length === 6 && hexagram.lineTexts.every(Boolean) && hexagram.basicMeaning.length > 0)).toBe(true)
  })
})
