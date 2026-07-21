import { describe, expect, it } from 'vitest'
import { getRitualLane } from '../utils/tarotRoller'
import { TAROT_ROLL_SPEED_PX_PER_SECOND } from './TarotRoller'

describe('塔罗仪式牌流', () => {
  it('只循环复用中央附近 9 张牌背', () => {
    const cards = Array.from({ length: 78 }, (_, index) => `card-${index}`)
    const lane = getRitualLane(cards, 12)
    expect(lane).toHaveLength(9)
    expect(lane[4]).toBe('card-12')
    expect(new Set(lane)).toHaveLength(9)
  })

  it('游标在牌尾时仍连续循环', () => {
    expect(getRitualLane(['a', 'b', 'c', 'd', 'e'], 4)[4]).toBe('e')
    expect(getRitualLane(['a', 'b', 'c', 'd', 'e'], 5)[4]).toBe('a')
  })

  it('滚动速度使用独立常量，并保持在原速度的 2.5 至 3 倍范围', () => {
    expect(TAROT_ROLL_SPEED_PX_PER_SECOND).toBe(264)
    expect(TAROT_ROLL_SPEED_PX_PER_SECOND).toBeGreaterThanOrEqual(96 * 2.5)
    expect(TAROT_ROLL_SPEED_PX_PER_SECOND).toBeLessThanOrEqual(96 * 3)
  })
})
