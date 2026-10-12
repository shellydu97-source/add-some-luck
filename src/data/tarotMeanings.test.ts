import { describe, expect, it } from 'vitest'
import { tarotKnowledgeCards } from './tarotMeanings'
import { createTarotSpreadInterpretation } from '../calculation/tarotInterpretation'

describe('RWS 逐牌牌义', () => {
  it('78张牌字段完整且正位文本不重复，56张小牌每条25–45字', () => {
    expect(tarotKnowledgeCards).toHaveLength(78)
    expect(new Set(tarotKnowledgeCards.map((c) => c.uprightMeaning)).size).toBe(78)
    for (const card of tarotKnowledgeCards) {
      expect(card.uprightKeywords).toHaveLength(3); expect(card.reversedKeywords).toHaveLength(3)
      expect(card.uprightMeaning).toBeTruthy(); expect(card.reversedMeaning).toBeTruthy()
      if (card.arcana === 'minor') for (const meaning of [card.uprightMeaning, card.reversedMeaning]) {
        expect(meaning.length, `${card.nameZh}: ${meaning}`).toBeGreaterThanOrEqual(25)
        expect(meaning.length, `${card.nameZh}: ${meaning}`).toBeLessThanOrEqual(45)
      }
    }
  })
  it.each([['swords', 'three', '心痛'], ['swords', 'nine', '焦虑'], ['swords', 'ten', '痛苦结束'], ['swords', 'eight', '受困'], ['swords', 'seven', '隐瞒'], ['cups', 'seven', '幻想'], ['cups', 'eight', '离开'], ['cups', 'four', '倦怠'], ['pentacles', 'six', '给予与接受']])('%s-%s保留核心含义', (suit, rank, keyword) => {
    expect(tarotKnowledgeCards.find((c) => c.suit === suit && c.rank === rank)?.uprightKeywords).toContain(keyword)
  })
  it('同一花色关键词重复不作独立重复信号，跨花色才提示', () => {
    const base = { nameZh: '测试', nameEn: 'test', orientation: 'upright' as const, arcana: 'minor' as const, element: '火', keywords: ['共同词'], basicMeaning: '测试牌义', position: '现状' }
    const same = createTarotSpreadInterpretation('three', [{ ...base, id: 'a', suit: 'wands' }, { ...base, id: 'b', suit: 'wands', position: '阻碍' }, { ...base, id: 'c', suit: 'wands', position: '建议' }])
    expect(same.patterns.some((p) => p.includes('关键词“共同词”'))).toBe(false)
    const different = createTarotSpreadInterpretation('three', [{ ...base, id: 'a', suit: 'wands' }, { ...base, id: 'b', suit: 'cups', position: '阻碍' }, { ...base, id: 'c', suit: 'wands', position: '建议' }])
    expect(different.patterns.some((p) => p.includes('关键词“共同词”'))).toBe(true)
  })
})
