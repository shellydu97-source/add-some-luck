import { describe, expect, it } from 'vitest'
import { interpretationMocks } from '../interpretation/mockAdapter'
import { createRecord, GUEST_PROFILE_ID } from './record'

describe('未关联人物记录', () => {
  it('无人物起卦使用 guest，但不创建人物档案', () => {
    const record = createRecord({
      type: 'liuyao', question: '', category: '其他', rawResult: {}, interpretation: interpretationMocks.liuyao,
    })
    expect(record.profileId).toBe(GUEST_PROFILE_ID)
    expect(record.profileNameSnapshot).toBe('未关联人物')
    expect(record.profileSnapshot).toMatchObject({ name: '未关联人物', timeAccuracy: 'unknown' })
    expect(record.question).toBeUndefined()
  })
})
