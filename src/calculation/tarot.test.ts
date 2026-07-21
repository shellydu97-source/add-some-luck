import { describe, expect, it } from 'vitest'
import { tarotKnowledgeCards } from '../data/tarotMeanings'
import type { TarotDraft } from '../models/types'
import { createTarotSession, spreadPositions, tarotCards } from './tarotMock'

describe('塔罗正式牌序与牌库', () => {
  it('78 张牌 ID 唯一，包含 22 张大阿卡纳和 56 张小阿卡纳', () => {
    expect(tarotCards).toHaveLength(78)
    expect(new Set(tarotCards.map((card) => card.id)).size).toBe(78)
    expect(tarotCards.filter((card) => card.arcana === 'major')).toHaveLength(22)
    expect(tarotCards.filter((card) => card.arcana === 'minor')).toHaveLength(56)
    expect(tarotKnowledgeCards).toHaveLength(78)
  })

  it('固定测试种子可复现完整无重复牌序与正逆位', () => {
    const first = createTarotSession('tarot-golden-seed')
    const second = createTarotSession('tarot-golden-seed')
    expect(first).toEqual(second)
    expect(first.deckOrder).toHaveLength(78)
    expect(new Set(first.deckOrder).size).toBe(78)
    expect(Object.keys(first.orientations).sort()).toEqual([...first.deckOrder].sort())
    expect(Object.values(first.orientations).every((orientation) => orientation === 'upright' || orientation === 'reversed')).toBe(true)
  })

  it('三种牌阵的数量与位置固定', () => {
    expect(spreadPositions.single).toEqual(['当前提示'])
    expect(spreadPositions.three).toEqual(['现状', '阻碍', '建议'])
    expect(spreadPositions['dual-path']).toEqual(['当前状态', 'A 路径发展', 'A 路径结果', 'B 路径发展', 'B 路径结果'])
  })

  it('草稿序列化恢复后牌序、正逆位、已选牌与流程状态不变', () => {
    const session = createTarotSession('resume-seed')
    const draft: TarotDraft = {
      id: 'draft-resume', type: 'tarot', profileId: 'guest', question: '', createdAt: '2026-07-14T00:00:00.000Z', updatedAt: '2026-07-14T00:01:00.000Z',
      state: { isChoice: false, spread: 'three', drawMode: 'ritual', phase: 'paused', deckOrder: session.deckOrder, orientations: session.orientations, selected: session.deckOrder.slice(0, 2), cursor: 17, revealed: false },
    }
    const restored = JSON.parse(JSON.stringify(draft)) as TarotDraft
    expect(restored.state).toEqual(draft.state)
    expect(new Set(restored.state.selected).size).toBe(restored.state.selected.length)
  })
})
