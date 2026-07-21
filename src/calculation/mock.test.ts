import { describe, expect, it } from 'vitest'
import { coinTossToLine, createDigitalCoinToss } from './liuyao'
import { createSeededRandomSource } from './random'
import { createTarotSession, tarotCards } from './tarotMock'
import { tarotKnowledgeMap } from '../data/tarotMeanings'

describe('正式起卦基础规则', () => {
  it('固定测试随机源可以复现六次三枚铜钱结果', () => {
    const createSix = () => {
      const source = createSeededRandomSource('fixed-seed')
      return Array.from({ length: 6 }, () => createDigitalCoinToss(source))
    }
    const first = createSix()
    expect(first).toEqual(createSix())
    expect(first).toHaveLength(6)
    expect(first.every((cast) => cast.coins.length === 3 && cast.coins.every((side) => side === 'yang' || side === 'yin'))).toBe(true)
    expect(first.map(coinTossToLine).every((line) => [6, 7, 8, 9].includes(line.value))).toBe(true)
  })

  it('塔罗测试种子生成完整、不重复且稳定的牌序和正逆位', () => {
    const first = createTarotSession('fixed-seed')
    const second = createTarotSession('fixed-seed')
    expect(first).toEqual(second)
    expect(first.deckOrder).toHaveLength(tarotCards.length)
    expect(new Set(first.deckOrder).size).toBe(tarotCards.length)
    expect(Object.keys(first.orientations)).toHaveLength(tarotCards.length)
  })

  it('78 张牌都有完整基础牌义', () => {
    expect(tarotCards).toHaveLength(78)
    expect(tarotKnowledgeMap.size).toBe(78)
    expect(tarotCards.every((card) => {
      const knowledge = tarotKnowledgeMap.get(card.id)
      return !!knowledge?.uprightMeaning && !!knowledge.reversedMeaning && knowledge.uprightKeywords.length > 0 && knowledge.reversedKeywords.length > 0
    })).toBe(true)
  })
})
