import { describe, expect, it } from 'vitest'
import type { LiuyaoDraft } from '../models/types'
import { getRequestedDraft } from './draftEntry'

function makeDraft(recordId?: string): LiuyaoDraft {
  return {
    id: 'draft-1',
    type: 'liuyao',
    profileId: 'guest',
    question: '上一次的问题',
    category: '其他',
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    state: { timeRange: '', casts: [], locked: false, recordId },
  }
}

describe('getRequestedDraft', () => {
  it('does not reuse a draft on a normal new entry', () => {
    expect(getRequestedDraft(makeDraft())).toBeUndefined()
  })

  it('restores only the explicitly selected unfinished draft', () => {
    const unfinished = makeDraft()
    expect(getRequestedDraft(unfinished, unfinished.id)).toBe(unfinished)
    expect(getRequestedDraft(unfinished, 'another-draft')).toBeUndefined()
  })

  it('does not reuse a completed draft', () => {
    expect(getRequestedDraft(makeDraft('record-1'), 'draft-1')).toBeUndefined()
  })
})
