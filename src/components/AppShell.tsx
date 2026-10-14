import { NavLink, Outlet, useLocation } from 'react-router-dom'
import SyncConflictPanel from './SyncConflictPanel'
import { useCloudAccount } from '../cloud/accountContext'
import { useEffect } from 'react'
import { useAppStore } from '../storage/store'
import type { PrimaryNav } from '../models/types'

const navItems = [
  { id: 'fortune' as const, to: '/today', label: '今日', icon: 'calendar' },
  { id: 'charts' as const, to: '/charts', label: '命理', icon: 'chart' },
  { id: 'divination' as const, to: '/divination', label: '占卜', icon: 'spark' },
  { id: 'records' as const, to: '/me', label: '我的', icon: 'person' },
]

function NavIcon({ name }: { name: string }) {
  if (name === 'calendar') return <svg viewBox="0 0 24 24"><path d="M6 3v3M18 3v3M4.5 8.5h15M5.5 5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M8 12h3v3H8zM14 12h3v3h-3z" /></svg>
  if (name === 'chart') return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg>
  if (name === 'spark') return <svg viewBox="0 0 24 24"><path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z" /></svg>
  return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.6-4.2 2.8-6.3 6.5-6.3s5.9 2.1 6.5 6.3" /></svg>
}

export default function AppShell() {
  const location = useLocation()
  const account = useCloudAccount()
  const notice = useAppStore((state) => state.notice)
  const setNotice = useAppStore((state) => state.setNotice)
  const setLastPrimaryRoute = useAppStore((state) => state.setLastPrimaryRoute)
  const storageRecovery = useAppStore((state) => state.storageRecovery)
  const dismissRecovery = useAppStore((state) => state.dismissStorageRecovery)
  const reduceMotion = useAppStore((state) => state.reduceMotion)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    let primary: PrimaryNav | undefined
    if (location.pathname.startsWith('/today')) primary = 'fortune'
    else if (location.pathname.startsWith('/charts') || location.pathname.startsWith('/profiles')) primary = 'charts'
    else if (location.pathname.startsWith('/divination')) primary = 'divination'
    else if (location.pathname.startsWith('/me') || location.pathname.startsWith('/records') || location.pathname.startsWith('/settings')) primary = 'records'
    if (primary) setLastPrimaryRoute(primary)
  }, [location.pathname, setLastPrimaryRoute])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  return (
    <div className={`app-shell ${reduceMotion ? 'reduce-motion' : ''}`}>
      {storageRecovery && <div className="storage-warning" role="alert"><p>{storageRecovery.message}</p><NavLink to="/settings">处理数据</NavLink><button onClick={dismissRecovery}>稍后处理</button></div>}
      <main className="page-container">{location.pathname !== '/account' && <SyncConflictPanel />}{!account.session && account.syncMessage && <p className="storage-warning" role="alert">{account.syncMessage} <NavLink to="/account">重新登录</NavLink></p>}<Outlet /></main>
      <nav className="bottom-nav" aria-label="一级导航">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => {
            const secondaryMineRoute = item.id === 'records' && (location.pathname.startsWith('/records') || location.pathname.startsWith('/settings'))
            const personRoute = item.id === 'charts' && location.pathname.startsWith('/profiles')
            return isActive || secondaryMineRoute || personRoute ? 'active' : ''
          }}>
            <span className="nav-icon" aria-hidden="true"><NavIcon name={item.icon} /></span><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}
