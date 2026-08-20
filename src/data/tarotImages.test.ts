import { describe, expect, it } from 'vitest'
import { tarotCards } from './tarotCards'
import { getTarotImagePath } from './tarotImages'

describe('塔罗牌面路径', () => {
  it('为 78 张牌生成唯一且完整的本地路径', () => {
    const paths = tarotCards.map(getTarotImagePath)
    expect(paths).toHaveLength(78)
    expect(new Set(paths).size).toBe(78)
    expect(paths).toContain('/tarot/rws/0.jpg')
    expect(paths).toContain('/tarot/rws/21.jpg')
    expect(paths).toContain('/tarot/rws/c1.jpg')
    expect(paths).toContain('/tarot/rws/p14.jpg')
    expect(paths).toContain('/tarot/rws/s12.jpg')
    expect(paths).toContain('/tarot/rws/w10.jpg')
  })
})
