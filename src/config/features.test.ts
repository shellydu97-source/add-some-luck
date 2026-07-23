import { describe, expect, it } from 'vitest'
import { featureFlags, isRecordTypeVisible } from './features'

describe('用户可见功能', () => {
  it('隐藏星盘入口但保留其他记录类型', () => {
    expect(featureFlags.astrology).toBe(false)
    expect(isRecordTypeVisible('astrology')).toBe(false)
    expect(isRecordTypeVisible('bazi')).toBe(true)
    expect(isRecordTypeVisible('liuyao')).toBe(true)
    expect(isRecordTypeVisible('meihua')).toBe(true)
    expect(isRecordTypeVisible('tarot')).toBe(true)
  })
})
