import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AccountGate from './AccountGate'

const state = vi.hoisted(() => ({
  account: {
    configured: true,
    authLoading: false,
    session: { user: { id: 'account-b' } },
    cloudDataReady: false,
    syncStatus: 'error',
    syncMessage: '暂时无法连接云端，本机数据仍会正常保留。',
  },
}))
vi.mock('./accountContext', () => ({ useCloudAccount: () => state.account }))
vi.mock('./guestAccess', () => ({ hasGuestAccess: () => false }))

beforeEach(() => {
  state.account.cloudDataReady = false
  state.account.syncStatus = 'error'
})
afterEach(cleanup)

function AppRoutes() {
  return <MemoryRouter initialEntries={['/records?type=tarot']}><Routes>
    <Route element={<AccountGate />}><Route path="/records" element={<p>账号私有记录</p>} /></Route>
    <Route path="/account" element={<p>账号管理与同步重试</p>} />
  </Routes></MemoryRouter>
}

describe('账号数据恢复错误界面', () => {
  it('恢复失败时不挂载私有页面，保留明确的账号重试入口', () => {
    render(<AppRoutes />)
    expect(screen.queryByText('账号私有记录')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '暂时无法恢复这个账号的数据' })).toBeInTheDocument()
    const retry = screen.getByRole('link', { name: '前往账号重试' })
    expect(retry).toHaveAttribute('href', '/account?next=%2Frecords%3Ftype%3Dtarot')
    fireEvent.click(retry)
    expect(screen.getByText('账号管理与同步重试')).toBeInTheDocument()
  })

  it('数据恢复成功后才挂载私有页面', () => {
    const view = render(<AppRoutes />)
    state.account.cloudDataReady = true
    state.account.syncStatus = 'synced'
    view.rerender(<AppRoutes />)
    expect(screen.getByText('账号私有记录')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '前往账号重试' })).not.toBeInTheDocument()
  })

  it('仍在恢复时不误报失败，也不挂载私有页面', () => {
    state.account.syncStatus = 'checking'
    render(<AppRoutes />)
    expect(screen.getByText('正在恢复你的数据…')).toBeInTheDocument()
    expect(screen.queryByText('账号私有记录')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '前往账号重试' })).not.toBeInTheDocument()
  })
})
