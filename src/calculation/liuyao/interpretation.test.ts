import { describe, expect, it } from 'vitest'
import { calculateLiuyao, createCastFromValues } from './adapter'
import { buildLiuyaoCopyText, createLiuyaoDetailedInterpretation } from './interpretation'
import type { YaoValue } from './types'

const CAST_TIME = '2026-07-15T02:30:00.000Z'

function calculate(values: YaoValue[]) {
  return calculateLiuyao(createCastFromValues(values), CAST_TIME)
}

describe('六爻本地详细解读', () => {
  it('无动爻时只保留本卦，不创建重复的变卦方向', () => {
    const result = calculate([7, 8, 7, 8, 7, 8])
    const before = structuredClone(result)
    const reading = createLiuyaoDetailedInterpretation(result)
    expect(result.changed.number).toBe(result.original.number)
    expect(reading.movingLines).toHaveLength(0)
    expect(reading.changeDirection).toBeUndefined()
    expect(reading.movingClue).toContain('无动爻，变卦同本卦')
    expect(result).toEqual(before)
  })

  it('单动爻展示原爻辞、通俗解释、动变影响与排盘依据', () => {
    const result = calculate([9, 8, 7, 8, 7, 8])
    const reading = createLiuyaoDetailedInterpretation(result)
    expect(reading.movingLines).toHaveLength(1)
    expect(reading.movingLines[0]).toMatchObject({ lineIndex: 1, originalText: result.original.lineTexts[0] })
    expect(reading.movingLines[0]!.plainExplanation).toContain('事情的起点')
    expect(reading.movingLines[0]!.impact).toContain('纳甲由')
    expect(reading.changeDirection?.relationship).toContain('第1爻')
  })

  it('多动爻按由下往上列出，并保留所有变化线索', () => {
    const result = calculate([6, 7, 8, 9, 7, 6])
    const before = structuredClone(result)
    const reading = createLiuyaoDetailedInterpretation(result)
    expect(reading.movingLines.map((line) => line.lineIndex)).toEqual([1, 4, 6])
    expect(reading.movingClue).toContain('第1爻、第4爻、第6爻')
    expect(reading.relationRules.some((rule) => rule.includes('不自动选择用神'))).toBe(true)
    expect(reading.relationReadings.map((item) => item.title)).toEqual(['世爻与应爻', '六亲与六神', '月建、日辰与旬空', '伏神、卦身与神煞', '动爻、变爻与生克'])
    expect(result).toEqual(before)
  })

  it('复制内容与原始铜钱、卦名、动爻及专业排盘完全一致', () => {
    const result = calculate([6, 7, 8, 9, 7, 6])
    const reading = createLiuyaoDetailedInterpretation(result)
    const text = buildLiuyaoCopyText({ question: '当前方案需要注意什么', castAt: CAST_TIME, result, interpretation: reading })
    result.lines.forEach((line) => {
      expect(text).toContain(`第${line.index}爻（由下往上）`)
      expect(text).toContain(`${line.label}（${line.yinYang === 'yang' ? '阳爻' : '阴爻'}）`)
      expect(text).toContain(line.naJia)
      expect(text).toContain(line.relation)
      expect(text).toContain(line.spirit)
    })
    expect(text).toContain(`本卦：第${result.original.number}卦 ${result.original.name}`)
    expect(text).toContain(`变卦：第${result.changed.number}卦 ${result.changed.name}`)
    expect(text).toContain(`本卦宫位：${result.original.palaceName}宫`)
    expect(text).toContain(`变卦宫位：${result.changed.palaceName}宫`)
    expect(text).toContain(`卦身：${result.guaShen.branch}`)
    expect(text).toContain(`世身：${result.shiShen.branch}`)
    expect(text).toContain('常用神煞：')
    expect(text).not.toContain('字面（阴2）')
    expect(text).not.toContain('背面（阳3）')
    expect(text).toContain('不得修改本卦、变卦、动爻或排盘字段')
  })
})
