import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import LiuyaoConfirmPage from './LiuyaoConfirmPage'
import { useAppStore } from '../storage/store'
import type { LiuyaoDraft, LiuyaoMethod } from '../models/types'

afterEach(cleanup)
function mount(method: LiuyaoMethod) {
  const draft: LiuyaoDraft = { id: 'test', type: 'liuyao', profileId: 'guest', question: '测试', createdAt: '2026-10-12T04:00:00Z', updatedAt: '2026-10-12T04:00:00Z', state: { method, timeRange: '', locked: false, castCompletedAt: '2026-10-12T04:00:00Z', casts: Array.from({ length: 6 }, () => ({ method, coins: ['yang', 'yin', 'yang'] })) } }
  useAppStore.setState({ drafts: [draft] })
  render(<MemoryRouter><LiuyaoConfirmPage /></MemoryRouter>)
}
describe('确认六爻', () => {
  it('数字投掷只读', () => {
    mount('digital')
    expect(screen.getAllByRole('img', { name: /数字投掷结果只读/ })).toHaveLength(18)
    expect(screen.queryByRole('button', { name: /点击翻面/ })).toBeNull()
  })
  it('手动录入可翻面且不改变起卦完成时间', () => {
    mount('manual')
    fireEvent.click(screen.getByRole('button', { name: '第 1 爻第 1 枚铜钱，点击翻面' }))
    const draft = useAppStore.getState().drafts[0] as LiuyaoDraft
    expect(draft.state.casts[0].coins[0]).toBe('yin')
    expect(draft.state.casts[0].method).toBe('manual')
    expect(draft.state.castCompletedAt).toBe('2026-10-12T04:00:00Z')
  })
})
