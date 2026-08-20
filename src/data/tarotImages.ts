import type { TarotCard } from '../models/types'

const suitCodes = {
  cups: 'c',
  pentacles: 'p',
  swords: 's',
  wands: 'w',
} as const

const rankCodes: Record<string, number> = {
  ace: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  page: 11,
  knight: 12,
  queen: 13,
  king: 14,
}

export function getTarotImagePath(card: Pick<TarotCard, 'arcana' | 'order' | 'rank' | 'suit'>) {
  if (card.arcana === 'major') return `/tarot/rws/${card.order}.jpg`
  if (!card.suit || !card.rank) throw new Error('小阿卡纳缺少花色或牌阶')
  const rank = rankCodes[card.rank]
  if (!rank) throw new Error(`不支持的塔罗牌阶：${card.rank}`)
  return `/tarot/rws/${suitCodes[card.suit]}${rank}.jpg`
}
