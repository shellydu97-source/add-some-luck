import { describe, expect, it } from 'vitest'
import { accountGateDestination } from './accountGateState'

describe('账号启动入口', () => {
  it('首次打开且未登录时进入账号页', () => {
    expect(accountGateDestination({
      configured: true, authLoading: false, signedIn: false, guestAllowed: false, currentPath: '/charts',
    })).toBe('/account?onboarding=1&next=%2Fcharts')
  })

  it('已登录或已选择本地体验时直接进入应用', () => {
    expect(accountGateDestination({
      configured: true, authLoading: false, signedIn: true, guestAllowed: false, currentPath: '/',
    })).toBeUndefined()
    expect(accountGateDestination({
      configured: true, authLoading: false, signedIn: false, guestAllowed: true, currentPath: '/',
    })).toBeUndefined()
  })

  it('账号服务未配置时不阻断本地功能', () => {
    expect(accountGateDestination({
      configured: false, authLoading: false, signedIn: false, guestAllowed: false, currentPath: '/',
    })).toBeUndefined()
  })
})
