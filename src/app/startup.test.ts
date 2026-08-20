import { describe, expect, it } from 'vitest'
import { resolveStartupPath } from './startup'

describe('启动入口', () => {
  it('无人物时进入欢迎页', () => {
    expect(resolveStartupPath(0, 'records')).toBe('/welcome')
  })

  it('有人物时恢复可见的最后一级导航', () => {
    expect(resolveStartupPath(2, 'records')).toBe('/me')
  })

  it('恢复今日运势入口', () => {
    expect(resolveStartupPath(2, 'fortune')).toBe('/today')
  })
})
