import { describe, expect, it } from 'vitest'
import { getTarotKnowledge } from '../data/tarotMeanings'
import type { TarotOrientation, TarotSpread } from '../models/types'
import { getTarotCard, spreadPositions } from './tarotMock'
import { buildTarotCopyText, createTarotSpreadInterpretation, getTarotElement, type TarotReadingCard } from './tarotInterpretation'

const cardIds = ['major-00', 'wands-three', 'cups-five', 'swords-queen', 'pentacles-ten']

function makeCards(spread: TarotSpread, orientations: TarotOrientation[]): TarotReadingCard[] {
  return spreadPositions[spread].map((position, index) => {
    const card = getTarotCard(cardIds[index]!)!
    const knowledge = getTarotKnowledge(card.id)!
    const orientation = orientations[index] ?? 'upright'
    return {
      ...card,
      position,
      orientation,
      element: getTarotElement(card.arcana, card.suit),
      keywords: orientation === 'upright' ? knowledge.uprightKeywords : knowledge.reversedKeywords,
      basicMeaning: orientation === 'upright' ? knowledge.uprightMeaning : knowledge.reversedMeaning,
    }
  })
}

describe('塔罗本地牌阵综合解读', () => {
  it.each([
    ['single', ['当前主题', '核心提醒', '行动建议']],
    ['three', ['现状', '阻碍', '建议', '整体发展脉络', '主要矛盾', '行动建议']],
    ['dual-path', ['当前状态', 'A 路径发展', 'A 路径结果', 'B 路径发展', 'B 路径结果', 'A / B 核心差异', 'A 路径：优势与风险', 'B 路径：优势与风险', '克制的行动建议']],
  ] as const)('%s 牌阵包含约定的完整结构', (spread, expectedTitles) => {
    const cards = makeCards(spread, ['upright', 'reversed', 'upright', 'reversed', 'upright'])
    const reading = createTarotSpreadInterpretation(spread, cards)
    expect(reading.sections.map((section) => section.title)).toEqual(expectedTitles)
    expect(reading.sections.every((section) => section.content.length > 20 && section.evidence.length > 0)).toBe(true)
    expect(reading.uncertainty).toContain('不构成确定预测')
  })

  it('三牌与五牌不是重复拼贴同一段模板', () => {
    for (const spread of ['three', 'dual-path'] as const) {
      const reading = createTarotSpreadInterpretation(spread, makeCards(spread, ['upright', 'reversed', 'upright', 'reversed', 'upright']))
      expect(new Set(reading.sections.map((section) => section.content)).size).toBe(reading.sections.length)
      for (const position of spreadPositions[spread]) {
        expect(reading.sections.some((section) => section.title === position && section.content.includes(position))).toBe(true)
      }
    }
  })

  it('复制内容与实际牌面、位置和正逆位完全一致', () => {
    const cards = makeCards('dual-path', ['upright', 'reversed', 'upright', 'reversed', 'upright'])
    const reading = createTarotSpreadInterpretation('dual-path', cards)
    const text = buildTarotCopyText({ question: '我要比较两个可行方案', drawnAt: '2026-07-15T02:00:00.000Z', cards, interpretation: reading })
    cards.forEach((card) => {
      expect(text).toContain(card.position)
      expect(text).toContain(card.nameZh)
      expect(text).toContain(card.orientation === 'upright' ? '正位' : '逆位')
      expect(text).toContain(card.basicMeaning)
    })
    expect(text).toContain('不要改变牌面和正逆位')
    expect(text).toContain('本地综合解读')
  })
})
