import { describe, expect, it } from 'vitest'
import {
  calculateMeihuaByNumbers, calculateMeihuaByObjectCount, calculateMeihuaBySoundCount,
  calculateMeihuaBySpecifiedTime, calculateMeihuaByText, calculateMeihuaByThreeNumbers,
  calculateMeihuaByTime, calculateMeihuaFromTrigramNumbers, meihuaRemainder, normalizeMeihuaText,
} from '.'
import { meihuaHexagrams, meihuaTrigramOrder, trigramFromNumber } from './data'

describe('梅花易数独立计算 adapter', () => {
  it('先天八卦数固定为乾一兑二离三震四巽五坎六艮七坤八', () => {
    expect(meihuaTrigramOrder.map((key, index) => [index + 1, key, trigramFromNumber(index + 1).name])).toEqual([
      [1, 'qian', '乾'], [2, 'dui', '兑'], [3, 'li', '离'], [4, 'zhen', '震'],
      [5, 'xun', '巽'], [6, 'kan', '坎'], [7, 'gen', '艮'], [8, 'kun', '坤'],
    ])
  })

  it('除尽时八卦取坤八、动爻取上六', () => {
    expect(meihuaRemainder(16, 8)).toBe(8)
    expect(meihuaRemainder(18, 6)).toBe(6)
  })

  it('两数法 1 和 8 得天地否、风山渐、天山遁，三爻动且用生体', () => {
    const result = calculateMeihuaByNumbers(1, 8)
    expect(result.original).toMatchObject({ number: 12, name: '天地否' })
    expect(result.mutual).toMatchObject({ number: 53, name: '风山渐' })
    expect(result.changed).toMatchObject({ number: 33, name: '天山遁' })
    expect(result.movingLine).toBe(3)
    expect(result.bodyUseRelation.label).toBe('用生体')
    expect(result.bodyTrigram.name).toBe('乾')
    expect(result.useTrigram.name).toBe('坤')
  })

  it('时间法按上海时区使用农历年月日与时支', () => {
    const result = calculateMeihuaByTime('2026-07-16T05:29:04.000Z')
    expect(result.calendar).toMatchObject({ localDateTime: '2026-07-16 13:29:04', yearBranch: '午', lunarMonth: 6, lunarDay: 3, hourBranch: '未' })
    expect(result.sourceNumbers).toMatchObject({ upperTotal: 16, lowerTotal: 24, movingTotal: 24 })
    expect(result.original).toMatchObject({ number: 2, name: '坤为地' })
    expect(result.changed).toMatchObject({ number: 23, name: '山地剥' })
    expect(result.movingLine).toBe(6)
  })

  it('《梅花易数》观梅占的 34 / 43 / 43 得泽火革、天风姤、泽山咸，初爻动', () => {
    const result = calculateMeihuaFromTrigramNumbers({
      method: 'time',
      upperNumber: 34,
      lowerNumber: 43,
      movingNumber: 43,
    })
    expect(result.original).toMatchObject({ number: 49, name: '泽火革' })
    expect(result.mutual).toMatchObject({ number: 44, name: '天风姤' })
    expect(result.changed).toMatchObject({ number: 31, name: '泽山咸' })
    expect(result.movingLine).toBe(1)
  })

  it('指定时间与同一时刻的当前时间法得到完全相同的卦象', () => {
    const specified = calculateMeihuaBySpecifiedTime('2026-07-16T13:29')
    const instant = calculateMeihuaByTime('2026-07-16T05:29:00.000Z')
    expect(specified.method).toBe('specified_time')
    expect(specified.sourceNumbers.specifiedLocalDateTime).toBe('2026-07-16T13:29')
    expect(specified.original.number).toBe(instant.original.number)
    expect(specified.changed.number).toBe(instant.changed.number)
    expect(specified.movingLine).toBe(instant.movingLine)
  })

  it('三数法分别使用第一数、第二数和第三数取上卦、下卦与动爻', () => {
    const result = calculateMeihuaByThreeNumbers(1, 8, 4)
    expect(result.sourceNumbers).toMatchObject({ upperTotal: 1, lowerTotal: 8, movingTotal: 4, firstNumber: 1, secondNumber: 8, thirdNumber: 4 })
    expect(result.original).toMatchObject({ number: 12, name: '天地否' })
    expect(result.mutual).toMatchObject({ number: 53, name: '风山渐' })
    expect(result.changed).toMatchObject({ number: 20, name: '风地观' })
    expect(result.movingLine).toBe(4)
  })

  it('文字字数法只计算汉字，11 字按少者为上、多者为下并以总字数取动爻', () => {
    const sourceText = '今天，工作应该注意些什么？'
    expect(normalizeMeihuaText(sourceText)).toBe('今天工作应该注意些什么')
    const result = calculateMeihuaByText(sourceText)
    expect(result.sourceNumbers).toMatchObject({ upperTotal: 5, lowerTotal: 6, movingTotal: 11, characterCount: 11 })
    expect(result.original).toMatchObject({ number: 59, name: '风水涣' })
    expect(result.changed).toMatchObject({ number: 4, name: '山水蒙' })
    expect(result.movingLine).toBe(5)
  })

  it('物数法以物品数量为上卦、当前时支为下卦，并合数取动爻', () => {
    const result = calculateMeihuaByObjectCount(3, '2026-07-16T05:29:04.000Z')
    expect(result.sourceNumbers).toMatchObject({ upperTotal: 3, lowerTotal: 8, movingTotal: 11, observedCount: 3 })
    expect(result.original).toMatchObject({ number: 35, name: '火地晋' })
    expect(result.changed).toMatchObject({ number: 12, name: '天地否' })
    expect(result.movingLine).toBe(5)
  })

  it('声音法以声音次数为上卦、次数加时支数为下卦和动爻', () => {
    const result = calculateMeihuaBySoundCount(3, '2026-07-16T05:29:04.000Z')
    expect(result.sourceNumbers).toMatchObject({ upperTotal: 3, lowerTotal: 11, movingTotal: 11, observedCount: 3 })
    expect(result.original).toMatchObject({ number: 30, name: '离为火' })
    expect(result.changed).toMatchObject({ number: 13, name: '天火同人' })
    expect(result.movingLine).toBe(5)
  })

  it('23:00 进入子时但仍使用当天农历日，00:00 后日期递增', () => {
    const beforeMidnight = calculateMeihuaByTime('2026-07-16T15:00:00.000Z')
    const afterMidnight = calculateMeihuaByTime('2026-07-16T16:00:00.000Z')
    expect(beforeMidnight.calendar).toMatchObject({ localDateTime: '2026-07-16 23:00:00', lunarDay: 3, hourBranch: '子' })
    expect(afterMidnight.calendar).toMatchObject({ localDateTime: '2026-07-17 00:00:00', lunarDay: 4, hourBranch: '子' })
  })

  it('64 种上下卦全部得到唯一六十四卦', () => {
    const found = new Set<number>()
    for (let upper = 1; upper <= 8; upper += 1) {
      for (let lower = 1; lower <= 8; lower += 1) {
        found.add(calculateMeihuaFromTrigramNumbers({ method: 'numbers', upperNumber: upper, lowerNumber: lower, movingNumber: 1 }).original.number)
      }
    }
    expect(found).toEqual(new Set(Array.from({ length: 64 }, (_, index) => index + 1)))
    expect(meihuaHexagrams).toHaveLength(64)
  })

  it('64 卦乘 6 个动爻全部只翻转对应一爻', () => {
    for (let upper = 1; upper <= 8; upper += 1) {
      for (let lower = 1; lower <= 8; lower += 1) {
        for (let moving = 1; moving <= 6; moving += 1) {
          const result = calculateMeihuaFromTrigramNumbers({ method: 'numbers', upperNumber: upper, lowerNumber: lower, movingNumber: moving })
          const originalBits = `${result.original.lower.bits}${result.original.upper.bits}`
          const changedBits = `${result.changed.lower.bits}${result.changed.upper.bits}`
          expect([...changedBits].filter((bit, index) => bit !== originalBits[index])).toHaveLength(1)
          expect(changedBits[moving - 1]).not.toBe(originalBits[moving - 1])
        }
      }
    }
  })

  it.each([[0, 1], [-1, 2], [1.5, 2], [1, Number.MAX_SAFE_INTEGER + 1]])('拒绝无效两数输入 %s / %s', (first, second) => {
    expect(() => calculateMeihuaByNumbers(first, second)).toThrow('正整数')
  })

  it('拒绝无效指定时间、过短文字和无效观察数量', () => {
    expect(() => calculateMeihuaBySpecifiedTime('2026-02-30T12:00')).toThrow('无效')
    expect(() => calculateMeihuaByText('太短了')).toThrow('11 至 100')
    expect(() => calculateMeihuaByObjectCount(0, new Date())).toThrow('正整数')
    expect(() => calculateMeihuaBySoundCount(1.5, new Date())).toThrow('正整数')
  })
})
