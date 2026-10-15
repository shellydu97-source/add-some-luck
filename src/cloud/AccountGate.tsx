import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCloudAccount } from './accountContext'
import { accountGateDestination, shouldWaitForAccountData } from './accountGateState'
import { hasGuestAccess } from './guestAccess'
import { EmptyState, LinkButton } from '../components/UI'

export default function AccountGate() {
  const account = useCloudAccount()
  const location = useLocation()
  const destination = accountGateDestination({
    configured: account.configured,
    authLoading: account.authLoading,
    signedIn: Boolean(account.session),
    guestAllowed: hasGuestAccess(),
    currentPath: `${location.pathname}${location.search}`,
  })

  if (account.configured && account.authLoading) {
    return <div className="route-loading">正在读取登录状态…</div>
  }
  if (shouldWaitForAccountData({
    configured: account.configured,
    authLoading: account.authLoading,
    signedIn: Boolean(account.session),
    cloudDataReady: account.cloudDataReady,
  })) {
    if (account.syncStatus === 'error') {
      return <div className="route-loading"><EmptyState
        title="暂时无法恢复这个账号的数据"
        action={<LinkButton to={`/account?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`} secondary>前往账号重试</LinkButton>}
      >{account.syncMessage || '请重新同步后再继续。'}</EmptyState></div>
    }
    return <div className="route-loading">正在恢复你的数据…</div>
  }
  return destination ? <Navigate to={destination} replace /> : <Outlet />
}
