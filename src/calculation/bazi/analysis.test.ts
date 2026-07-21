import { describe, expect, it } from 'vitest'
import { analyzeBaziFlow, analyzeBaziNatal } from './analysis'
import type { AvailablePillar, BaziCalculationSuccess, EarthlyBranch, HeavenlyStem, PillarKey } from './types'
import { BRANCH_ELEMENTS, HIDDEN_STEMS, STEM_META, getNaYin, getTenGod, getTwelveStage, getXun, getXunKong } from './rules'

function pillar(gan: HeavenlyStem, zhi: EarthlyBranch, dayStem: HeavenlyStem): AvailablePillar {
  const ganZhi = `${gan}${zhi}`
  return {
    status: 'available', ganZhi, gan, zhi,
    hiddenStems: HIDDEN_STEMS[zhi],
    stemTenGod: gan === dayStem ? '日主' : getTenGod(dayStem, gan),
    hiddenTenGods: HIDDEN_STEMS[zhi].map((stem) => getTenGod(dayStem, stem)),
    fiveElements: { stem: STEM_META[gan].element, branch: BRANCH_ELEMENTS[zhi] },
    naYin: getNaYin(ganZhi)!, twelveStage: getTwelveStage(dayStem, zhi), selfStage: getTwelveStage(gan, zhi),
    xun: getXun(ganZhi)!, xunKong: getXunKong(ganZhi)!,
  }
}

function result(): BaziCalculationSuccess {
  const dayStem = '甲'
  const pillars: Record<PillarKey, AvailablePillar> = {
    year: pillar('庚', '申', dayStem), month: pillar('丙', '辰', dayStem),
    day: pillar('甲', '子', dayStem), time: pillar('丁', '卯', dayStem),
  }
  return {
    ok: true, engine: 'lunar-typescript', engineVersion: 'test', adapterVersion: 'test', ruleVersion: 'test', calculatedAt: '',
    normalizedInput: {
      sourceCalendar: 'solar', sourceDate: { year: 2000, month: 1, day: 1 }, solarDate: { year: 2000, month: 1, day: 1 },
      lunarDate: { year: 1999, month: 11, day: 25, isLeapMonth: false }, timeKnown: true,
      localTime: { hour: 12, minute: 0, second: 0, precision: 'minute' }, timezone: 'Asia/Shanghai', trueSolarTime: false,
      dayRollover: 'eight-char-sect-2', yearBoundary: 'exact-lichun', monthBoundary: 'exact-jie', luckStartMethod: 'yun-sect-1',
    },
    pillars, fiveElementCounts: { 木: 2, 火: 1, 土: 1, 金: 1, 水: 3 }, warnings: [],
  }
}

describe('八字事实分析层', () => {
  it('统计显干与藏干十神，并识别完整三合结构', () => {
    const analysis = analyzeBaziNatal(result())
    expect(analysis.tenGodCounts.伤官).toBeGreaterThan(0)
    expect(analysis.relations.some((item) => item.kind === '地支三合' && item.text.includes('申、子、辰'))).toBe(true)
    expect(analysis.shenSha.some((item) => item.name === '华盖' && item.target === '月柱')).toBe(true)
  })

  it('为流运标出十神、五行、纳音、长生、关系和常用神煞', () => {
    const flow = analyzeBaziFlow(result(), '己丑', '流年')!
    expect(flow.stemTenGod).toBe('正财')
    expect(flow.relations.some((item) => item.kind === '天干五合' && item.text.includes('日柱甲'))).toBe(true)
    expect(flow.relations.some((item) => item.kind === '地支六合' && item.text.includes('日柱子'))).toBe(true)
    expect(flow.shenSha.some((item) => item.name === '天乙贵人')).toBe(true)
  })

  it('覆盖日支相冲、相害、相破、相刑和七类常用神煞', () => {
    expect(analyzeBaziFlow(result(), '甲午', '流日')!.relations.some((item) => item.kind === '地支六冲')).toBe(true)
    expect(analyzeBaziFlow(result(), '甲未', '流日')!.relations.some((item) => item.kind === '地支相害')).toBe(true)
    expect(analyzeBaziFlow(result(), '甲酉', '流日')!.relations.some((item) => item.kind === '地支相破')).toBe(true)
    expect(analyzeBaziFlow(result(), '甲卯', '流日')!.relations.some((item) => item.kind === '地支相刑')).toBe(true)

    const names = ['甲丑', '甲巳', '甲寅', '甲酉', '甲辰', '甲子']
      .flatMap((ganZhi) => analyzeBaziFlow(result(), ganZhi, '流日')!.shenSha.map((item) => item.name))
    expect(new Set(names)).toEqual(new Set(['天乙贵人', '文昌贵人', '禄神', '驿马', '桃花', '华盖', '将星']))
  })
})
