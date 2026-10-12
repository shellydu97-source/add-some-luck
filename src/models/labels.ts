import type { RecordType, Relation, TimeAccuracy, VerificationStatus } from './types'

export const relationLabels: Record<Relation, string> = {
  self: '自己', family: '家人', friend: '朋友', partner: '伴侣', other: '其他',
}

export const accuracyLabels: Record<TimeAccuracy, string> = {
  exact_minute: '精确到分钟', known_shichen: '只知道时辰', approximate_period: '只知道大致时段', unknown: '完全未知',
}

export const recordTypeLabels: Record<RecordType, string> = {
  bazi: '八字', astrology: '星盘', liuyao: '六爻', meihua: '梅花易数', tarot: '塔罗',
}

export const verificationLabels: Record<VerificationStatus, string> = {
  pending: '等待验证', matched: '已应验', partially_matched: '部分符合', not_happened: '未发生',
  opposite: '结果相反', unknown: '暂时无法判断',
}

export const categoryOptions = ['感情', '工作 / 事业', '学业 / 考试', '财运', '健康', '出行', '其他']
