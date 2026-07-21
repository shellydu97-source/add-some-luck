import type { FortunePeriod, FortunePeriodType } from '../models/types'
import { interpretationMocks } from './interpretations'

const periodLabels: Record<FortunePeriodType, string> = { day: '今日', week: '本周', month: '本月' }

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function range(anchor: Date, periodType: FortunePeriodType) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const end = new Date(start)
  if (periodType === 'week') {
    const offset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - offset)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  } else if (periodType === 'month') {
    start.setDate(1)
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0)
  }
  return { startDate: localIso(start), endDate: localIso(end) }
}

export function getMockFortune(profileId: string, periodType: FortunePeriodType, anchor = new Date()): FortunePeriod {
  const label = periodLabels[periodType]
  const dates = range(anchor, periodType)
  return {
    profileId, periodType, ...dates,
    keywords: ['核对', '推进', '留余地'],
    summary: `${label}适合处理已经确认的信息；遇到关键决定时，仍应回到现实证据。`,
    baziView: { ...interpretationMocks.bazi, headline: `${label}八字视角（演示）` },
    astrologyView: { ...interpretationMocks.astrology, headline: `${label}星象视角（演示）` },
    combinedView: {
      ...interpretationMocks.astrology,
      headline: `${label}综合提示（演示）`,
      conclusion: '两个 mock 视角都强调先核对条件，但这只是展示结构，不是实际运势。',
    },
    dimensions: {
      relationships: { trend: '平稳', summary: '适合把事实与猜测分开，再决定是否沟通。' },
      work: { trend: '可推进', summary: '已经确认的任务可以继续，关键节点仍需复核。' },
      finance: { trend: '宜审慎', summary: '不根据演示运势作消费、投资或财务决定。' },
      wellbeing: { trend: '有波动', summary: '留意节奏与休息；这不是医疗判断。' },
    },
    alignment: '两个 mock 视角都指向“先核对条件”，但各自依据尚未接入真实计算，不能强行合并成确定结论。',
    suggestions: ['推进已确认的计划', '留出复核时间'],
    cautions: ['不要用玄学提示替代现实信息', '避免为了尽快得到答案而重复占问'],
  }
}
