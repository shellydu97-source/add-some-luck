import { describe, expect, it } from 'vitest'
import { resolveStartupPath } from './startup'

describe('启动入口', () => {
  it('无人物时进入欢迎页', () => {
    expect(resolveStartupPath(0, 'records')).toBe('/welcome')
  })

  it('有人物时恢复可见的最后一级导航', () => {
    expect(resolveStartupPath(2, 'records')).toBe('/records')
  })

  it('旧运势导航在 V1 基础框架版回退到命盘', () => {
    expect(resolveStartupPath(2, 'fortune')).toBe('/charts')
  })
})
