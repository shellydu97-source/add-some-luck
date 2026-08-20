import { describe, expect, it } from 'vitest'
import { interpretationMocks } from '../interpretation/mockAdapter'
import { createRecord, GUEST_PROFILE_ID } from './record'

describe('临时测算记录', () => {
  it('无人物起卦使用 guest，但不创建人物档案', () => {
    const record = createRecord({
      type: 'liuyao', question: '', category: '其他', rawResult: {}, interpretation: interpretationMocks.liuyao,
    })
    expect(record.profileId).toBe(GUEST_PROFILE_ID)
    expect(record.profileNameSnapshot).toBe('临时测算')
    expect(record.profileSnapshot).toMatchObject({ name: '临时测算', timeAccuracy: 'unknown' })
    expect(record.subjectType).toBe('temporary')
    expect(record.question).toBeUndefined()
  })

  it('保留临时对象称呼和性别，但不绑定人物档案', () => {
    const record = createRecord({
      temporarySubject: { name: '朋友小林', gender: 'female' },
      type: 'liuyao', question: '这件事如何发展？', category: '其他', rawResult: {}, interpretation: interpretationMocks.liuyao,
    })
    expect(record.profileId).toBe(GUEST_PROFILE_ID)
    expect(record.profileNameSnapshot).toBe('临时测算 · 朋友小林')
    expect(record.profileSnapshot).toMatchObject({ name: '朋友小林', gender: 'female' })
    expect(record.subjectType).toBe('temporary')
  })
})
